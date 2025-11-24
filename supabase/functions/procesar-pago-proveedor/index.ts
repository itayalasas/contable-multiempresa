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
        creado_por: pago.creadoPor,
        banco: pago.banco,
        numero_cuenta: pago.numeroCuenta,
        numero_operacion: pago.numeroOperacion,
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

    // 3. Generar asiento contable
    await generarAsientoPago(supabase, factura, pago, pagoData.id);

    return new Response(
      JSON.stringify({
        success: true,
        pagoId: pagoData.id,
        message: 'Pago procesado y asiento contable generado exitosamente'
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
    let cuentaOrigenCodigo = '1111'; // Efectivo/Caja por defecto

    if (pago.tipoPago === 'TRANSFERENCIA' || pago.tipoPago === 'CHEQUE') {
      cuentaOrigenCodigo = '1112'; // Bancos
    } else if (pago.tipoPago === 'TARJETA_CREDITO') {
      cuentaOrigenCodigo = '1113'; // Tarjetas de Crédito
    }

    // Obtener IDs de cuentas
    const cuentaOrigenId = await obtenerCuentaId(supabase, factura.empresa_id, cuentaOrigenCodigo);

    // Determinar si el pago es de comisión o gasto normal
    const esComision = factura.referencia?.includes('COMISION') ||
                       factura.descripcion?.toLowerCase().includes('comision');

    let cuentaDestinoCodigo = '2112'; // Cuentas por Pagar por defecto

    if (esComision) {
      // Verificar si es comisión de partner o MercadoPago
      if (factura.descripcion?.toLowerCase().includes('mercadopago')) {
        cuentaDestinoCodigo = '2115'; // Comisiones MercadoPago por Pagar
      } else {
        cuentaDestinoCodigo = '2114'; // Comisiones por Pagar - Partners
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
        cuenta: `${cuentaDestinoCodigo} - ${esComision ? 'Comisiones por Pagar' : 'Cuentas por Pagar'}`,
        debito: monto,
        credito: 0,
        descripcion: `Pago ${factura.numero} - ${factura.proveedor?.razon_social || 'Proveedor'}`,
      },
      // HABER: Banco/Caja (sale dinero)
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaOrigenId,
        cuenta: `${cuentaOrigenCodigo} - ${pago.tipoPago === 'EFECTIVO' ? 'Caja' : 'Bancos'}`,
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

  } catch (error) {
    console.error('❌ Error generando asiento de pago:', error);
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