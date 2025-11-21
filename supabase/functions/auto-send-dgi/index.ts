import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Mapeo de tipos de documento a códigos DGI
const TIPOS_DOCUMENTO_DGI: Record<string, number> = {
  'CI': 2,
  'RUT': 3,
  'PASAPORTE': 4,
  'DNI': 5,
  'OTRO': 6,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { facturaId } = await req.json();

    console.log('🚀 [AutoSendDGI] Procesando factura:', facturaId);

    // 1. Obtener la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .select('*')
      .eq('id', facturaId)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    // 2. Validar que no esté ya enviada
    if (factura.dgi_enviada) {
      console.log('⚠️ [AutoSendDGI] Factura ya enviada a DGI');
      return new Response(
        JSON.stringify({ success: true, message: 'Factura ya enviada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Obtener configuración CFE de la empresa
    const { data: config, error: configError } = await supabase
      .from('empresas_config_cfe')
      .select('*')
      .eq('empresa_id', factura.empresa_id)
      .maybeSingle();

    if (configError || !config || !config.activa) {
      console.log('⚠️ [AutoSendDGI] Empresa sin configuración CFE activa');
      return new Response(
        JSON.stringify({ success: false, error: 'Empresa sin configuración CFE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Obtener items de la factura
    const { data: items, error: itemsError } = await supabase
      .from('facturas_venta_items')
      .select('*')
      .eq('factura_id', facturaId)
      .order('numero_linea', { ascending: true });

    if (itemsError || !items || items.length === 0) {
      throw new Error('No se encontraron items de la factura');
    }

    // 5. Obtener cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', factura.cliente_id)
      .single();

    if (clienteError || !cliente) {
      throw new Error('Cliente no encontrado');
    }

    // 6. Obtener tipo de documento del cliente
    let tipoDocumento = 'CI';
    if (cliente.tipo_documento_id) {
      const { data: tipoDoc } = await supabase
        .from('tipo_documento_identidad')
        .select('codigo')
        .eq('id', cliente.tipo_documento_id)
        .maybeSingle();
      if (tipoDoc) {
        tipoDocumento = tipoDoc.codigo;
      }
    }

    // 7. Obtener país de la empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .maybeSingle();

    let paisCodigo = 'UY';
    if (empresa?.pais_id) {
      const { data: pais } = await supabase
        .from('paises')
        .select('codigo')
        .eq('id', empresa.pais_id)
        .maybeSingle();
      if (pais) {
        paisCodigo = pais.codigo;
      }
    }

    // 8. Generar JSON CFE para DGI
    const jsonCFE = generarJSONCFE(factura, items, cliente, config, tipoDocumento, paisCodigo);

    // 9. Enviar a DGI
    const resultadoDGI = await enviarADGI(jsonCFE, config);

    // 10. Actualizar factura con datos de DGI
    const { error: updateError } = await supabase
      .from('facturas_venta')
      .update({
        dgi_enviada: true,
        dgi_cae: resultadoDGI.cae,
        dgi_fecha_envio: new Date().toISOString(),
        dgi_hash: resultadoDGI.hash,
        dgi_respuesta: resultadoDGI,
      })
      .eq('id', facturaId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ [AutoSendDGI] Factura enviada exitosamente a DGI');

    return new Response(
      JSON.stringify({
        success: true,
        cae: resultadoDGI.cae,
        mensaje: 'Factura enviada exitosamente a DGI',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [AutoSendDGI] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generarJSONCFE(factura: any, items: any[], cliente: any, config: any, tipoDocumento: string, paisCodigo: string): any {
  // Determinar tipo de CFE según prefijo del número de factura:
  // - Prefijo "A-" → e-ticket ventas normales (101)
  // - Prefijo "COM-" → e-ticket comisiones partners (101)
  // - Sin prefijo especial → e-factura (111)
  const numeroFactura = factura.numero_factura || '';
  const esTicketVentaNormal = numeroFactura.startsWith('A-');
  const esTicketComision = numeroFactura.startsWith('COM-');
  const tipoCFE = (esTicketVentaNormal || esTicketComision) ? 101 : 111;

  // Mapear tipo de documento a código DGI
  const tipoDocumentoDGI = TIPOS_DOCUMENTO_DGI[tipoDocumento] || 2; // Default: CI

  // Determinar forma de pago (1: Contado, 2: Crédito)
  const formaPago = factura.estado === 'pagada' ? 1 : 2;

  // Generar items en formato DGI
  const itemsDGI = items.map((item, index) => ({
    codigo: item.codigo || `ITEM-${index + 1}`,
    cantidad: parseFloat(item.cantidad),
    concepto: item.descripcion,
    precio: parseFloat(item.precio_unitario),
    indicador_facturacion: 3, // 3: Producto/Servicio
    ...(item.tasa_iva && parseFloat(item.tasa_iva) > 0 ? {
      tasa_iva: parseFloat(item.tasa_iva) * 100 // Convertir 0.22 a 22
    } : {})
  }));

  // Construir JSON según formato DGI (estructura Comprobantes[])
  const comprobante = {
    tipo_comprobante: tipoCFE,
    numero_interno: factura.numero_factura,
    forma_pago: formaPago,
    sucursal: parseInt(config.codigo_sucursal) || 1,
    moneda: factura.moneda || 'UYU',
    montos_brutos: parseFloat(factura.subtotal) || 0,
    tipo_doc_receptor: tipoDocumentoDGI,
    doc_receptor: cliente.numero_documento,
    cod_pais: paisCodigo,
    razon_social: cliente.razon_social,
    items: itemsDGI
  };

  // Agregar campos opcionales si existen
  if (cliente.email) {
    comprobante.email_receptor = cliente.email;
  }
  if (cliente.telefono) {
    comprobante.telefono_receptor = cliente.telefono;
  }
  if (cliente.direccion) {
    comprobante.direccion_receptor = cliente.direccion;
  }
  if (cliente.ciudad) {
    comprobante.ciudad_receptor = cliente.ciudad;
  }
  if (cliente.departamento) {
    comprobante.departamento_receptor = cliente.departamento;
  }

  // Retornar en estructura Comprobantes[]
  return {
    Comprobantes: [comprobante]
  };
}

async function enviarADGI(jsonCFE: any, config: any): Promise<any> {
  console.log('📤 [DGI] Enviando JSON CFE a DGI...');
  console.log('📋 [DGI] Payload:', JSON.stringify(jsonCFE, null, 2));

  // SIMULADO: En producción conectar con API real de DGI
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generar CAE simulado
  const cae = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const hash = `SHA256-${Math.random().toString(36).substr(2, 16)}`;

  return {
    success: true,
    cae,
    hash,
    fecha: new Date().toISOString(),
    mensaje: 'CFE aceptado por DGI (simulado)',
  };

  /*
  // PRODUCCIÓN: Descomentar y configurar cuando tengas la URL de la API DGI
  const response = await fetch(config.url_webservice, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.dgi_api_key}`,
    },
    body: JSON.stringify(jsonCFE),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DGI Error (${response.status}): ${errorText}`);
  }

  return await response.json();
  */
}
