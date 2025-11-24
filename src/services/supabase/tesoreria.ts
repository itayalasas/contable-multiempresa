import { supabase } from '../../config/supabase';

export interface CuentaBancaria {
  id: string;
  nombre: string;
  numeroCuenta: string;
  bancoId: string | null;
  banco: string;
  tipoCuenta: string;
  moneda: string;
  saldoActual: number;
  saldoInicial: number;
  fechaApertura: string | null;
  activa: boolean;
  empresaId: string;
  cuentaContableId: string | null;
  observaciones: string | null;
}

export interface MovimientoTesoreria {
  id: string;
  cuentaBancariaId: string;
  tipoMovimiento: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  fecha: string;
  monto: number;
  descripcion: string;
  referencia: string | null;
  beneficiario: string | null;
  categoria: string | null;
  cuentaDestinoId: string | null;
  documentoSoporte: string | null;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CONCILIADO' | 'ANULADO';
  empresaId: string;
  creadoPor: string;
}

export const tesoreriaSupabaseService = {
  async getCuentasBancarias(empresaId: string): Promise<CuentaBancaria[]> {
    const { data, error } = await supabase
      .from('cuentas_bancarias')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('nombre');

    if (error) throw error;

    return data.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre,
      numeroCuenta: cuenta.numero_cuenta,
      bancoId: cuenta.banco_id,
      banco: cuenta.banco,
      tipoCuenta: cuenta.tipo_cuenta,
      moneda: cuenta.moneda,
      saldoActual: cuenta.saldo_actual,
      saldoInicial: cuenta.saldo_inicial,
      fechaApertura: cuenta.fecha_apertura,
      activa: cuenta.activa,
      empresaId: cuenta.empresa_id,
      cuentaContableId: cuenta.cuenta_contable_id,
      observaciones: cuenta.observaciones,
    }));
  },

  async createCuentaBancaria(cuenta: Omit<CuentaBancaria, 'id'>): Promise<CuentaBancaria> {
    const { data, error } = await supabase
      .from('cuentas_bancarias')
      .insert({
        nombre: cuenta.nombre,
        numero_cuenta: cuenta.numeroCuenta,
        banco_id: cuenta.bancoId,
        banco: cuenta.banco,
        tipo_cuenta: cuenta.tipoCuenta,
        moneda: cuenta.moneda,
        saldo_actual: cuenta.saldoActual,
        saldo_inicial: cuenta.saldoInicial,
        fecha_apertura: cuenta.fechaApertura,
        activa: cuenta.activa,
        empresa_id: cuenta.empresaId,
        cuenta_contable_id: cuenta.cuentaContableId,
        observaciones: cuenta.observaciones,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nombre: data.nombre,
      numeroCuenta: data.numero_cuenta,
      bancoId: data.banco_id,
      banco: data.banco,
      tipoCuenta: data.tipo_cuenta,
      moneda: data.moneda,
      saldoActual: data.saldo_actual,
      saldoInicial: data.saldo_inicial,
      fechaApertura: data.fecha_apertura,
      activa: data.activa,
      empresaId: data.empresa_id,
      cuentaContableId: data.cuenta_contable_id,
      observaciones: data.observaciones,
    };
  },

  async updateCuentaBancaria(cuentaId: string, updates: Partial<CuentaBancaria>): Promise<void> {
    const updateData: any = {};

    if (updates.nombre) updateData.nombre = updates.nombre;
    if (updates.numeroCuenta) updateData.numero_cuenta = updates.numeroCuenta;
    if (updates.bancoId !== undefined) updateData.banco_id = updates.bancoId;
    if (updates.banco) updateData.banco = updates.banco;
    if (updates.tipoCuenta) updateData.tipo_cuenta = updates.tipoCuenta;
    if (updates.moneda) updateData.moneda = updates.moneda;
    if (updates.saldoInicial !== undefined) updateData.saldo_inicial = updates.saldoInicial;
    if (updates.fechaApertura !== undefined) updateData.fecha_apertura = updates.fechaApertura;
    if (updates.activa !== undefined) updateData.activa = updates.activa;
    if (updates.cuentaContableId !== undefined) updateData.cuenta_contable_id = updates.cuentaContableId;
    if (updates.observaciones !== undefined) updateData.observaciones = updates.observaciones;

    const { error } = await supabase
      .from('cuentas_bancarias')
      .update(updateData)
      .eq('id', cuentaId);

    if (error) throw error;
  },

  async getMovimientos(empresaId: string, cuentaBancariaId?: string): Promise<MovimientoTesoreria[]> {
    let query = supabase
      .from('movimientos_tesoreria')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha', { ascending: false });

    if (cuentaBancariaId) {
      query = query.eq('cuenta_bancaria_id', cuentaBancariaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(mov => ({
      id: mov.id,
      cuentaBancariaId: mov.cuenta_bancaria_id,
      tipoMovimiento: mov.tipo_movimiento as any,
      fecha: mov.fecha,
      monto: mov.monto,
      descripcion: mov.descripcion,
      referencia: mov.referencia,
      beneficiario: mov.beneficiario,
      categoria: mov.categoria,
      cuentaDestinoId: mov.cuenta_destino_id,
      documentoSoporte: mov.documento_soporte,
      estado: mov.estado as any,
      empresaId: mov.empresa_id,
      creadoPor: mov.creado_por,
    }));
  },

  async createMovimiento(movimiento: Omit<MovimientoTesoreria, 'id'>): Promise<MovimientoTesoreria> {
    const { data, error } = await supabase
      .from('movimientos_tesoreria')
      .insert({
        cuenta_bancaria_id: movimiento.cuentaBancariaId,
        tipo_movimiento: movimiento.tipoMovimiento,
        fecha: movimiento.fecha,
        monto: movimiento.monto,
        descripcion: movimiento.descripcion,
        referencia: movimiento.referencia,
        beneficiario: movimiento.beneficiario,
        categoria: movimiento.categoria,
        cuenta_destino_id: movimiento.cuentaDestinoId,
        documento_soporte: movimiento.documentoSoporte,
        estado: movimiento.estado,
        empresa_id: movimiento.empresaId,
        creado_por: movimiento.creadoPor,
      })
      .select()
      .single();

    if (error) throw error;

    const { data: cuenta } = await supabase
      .from('cuentas_bancarias')
      .select('saldo_actual')
      .eq('id', movimiento.cuentaBancariaId)
      .single();

    if (cuenta) {
      let nuevoSaldo = cuenta.saldo_actual;

      if (movimiento.tipoMovimiento === 'INGRESO') {
        nuevoSaldo += movimiento.monto;
      } else if (movimiento.tipoMovimiento === 'EGRESO') {
        nuevoSaldo -= movimiento.monto;
      }

      await supabase
        .from('cuentas_bancarias')
        .update({ saldo_actual: nuevoSaldo })
        .eq('id', movimiento.cuentaBancariaId);

      if (movimiento.tipoMovimiento === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
        const { data: cuentaDestino } = await supabase
          .from('cuentas_bancarias')
          .select('saldo_actual')
          .eq('id', movimiento.cuentaDestinoId)
          .single();

        if (cuentaDestino) {
          await supabase
            .from('cuentas_bancarias')
            .update({ saldo_actual: cuentaDestino.saldo_actual + movimiento.monto })
            .eq('id', movimiento.cuentaDestinoId);
        }
      }
    }

    return {
      id: data.id,
      cuentaBancariaId: data.cuenta_bancaria_id,
      tipoMovimiento: data.tipo_movimiento as any,
      fecha: data.fecha,
      monto: data.monto,
      descripcion: data.descripcion,
      referencia: data.referencia,
      beneficiario: data.beneficiario,
      categoria: data.categoria,
      cuentaDestinoId: data.cuenta_destino_id,
      documentoSoporte: data.documento_soporte,
      estado: data.estado as any,
      empresaId: data.empresa_id,
      creadoPor: data.creado_por,
    };
  },

  async updateMovimiento(movimientoId: string, updates: Partial<MovimientoTesoreria>): Promise<void> {
    const updateData: any = {};

    if (updates.fecha) updateData.fecha = updates.fecha;
    if (updates.descripcion) updateData.descripcion = updates.descripcion;
    if (updates.referencia !== undefined) updateData.referencia = updates.referencia;
    if (updates.beneficiario !== undefined) updateData.beneficiario = updates.beneficiario;
    if (updates.estado) updateData.estado = updates.estado;

    const { error } = await supabase
      .from('movimientos_tesoreria')
      .update(updateData)
      .eq('id', movimientoId);

    if (error) throw error;
  },
};
