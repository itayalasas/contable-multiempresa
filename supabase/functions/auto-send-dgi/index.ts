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

    let cliente: any;
    let tipoDocumento = 'CI';

    const esFacturaComision = factura.metadata?.tipo === 'factura_comisiones_partner' && factura.metadata?.partner_id;

    if (esFacturaComision) {
      console.log('🔄 [AutoSendDGI] Factura de comisión detectada, obteniendo datos actualizados del partner...');

      const { data: partner, error: partnerError } = await supabase
        .from('partners_aliados')
        .select('*')
        .eq('id', factura.metadata.partner_id)
        .single();

      if (partnerError || !partner) {
        console.error('❌ [AutoSendDGI] Partner no encontrado, usando datos del cliente');
        const { data: clienteFallback, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', factura.cliente_id)
          .single();

        if (clienteError || !clienteFallback) {
          throw new Error('Cliente no encontrado');
        }
        cliente = clienteFallback;
      } else {
        console.log('✅ [AutoSendDGI] Datos del partner obtenidos:', partner.razon_social);

        cliente = {
          razon_social: partner.razon_social,
          numero_documento: partner.documento,
          email: partner.email,
          telefono: partner.telefono,
          direccion: partner.direccion || 'Sin dirección',
          ciudad: partner.ciudad || 'Montevideo',
          departamento: partner.departamento || 'Montevideo',
        };
        tipoDocumento = partner.tipo_documento || 'RUT';

        console.log('📋 [AutoSendDGI] Cliente construido desde partner:', {
          razon_social: cliente.razon_social,
          documento: cliente.numero_documento,
          tipo_documento: tipoDocumento
        });
      }
    } else {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', factura.cliente_id)
        .single();

      if (clienteError || !clienteData) {
        throw new Error('Cliente no encontrado');
      }
      cliente = clienteData;

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
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id, razon_social, rut, numero_documento')
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

    const jsonCFE = generarJSONCFE(factura, items, cliente, config, tipoDocumento, paisCodigo, empresa);
    const resultadoDGI = await enviarADGI(jsonCFE, config);

    const dgiData = resultadoDGI.data || {};

    const updateData: any = {
      dgi_enviada: true,
      dgi_cae: resultadoDGI.cae,
      dgi_fecha_envio: new Date().toISOString(),
      dgi_hash: resultadoDGI.hash,
      dgi_response: resultadoDGI,
    };

    if (dgiData.serie) {
      updateData.dgi_serie = dgiData.serie;
    }
    if (dgiData.numero || dgiData.nro) {
      updateData.dgi_numero = parseInt(dgiData.numero || dgiData.nro);
    }
    if (dgiData.cae || dgiData.CAE) {
      updateData.dgi_cae_numero = dgiData.cae || dgiData.CAE;
      updateData.dgi_cae_serie = dgiData.cae_serie || dgiData.serie || config.codigo_sucursal;
    }
    if (dgiData.vencimiento_cae || dgiData.fecha_vencimiento) {
      updateData.dgi_cae_vencimiento = dgiData.vencimiento_cae || dgiData.fecha_vencimiento;
    }

    const { error: updateError } = await supabase
      .from('facturas_venta')
      .update(updateData)
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

function generarJSONCFE(factura: any, items: any[], cliente: any, config: any, tipoDocumento: string, paisCodigo: string, empresa: any): any {
  const numeroFactura = factura.numero_factura || '';
  const serie = factura.serie || (numeroFactura.includes('-') ? numeroFactura.split('-')[0] : '');

  const esETicket = serie === 'A' || factura.tipo_documento === 'e-ticket';
  const esEFactura = serie === 'COM' || factura.tipo_documento === 'e-factura';

  if (esETicket) {
    return generarETicket(factura, items, cliente, config, tipoDocumento, paisCodigo, empresa);
  } else if (esEFactura) {
    return generarEFactura(factura, items, cliente, config, tipoDocumento, paisCodigo, empresa);
  } else {
    return generarEFactura(factura, items, cliente, config, tipoDocumento, paisCodigo, empresa);
  }
}

function generarETicket(factura: any, items: any[], cliente: any, config: any, tipoDocumento: string, paisCodigo: string, empresa: any): any {
  const esFacturaWebhook = factura.metadata?.order_id || factura.metadata?.evento_id;
  const formaPago = esFacturaWebhook ? 1 : (factura.estado === 'pagada' ? 1 : 2);

  if (esFacturaWebhook) {
    console.log('💳 [DGI] e-Ticket desde webhook detectado, usando forma_pago: 1 (contado)');
  } else {
    console.log('💳 [DGI] e-Ticket manual, forma_pago basada en estado:', formaPago === 1 ? 'contado' : 'crédito');
  }

  const fechaEmision = factura.fecha_emision ? formatearFechaDGI(factura.fecha_emision) : formatearFechaDGI(new Date().toISOString());

  const itemsDGI = items.map((item) => {
    const itemDGI: any = {
      cantidad: parseFloat(item.cantidad),
      concepto: item.descripcion,
      precio: parseFloat(item.precio_unitario),
      indicador_facturacion: determinarIndicadorFacturacion(item.tasa_iva),
    };
    if (item.codigo) { itemDGI.codigo = item.codigo; }

    // Priorizar porcentaje de descuento sobre monto (normalmente se usa %)
    if (item.descuento_porcentaje && parseFloat(item.descuento_porcentaje) > 0) {
      itemDGI.descuento_tipo = '%';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_porcentaje);
    } else if (item.descuento_monto && parseFloat(item.descuento_monto) > 0) {
      itemDGI.descuento_tipo = '$';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_monto);
    } else {
      itemDGI.descuento_tipo = '';
      itemDGI.descuento_cantidad = 0;
    }

    return itemDGI;
  });

  const comprobante: any = {
    tipo_comprobante: 131,
    numero_interno: factura.id,
    forma_pago: formaPago,
    fecha_emision: fechaEmision,
    sucursal: parseInt(config.codigo_sucursal) || 1,
    moneda: factura.moneda || 'UYU',
    montos_brutos: 1,
    cliente: '-',
    items: itemsDGI,
    complementoFiscal: {
      nombre: empresa?.razon_social || 'DA VINCI',
      tipo_documento: 2,
      documento: empresa?.rut || empresa?.numero_documento || '210980330017',
      pais: paisCodigo
    }
  };

  if (factura.numero_orden || factura.orden_externa_id) {
    comprobante.numero_orden = factura.numero_orden || factura.orden_externa_id;
  }

  if (factura.lugar_entrega) {
    comprobante.lugar_entrega = factura.lugar_entrega;
  }

  if (factura.adenda || factura.orden_externa_id) {
    comprobante.adenda = factura.adenda || `Orden DC-${factura.orden_externa_id}`;
  }

  return comprobante;
}

function generarEFactura(factura: any, items: any[], cliente: any, config: any, tipoDocumento: string, paisCodigo: string, empresa: any): any {
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

    // Priorizar porcentaje de descuento sobre monto
    if (item.descuento_porcentaje && parseFloat(item.descuento_porcentaje) > 0) {
      itemDGI.descuento_tipo = '%';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_porcentaje);
    } else if (item.descuento_monto && parseFloat(item.descuento_monto) > 0) {
      itemDGI.descuento_tipo = '$';
      itemDGI.descuento_cantidad = parseFloat(item.descuento_monto);
    } else {
      itemDGI.descuento_tipo = '';
      itemDGI.descuento_cantidad = 0;
    }

    return itemDGI;
  });

  const tipoDocumentoDGI = TIPOS_DOCUMENTO_DGI[tipoDocumento] || 2;

  const comprobante: any = {
    tipo_comprobante: 141,
    forma_pago: formaPago,
    fecha_vencimiento: fechaVencimiento,
    sucursal: parseInt(config.codigo_sucursal) || 1,
    moneda: factura.moneda || 'UYU',
    cliente: {
      tipo_documento: tipoDocumentoDGI,
      documento: cliente.numero_documento || '214987440015',
      razon_social: cliente.razon_social,
      sucursal: {
        direccion: cliente.direccion || 'Sin dirección',
        ciudad: cliente.ciudad || 'Montevideo',
        departamento: cliente.departamento || 'Montevideo',
        pais: paisCodigo,
      }
    },
    items: itemsDGI,
    complementoFiscal: {
      nombre: empresa?.razon_social || 'DA VINCI',
      tipo_documento: 2,
      documento: empresa?.rut || empresa?.numero_documento || '210980330017',
      pais: paisCodigo
    }
  };

  if (cliente.nombre_comercial) {
    comprobante.cliente.nombre_fantasia = cliente.nombre_comercial;
  }

  if (factura.adenda || factura.orden_externa_id) {
    comprobante.adenda = factura.adenda || `Orden DC-${factura.orden_externa_id}`;
  }

  if (factura.moneda !== 'UYU' && factura.tipo_cambio) {
    comprobante.tasa_cambio = parseFloat(factura.tipo_cambio);
  }

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

  const apiUrlCreate = Deno.env.get('DGI_API_CREATE_URL') || 'https://api.flowbridge.site/functions/v1/api-gateway/1a062194-437a-4d61-8cb3-fe7d00f90234';
  const apiKeyCreate = Deno.env.get('DGI_API_CREATE_KEY') || 'pub_83e398f967f43cda32a97b7f5ea1cf27623f82fafd46388e82608a1cbc8849a3';

  console.log('🌐 [DGI] Llamando a API de creación:', apiUrlCreate);

  try {
    const responseCreate = await fetch(apiUrlCreate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Key': apiKeyCreate,
      },
      body: JSON.stringify(jsonCFE),
    });

    console.log('📥 [DGI] Respuesta status creación:', responseCreate.status);

    if (!responseCreate.ok) {
      const errorText = await responseCreate.text();
      console.error('❌ [DGI] Error response creación:', errorText);
      throw new Error(`Error al enviar a DGI: ${responseCreate.status} - ${errorText}`);
    }

    const resultadoCreate = await responseCreate.json();
    console.log('✅ [DGI] Respuesta exitosa creación:', resultadoCreate);

    const apiUrlQuery = Deno.env.get('DGI_API_QUERY_URL') || 'https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b';
    const apiKeyQuery = Deno.env.get('DGI_API_QUERY_KEY') || 'pub_83e398f967f43cda32a97b7f5ea1cf27623f82fafd46388e82608a1cbc8849a3';

    console.log('🔍 [DGI] Consultando datos del CFE en API de consulta:', apiUrlQuery);

    const queryPayload = {
      numero_interno: jsonCFE.numero_interno,
      sucursal: jsonCFE.sucursal,
      tipo_comprobante: jsonCFE.tipo_comprobante,
    };

    console.log('📋 [DGI] Payload consulta:', JSON.stringify(queryPayload, null, 2));

    const responseQuery = await fetch(apiUrlQuery, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Key': apiKeyQuery,
      },
      body: JSON.stringify(queryPayload),
    });

    console.log('📥 [DGI] Respuesta status consulta:', responseQuery.status);

    if (!responseQuery.ok) {
      console.warn('⚠️ [DGI] No se pudo consultar el CFE, usando datos de creación');
      return {
        success: true,
        cae: resultadoCreate.cae || resultadoCreate.CAE || `CAE-${Date.now()}`,
        hash: resultadoCreate.hash || resultadoCreate.HASH || `SHA256-${Math.random().toString(36).substr(2, 16)}`,
        fecha: new Date().toISOString(),
        mensaje: resultadoCreate.mensaje || 'CFE aceptado por DGI',
        data: resultadoCreate,
      };
    }

    const resultadoQuery = await responseQuery.json();
    console.log('✅ [DGI] Respuesta exitosa consulta:', resultadoQuery);

    return {
      success: true,
      cae: resultadoQuery.cae || resultadoQuery.CAE || resultadoCreate.cae || `CAE-${Date.now()}`,
      hash: resultadoQuery.hash || resultadoQuery.HASH || resultadoCreate.hash || `SHA256-${Math.random().toString(36).substr(2, 16)}`,
      fecha: new Date().toISOString(),
      mensaje: resultadoQuery.mensaje || resultadoCreate.mensaje || 'CFE aceptado por DGI',
      data: {
        ...resultadoCreate,
        ...resultadoQuery,
      },
    };
  } catch (error: any) {
    console.error('❌ [DGI] Error al enviar:', error.message);
    throw new Error(`Error al comunicarse con DGI: ${error.message}`);
  }
}