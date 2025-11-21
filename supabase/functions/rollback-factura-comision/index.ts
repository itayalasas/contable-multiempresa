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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });

    const { facturaId } = await req.json();

    console.log('🔄 [Rollback] Iniciando rollback de factura:', facturaId);

    // 1. Obtener la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .select('*')
      .eq('id', facturaId)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    // 2. Validar que sea una factura de comisión (validar por serie)
    const serie = factura.serie || '';
    const esFacturaComision = serie === 'COM';

    if (!esFacturaComision) {
      throw new Error('Solo se pueden hacer rollback de facturas de comisiones (serie COM)');
    }

    console.log('📋 [Rollback] Factura válida:', `${serie}-${factura.numero_factura}`);

    // 3. Eliminar asiento contable si existe
    if (factura.asiento_contable_id) {
      console.log('🗑️ [Rollback] Eliminando asiento contable:', factura.asiento_contable_id);

      // Eliminar movimientos del asiento
      const { error: movError } = await supabase
        .from('asientos_contables_movimientos')
        .delete()
        .eq('asiento_id', factura.asiento_contable_id);

      if (movError) {
        console.error('❌ [Rollback] Error eliminando movimientos:', movError);
        throw new Error('Error eliminando movimientos del asiento');
      }

      // Eliminar asiento
      const { error: asientoError } = await supabase
        .from('asientos_contables')
        .delete()
        .eq('id', factura.asiento_contable_id);

      if (asientoError) {
        console.error('❌ [Rollback] Error eliminando asiento:', asientoError);
        throw new Error('Error eliminando asiento contable');
      }

      console.log('✅ [Rollback] Asiento eliminado exitosamente');
    }

    // 4. Revertir comisiones a estado pendiente
    const { data: comisiones, error: comisionesError } = await supabase
      .from('partners_comisiones')
      .select('id')
      .eq('factura_venta_comision_id', facturaId);

    if (comisionesError) {
      console.error('❌ [Rollback] Error obteniendo comisiones:', comisionesError);
      throw new Error('Error obteniendo comisiones');
    }

    if (comisiones && comisiones.length > 0) {
      console.log(`🔄 [Rollback] Revirtiendo ${comisiones.length} comisiones a pendiente`);

      const { error: updateComisionesError } = await supabase
        .from('partners_comisiones')
        .update({
          estado: 'pendiente',
          factura_venta_comision_id: null,
          fecha_facturacion: null,
        })
        .eq('factura_venta_comision_id', facturaId);

      if (updateComisionesError) {
        console.error('❌ [Rollback] Error actualizando comisiones:', updateComisionesError);
        throw new Error('Error revirtiendo comisiones');
      }

      console.log('✅ [Rollback] Comisiones revertidas a pendiente');
    }

    // 5. Eliminar items de la factura
    console.log('🗑️ [Rollback] Eliminando items de la factura');
    const { error: itemsError } = await supabase
      .from('facturas_venta_items')
      .delete()
      .eq('factura_id', facturaId);

    if (itemsError) {
      console.error('❌ [Rollback] Error eliminando items:', itemsError);
      throw new Error('Error eliminando items de la factura');
    }

    // 6. Eliminar la factura
    console.log('🗑️ [Rollback] Eliminando factura');
    const { error: deleteError } = await supabase
      .from('facturas_venta')
      .delete()
      .eq('id', facturaId);

    if (deleteError) {
      console.error('❌ [Rollback] Error eliminando factura:', deleteError);
      throw new Error('Error eliminando factura');
    }

    console.log('✅ [Rollback] Rollback completado exitosamente');

    return new Response(
      JSON.stringify({
        success: true,
        mensaje: 'Rollback completado exitosamente',
        detalles: {
          facturaEliminada: `${factura.serie}-${factura.numero_factura}`,
          asientoEliminado: !!factura.asiento_contable_id,
          comisionesRevertidas: comisiones?.length || 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [Rollback] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
