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

    console.log('💸 [PagoProveedor] Procesando pago para factura:', factura_id);

    // 1. Insertar el pago en la base de datos
    const { data: pagoData, error: pagoError } = await supabase
      .from('pagos_proveedor')
      .insert({
        factura_id: factura_id,
        fecha_pago: pago.fechaPago,
        monto: pago.monto,
        tipo_pago: pago.tipoPago,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        creado_por: pago.creadoPor || null,
        banco: pago.banco,
        numero_cuenta: pago.numeroCuenta,
        numero_operacion: pago.numeroOperacion,
        cuenta_bancaria_id: pago.cuentaBancariaId || null,
      })
      .select()
      .single();

    if (pagoError) {
      console.error('❌ Error insertando pago:', pagoError);
      throw new Error(`Error al insertar pago: ${pagoError.message}`);
    }

    console.log('✅ Pago insertado:', pagoData.id);

    // 2. Actualizar la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_por_pagar')
      .select('*, proveedor:proveedores(*)')
      .eq('id', factura_id)
      .single();

    if (facturaError || !factura) {
      throw new Error('No se pudo obtener la factura');
    }

    const nuevoMontoPagado = parseFloat(factura.monto_pagado) + pago.monto;
    const nuevoSaldo = parseFloat(factura.monto_total) - nuevoMontoPagado;
    let nuevoEstado = 'PENDIENTE';

    if (nuevoSaldo <= 0) {
      nuevoEstado = 'PAGADA';
    } else if (nuevoMontoPagado > 0) {
      nuevoEstado = 'PARCIAL';
    }

    await supabase
      .from('facturas_por_pagar')
      .update({
        monto_pagado: nuevoMontoPagado,
        saldo_pendiente: Math.max(0, nuevoSaldo),
        estado: nuevoEstado,
        fecha_modificacion: new Date().toISOString(),
      })
      .eq('id', factura_id);

    console.log(`✅ Factura actualizada: Estado=${nuevoEstado}, Saldo=${nuevoSaldo}`);

    // 2.5. Actualizar estado de comisiones si es una factura de comisiones
    if (nuevoEstado === 'PAGADA') {
      await actualizarEstadoComisiones(supabase, factura_id);
    }

    // 3. Generar asiento contable (si está configurado)
    let asientoId = null;
    let mensajeAsiento = '';

    try {
      asientoId = await generarAsientoPago(supabase, factura, pago, pagoData.id);
      mensajeAsiento = 'asiento contable generado';
    } catch (asientoError) {
      console.warn('⚠️ No se pudo generar asiento contable:', asientoError.message);
      mensajeAsiento = 'sin asiento (configurar plan de cuentas)';
    }

    // 4. Registrar movimiento en tesorería (actualiza saldo automáticamente)
    try {
      await registrarMovimientoTesoreria(supabase, factura, pago, pagoData.id, asientoId);
    } catch (tesoreriaError) {
      console.warn('⚠️ No se pudo registrar movimiento de tesorería:', tesoreriaError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pagoId: pagoData.id,
        message: `Pago procesado exitosamente (${mensajeAsiento})`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generarAsientoPago(supabase: any, factura: any, pago: any, pagoId: string) {
  try {
    console.log('📝 [AsientoPago] Generando asiento para pago...');

    // Obtener empresa para pais_id
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .maybeSingle();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Determinar la cuenta de origen según el tipo de pago
    let cuentaOrigenCodigo = '111101'; // Efectivo/Caja por defecto
    let nombreCuentaOrigen = 'Caja - Efectivo';

    if (pago.tipoPago === 'TRANSFERENCIA') {
      cuentaOrigenCodigo = '112101'; // Bancos - Transferencias
      nombreCuentaOrigen = 'Bancos - Transferencias';
    } else if (pago.tipoPago === 'CHEQUE') {
      cuentaOrigenCodigo = '112102'; // Bancos - Cheques
      nombreCuentaOrigen = 'Bancos - Cheques';
    } else if (pago.tipoPago === 'TARJETA_CREDITO') {
      cuentaOrigenCodigo = '113101'; // Tarjetas de Crédito
      nombreCuentaOrigen = 'Tarjetas de Crédito';
    }

    // Obtener IDs de cuentas
    const cuentaOrigenId = await obtenerCuentaId(supabase, factura.empresa_id, cuentaOrigenCodigo);

    // Determinar si el pago es de comisión o gasto normal
    const esComision = factura.referencia?.includes('COMISION') ||
                       factura.descripcion?.toLowerCase().includes('comision');

    let cuentaDestinoCodigo = '213001'; // Cuentas por Pagar - Proveedores por defecto
    let nombreCuentaDestino = 'Cuentas por Pagar - Proveedores';

    if (esComision) {
      // Verificar si es comisión de partner o MercadoPago
      if (factura.descripcion?.toLowerCase().includes('mercadopago')) {
        cuentaDestinoCodigo = '212002'; // Comisiones MercadoPago por Pagar
        nombreCuentaDestino = 'Comisiones MercadoPago por Pagar';
      } else {
        cuentaDestinoCodigo = '212001'; // Comisiones por Pagar - Partners
        nombreCuentaDestino = 'Comisiones por Pagar - Partners';
      }
    }

    const cuentaDestinoId = await obtenerCuentaId(supabase, factura.empresa_id, cuentaDestinoCodigo);

    if (!cuentaOrigenId || !cuentaDestinoId) {
      const cuentasFaltantes = [];
      if (!cuentaOrigenId) cuentasFaltantes.push(`${cuentaOrigenCodigo} (${pago.tipoPago})`);
      if (!cuentaDestinoId) cuentasFaltantes.push(`${cuentaDestinoCodigo} (Cuenta Destino)`);

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
        descripcion: `Pago Factura ${factura.numero} - ${factura.proveedor?.razon_social || 'Proveedor'}`,
        referencia: `PAGO-${factura.numero}`,
        estado: 'confirmado',
        creado_por: SISTEMA_USER_ID,
        documento_soporte: {
          tipo: 'pago_proveedor',
          factura_id: factura.id,
          pago_id: pagoId,
          numero: factura.numero,
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
      // DEBE: Cuenta por Pagar (se reduce el pasivo)
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaDestinoId,
        cuenta: `${cuentaDestinoCodigo} - ${nombreCuentaDestino}`,
        debito: monto,
        credito: 0,
        descripcion: `Pago ${factura.numero} - ${factura.proveedor?.razon_social || 'Proveedor'}`,
      },
      // HABER: Banco/Caja (sale dinero)
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaOrigenId,
        cuenta: `${cuentaOrigenCodigo} - ${nombreCuentaOrigen}`,
        debito: 0,
        credito: monto,
        descripcion: `Pago ${factura.numero} - ${pago.tipoPago}`,
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
      .from('pagos_proveedor')
      .update({ asiento_contable_id: asiento.id })
      .eq('id', pagoId);

    console.log(`✅ Asiento contable ${numeroAsiento} generado exitosamente`);

    return asiento.id;

  } catch (error) {
    console.error('❌ Error generando asiento de pago:', error);
    throw error;
  }
}

async function registrarMovimientoTesoreria(
  supabase: any,
  factura: any,
  pago: any,
  pagoId: string,
  asientoId: string
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

    const movimientos = [];

    // 1. EGRESO: Pago al partner/proveedor (sale dinero)
    movimientos.push({
      empresa_id: factura.empresa_id,
      cuenta_bancaria_id: cuentaBancariaId,
      tipo_movimiento: 'EGRESO',
      fecha: pago.fechaPago,
      monto: pago.monto,
      descripcion: `Pago factura ${factura.numero} - ${factura.proveedor?.razon_social || 'Proveedor'}`,
      referencia: pago.numeroOperacion || pago.referencia || factura.numero,
      beneficiario: factura.proveedor?.razon_social || 'Proveedor',
      categoria: 'PAGO_PROVEEDOR',
      asiento_contable_id: asientoId,
      documento_origen_tipo: 'pago_proveedor',
      documento_origen_id: pagoId,
      metadata: {
        tipo_pago: pago.tipoPago,
        banco: pago.banco,
        numero_cuenta: pago.numeroCuenta,
        numero_operacion: pago.numeroOperacion,
        factura_id: factura.id,
      },
    });

    // 2. Verificar si hay comisiones retenidas (para facturas de partners)
    const { data: comisionesRetenidas } = await supabase
      .from('comisiones_partners')
      .select('id, comision_app, comision_mercadopago_aliado, factura_compra_id')
      .eq('factura_compra_id', factura.id)
      .eq('estado', 'facturada');

    if (comisionesRetenidas && comisionesRetenidas.length > 0) {
      const totalComisionApp = comisionesRetenidas.reduce((sum, c) => sum + parseFloat(c.comision_app || 0), 0);
      const totalComisionMPAliado = comisionesRetenidas.reduce((sum, c) => sum + parseFloat(c.comision_mercadopago_aliado || 0), 0);
      const totalComisiones = totalComisionApp + totalComisionMPAliado;

      if (totalComisiones > 0) {
        console.log(`💰 [Tesorería] Comisiones retenidas: App=$${totalComisionApp.toFixed(2)}, MP Aliado=$${totalComisionMPAliado.toFixed(2)}`);

        // INGRESO: Comisión retenida por la app (la ganancia)
        // Este dinero YA está en la cuenta, NO sale al pagar al partner
        movimientos.push({
          empresa_id: factura.empresa_id,
          cuenta_bancaria_id: cuentaBancariaId,
          tipo_movimiento: 'INGRESO',
          fecha: pago.fechaPago,
          monto: totalComisiones,
          descripcion: `Ingreso comisiones retenidas - Factura ${factura.numero}`,
          referencia: `COM-RETENIDA-${factura.numero}`,
          beneficiario: 'Comisiones Marketplace',
          categoria: 'INGRESO_COMISION',
          asiento_contable_id: asientoId,
          documento_origen_tipo: 'comision_marketplace',
          documento_origen_id: factura.id,
          metadata: {
            factura_compra_id: factura.id,
            pago_proveedor_id: pagoId,
            comision_app: totalComisionApp,
            comision_mp_aliado: totalComisionMPAliado,
            tipo: 'comision_retenida',
          },
        });

        console.log(`✅ [Tesorería] Registrando ingreso por comisión retenida: $${totalComisiones.toFixed(2)}`);
      }
    }

    const { error: movError } = await supabase
      .from('movimientos_tesoreria')
      .insert(movimientos);

    if (movError) {
      console.error('⚠️ Error registrando movimiento de tesorería:', movError.message);
      return;
    }

    console.log(`✅ ${movimientos.length} movimiento(s) de tesorería registrado(s) - Saldo actualizado`);

  } catch (error) {
    console.error('⚠️ Error en tesorería (no crítico):', error);
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

async function actualizarEstadoComisiones(supabase: any, facturaId: string) {
  try {
    console.log('📊 [Comisiones] Actualizando estado de comisiones relacionadas...');

    // Actualizar comisiones relacionadas con esta factura a PAGADA
    const { data, error } = await supabase
      .from('comisiones_partners')
      .update({
        estado_pago: 'PAGADA',
        fecha_pagada: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('factura_compra_id', facturaId)
      .select();

    if (error) {
      console.error('⚠️ Error actualizando comisiones:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ ${data.length} comisiones actualizadas a PAGADA`);
    } else {
      console.log('ℹ️ No hay comisiones relacionadas con esta factura');
    }
  } catch (error) {
    console.error('⚠️ Error en actualización de comisiones (no crítico):', error);
  }
}
