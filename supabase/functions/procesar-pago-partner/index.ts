import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Edge Function: procesar-pago-partner
 *
 * Procesa el pago de una cuenta por pagar a un partner y genera todos los asientos contables necesarios.
 *
 * Flujo:
 * 1. Verifica la cuenta por pagar y la factura de compra asociada
 * 2. Registra el pago en pagos_proveedor
 * 3. Actualiza el saldo de la cuenta por pagar
 * 4. Marca las comisiones como pagadas
 * 5. Genera asiento contable del pago:
 *
 *    DEBE:
 *    - Cuentas por Pagar (2211): Monto transferido
 *
 *    HABER:
 *    - Banco/Caja (1111 o cuenta especificada): Monto transferido
 *
 * Este asiento cierra la cuenta por pagar y registra la salida de dinero.
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      cuentaPorPagarId,
      monto,
      fecha_pago,
      tipo_pago,
      cuentaBancariaId,
      referencia,
      observaciones,
      usuarioId
    } = body;

    if (!cuentaPorPagarId || !monto || !fecha_pago || !tipo_pago) {
      throw new Error('Datos incompletos: cuentaPorPagarId, monto, fecha_pago y tipo_pago son requeridos');
    }

    console.log('💰 Procesando pago de cuenta por pagar:', cuentaPorPagarId);

    // 1. Obtener cuenta por pagar
    const { data: cuentaPorPagar, error: cuentaError } = await supabase
      .from('facturas_por_pagar')
      .select('*')
      .eq('id', cuentaPorPagarId)
      .single();

    if (cuentaError || !cuentaPorPagar) {
      throw new Error(`Cuenta por pagar no encontrada: ${cuentaError?.message}`);
    }

    if (cuentaPorPagar.estado === 'PAGADA') {
      throw new Error('La cuenta por pagar ya está pagada');
    }

    const montoFloat = parseFloat(monto);
    const saldoPendiente = parseFloat(cuentaPorPagar.saldo_pendiente);

    if (montoFloat > saldoPendiente) {
      throw new Error(`El monto del pago ($${montoFloat}) excede el saldo pendiente ($${saldoPendiente})`);
    }

    // 2. Obtener factura de compra asociada
    const { data: facturaCompra } = await supabase
      .from('facturas_compra')
      .select('*')
      .eq('id', cuentaPorPagar.referencia)
      .maybeSingle();

    if (!facturaCompra) {
      throw new Error('No se encontró la factura de compra asociada');
    }

    // 3. Verificar período contable
    const { data: periodo } = await supabase
      .from('periodos_contables')
      .select('id, nombre, estado')
      .eq('empresa_id', cuentaPorPagar.empresa_id)
      .lte('fecha_inicio', fecha_pago)
      .gte('fecha_fin', fecha_pago)
      .maybeSingle();

    if (periodo && periodo.estado === 'cerrado') {
      throw new Error(`El período contable ${periodo.nombre} está cerrado`);
    }

    // 4. Registrar pago
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_proveedor')
      .insert({
        factura_id: cuentaPorPagarId,
        fecha_pago: fecha_pago,
        monto: montoFloat,
        tipo_pago: tipo_pago,
        referencia: referencia || null,
        observaciones: observaciones || null,
        creado_por: usuarioId || 'system',
      })
      .select()
      .single();

    if (pagoError) throw pagoError;

    console.log('✅ Pago registrado:', pago.id);

    // 5. Actualizar cuenta por pagar
    const montoPagadoNuevo = parseFloat(cuentaPorPagar.monto_pagado) + montoFloat;
    const saldoNuevo = parseFloat(cuentaPorPagar.monto_total) - montoPagadoNuevo;
    const estadoNuevo = saldoNuevo <= 0.01 ? 'PAGADA' : (montoPagadoNuevo > 0 ? 'PARCIAL' : 'PENDIENTE');

    const { error: updateCuentaError } = await supabase
      .from('facturas_por_pagar')
      .update({
        monto_pagado: montoPagadoNuevo,
        saldo_pendiente: saldoNuevo,
        estado: estadoNuevo,
        fecha_modificacion: new Date().toISOString(),
      })
      .eq('id', cuentaPorPagarId);

    if (updateCuentaError) throw updateCuentaError;

    console.log(`✅ Cuenta por pagar actualizada: Estado=${estadoNuevo}, Saldo=${saldoNuevo.toFixed(2)}`);

    // 6. Si es pago total, actualizar estado de factura de compra y comisiones
    if (estadoNuevo === 'PAGADA') {
      // Actualizar factura de compra
      await supabase
        .from('facturas_compra')
        .update({ estado: 'pagada' })
        .eq('id', facturaCompra.id);

      // Si es factura de partner, actualizar comisiones
      if (facturaCompra.tipo_factura_compra === 'partner_pago' && facturaCompra.metadata?.comisiones_ids) {
        const comisionesIds = facturaCompra.metadata.comisiones_ids;

        const { error: comisionesError } = await supabase
          .from('comisiones_partners')
          .update({
            estado_pago: 'pagada',
            fecha_pagada: new Date().toISOString(),
          })
          .in('id', comisionesIds);

        if (comisionesError) {
          console.error('⚠️ Error actualizando comisiones:', comisionesError);
        } else {
          console.log(`✅ ${comisionesIds.length} comisiones marcadas como pagadas`);
        }
      }
    }

    // 7. Generar asiento contable del pago
    await generarAsientoPago(
      supabase,
      cuentaPorPagar,
      facturaCompra,
      pago,
      montoFloat,
      cuentaBancariaId,
      periodo?.id
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pago procesado exitosamente',
        pago_id: pago.id,
        estado_cuenta: estadoNuevo,
        saldo_pendiente: saldoNuevo,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generarAsientoPago(
  supabase: any,
  cuentaPorPagar: any,
  facturaCompra: any,
  pago: any,
  monto: number,
  cuentaBancariaId: string | undefined,
  periodoId?: string
) {
  console.log('📝 Generando asiento contable del pago');

  // Obtener proveedor
  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('razon_social')
    .eq('id', cuentaPorPagar.proveedor_id)
    .maybeSingle();

  const proveedorNombre = proveedor?.razon_social || 'Proveedor';

  // Cuentas necesarias
  const cuentaPagarId = await obtenerCuentaId(supabase, cuentaPorPagar.empresa_id, '2211'); // Cuentas por pagar

  // Cuenta de banco/caja
  let cuentaBancoId: string | null = null;
  if (cuentaBancariaId) {
    // Si se especificó cuenta bancaria, obtener su cuenta contable
    const { data: cuentaBancaria } = await supabase
      .from('cuentas_bancarias')
      .select('cuenta_contable_id')
      .eq('id', cuentaBancariaId)
      .maybeSingle();

    cuentaBancoId = cuentaBancaria?.cuenta_contable_id || null;
  }

  // Si no hay cuenta bancaria específica, usar cuenta general de bancos
  if (!cuentaBancoId) {
    cuentaBancoId = await obtenerCuentaId(supabase, cuentaPorPagar.empresa_id, '1111'); // Bancos
  }

  if (!cuentaPagarId || !cuentaBancoId) {
    const faltantes = [];
    if (!cuentaPagarId) faltantes.push('2211 (Cuentas por Pagar)');
    if (!cuentaBancoId) faltantes.push('1111 (Bancos)');
    throw new Error(`Faltan cuentas: ${faltantes.join(', ')}`);
  }

  // Generar número de asiento
  const numeroAsiento = await generarNumeroAsiento(supabase, cuentaPorPagar.empresa_id);

  // Crear asiento
  const { data: asiento, error: asientoError } = await supabase
    .from('asientos_contables')
    .insert({
      empresa_id: cuentaPorPagar.empresa_id,
      numero_asiento: numeroAsiento,
      fecha: pago.fecha_pago,
      tipo_asiento: 'PAGO',
      descripcion: `Pago ${cuentaPorPagar.numero} - ${proveedorNombre}`,
      referencia: `PAGO-${cuentaPorPagar.numero}`,
      estado: 'APROBADO',
      periodo_contable_id: periodoId,
      metadata: {
        tipo: 'pago_proveedor',
        pago_id: pago.id,
        cuenta_por_pagar_id: cuentaPorPagar.id,
        factura_compra_id: facturaCompra.id,
        tipo_pago: pago.tipo_pago,
      },
    })
    .select()
    .single();

  if (asientoError) throw asientoError;

  // Crear detalle del asiento
  // DEBE: Cuentas por Pagar (disminuye el pasivo)
  // HABER: Banco/Caja (sale dinero)
  const detalles = [
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaPagarId,
      tipo_movimiento: 'DEBE',
      monto: monto,
      descripcion: `Pago a ${proveedorNombre}`,
    },
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaBancoId,
      tipo_movimiento: 'HABER',
      monto: monto,
      descripcion: `Transferencia a ${proveedorNombre}`,
    },
  ];

  const { error: detalleError } = await supabase
    .from('asientos_contables_detalle')
    .insert(detalles);

  if (detalleError) throw detalleError;

  console.log(`✅ Asiento contable ${numeroAsiento} generado para pago`);
}

async function generarNumeroAsiento(supabase: any, empresaId: string): Promise<string> {
  const anio = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');

  const { data, error } = await supabase
    .from('asientos_contables')
    .select('numero_asiento')
    .eq('empresa_id', empresaId)
    .order('numero_asiento', { ascending: false })
    .limit(1);

  if (error) throw error;

  let siguienteNumero = 1;
  if (data && data.length > 0) {
    const ultimoNumero = parseInt(data[0].numero_asiento.split('-').pop() || '0');
    siguienteNumero = ultimoNumero + 1;
  }

  return `${anio}-${mes}-${String(siguienteNumero).padStart(4, '0')}`;
}

async function obtenerCuentaId(supabase: any, empresaId: string, codigo: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('plan_cuentas')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) {
    console.error(`Error obteniendo cuenta ${codigo}:`, error);
    return null;
  }

  return data?.id || null;
}
