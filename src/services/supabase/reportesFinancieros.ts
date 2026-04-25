import { supabase } from '../../config/supabase';

export interface EstadoResultadosLinea {
  codigo: string;
  nombre: string;
  monto: number;
}

export interface EstadoResultadosData {
  ingresos: EstadoResultadosLinea[];
  gastos: EstadoResultadosLinea[];
  totalIngresos: number;
  totalGastos: number;
  resultadoNeto: number;
}

export interface FlujoEfectivoData {
  ingresosOperativos: number;
  egresosOperativos: number;
  transferenciasNetas: number;
  flujoNeto: number;
}

interface MovimientoEstadoResultados {
  debito: number;
  credito: number;
  plan_cuentas?: {
    codigo?: string;
    nombre?: string;
    tipo?: string;
  } | null;
}

interface MovimientoFlujo {
  tipo_movimiento: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  monto: number;
}

export function buildEstadoResultados(
  movimientos: MovimientoEstadoResultados[],
): EstadoResultadosData {
  const ingresosMap = new Map<string, EstadoResultadosLinea>();
  const gastosMap = new Map<string, EstadoResultadosLinea>();

  for (const movimiento of movimientos) {
    const cuenta = movimiento.plan_cuentas;
    if (!cuenta?.tipo || !cuenta.codigo || !cuenta.nombre) continue;

    if (cuenta.tipo === 'INGRESO') {
      const current = ingresosMap.get(cuenta.codigo) || { codigo: cuenta.codigo, nombre: cuenta.nombre, monto: 0 };
      current.monto += Number(movimiento.credito || 0) - Number(movimiento.debito || 0);
      ingresosMap.set(cuenta.codigo, current);
    }

    if (cuenta.tipo === 'GASTO') {
      const current = gastosMap.get(cuenta.codigo) || { codigo: cuenta.codigo, nombre: cuenta.nombre, monto: 0 };
      current.monto += Number(movimiento.debito || 0) - Number(movimiento.credito || 0);
      gastosMap.set(cuenta.codigo, current);
    }
  }

  const ingresos = Array.from(ingresosMap.values()).filter((linea) => Math.abs(linea.monto) > 0.009);
  const gastos = Array.from(gastosMap.values()).filter((linea) => Math.abs(linea.monto) > 0.009);
  const totalIngresos = ingresos.reduce((sum, item) => sum + item.monto, 0);
  const totalGastos = gastos.reduce((sum, item) => sum + item.monto, 0);

  return {
    ingresos,
    gastos,
    totalIngresos,
    totalGastos,
    resultadoNeto: totalIngresos - totalGastos,
  };
}

export function buildFlujoEfectivo(movimientos: MovimientoFlujo[]): FlujoEfectivoData {
  return movimientos.reduce<FlujoEfectivoData>((acc, movimiento) => {
    const monto = Number(movimiento.monto || 0);
    if (movimiento.tipo_movimiento === 'INGRESO') acc.ingresosOperativos += monto;
    if (movimiento.tipo_movimiento === 'EGRESO') acc.egresosOperativos += monto;
    if (movimiento.tipo_movimiento === 'TRANSFERENCIA') acc.transferenciasNetas += monto;
    acc.flujoNeto = acc.ingresosOperativos - acc.egresosOperativos;
    return acc;
  }, {
    ingresosOperativos: 0,
    egresosOperativos: 0,
    transferenciasNetas: 0,
    flujoNeto: 0,
  });
}

export const reportesFinancierosService = {
  async obtenerEstadoResultados(empresaId: string, fechaInicio?: string, fechaFin?: string): Promise<EstadoResultadosData> {
    let query = supabase
      .from('movimientos_contables')
      .select(`
        debito,
        credito,
        plan_cuentas (
          codigo,
          nombre,
          tipo
        ),
        asientos_contables!inner (
          empresa_id,
          fecha,
          estado,
          eliminado
        )
      `)
      .eq('asientos_contables.empresa_id', empresaId)
      .eq('asientos_contables.estado', 'confirmado')
      .eq('asientos_contables.eliminado', false);

    if (fechaInicio) query = query.gte('asientos_contables.fecha', fechaInicio);
    if (fechaFin) query = query.lte('asientos_contables.fecha', fechaFin);

    const { data, error } = await query;
    if (error) throw error;

    return buildEstadoResultados(data as MovimientoEstadoResultados[]);
  },

  async obtenerFlujoEfectivo(empresaId: string, fechaInicio?: string, fechaFin?: string): Promise<FlujoEfectivoData> {
    let query = supabase
      .from('movimientos_tesoreria')
      .select('tipo_movimiento, monto')
      .eq('empresa_id', empresaId)
      .eq('eliminado', false);

    if (fechaInicio) query = query.gte('fecha', fechaInicio);
    if (fechaFin) query = query.lte('fecha', fechaFin);

    const { data, error } = await query;
    if (error) throw error;

    return buildFlujoEfectivo((data || []) as MovimientoFlujo[]);
  },
};
