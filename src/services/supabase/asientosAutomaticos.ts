import { supabase } from '../../config/supabase';

// UUID del usuario sistema para operaciones automáticas
const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';

interface MovimientoAsiento {
  numero_linea: number;
  cuenta_id: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  debe: number;
  haber: number;
  descripcion: string;
}

export async function generarAsientoFacturaVenta(
  facturaId: string,
  empresaId: string,
  paisId: string,
  clienteNombre: string,
  numeroFactura: string,
  subtotal: number,
  totalIva: number,
  total: number,
  fechaEmision: string,
  usuarioId?: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento para factura:', numeroFactura);

    const { data: facturaExistente, error: facturaExistenteError } = await supabase
      .from('facturas_venta')
      .select('id, asiento_contable_id, asiento_generado, metadata, serie, numero_factura')
      .eq('id', facturaId)
      .maybeSingle();

    if (facturaExistenteError) {
      console.warn('⚠️ [AsientosAutomaticos] No se pudo validar asiento existente:', facturaExistenteError);
    }

    const esFacturaComision = facturaExistente?.metadata?.tipo === 'factura_comisiones_partner'
      || facturaExistente?.serie === 'COM'
      || (typeof facturaExistente?.numero_factura === 'string' && facturaExistente.numero_factura.startsWith('COM-'));

    if (esFacturaComision) {
      await supabase
        .from('facturas_venta')
        .update({
          asiento_generado: true,
          asiento_contable_id: null,
          asiento_error: null
        })
        .eq('id', facturaId);

      console.log('ℹ️ [AsientosAutomaticos] Factura de comisión omitida en contabilidad:', facturaId);
      return null;
    }

    if (facturaExistente?.asiento_contable_id) {
      console.log('ℹ️ [AsientosAutomaticos] La factura ya tiene asiento, se omite generación:', facturaExistente.asiento_contable_id);
      return facturaExistente.asiento_contable_id;
    }

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, '1212'),
        cuenta_codigo: '1212',
        cuenta_nombre: 'Cuentas por Cobrar - Comerciales',
        debe: total,
        haber: 0,
        descripcion: `Factura ${numeroFactura} - ${clienteNombre}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '7011'),
        cuenta_codigo: '7011',
        cuenta_nombre: 'Ventas',
        debe: 0,
        haber: subtotal,
        descripcion: `Factura ${numeroFactura} - ${clienteNombre}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '2113'),
        cuenta_codigo: '2113',
        cuenta_nombre: 'IVA por Pagar',
        debe: 0,
        haber: totalIva,
        descripcion: `IVA Factura ${numeroFactura}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaEmision,
      descripcion: `Factura de Venta ${numeroFactura} - ${clienteNombre}`,
      referencia: `FACT-${numeroFactura}`,
      estado: 'confirmado',
      creado_por: usuarioId || SISTEMA_USER_ID,
      documento_soporte: {
        tipo: 'factura_venta',
        id: facturaId,
        numero: numeroFactura,
      },
    };

    console.log('📝 [AsientosAutomaticos] Creando asiento:', asientoData);

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) {
      console.error('❌ [AsientosAutomaticos] Error creando asiento:', asientoError);
      throw asientoError;
    }

    console.log('✅ [AsientosAutomaticos] Asiento creado:', asiento.id);

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    console.log('📝 [AsientosAutomaticos] Insertando movimientos:', movimientosConLinea.length);

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      console.error('❌ [AsientosAutomaticos] Error insertando movimientos:', movimientosError);

      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    const { error: facturaUpdateError } = await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: true,
        asiento_contable_id: asiento.id,
        asiento_error: null
      })
      .eq('id', facturaId);

    if (facturaUpdateError) {
      console.warn('⚠️ [AsientosAutomaticos] No se pudo actualizar la factura con el asiento:', facturaUpdateError);
    }

    console.log('✅ [AsientosAutomaticos] Asiento contable generado exitosamente:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento automático:', error);
    throw new Error('Error generando asiento contable: ' + error.message);
  }
}

export async function generarAsientoNotaCredito(
  notaCreditoId: string,
  empresaId: string,
  paisId: string,
  clienteNombre: string,
  numeroNota: string,
  numeroFactura: string,
  subtotal: number,
  totalIva: number,
  total: number,
  fechaEmision: string,
  usuarioId?: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento para nota de crédito:', numeroNota);

    const { data: notaExistente, error: notaExistenteError } = await supabase
      .from('notas_credito')
      .select('id, asiento_contable_id')
      .eq('id', notaCreditoId)
      .maybeSingle();

    if (notaExistenteError) {
      console.warn('⚠️ [AsientosAutomaticos] No se pudo validar asiento existente en nota de crédito:', notaExistenteError);
    }

    if (notaExistente?.asiento_contable_id) {
      console.log('ℹ️ [AsientosAutomaticos] La nota de crédito ya tiene asiento, se omite generación:', notaExistente.asiento_contable_id);
      return notaExistente.asiento_contable_id;
    }

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const montoSubtotal = Math.abs(subtotal);
    const montoIva = Math.abs(totalIva);
    const montoTotal = Math.abs(total);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, '7011'),
        cuenta_codigo: '7011',
        cuenta_nombre: 'Ventas',
        debe: montoSubtotal,
        haber: 0,
        descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '2113'),
        cuenta_codigo: '2113',
        cuenta_nombre: 'IVA por Pagar',
        debe: montoIva,
        haber: 0,
        descripcion: `IVA Nota de Crédito ${numeroNota}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '1212'),
        cuenta_codigo: '1212',
        cuenta_nombre: 'Cuentas por Cobrar - Comerciales',
        debe: 0,
        haber: montoTotal,
        descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaEmision,
      descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
      referencia: `NC-${numeroNota}`,
      estado: 'confirmado',
      creado_por: usuarioId || SISTEMA_USER_ID,
      documento_soporte: {
        tipo: 'nota_credito',
        id: notaCreditoId,
        numero: numeroNota,
        factura_referencia: numeroFactura,
      },
    };

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) {
      console.error('❌ [AsientosAutomaticos] Error creando asiento de nota de crédito:', asientoError);
      throw asientoError;
    }

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      console.error('❌ [AsientosAutomaticos] Error insertando movimientos de nota de crédito:', movimientosError);
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    const { error: notaUpdateError } = await supabase
      .from('notas_credito')
      .update({ asiento_contable_id: asiento.id })
      .eq('id', notaCreditoId);

    if (notaUpdateError) {
      console.warn('⚠️ [AsientosAutomaticos] No se pudo actualizar la nota con el asiento:', notaUpdateError);
    }

    console.log('✅ [AsientosAutomaticos] Asiento de nota de crédito generado:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento de nota de crédito:', error);
    throw new Error('Error generando asiento contable de nota de crédito: ' + error.message);
  }
}

async function generarNumeroAsiento(empresaId: string): Promise<string> {
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

async function obtenerCuentaId(empresaId: string, codigo: string): Promise<string> {
  try {
    const { data: cuenta, error } = await supabase
      .from('plan_cuentas')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('codigo', codigo)
      .maybeSingle();

    if (error || !cuenta) {
      console.warn(`⚠️ No se encontró cuenta ${codigo}, usando valor por defecto`);
      return codigo;
    }

    return cuenta.id;
  } catch (error) {
    console.warn(`⚠️ Error buscando cuenta ${codigo}:`, error);
    return codigo;
  }
}

export async function generarAsientoPagoFacturaVenta(
  facturaId: string,
  empresaId: string,
  paisId: string,
  numeroFactura: string,
  montoPago: number,
  fechaPago: string,
  tipoPago: string,
  usuarioId?: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento de pago para factura:', numeroFactura);

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const cuentaCobro = obtenerCuentaSegunTipoPago(tipoPago);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, cuentaCobro),
        cuenta_codigo: cuentaCobro,
        cuenta_nombre: obtenerNombreCuentaPago(tipoPago),
        debe: montoPago,
        haber: 0,
        descripcion: `Cobro factura ${numeroFactura}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '1212'),
        cuenta_codigo: '1212',
        cuenta_nombre: 'Cuentas por Cobrar - Comerciales',
        debe: 0,
        haber: montoPago,
        descripcion: `Cobro factura ${numeroFactura}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaPago,
      descripcion: `Cobro Factura ${numeroFactura}`,
      referencia: `COBRO-${numeroFactura}`,
      estado: 'confirmado',
      creado_por: usuarioId || SISTEMA_USER_ID,
      documento_soporte: {
        tipo: 'pago_factura',
        id: facturaId,
        numero: numeroFactura,
        tipo_pago: tipoPago,
      },
    };

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    console.log('✅ [AsientosAutomaticos] Asiento de pago generado exitosamente:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento de pago:', error);
    throw new Error('Error generando asiento de pago: ' + error.message);
  }
}

function obtenerCuentaSegunTipoPago(tipoPago: string): string {
  switch (tipoPago.toUpperCase()) {
    case 'EFECTIVO':
      return '1011';
    case 'TRANSFERENCIA':
    case 'TRANSFERENCIA BANCARIA':
      return '1041';
    case 'CHEQUE':
      return '1041';
    case 'TARJETA':
    case 'TARJETA DE CREDITO':
    case 'TARJETA DE DEBITO':
      return '1042';
    default:
      return '1011';
  }
}

function obtenerNombreCuentaPago(tipoPago: string): string {
  switch (tipoPago.toUpperCase()) {
    case 'EFECTIVO':
      return 'Caja';
    case 'TRANSFERENCIA':
    case 'TRANSFERENCIA BANCARIA':
      return 'Bancos';
    case 'CHEQUE':
      return 'Bancos';
    case 'TARJETA':
    case 'TARJETA DE CREDITO':
    case 'TARJETA DE DEBITO':
      return 'Tarjetas';
    default:
      return 'Caja';
  }
}

export async function generarAsientoComision(
  facturaId: string,
  empresaId: string,
  paisId: string,
  numeroFactura: string,
  partnerNombre: string,
  montoComision: number,
  fechaEmision: string,
  usuarioId: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento de comisión para:', partnerNombre);

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, '5211'),
        cuenta_codigo: '5211',
        cuenta_nombre: 'Gastos - Comisiones',
        debe: montoComision,
        haber: 0,
        descripcion: `Comisión ${partnerNombre} - Factura ${numeroFactura}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '2111'),
        cuenta_codigo: '2111',
        cuenta_nombre: 'Cuentas por Pagar - Proveedores',
        debe: 0,
        haber: montoComision,
        descripcion: `Comisión ${partnerNombre} - Factura ${numeroFactura}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaEmision,
      descripcion: `Comisión Partner ${partnerNombre} - Factura ${numeroFactura}`,
      referencia: `COMISION-${numeroFactura}`,
      estado: 'confirmado',
      creado_por: usuarioId,
      documento_soporte: {
        tipo: 'comision_partner',
        factura_id: facturaId,
        numero_factura: numeroFactura,
        partner: partnerNombre,
      },
    };

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    console.log('✅ [AsientosAutomaticos] Asiento de comisión generado:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento de comisión:', error);
    throw new Error('Error generando asiento de comisión: ' + error.message);
  }
}

export async function generarAsientoFacturaCompraComisiones(
  facturaCompraId: string,
  empresaId: string,
  paisId: string,
  numeroFactura: string,
  partnerNombre: string,
  totalComisiones: number,
  fechaEmision: string,
  usuarioId: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento de factura compra comisiones:', numeroFactura);

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, '5211'),
        cuenta_codigo: '5211',
        cuenta_nombre: 'Gastos - Comisiones',
        debe: totalComisiones,
        haber: 0,
        descripcion: `Factura comisiones ${partnerNombre} - ${numeroFactura}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, '2111'),
        cuenta_codigo: '2111',
        cuenta_nombre: 'Cuentas por Pagar - Proveedores',
        debe: 0,
        haber: totalComisiones,
        descripcion: `Factura comisiones ${partnerNombre} - ${numeroFactura}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaEmision,
      descripcion: `Factura Compra Comisiones ${numeroFactura} - ${partnerNombre}`,
      referencia: `FC-COMISION-${numeroFactura}`,
      estado: 'confirmado',
      creado_por: usuarioId,
      documento_soporte: {
        tipo: 'factura_compra_comisiones',
        id: facturaCompraId,
        numero: numeroFactura,
        partner: partnerNombre,
      },
    };

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    console.log('✅ [AsientosAutomaticos] Asiento de factura compra comisiones generado:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento:', error);
    throw new Error('Error generando asiento de factura compra: ' + error.message);
  }
}

export async function generarAsientoPagoFacturaCompra(
  facturaCompraId: string,
  empresaId: string,
  paisId: string,
  numeroFactura: string,
  proveedorNombre: string,
  montoPago: number,
  fechaPago: string,
  tipoPago: string,
  usuarioId: string
) {
  try {
    console.log('🔄 [AsientosAutomaticos] Generando asiento de pago factura compra:', numeroFactura);

    const numeroAsiento = await generarNumeroAsiento(empresaId);

    const cuentaPago = obtenerCuentaSegunTipoPago(tipoPago);

    const movimientos: Omit<MovimientoAsiento, 'numero_linea'>[] = [
      {
        cuenta_id: await obtenerCuentaId(empresaId, '2111'),
        cuenta_codigo: '2111',
        cuenta_nombre: 'Cuentas por Pagar - Proveedores',
        debe: montoPago,
        haber: 0,
        descripcion: `Pago ${proveedorNombre} - ${numeroFactura}`,
      },
      {
        cuenta_id: await obtenerCuentaId(empresaId, cuentaPago),
        cuenta_codigo: cuentaPago,
        cuenta_nombre: obtenerNombreCuentaPago(tipoPago),
        debe: 0,
        haber: montoPago,
        descripcion: `Pago ${proveedorNombre} - ${numeroFactura}`,
      },
    ];

    const asientoData = {
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaPago,
      descripcion: `Pago Factura Compra ${numeroFactura} - ${proveedorNombre}`,
      referencia: `PAGO-FC-${numeroFactura}`,
      estado: 'confirmado',
      creado_por: usuarioId,
      documento_soporte: {
        tipo: 'pago_factura_compra',
        id: facturaCompraId,
        numero: numeroFactura,
        proveedor: proveedorNombre,
        tipo_pago: tipoPago,
      },
    };

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert(asientoData)
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientosConLinea = movimientos.map((mov, index) => ({
      ...mov,
      asiento_id: asiento.id,
      numero_linea: index + 1,
    }));

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientosConLinea);

    if (movimientosError) {
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movimientosError;
    }

    console.log('✅ [AsientosAutomaticos] Asiento de pago factura compra generado:', numeroAsiento);
    return asiento.id;
  } catch (error: any) {
    console.error('❌ [AsientosAutomaticos] Error generando asiento de pago:', error);
    throw new Error('Error generando asiento de pago: ' + error.message);
  }
}
