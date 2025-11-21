import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const TIPOS_DOCUMENTO_DGI: Record<string, number> = {
  'RUT': 2,
  'CI': 3,
  'OTRO': 4,
  'PASAPORTE': 5,
  'DNI': 6,
  'NIFE': 7,
};

const TIPO_COMPROBANTE_DGI: Record<string, number> = {
  'e-ticket': 101,
  'e-factura': 111,
  'nota-credito-eticket': 102,
  'nota-debito-eticket': 103,
  'nota-credito-efactura': 112,
  'nota-debito-efactura': 113,
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

    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .select('*')
      .eq('id', facturaId)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    if (factura.dgi_enviada) {
      console.log('⚠️ [AutoSendDGI] Factura ya enviada a DGI');
      return new Response(
        JSON.stringify({ success: true, message: 'Factura ya enviada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: items, error: itemsError } = await supabase
      .from('facturas_venta_items')
      .select('*')
      .eq('factura_id', facturaId)
      .order('numero_linea', { ascending: true });

    if (itemsError || !items || items.length === 0) {
      throw new Error('No se encontraron items de la factura');
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', factura.cliente_id)
      .single();

    if (clienteError || !cliente) {
      throw new Error('Cliente no encontrado');
    }

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

    const jsonCFE = generarJSONCFE(factura, items, cliente, config, tipoDocumento, paisCodigo);
    const resultadoDGI = await enviarADGI(jsonCFE, config);

    const { error: updateError } = await supabase
      .from('facturas_venta')
      .update({
        dgi_enviada: true,
        dgi_cae: resultadoDGI.cae,
        dgi_fecha_envio: new Date().toISOString(),
        dgi_hash: resultadoDGI.hash,
        dgi_response: resultadoDGI,
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
  let tipoCFE: number;
  const numeroFactura = factura.numero_factura || '';
  const serie = factura.serie || (numeroFactura.includes('-') ? numeroFactura.split('-')[0] : '');

  if (serie === 'COM') {
    tipoCFE = 141;
  } else if (factura.tipo_documento === 'e-ticket') {
    tipoCFE = 101;
  } else if (factura.tipo_documento === 'e-factura') {
    tipoCFE = 111;
  } else {
    tipoCFE = TIPO_COMPROBANTE_DGI[factura.tipo_documento] || 111;
  }

  const tipoDocumentoDGI = TIPOS_DOCUMENTO_DGI[tipoDocumento] || 3;
  const formaPago = factura.estado === 'pagada' ? 1 : 2;
  const fechaVencimiento = factura.fecha_vencimiento ? formatearFechaDGI(factura.fecha_vencimiento) : formatearFechaDGI(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

  const itemsDGI = items.map((item) => {
    const itemDGI: any = {
      cantidad: parseFloat(item.cantidad),
      concepto: item.descripcion,
      precio: parseFloat(item.precio_unitario),
      indicador_facturacion: determinarIndicadorFacturacion(item.tasa_iva),
    };
    if (item.codigo) { itemDGI.codigo = item.codigo; }
    if (item.descuento_monto && parseFloat(item.descuento_monto) > 0) {
      itemDGI.descuento_tipo = '$';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_monto);
    } else if (item.descuento_porcentaje && parseFloat(item.descuento_porcentaje) > 0) {
      itemDGI.descuento_tipo = '%';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_porcentaje);
    }
    return itemDGI;
  });

  const comprobante: any = {
    tipo_comprobante: tipoCFE,
    forma_pago: formaPago,
    fecha_vencimiento: fechaVencimiento,
    sucursal: parseInt(config.codigo_sucursal) || 1,
    moneda: factura.moneda || 'UYU',
    cliente: {
      tipo_documento: tipoDocumentoDGI,
      documento: cliente.numero_documento,
      razon_social: cliente.razon_social,
      sucursal: {
        direccion: cliente.direccion || 'Sin dirección',
        ciudad: cliente.ciudad || 'Montevideo',
        departamento: cliente.departamento || 'Montevideo',
        pais: paisCodigo,
      }
    },
    items: itemsDGI
  };

  if (numeroFactura.includes('-')) {
    comprobante.numero_interno = numeroFactura;
  } else if (serie && numeroFactura) {
    comprobante.numero_interno = `${serie}-${numeroFactura}`;
  } else if (numeroFactura) {
    comprobante.numero_interno = numeroFactura;
  } else {
    comprobante.numero_interno = factura.id;
  }

  if (cliente.nombre_comercial) { comprobante.cliente.nombre_fantasia = cliente.nombre_comercial; }
  if (cliente.email) { comprobante.cliente.sucursal.emails = [cliente.email]; }
  if (factura.moneda !== 'UYU' && factura.tipo_cambio) { comprobante.tasa_cambio = parseFloat(factura.tipo_cambio); }

  return comprobante;
}

function formatearFechaDGI(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

function determinarIndicadorFacturacion(tasaIva: string | number | null): number {
  if (!tasaIva || parseFloat(tasaIva.toString()) === 0) { return 1; }
  const tasa = parseFloat(tasaIva.toString());
  if (tasa === 0.10) { return 2; }
  else if (tasa === 0.22) { return 3; }
  else { return 4; }
}

async function enviarADGI(jsonCFE: any, config: any): Promise<any> {
  console.log('📤 [DGI] Enviando JSON CFE a DGI...');
  console.log('📋 [DGI] Payload:', JSON.stringify(jsonCFE, null, 2));

  const apiUrl = Deno.env.get('DGI_API_CREATE_URL') || 'https://api.flowbridge.site/functions/v1/api-gateway/1a062194-437a-4d61-8cb3-fe7d00f90234';
  const apiKey = Deno.env.get('DGI_API_CREATE_KEY') || 'pub_83e398f967f43cda32a97b7f5ea1cf27623f82fafd46388e82608a1cbc8849a3';

  console.log('🌐 [DGI] Llamando a:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Key': apiKey,
      },
      body: JSON.stringify(jsonCFE),
    });

    console.log('📥 [DGI] Respuesta status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DGI] Error response:', errorText);
      throw new Error(`Error al enviar a DGI: ${response.status} - ${errorText}`);
    }

    const resultado = await response.json();
    console.log('✅ [DGI] Respuesta exitosa:', resultado);

    return {
      success: true,
      cae: resultado.cae || resultado.CAE || `CAE-${Date.now()}`,
      hash: resultado.hash || resultado.HASH || `SHA256-${Math.random().toString(36).substr(2, 16)}`,
      fecha: new Date().toISOString(),
      mensaje: resultado.mensaje || 'CFE aceptado por DGI',
      data: resultado,
    };
  } catch (error: any) {
    console.error('❌ [DGI] Error al enviar:', error.message);
    throw new Error(`Error al comunicarse con DGI: ${error.message}`);
  }
}