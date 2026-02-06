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
  estadoConciliacion: 'PENDIENTE' | 'CONCILIADO' | 'RECHAZADO';
  documentoSoporte: string | null;
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
      .eq('eliminado', false)
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
      cuentaDestinoId: mov.metadata?.cuenta_destino_id || null,
      estadoConciliacion: mov.estado_conciliacion || 'PENDIENTE',
      documentoSoporte: mov.documento_soporte,
      empresaId: mov.empresa_id,
      creadoPor: mov.creado_por,
    }));
  },

  async createMovimiento(movimiento: Omit<MovimientoTesoreria, 'id'>): Promise<MovimientoTesoreria> {
    const metadata: any = {};

    if (movimiento.tipoMovimiento === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
      metadata.cuenta_destino_id = movimiento.cuentaDestinoId;
    }

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
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        empresa_id: movimiento.empresaId,
        creado_por: movimiento.creadoPor,
      })
      .select()
      .single();

    if (error) throw error;

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
      cuentaDestinoId: data.metadata?.cuenta_destino_id || null,
      estadoConciliacion: data.estado_conciliacion || 'PENDIENTE',
      documentoSoporte: data.documento_soporte,
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

    const { error } = await supabase
      .from('movimientos_tesoreria')
      .update(updateData)
      .eq('id', movimientoId);

    if (error) throw error;
  },

  async solicitarEliminacionMovimiento(params: {
    movimientoId: string;
    empresaId: string;
    motivo: string;
    solicitadoPor: string;
  }): Promise<{ solicitudId: string; tieneAsiento: boolean }> {
    // Obtener datos completos del movimiento
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos_tesoreria')
      .select('*, cuentas_bancarias(nombre)')
      .eq('id', params.movimientoId)
      .single();

    if (movError) throw movError;
    if (!movimiento) throw new Error('Movimiento no encontrado');

    let tieneAsiento = false;
    if (movimiento.asiento_contable_id) {
      tieneAsiento = true;
    }

    // Crear solicitud de autorización usando el servicio
    const { autorizacionesService } = await import('./autorizaciones');

    const solicitud = await autorizacionesService.crearSolicitudEliminacion({
      empresaId: params.empresaId,
      tipoOperacion: 'eliminar_movimiento_tesoreria',
      tablaAfectada: 'movimientos_tesoreria',
      registroId: params.movimientoId,
      datosRegistro: movimiento,
      motivo: params.motivo,
      solicitadoPor: params.solicitadoPor,
    });

    return {
      solicitudId: solicitud.id,
      tieneAsiento,
    };
  },

  async diagnosticarCuentasBancarias(empresaId: string): Promise<{
    cuentasConProblemas: Array<{
      id: string;
      nombre: string;
      numeroCuenta: string;
      saldoActual: number;
      saldoInicial: number;
      totalMovimientos: number;
      problema: string;
    }>;
    totalCuentas: number;
    cuentasOk: number;
  }> {
    const cuentas = await this.getCuentasBancarias(empresaId);
    const cuentasConProblemas = [];
    let cuentasOk = 0;

    for (const cuenta of cuentas) {
      const { data: movimientos } = await supabase
        .from('movimientos_tesoreria')
        .select('id')
        .eq('cuenta_bancaria_id', cuenta.id);

      const totalMovimientos = movimientos?.length || 0;

      if (totalMovimientos === 0 && Math.abs(cuenta.saldoActual) > 0.01) {
        cuentasConProblemas.push({
          id: cuenta.id,
          nombre: cuenta.nombre,
          numeroCuenta: cuenta.numeroCuenta,
          saldoActual: cuenta.saldoActual,
          saldoInicial: cuenta.saldoInicial,
          totalMovimientos,
          problema: 'Cuenta sin movimientos pero con saldo diferente de cero'
        });
      } else if (totalMovimientos === 0 && Math.abs(cuenta.saldoInicial) > 0.01) {
        cuentasConProblemas.push({
          id: cuenta.id,
          nombre: cuenta.nombre,
          numeroCuenta: cuenta.numeroCuenta,
          saldoActual: cuenta.saldoActual,
          saldoInicial: cuenta.saldoInicial,
          totalMovimientos,
          problema: 'Cuenta sin movimientos pero con saldo inicial diferente de cero'
        });
      } else {
        cuentasOk++;
      }
    }

    return {
      cuentasConProblemas,
      totalCuentas: cuentas.length,
      cuentasOk
    };
  },

  async cuadrarCuentasSinMovimientos(empresaId: string): Promise<{
    cuentasCorregidas: number;
    detalles: Array<{
      nombre: string;
      numeroCuenta: string;
      saldoAnterior: number;
      saldoNuevo: number;
    }>;
  }> {
    const diagnostico = await this.diagnosticarCuentasBancarias(empresaId);
    const detalles = [];

    for (const cuenta of diagnostico.cuentasConProblemas) {
      if (cuenta.totalMovimientos === 0) {
        await supabase
          .from('cuentas_bancarias')
          .update({
            saldo_inicial: 0,
            saldo_actual: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', cuenta.id);

        detalles.push({
          nombre: cuenta.nombre,
          numeroCuenta: cuenta.numeroCuenta,
          saldoAnterior: cuenta.saldoActual,
          saldoNuevo: 0
        });
      }
    }

    return {
      cuentasCorregidas: detalles.length,
      detalles
    };
  },

  async sincronizarTesoreriaCompleta(empresaId: string): Promise<{
    movimientosCreados: number;
    cuentasActualizadas: number;
    pasos: Array<{
      paso: string;
      mensaje: string;
      cantidad: number;
    }>;
  }> {
    const { data, error } = await supabase
      .rpc('ejecutar_sincronizacion_completa', {
        p_empresa_id: empresaId
      });

    if (error) throw error;

    const pasos = data || [];
    const movimientosCreados = pasos.find((p: any) => p.paso === 'PASO 1 COMPLETADO')?.cantidad || 0;
    const cuentasActualizadas = pasos.find((p: any) => p.paso === 'PASO 2 COMPLETADO')?.cantidad || 0;

    return {
      movimientosCreados,
      cuentasActualizadas,
      pasos
    };
  },

  async previsualizarSincronizacion(empresaId: string): Promise<Array<{
    tipoOperacion: string;
    asientoNumero: string;
    asientoFecha: string;
    cuentaBancariaNombre: string;
    tipoMovimiento: string;
    monto: number;
    descripcion: string;
  }>> {
    const { data, error } = await supabase
      .rpc('sincronizar_tesoreria_desde_asientos', {
        p_empresa_id: empresaId,
        p_modo: 'PREVIEW'
      });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      tipoOperacion: item.tipo_operacion,
      asientoNumero: item.asiento_numero,
      asientoFecha: item.asiento_fecha,
      cuentaBancariaNombre: item.cuenta_bancaria_nombre,
      tipoMovimiento: item.tipo_movimiento,
      monto: parseFloat(item.monto || '0'),
      descripcion: item.descripcion
    }));
  },
};
