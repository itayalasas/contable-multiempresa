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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Detectar si es una llamada manual o un trigger automático
    if (body.factura_id) {
      // Llamada manual: { factura_id: string, manual: boolean }
      console.log('🔄 [AsientoManual] Regenerando asiento para factura:', body.factura_id);

      const { data: factura, error: facturaError } = await supabase
        .from('facturas_venta')
        .select('*')
        .eq('id', body.factura_id)
        .single();

      if (facturaError) {
        console.error('❌ [AsientoManual] Error obteniendo factura:', facturaError);
        throw new Error(`No se pudo obtener la factura: ${facturaError.message}`);
      }

      await generarAsientoFacturaVenta(supabase, factura);

      return new Response(
        JSON.stringify({ success: true, message: 'Asiento regenerado exitosamente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Trigger automático: { type: string, record: object }
      const { type, record } = body;
      console.log('🔄 [AsientoAutomatico] Procesando:', type, record.id);

      if (type === 'INSERT' && record.table === 'facturas_venta') {
        await generarAsientoFacturaVenta(supabase, record);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ [AsientoAutomatico] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generarAsientoFacturaVenta(supabase: any, factura: any) {
  try {
    console.log('📝 [Asiento] Generando para factura:', factura.numero_factura);

    // Incrementar contador de intentos
    await supabase
      .from('facturas_venta')
      .update({ asiento_intentos: (factura.asiento_intentos || 0) + 1 })
      .eq('id', factura.id);

    // Obtener período contable correspondiente a la fecha
    const { data: periodo } = await supabase
      .from('periodos_contables')
      .select('id, nombre, estado')
      .eq('empresa_id', factura.empresa_id)
      .lte('fecha_inicio', factura.fecha_emision)
      .gte('fecha_fin', factura.fecha_emision)
      .maybeSingle();

    // Validar si el período está cerrado
    if (periodo && periodo.estado === 'cerrado') {
      const errorMsg = `El período contable ${periodo.nombre} está cerrado. Para contabilizar esta factura, ve a Contabilidad > Períodos Contables y reabre el período.`;
      console.warn('⚠️', errorMsg);

      await supabase
        .from('facturas_venta')
        .update({
          asiento_generado: false,
          asiento_error: errorMsg,
          periodo_contable_id: periodo.id
        })
        .eq('id', factura.id);

      return;
    }

    // Si hay período, guardar la referencia
    if (periodo) {
      await supabase
        .from('facturas_venta')
        .update({ periodo_contable_id: periodo.id })
        .eq('id', factura.id);
    }

    // Obtener datos del cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('razon_social')
      .eq('id', factura.cliente_id)
      .maybeSingle();

    const clienteNombre = cliente?.razon_social || 'Cliente';

    // Obtener empresa para pais_id
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .maybeSingle();

    if (!empresa) {
      console.error('❌ Empresa no encontrada');
      return;
    }

    // Generar número de asiento
    const numeroAsiento = await generarNumeroAsiento(supabase, factura.empresa_id);

    // Obtener IDs de cuentas
    const cuentaCobrarId = await obtenerCuentaId(supabase, factura.empresa_id, '1212');
    const cuentaVentasId = await obtenerCuentaId(supabase, factura.empresa_id, '7011');
    const cuentaIvaId = await obtenerCuentaId(supabase, factura.empresa_id, '2113');

    if (!cuentaCobrarId || !cuentaVentasId || !cuentaIvaId) {
      const cuentasFaltantes = [];
      if (!cuentaCobrarId) cuentasFaltantes.push('1212 (Cuentas por Cobrar)');
      if (!cuentaVentasId) cuentasFaltantes.push('7011 (Ventas)');
      if (!cuentaIvaId) cuentasFaltantes.push('2113 (IVA por Pagar)');

      const errorMsg = `Faltan cuentas en el plan de cuentas: ${cuentasFaltantes.join(', ')}`;
      console.error('❌', errorMsg);

      // Guardar error en la factura
      await supabase
        .from('facturas_venta')
        .update({
          asiento_generado: false,
          asiento_error: errorMsg
        })
        .eq('id', factura.id);

      return;
    }

    // Usar el usuario Sistema para operaciones automáticas
    const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';

    // Crear asiento
    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        empresa_id: factura.empresa_id,
        pais_id: empresa.pais_id,
        numero: numeroAsiento,
        fecha: factura.fecha_emision,
        descripcion: `Factura de Venta ${factura.numero_factura} - ${clienteNombre}`,
        referencia: `FACT-${factura.numero_factura}`,
        estado: 'confirmado',
        creado_por: SISTEMA_USER_ID,
        documento_soporte: {
          tipo: 'factura_venta',
          id: factura.id,
          numero: factura.numero_factura,
        },
      })
      .select()
      .single();

    if (asientoError) {
      console.error('❌ Error creando asiento:', asientoError);
      return;
    }

    console.log('✅ Asiento creado:', asiento.id);

    // Crear movimientos contables
    // IMPORTANTE: Calcular IVA como diferencia para evitar descuadres por redondeo
    const total = parseFloat(factura.total);
    const subtotal = parseFloat(factura.subtotal);
    const iva = total - subtotal; // ✅ Calculado como diferencia para cuadrar perfectamente

    const movimientos = [
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaCobrarId,
        cuenta: '1212 - Cuentas por Cobrar - Comerciales',
        debito: total,
        credito: 0,
        descripcion: `Factura ${factura.numero_factura} - ${clienteNombre}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaVentasId,
        cuenta: '7011 - Ventas',
        debito: 0,
        credito: subtotal,
        descripcion: `Factura ${factura.numero_factura} - ${clienteNombre}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaIvaId,
        cuenta: '2113 - IVA por Pagar',
        debito: 0,
        credito: iva, // ✅ Usa el IVA calculado como diferencia
        descripcion: `IVA Factura ${factura.numero_factura}`,
      },
    ];

    const { error: movError } = await supabase
      .from('movimientos_contables')
      .insert(movimientos);

    if (movError) {
      console.error('❌ Error insertando movimientos:', movError);
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);

      const errorMsg = movError.message || JSON.stringify(movError);
      await supabase
        .from('facturas_venta')
        .update({
          asiento_generado: false,
          asiento_error: errorMsg.substring(0, 500)
        })
        .eq('id', factura.id);

      return;
    }

    // Marcar como exitoso
    await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: true,
        asiento_contable_id: asiento.id,
        asiento_error: null
      })
      .eq('id', factura.id);

    console.log('✅ Asiento contable generado exitosamente:', numeroAsiento);
  } catch (error) {
    console.error('❌ Error generando asiento:', error);

    // Guardar el error en la factura
    const errorMsg = error.message || JSON.stringify(error);
    await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: false,
        asiento_error: errorMsg.substring(0, 500)
      })
      .eq('id', factura.id);
  }
}

async function generarNumeroAsiento(supabase: any, empresaId: string): Promise<string> {
  try {
    const { data: ultimoAsiento } = await supabase
      .from('asientos_contables')
      .select('numero')
      .eq('empresa_id', empresaId)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ultimoAsiento) {
      return 'ASI-00001';
    }

    const match = ultimoAsiento.numero.match(/ASI-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const nextNumero = num + 1;
      return `ASI-${String(nextNumero).padStart(5, '0')}`;
    }

    return `ASI-${Date.now().toString().slice(-5)}`;
  } catch (error) {
    console.error('Error generando número de asiento:', error);
    return `ASI-${Date.now().toString().slice(-5)}`;
  }
}

async function obtenerCuentaId(supabase: any, empresaId: string, codigo: string): Promise<string | null> {
  try {
    const { data: cuenta } = await supabase
      .from('plan_cuentas')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
      .eq('codigo', codigo)
      .maybeSingle();

    if (!cuenta) {
      console.warn(`⚠️ No se encontró cuenta ${codigo} para empresa ${empresaId}`);
      return null;
    }

    return cuenta.id;
  } catch (error) {
    console.warn(`⚠️ Error buscando cuenta ${codigo}:`, error);
    return null;
  }
}
