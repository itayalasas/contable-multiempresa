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

    const { factura_id, pago } = await req.json();

    if (!factura_id || !pago) {
      throw new Error('Faltan parámetros requeridos: factura_id y pago');
    }

    console.log('💰 [CobroCliente] Procesando cobro para factura:', factura_id);

    // 1. Insertar el cobro en la base de datos
    const { data: pagoData, error: pagoError } = await supabase
      .from('pagos_cliente')
      .insert({
        factura_id: factura_id,
        fecha_pago: pago.fechaPago,
        monto: pago.monto,
        tipo_pago: pago.tipoPago,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        creado_por: pago.creadoPor,
      })
      .select()
      .single();

    if (pagoError) {
      console.error('❌ Error insertando cobro:', pagoError);
      throw new Error(`Error al insertar cobro: ${pagoError.message}`);
    }

    console.log('✅ Cobro insertado:', pagoData.id);

    // 2. Obtener la factura con información del cliente
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .select('*, cliente:clientes(*)')
      .eq('id', factura_id)
      .single();

    if (facturaError || !factura) {
      throw new Error('No se pudo obtener la factura');
    }

    // 3. Calcular pagos totales de esta factura
    const { data: todosLosPagos } = await supabase
      .from('pagos_cliente')
      .select('monto')
      .eq('factura_id', factura_id);

    const totalPagado = todosLosPagos?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0;
    const total = parseFloat(factura.total);
    const saldoPendiente = total - totalPagado;

    // 4. Actualizar estado de la factura
    let nuevoEstado = 'validada';
    if (saldoPendiente <= 0) {
      nuevoEstado = 'pagada';
    } else if (totalPagado > 0) {
      nuevoEstado = 'parcialmente_pagada';
    }

    await supabase
      .from('facturas_venta')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', factura_id);

    console.log(`✅ Factura actualizada: Estado=${nuevoEstado}, Pagado=${totalPagado}/${total}`);

    // 5. Generar asiento contable
    await generarAsientoCobro(supabase, factura, pago, pagoData.id);

    return new Response(
      JSON.stringify({
        success: true,
        pagoId: pagoData.id,
        totalPagado,
        saldoPendiente: Math.max(0, saldoPendiente),
        nuevoEstado,
        message: 'Cobro procesado y asiento contable generado exitosamente'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error procesando cobro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generarAsientoCobro(supabase: any, factura: any, pago: any, pagoId: string) {
  try {
    console.log('📝 [AsientoCobro] Generando asiento para cobro...');

    // Obtener empresa para pais_id
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .maybeSingle();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Determinar la cuenta de destino según el tipo de pago
    let cuentaDestinoCodigo = '1111'; // Efectivo/Caja por defecto

    if (pago.tipoPago === 'TRANSFERENCIA' || pago.tipoPago === 'CHEQUE') {
      cuentaDestinoCodigo = '1112'; // Bancos
    } else if (pago.tipoPago === 'TARJETA_CREDITO') {
      cuentaDestinoCodigo = '1113'; // Tarjetas de Crédito
    }

    // Obtener IDs de cuentas
    const cuentaDestinoId = await obtenerCuentaId(supabase, factura.empresa_id, cuentaDestinoCodigo);
    const cuentaCobrarId = await obtenerCuentaId(supabase, factura.empresa_id, '1212'); // Cuentas por Cobrar

    if (!cuentaDestinoId || !cuentaCobrarId) {
      const cuentasFaltantes = [];
      if (!cuentaDestinoId) cuentasFaltantes.push(`${cuentaDestinoCodigo} (${pago.tipoPago})`);
      if (!cuentaCobrarId) cuentasFaltantes.push('1212 (Cuentas por Cobrar)');

      throw new Error(`Faltan cuentas en el plan de cuentas: ${cuentasFaltantes.join(', ')}`);
    }

    // Generar número de asiento
    const numeroAsiento = await generarNumeroAsiento(supabase, factura.empresa_id);

    const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';

    // Crear asiento
    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        empresa_id: factura.empresa_id,
        pais_id: empresa.pais_id,
        numero: numeroAsiento,
        fecha: pago.fechaPago,
        descripcion: `Cobro Factura ${factura.numero_factura} - ${factura.cliente?.razon_social || 'Cliente'}`,
        referencia: `COBRO-${factura.numero_factura}`,
        estado: 'confirmado',
        creado_por: SISTEMA_USER_ID,
        documento_soporte: {
          tipo: 'cobro_cliente',
          factura_id: factura.id,
          pago_id: pagoId,
          numero: factura.numero_factura,
        },
      })
      .select()
      .single();

    if (asientoError) {
      console.error('❌ Error creando asiento:', asientoError);
      throw new Error(`Error al crear asiento: ${asientoError.message}`);
    }

    console.log('✅ Asiento creado:', asiento.id);

    // Crear movimientos contables
    const monto = pago.monto;

    const movimientos = [
      // DEBE: Banco/Caja (entra dinero)
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaDestinoId,
        cuenta: `${cuentaDestinoCodigo} - ${pago.tipoPago === 'EFECTIVO' ? 'Caja' : 'Bancos'}`,
        debito: monto,
        credito: 0,
        descripcion: `Cobro ${factura.numero_factura} - ${pago.tipoPago}`,
      },
      // HABER: Cuentas por Cobrar (se reduce el activo)
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaCobrarId,
        cuenta: '1212 - Cuentas por Cobrar - Comerciales',
        debito: 0,
        credito: monto,
        descripcion: `Cobro ${factura.numero_factura} - ${factura.cliente?.razon_social || 'Cliente'}`,
      },
    ];

    const { error: movError } = await supabase
      .from('movimientos_contables')
      .insert(movimientos);

    if (movError) {
      console.error('❌ Error insertando movimientos:', movError);

      // Eliminar asiento si falla la inserción de movimientos
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);

      throw new Error(`Error al insertar movimientos: ${movError.message}`);
    }

    // Guardar referencia del asiento en el pago
    await supabase
      .from('pagos_cliente')
      .update({ asiento_contable_id: asiento.id })
      .eq('id', pagoId);

    console.log(`✅ Asiento contable ${numeroAsiento} generado exitosamente`);

  } catch (error) {
    console.error('❌ Error generando asiento de cobro:', error);
    throw error;
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