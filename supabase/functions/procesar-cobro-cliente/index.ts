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

    // 5. Generar asiento contable (si está configurado)
    let asientoId = null;
    let mensajeAsiento = '';
    try {
      asientoId = await generarAsientoCobro(supabase, factura, pago, pagoData.id);
      mensajeAsiento = 'con asiento contable';
    } catch (asientoError) {
      console.warn('⚠️ No se pudo generar asiento contable:', asientoError.message);
      mensajeAsiento = 'sin asiento (configurar plan de cuentas)';
    }

    // 6. Registrar movimiento en tesorería (actualiza saldo automáticamente)
    try {
      await registrarMovimientoTesoreria(supabase, factura, pago, pagoData.id, asientoId);
    } catch (tesoreriaError) {
      console.warn('⚠️ No se pudo registrar movimiento de tesorería:', tesoreriaError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pagoId: pagoData.id,
        totalPagado,
        saldoPendiente: Math.max(0, saldoPendiente),
        nuevoEstado,
        message: `Cobro procesado exitosamente ${mensajeAsiento}`
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
    let cuentaDestinoCodigo = '111101'; // Efectivo/Caja por defecto
    let nombreCuentaDestino = 'Caja - Efectivo';

    if (pago.tipoPago === 'TRANSFERENCIA') {
      cuentaDestinoCodigo = '112101'; // Bancos - Transferencias
      nombreCuentaDestino = 'Bancos - Transferencias';
    } else if (pago.tipoPago === 'CHEQUE') {
      cuentaDestinoCodigo = '112102'; // Bancos - Cheques
      nombreCuentaDestino = 'Bancos - Cheques';
    } else if (pago.tipoPago === 'TARJETA_CREDITO') {
      cuentaDestinoCodigo = '113101'; // Tarjetas de Crédito
      nombreCuentaDestino = 'Tarjetas de Crédito';
    }

    // Obtener IDs de cuentas
    const cuentaDestinoId = await obtenerCuentaId(supabase, factura.empresa_id, cuentaDestinoCodigo);
    const cuentaCobrarId = await obtenerCuentaId(supabase, factura.empresa_id, '121201'); // Cuentas por Cobrar - Clientes

    if (!cuentaDestinoId || !cuentaCobrarId) {
      const cuentasFaltantes = [];
      if (!cuentaDestinoId) cuentasFaltantes.push(`${cuentaDestinoCodigo} (${pago.tipoPago})`);
      if (!cuentaCobrarId) cuentasFaltantes.push('121201 (Cuentas por Cobrar - Clientes)');

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
    const comisionMP = parseFloat(factura.comision_mp_monto || 0);
    const ingresoNeto = parseFloat(factura.ingreso_neto || monto);

    const movimientos = [];

    // DEBE: Banco/Caja (entra el dinero real, después de comisión MP)
    movimientos.push({
      asiento_id: asiento.id,
      cuenta_id: cuentaDestinoId,
      cuenta: `${cuentaDestinoCodigo} - ${nombreCuentaDestino}`,
      debito: comisionMP > 0 ? ingresoNeto : monto,
      credito: 0,
      descripcion: `Cobro ${factura.numero_factura} - ${pago.tipoPago}`,
    });

    // DEBE: Gastos Comisión MP (si hay comisión de Mercado Pago)
    if (comisionMP > 0) {
      const cuentaGastoMPId = await obtenerCuentaId(supabase, factura.empresa_id, '630501');
      if (cuentaGastoMPId) {
        movimientos.push({
          asiento_id: asiento.id,
          cuenta_id: cuentaGastoMPId,
          cuenta: '630501 - Gastos Comisiones Mercado Pago',
          debito: comisionMP,
          credito: 0,
          descripcion: `Comisión MP ${factura.comision_mp_porcentaje}% - Factura ${factura.numero_factura}`,
        });
        console.log(`💳 [ComisionMP] Registrando gasto: $${comisionMP.toFixed(2)} (${factura.comision_mp_porcentaje}%)`);
      } else {
        console.warn('⚠️ No se encontró cuenta 630501 para gastos de comisión MP');
      }
    }

    // HABER: Cuentas por Cobrar (se reduce por el monto total de la factura)
    movimientos.push({
      asiento_id: asiento.id,
      cuenta_id: cuentaCobrarId,
      cuenta: '121201 - Cuentas por Cobrar - Clientes',
      debito: 0,
      credito: monto,
      descripcion: `Cobro ${factura.numero_factura} - ${factura.cliente?.razon_social || 'Cliente'}`,
    });

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

    return asiento.id;

  } catch (error) {
    console.error('❌ Error generando asiento de cobro:', error);
    throw error;
  }
}

async function registrarMovimientoTesoreria(
  supabase: any,
  factura: any,
  pago: any,
  pagoId: string,
  asientoId: string | null
) {
  try {
    console.log('💰 [Tesorería] Registrando movimiento bancario...');

    // Si el pago ya tiene un ID de cuenta bancaria, usarlo directamente
    let cuentaBancariaId = pago.cuentaBancariaId;

    if (!cuentaBancariaId) {
      console.warn('⚠️ No se proporcionó ID de cuenta bancaria');
      return;
    }

    // Verificar que la cuenta bancaria existe
    const { data: cuenta, error: cuentaError } = await supabase
      .from('cuentas_bancarias')
      .select('id, nombre')
      .eq('id', cuentaBancariaId)
      .eq('empresa_id', factura.empresa_id)
      .maybeSingle();

    if (cuentaError || !cuenta) {
      console.warn('⚠️ No se encontró cuenta bancaria con ID:', cuentaBancariaId);
      return;
    }

    console.log('✅ Usando cuenta bancaria:', cuenta.nombre);

    const comisionMP = parseFloat(factura.comision_mp_monto || 0);
    const ingresoNeto = parseFloat(factura.ingreso_neto || pago.monto);
    const montoTotal = parseFloat(pago.monto);

    // Si hay comisión MP, registrar dos movimientos para visibilidad
    const movimientos = [];

    if (comisionMP > 0) {
      // 1. INGRESO bruto (lo que el cliente pagó)
      movimientos.push({
        empresa_id: factura.empresa_id,
        cuenta_bancaria_id: cuentaBancariaId,
        tipo_movimiento: 'INGRESO',
        fecha: pago.fechaPago,
        monto: montoTotal,
        descripcion: `Cobro factura ${factura.numero_factura} - ${factura.cliente?.razon_social || 'Cliente'}`,
        referencia: pago.referencia || factura.numero_factura,
        beneficiario: factura.cliente?.razon_social || 'Cliente',
        categoria: 'COBRO_CLIENTE',
        asiento_contable_id: asientoId,
        documento_origen_tipo: 'pago_cliente',
        documento_origen_id: pagoId,
        metadata: {
          tipo_pago: pago.tipoPago,
          factura_id: factura.id,
          tiene_comision_mp: true,
          comision_mp: comisionMP,
          ingreso_neto: ingresoNeto,
        },
      });

      // 2. EGRESO por comisión de Mercado Pago
      movimientos.push({
        empresa_id: factura.empresa_id,
        cuenta_bancaria_id: cuentaBancariaId,
        tipo_movimiento: 'EGRESO',
        fecha: pago.fechaPago,
        monto: comisionMP,
        descripcion: `Comisión Mercado Pago ${factura.comision_mp_porcentaje}% - Factura ${factura.numero_factura}`,
        referencia: `MP-${factura.numero_factura}`,
        beneficiario: 'Mercado Pago',
        categoria: 'COMISION_PASARELA',
        asiento_contable_id: asientoId,
        documento_origen_tipo: 'comision_mercadopago',
        documento_origen_id: factura.id,
        metadata: {
          factura_id: factura.id,
          pago_cliente_id: pagoId,
          porcentaje: factura.comision_mp_porcentaje,
          tipo: 'mercadopago',
        },
      });

      console.log(`💳 [ComisionMP] Registrando: Ingreso $${montoTotal.toFixed(2)} - Comisión MP $${comisionMP.toFixed(2)} = Neto $${ingresoNeto.toFixed(2)}`);
    } else {
      // Sin comisión MP, registrar solo el ingreso
      movimientos.push({
        empresa_id: factura.empresa_id,
        cuenta_bancaria_id: cuentaBancariaId,
        tipo_movimiento: 'INGRESO',
        fecha: pago.fechaPago,
        monto: montoTotal,
        descripcion: `Cobro factura ${factura.numero_factura} - ${factura.cliente?.razon_social || 'Cliente'}`,
        referencia: pago.referencia || factura.numero_factura,
        beneficiario: factura.cliente?.razon_social || 'Cliente',
        categoria: 'COBRO_CLIENTE',
        asiento_contable_id: asientoId,
        documento_origen_tipo: 'pago_cliente',
        documento_origen_id: pagoId,
        metadata: {
          tipo_pago: pago.tipoPago,
          factura_id: factura.id,
        },
      });
    }

    const { error: movError } = await supabase
      .from('movimientos_tesoreria')
      .insert(movimientos);

    if (movError) {
      console.error('⚠️ Error registrando movimiento de tesorería:', movError.message);
      // No lanzar error, solo advertir
      return;
    }

    console.log(`✅ ${movimientos.length} movimiento(s) de tesorería registrado(s) - Saldo bancario actualizado automáticamente`);

  } catch (error) {
    console.error('⚠️ Error en tesorería (no crítico):', error);
    // No lanzar error para no bloquear el cobro
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