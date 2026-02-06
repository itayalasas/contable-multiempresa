import { supabase } from '../../config/supabase';

export interface CuentaBalance {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: 'deudora' | 'acreedora';
  saldo_deudor: number;
  saldo_acreedor: number;
  saldo_final: number;
  nivel: number;
  es_titulo: boolean;
  padre_codigo?: string;
  subcuentas?: CuentaBalance[];
}

export interface BalanceGeneral {
  fecha_corte: string;
  periodo_id?: string;
  activo_corriente: CuentaBalance[];
  activo_no_corriente: CuentaBalance[];
  pasivo_corriente: CuentaBalance[];
  pasivo_no_corriente: CuentaBalance[];
  patrimonio: CuentaBalance[];
  total_activo: number;
  total_pasivo: number;
  total_patrimonio: number;
  total_pasivo_patrimonio: number;
  cuadrado: boolean;
  diferencia: number;
}

export const balanceGeneralService = {
  async obtenerBalance(
    empresaId: string,
    fechaCorte?: string,
    periodoId?: string
  ): Promise<BalanceGeneral> {
    try {
      let cuentas: CuentaBalance[];

      if (periodoId) {
        cuentas = await this.obtenerSaldosDePeriodo(empresaId, periodoId);
      } else {
        cuentas = await this.obtenerSaldosActuales(empresaId, fechaCorte);
      }

      const activoCorriente = this.filtrarCuentas(cuentas, '11');
      const activoNoCorriente = this.filtrarCuentas(cuentas, '12');
      const pasivoCorriente = this.filtrarCuentas(cuentas, '21');
      const pasivoNoCorriente = this.filtrarCuentas(cuentas, '22');
      const patrimonio = this.filtrarCuentas(cuentas, '3');

      const totalActivo = this.calcularTotal(activoCorriente) +
                          this.calcularTotal(activoNoCorriente);
      const totalPasivo = this.calcularTotal(pasivoCorriente) +
                          this.calcularTotal(pasivoNoCorriente);
      const totalPatrimonio = this.calcularTotal(patrimonio);
      const totalPasivoPatrimonio = totalPasivo + totalPatrimonio;

      const diferencia = totalActivo - totalPasivoPatrimonio;
      const cuadrado = Math.abs(diferencia) < 0.01;

      return {
        fecha_corte: fechaCorte || new Date().toISOString().split('T')[0],
        periodo_id: periodoId,
        activo_corriente: this.construirJerarquia(activoCorriente),
        activo_no_corriente: this.construirJerarquia(activoNoCorriente),
        pasivo_corriente: this.construirJerarquia(pasivoCorriente),
        pasivo_no_corriente: this.construirJerarquia(pasivoNoCorriente),
        patrimonio: this.construirJerarquia(patrimonio),
        total_activo: totalActivo,
        total_pasivo: totalPasivo,
        total_patrimonio: totalPatrimonio,
        total_pasivo_patrimonio: totalPasivoPatrimonio,
        cuadrado,
        diferencia
      };
    } catch (error) {
      console.error('Error al obtener balance general:', error);
      throw error;
    }
  },

  async obtenerSaldosActuales(
    empresaId: string,
    fechaCorte?: string
  ): Promise<CuentaBalance[]> {
    const query = supabase
      .from('plan_cuentas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('codigo');

    const { data: cuentas, error } = await query;

    if (error) throw error;

    const cuentasConSaldo = await Promise.all(
      (cuentas || []).map(async (cuenta) => {
        const saldos = await this.calcularSaldoCuenta(
          cuenta.id,
          empresaId,
          fechaCorte
        );

        return {
          id: cuenta.id,
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          naturaleza: cuenta.naturaleza,
          saldo_deudor: saldos.deudor,
          saldo_acreedor: saldos.acreedor,
          saldo_final: saldos.final,
          nivel: cuenta.nivel,
          es_titulo: cuenta.es_titulo,
          padre_codigo: cuenta.cuenta_padre
        };
      })
    );

    return cuentasConSaldo;
  },

  async obtenerSaldosDePeriodo(
    empresaId: string,
    periodoId: string
  ): Promise<CuentaBalance[]> {
    const { data: periodo, error: periodoError } = await supabase
      .from('periodos_contables')
      .select('fecha_inicio, fecha_fin')
      .eq('id', periodoId)
      .single();

    if (periodoError) throw periodoError;

    return this.obtenerSaldosActuales(empresaId, periodo.fecha_fin);
  },

  async calcularSaldoCuenta(
    cuentaId: string,
    empresaId: string,
    fechaCorte?: string
  ): Promise<{ deudor: number; acreedor: number; final: number }> {
    let query = supabase
      .from('movimientos_asientos')
      .select('tipo, monto')
      .eq('cuenta_id', cuentaId);

    if (fechaCorte) {
      query = query.lte('asientos_contables.fecha', fechaCorte);
    }

    const { data: movimientos, error } = await query;

    if (error) {
      console.error('Error al calcular saldo:', error);
      return { deudor: 0, acreedor: 0, final: 0 };
    }

    let deudor = 0;
    let acreedor = 0;

    (movimientos || []).forEach((mov) => {
      if (mov.tipo === 'debito') {
        deudor += mov.monto;
      } else {
        acreedor += mov.monto;
      }
    });

    const final = deudor - acreedor;

    return { deudor, acreedor, final };
  },

  filtrarCuentas(cuentas: CuentaBalance[], prefijo: string): CuentaBalance[] {
    return cuentas.filter(c => c.codigo.startsWith(prefijo));
  },

  construirJerarquia(cuentas: CuentaBalance[]): CuentaBalance[] {
    const cuentasPorCodigo = new Map<string, CuentaBalance>();
    const raices: CuentaBalance[] = [];

    cuentas.forEach(cuenta => {
      cuentasPorCodigo.set(cuenta.codigo, { ...cuenta, subcuentas: [] });
    });

    cuentas.forEach(cuenta => {
      const cuentaActual = cuentasPorCodigo.get(cuenta.codigo)!;

      if (cuenta.padre_codigo) {
        const padre = cuentasPorCodigo.get(cuenta.padre_codigo);
        if (padre) {
          if (!padre.subcuentas) padre.subcuentas = [];
          padre.subcuentas.push(cuentaActual);
        } else {
          raices.push(cuentaActual);
        }
      } else {
        raices.push(cuentaActual);
      }
    });

    return raices;
  },

  calcularTotal(cuentas: CuentaBalance[]): number {
    return cuentas.reduce((sum, cuenta) => {
      if (cuenta.es_titulo && cuenta.subcuentas) {
        return sum + this.calcularTotal(cuenta.subcuentas);
      }
      return sum + Math.abs(cuenta.saldo_final);
    }, 0);
  },

  async obtenerPeriodosCerrados(empresaId: string) {
    const { data, error } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('estado', 'cerrado')
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
