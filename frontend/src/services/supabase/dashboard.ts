import { supabase } from '../../config/supabase';

export interface DashboardStats {
  totalAsientos: number;
  asientosPendientes: number;
  asientosConfirmados: number;
  totalCuentas: number;
  cuentasActivas: number;
  ultimaActividad: Date | null;
  movimientosRecientes: MovimientoReciente[];
  resumenFinanciero: ResumenFinanciero;
}

export interface MovimientoReciente {
  id: string;
  fecha: string;
  asientoNumero: string;
  descripcion: string;
  monto: number;
  tipo: 'ingreso' | 'gasto' | 'asiento';
  usuario: string;
}

export interface ResumenFinanciero {
  totalIngresos: number;
  totalGastos: number;
  utilidadNeta: number;
  efectivoDisponible: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;
}

export const dashboardSupabaseService = {
  async getDashboardStats(empresaId: string): Promise<DashboardStats> {
    try {
      console.log('📊 Cargando estadísticas del dashboard para empresa:', empresaId);

      const [
        asientos,
        cuentas,
        movimientosRecientes,
        resumenFinanciero
      ] = await Promise.all([
        this.getAsientosStats(empresaId),
        this.getCuentasStats(empresaId),
        this.getMovimientosRecientes(empresaId),
        this.getResumenFinanciero(empresaId)
      ]);

      const stats: DashboardStats = {
        ...asientos,
        ...cuentas,
        movimientosRecientes,
        resumenFinanciero,
        ultimaActividad: this.getUltimaActividad(movimientosRecientes)
      };

      console.log('✅ Estadísticas del dashboard cargadas:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error cargando estadísticas del dashboard:', error);
      throw error;
    }
  },

  async getAsientosStats(empresaId: string): Promise<{
    totalAsientos: number;
    asientosPendientes: number;
    asientosConfirmados: number;
  }> {
    try {
      const { data: asientos, error } = await supabase
        .from('asientos_contables')
        .select('estado')
        .eq('empresa_id', empresaId);

      if (error) throw error;

      const totalAsientos = asientos?.length || 0;
      const asientosPendientes = asientos?.filter(a => a.estado === 'borrador').length || 0;
      const asientosConfirmados = asientos?.filter(a => a.estado === 'confirmado').length || 0;

      return {
        totalAsientos,
        asientosPendientes,
        asientosConfirmados
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de asientos:', error);
      return {
        totalAsientos: 0,
        asientosPendientes: 0,
        asientosConfirmados: 0
      };
    }
  },

  async getCuentasStats(empresaId: string): Promise<{
    totalCuentas: number;
    cuentasActivas: number;
  }> {
    try {
      const { data: cuentas, error } = await supabase
        .from('plan_cuentas')
        .select('activa')
        .eq('empresa_id', empresaId);

      if (error) throw error;

      const totalCuentas = cuentas?.length || 0;
      const cuentasActivas = cuentas?.filter(c => c.activa).length || 0;

      return {
        totalCuentas,
        cuentasActivas
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de cuentas:', error);
      return {
        totalCuentas: 0,
        cuentasActivas: 0
      };
    }
  },

  async getMovimientosRecientes(empresaId: string, limitCount = 10): Promise<MovimientoReciente[]> {
    try {
      const { data: asientos, error } = await supabase
        .from('asientos_contables')
        .select(`
          id,
          numero,
          fecha,
          descripcion,
          creado_por,
          movimientos_contables (
            debito,
            credito
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'confirmado')
        .order('fecha', { ascending: false })
        .limit(limitCount);

      if (error) throw error;

      const movimientos: MovimientoReciente[] = (asientos || []).map(asiento => {
        const totalMonto = (asiento.movimientos_contables || []).reduce(
          (sum: number, mov: any) => sum + (mov.debito || 0),
          0
        );

        return {
          id: asiento.id,
          fecha: asiento.fecha,
          asientoNumero: asiento.numero,
          descripcion: asiento.descripcion || '',
          monto: totalMonto,
          tipo: 'asiento' as const,
          usuario: asiento.creado_por || 'Sistema'
        };
      });

      return movimientos;

    } catch (error) {
      console.error('Error obteniendo movimientos recientes:', error);
      return [];
    }
  },

  async getResumenFinanciero(empresaId: string): Promise<ResumenFinanciero> {
    try {
      // Primero obtenemos los asientos confirmados de la empresa
      const { data: asientos, error: asientosError } = await supabase
        .from('asientos_contables')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('estado', 'confirmado');

      if (asientosError) throw asientosError;

      if (!asientos || asientos.length === 0) {
        return {
          totalIngresos: 0,
          totalGastos: 0,
          utilidadNeta: 0,
          efectivoDisponible: 0,
          cuentasPorCobrar: 0,
          cuentasPorPagar: 0
        };
      }

      const asientoIds = asientos.map(a => a.id);

      // Luego obtenemos los movimientos de esos asientos con sus cuentas
      const { data: movimientos, error } = await supabase
        .from('movimientos_contables')
        .select(`
          debito,
          credito,
          cuenta_id,
          plan_cuentas (
            tipo,
            codigo
          )
        `)
        .in('asiento_id', asientoIds);

      if (error) throw error;

      let totalIngresos = 0;
      let totalGastos = 0;
      let efectivoDisponible = 0;
      let cuentasPorCobrar = 0;
      let cuentasPorPagar = 0;

      (movimientos || []).forEach((mov: any) => {
        const debe = mov.debito || 0;
        const haber = mov.credito || 0;
        const tipoCuenta = mov.plan_cuentas?.tipo;
        const codigoCuenta = mov.plan_cuentas?.codigo || '';

        switch (tipoCuenta) {
          case 'INGRESO':
            totalIngresos += haber - debe;
            break;
          case 'GASTO':
            totalGastos += debe - haber;
            break;
          case 'ACTIVO':
            if (codigoCuenta.startsWith('1.1.1')) {
              efectivoDisponible += debe - haber;
            } else if (codigoCuenta.startsWith('1.1.2')) {
              cuentasPorCobrar += debe - haber;
            }
            break;
          case 'PASIVO':
            if (codigoCuenta.startsWith('2.1.1')) {
              cuentasPorPagar += haber - debe;
            }
            break;
        }
      });

      const utilidadNeta = totalIngresos - totalGastos;

      return {
        totalIngresos,
        totalGastos,
        utilidadNeta,
        efectivoDisponible,
        cuentasPorCobrar,
        cuentasPorPagar
      };
    } catch (error) {
      console.error('Error obteniendo resumen financiero:', error);
      return {
        totalIngresos: 0,
        totalGastos: 0,
        utilidadNeta: 0,
        efectivoDisponible: 0,
        cuentasPorCobrar: 0,
        cuentasPorPagar: 0
      };
    }
  },

  getUltimaActividad(movimientos: MovimientoReciente[]): Date | null {
    if (movimientos.length === 0) return null;
    const ultimaFecha = movimientos[0].fecha;
    return ultimaFecha ? new Date(ultimaFecha) : null;
  }
};
