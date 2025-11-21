import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
      .select('*, empresa_id, numero_factura')
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
      .eq('activa', true)
      .maybeSingle();

    if (configError || !config) {
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

    // 6. Generar XML CFE
    const xmlCFE = generarXMLCFE(factura, items, cliente, config);

    // 7. Enviar a DGI (simulado por ahora)
    const resultadoDGI = await enviarADGI(xmlCFE, config);

    // 8. Actualizar factura con datos de DGI
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

function generarXMLCFE(factura: any, items: any[], cliente: any, config: any): string {
  // Simplificado - en producción usar librería XML
  const fecha = new Date(factura.fecha_emision).toISOString().split('T')[0];

  const itemsXML = items
    .map(
      (item, idx) => `
    <Item>
      <NroLinDet>${idx + 1}</NroLinDet>
      <CodItem>${item.codigo || 'SERV'}</CodItem>
      <NomItem><![CDATA[${item.descripcion}]]></NomItem>
      <Cantidad>${item.cantidad}</Cantidad>
      <UniMed>Unidad</UniMed>
      <PrecioUnitario>${item.precio_unitario}</PrecioUnitario>
      <MontoItem>${item.total}</MontoItem>
    </Item>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<CFE version="1.0">
  <eFact>
    <TmstFirma>${new Date().toISOString()}</TmstFirma>
    <Encabezado>
      <IdDoc>
        <TipoCFE>101</TipoCFE>
        <Serie>${config.codigo_sucursal}</Serie>
        <Nro>${factura.numero_factura}</Nro>
        <FchEmis>${fecha}</FchEmis>
      </IdDoc>
      <Emisor>
        <RUCEmisor>${config.rut_emisor}</RUCEmisor>
        <RznSoc><![CDATA[${config.razon_social}]]></RznSoc>
        <CdgDGISucur>${config.codigo_sucursal}</CdgDGISucur>
      </Emisor>
      <Receptor>
        <TipoDocRecep>2</TipoDocRecep>
        <CodPaisRecep>UY</CodPaisRecep>
        <DocRecep>${cliente.numero_documento}</DocRecep>
        <RznSocRecep><![CDATA[${cliente.razon_social}]]></RznSocRecep>
        <DirRecep><![CDATA[${cliente.direccion || ''}]]></DirRecep>
      </Receptor>
      <Totales>
        <MntTotal>${factura.total}</MntTotal>
      </Totales>
    </Encabezado>
    <Detalle>
      ${itemsXML}
    </Detalle>
  </eFact>
</CFE>`;
}

async function enviarADGI(xmlCFE: string, config: any): Promise<any> {
  // SIMULADO: En producción conectar con API real de DGI
  console.log('📤 [DGI] Enviando XML CFE...');

  // Simular delay de red
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
  // PRODUCCIÓN: Descomentar y configurar
  const response = await fetch(config.dgi_url_webservice, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'X-API-Key': config.dgi_api_key,
    },
    body: xmlCFE,
  });

  if (!response.ok) {
    throw new Error(`DGI Error: ${response.statusText}`);
  }

  return await response.json();
  */
}
