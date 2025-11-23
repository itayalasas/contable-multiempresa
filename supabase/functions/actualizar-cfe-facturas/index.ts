import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    console.log('🔄 [ActualizarCFE] Iniciando actualización de facturas...');

    const { data: facturas, error: facturasError } = await supabase
      .from('facturas_venta')
      .select('id, dgi_response')
      .eq('dgi_enviada', true)
      .or('dgi_cae_numero.is.null,dgi_cae_vencimiento.is.null');

    if (facturasError) {
      throw facturasError;
    }

    if (!facturas || facturas.length === 0) {
      console.log('✅ [ActualizarCFE] No hay facturas para actualizar');
      return new Response(
        JSON.stringify({
          success: true,
          mensaje: 'No hay facturas para actualizar',
          actualizadas: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [ActualizarCFE] Encontradas ${facturas.length} facturas para actualizar`);

    const apiUrlQuery = Deno.env.get('DGI_API_QUERY_URL') || 'https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b';
    const apiKeyQuery = Deno.env.get('DGI_API_QUERY_KEY') || 'pub_90e731b2639b030baad40d14f7622afb10dfb10b1b05933d7b67fc920f3fb734';

    let actualizadas = 0;
    let errores = 0;

    for (const factura of facturas) {
      try {
        let dgiId = null;

        if (factura.dgi_response && factura.dgi_response.data) {
          dgiId = factura.dgi_response.data.id;
        }

        if (!dgiId) {
          console.warn(`⚠️ [ActualizarCFE] Factura ${factura.id}: No tiene ID de DGI`);
          errores++;
          continue;
        }

        console.log(`🔍 [ActualizarCFE] Consultando factura ${factura.id} con ID DGI: ${dgiId}`);

        const url = `${apiUrlQuery}?id=${dgiId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Integration-Key': apiKeyQuery,
          },
        });

        if (!response.ok) {
          console.error(`❌ [ActualizarCFE] Error al consultar factura ${factura.id}: ${response.status}`);
          errores++;
          continue;
        }

        const resultado = await response.json();
        console.log(`✅ [ActualizarCFE] Datos obtenidos para factura ${factura.id}:`, resultado);

        const updateData: any = {};

        if (resultado.serie) {
          updateData.dgi_serie = resultado.serie;
        }
        if (resultado.numero || resultado.nro) {
          updateData.dgi_numero = parseInt(resultado.numero || resultado.nro);
        }
        if (resultado.cae || resultado.CAE) {
          updateData.dgi_cae_numero = resultado.cae || resultado.CAE;
          updateData.dgi_cae_serie = resultado.cae_serie || resultado.serie;
        }
        if (resultado.vencimiento_cae || resultado.fecha_vencimiento) {
          updateData.dgi_cae_vencimiento = resultado.vencimiento_cae || resultado.fecha_vencimiento;
        }
        if (resultado.hash || resultado.HASH) {
          updateData.dgi_hash = resultado.hash || resultado.HASH;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.dgi_response = {
            ...factura.dgi_response,
            data: {
              ...(factura.dgi_response?.data || {}),
              ...resultado,
            },
          };

          const { error: updateError } = await supabase
            .from('facturas_venta')
            .update(updateData)
            .eq('id', factura.id);

          if (updateError) {
            console.error(`❌ [ActualizarCFE] Error al actualizar factura ${factura.id}:`, updateError);
            errores++;
          } else {
            console.log(`✅ [ActualizarCFE] Factura ${factura.id} actualizada correctamente`);
            actualizadas++;
          }
        } else {
          console.warn(`⚠️ [ActualizarCFE] Factura ${factura.id}: No hay datos para actualizar`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`❌ [ActualizarCFE] Error procesando factura ${factura.id}:`, error.message);
        errores++;
      }
    }

    console.log(`✅ [ActualizarCFE] Proceso completado. Actualizadas: ${actualizadas}, Errores: ${errores}`);

    return new Response(
      JSON.stringify({
        success: true,
        mensaje: 'Actualización completada',
        total: facturas.length,
        actualizadas,
        errores,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [ActualizarCFE] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});