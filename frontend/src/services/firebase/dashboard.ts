import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { AsientoContable, PlanCuenta } from '../../types';

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

export const dashboardService = {
  // Obtener estadísticas completas del dashboard
  async getDashboardStats(empresaId: string): Promise<DashboardStats> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📊 Cargando estadísticas del dashboard para empresa:', empresaId);

      // Cargar datos en paralelo para mejor rendimiento
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

  // Obtener estadísticas de asientos
  async getAsientosStats(empresaId: string): Promise<{
    totalAsientos: number;
    asientosPendientes: number;
    asientosConfirmados: number;
  }> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const snapshot = await getDocs(asientosRef);
      
      let totalAsientos = 0;
      let asientosPendientes = 0;
      let asientosConfirmados = 0;

      snapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        totalAsientos++;
        
        if (asiento.estado === 'borrador') {
          asientosPendientes++;
        } else if (asiento.estado === 'confirmado') {
          asientosConfirmados++;
        }
      });

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

  // Obtener estadísticas de cuentas
  async getCuentasStats(empresaId: string): Promise<{
    totalCuentas: number;
    cuentasActivas: number;
  }> {
    try {
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
      const snapshot = await getDocs(cuentasRef);
      
      let totalCuentas = 0;
      let cuentasActivas = 0;

      snapshot.docs.forEach(doc => {
        const cuenta = doc.data() as PlanCuenta;
        totalCuentas++;
        
        if (cuenta.activa) {
          cuentasActivas++;
        }
      });

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

  // Obtener movimientos recientes
  async getMovimientosRecientes(empresaId: string, limitCount = 10): Promise<MovimientoReciente[]> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      
      // Primero obtener solo los asientos confirmados sin ordenar
      const q = query(
        asientosRef,
        where('estado', '==', 'confirmado')
      );
      
      const snapshot = await getDocs(q);
      const movimientos: MovimientoReciente[] = [];

      snapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        
        // Crear un movimiento por cada asiento
        const totalMonto = asiento.movimientos.reduce((sum, mov) => 
          sum + (mov.debito || 0), 0
        );

        movimientos.push({
          id: doc.id,
          fecha: asiento.fecha,
          asientoNumero: asiento.numero,
          descripcion: asiento.descripcion,
          monto: totalMonto,
          tipo: this.determinarTipoMovimiento(asiento),
          usuario: asiento.creadoPor || 'Sistema'
        });
      });

      // Ordenar por fecha en el cliente y limitar los resultados
      return movimientos
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, limitCount);

    } catch (error) {
      console.error('Error obteniendo movimientos recientes:', error);
      return [];
    }
  },

  // Obtener resumen financiero
  async getResumenFinanciero(empresaId: string): Promise<ResumenFinanciero> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const q = query(
        asientosRef,
        where('estado', '==', 'confirmado')
      );
      
      const snapshot = await getDocs(q);
      
      let totalIngresos = 0;
      let totalGastos = 0;
      let efectivoDisponible = 0;
      let cuentasPorCobrar = 0;
      let cuentasPorPagar = 0;

      // Obtener cuentas para clasificar movimientos
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
      const cuentasSnapshot = await getDocs(cuentasRef);
      const cuentasMap = new Map<string, PlanCuenta>();
      
      cuentasSnapshot.docs.forEach(doc => {
        cuentasMap.set(doc.id, { id: doc.id, ...doc.data() } as PlanCuenta);
      });

      // Procesar asientos para calcular totales
      snapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        
        asiento.movimientos.forEach(movimiento => {
          const cuenta = cuentasMap.get(movimiento.cuentaId);
          if (!cuenta) return;

          const debe = movimiento.debito || 0;
          const haber = movimiento.credito || 0;

          // Clasificar según tipo de cuenta
          switch (cuenta.tipo) {
            case 'INGRESO':
              totalIngresos += haber - debe;
              break;
            case 'GASTO':
              totalGastos += debe - haber;
              break;
            case 'ACTIVO':
              if (cuenta.codigo.startsWith('10')) { // Efectivo
                efectivoDisponible += debe - haber;
              } else if (cuenta.codigo.startsWith('12')) { // Cuentas por cobrar
                cuentasPorCobrar += debe - haber;
              }
              break;
            case 'PASIVO':
              if (cuenta.codigo.startsWith('42')) { // Cuentas por pagar
                cuentasPorPagar += haber - debe;
              }
              break;
          }
        });
      });

      const utilidadNeta = totalIngresos - totalGastos;

      return {
        totalIngresos: Math.max(0, totalIngresos),
        totalGastos: Math.max(0, totalGastos),
        utilidadNeta,
        efectivoDisponible: Math.max(0, efectivoDisponible),
        cuentasPorCobrar: Math.max(0, cuentasPorCobrar),
        cuentasPorPagar: Math.max(0, cuentasPorPagar)
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

  // Determinar tipo de movimiento basado en las cuentas involucradas
  determinarTipoMovimiento(asiento: AsientoContable): 'ingreso' | 'gasto' | 'asiento' {
    const descripcion = asiento.descripcion.toLowerCase();
    
    if (descripcion.includes('venta') || descripcion.includes('ingreso') || descripcion.includes('cobro')) {
      return 'ingreso';
    } else if (descripcion.includes('compra') || descripcion.includes('gasto') || descripcion.includes('pago')) {
      return 'gasto';
    }
    
    return 'asiento';
  },

  // Obtener última actividad
  getUltimaActividad(movimientos: MovimientoReciente[]): Date | null {
    if (movimientos.length === 0) return null;
    
    const fechaMasReciente = movimientos[0]?.fecha;
    return fechaMasReciente ? new Date(fechaMasReciente) : null;
  },

  // Obtener datos para gráficos (últimos 6 meses)
  async getDatosGraficos(empresaId: string): Promise<{
    ingresosMensuales: { mes: string; ingresos: number; gastos: number }[];
    distribucionCuentas: { tipo: string; cantidad: number; porcentaje: number }[];
  }> {
    try {
      // Obtener asientos de los últimos 6 meses
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 6);
      
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const q = query(
        asientosRef,
        where('estado', '==', 'confirmado'),
        where('fecha', '>=', fechaInicio.toISOString().split('T')[0])
      );
      
      const snapshot = await getDocs(q);
      
      // Procesar datos para gráficos
      const ingresosPorMes = new Map<string, { ingresos: number; gastos: number }>();
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      // Obtener cuentas para clasificación
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
      const cuentasSnapshot = await getDocs(cuentasRef);
      const cuentasMap = new Map<string, PlanCuenta>();
      const distribucionCuentas = new Map<string, number>();
      
      cuentasSnapshot.docs.forEach(doc => {
        const cuenta = { id: doc.id, ...doc.data() } as PlanCuenta;
        cuentasMap.set(doc.id, cuenta);
        
        // Contar cuentas por tipo
        const tipo = cuenta.tipo;
        distribucionCuentas.set(tipo, (distribucionCuentas.get(tipo) || 0) + 1);
      });

      // Procesar asientos
      snapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        const fecha = new Date(asiento.fecha);
        const mesKey = `${meses[fecha.getMonth()]}`;
        
        if (!ingresosPorMes.has(mesKey)) {
          ingresosPorMes.set(mesKey, { ingresos: 0, gastos: 0 });
        }
        
        const mesData = ingresosPorMes.get(mesKey)!;
        
        asiento.movimientos.forEach(movimiento => {
          const cuenta = cuentasMap.get(movimiento.cuentaId);
          if (!cuenta) return;

          const debe = movimiento.debito || 0;
          const haber = movimiento.credito || 0;

          if (cuenta.tipo === 'INGRESO') {
            mesData.ingresos += haber - debe;
          } else if (cuenta.tipo === 'GASTO') {
            mesData.gastos += debe - haber;
          }
        });
      });

      // Convertir a arrays para los gráficos
      const ingresosMensuales = Array.from(ingresosPorMes.entries()).map(([mes, data]) => ({
        mes,
        ingresos: Math.max(0, data.ingresos),
        gastos: Math.max(0, data.gastos)
      }));

      const totalCuentas = Array.from(distribucionCuentas.values()).reduce((sum, count) => sum + count, 0);
      const distribucionCuentasArray = Array.from(distribucionCuentas.entries()).map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        porcentaje: totalCuentas > 0 ? Math.round((cantidad / totalCuentas) * 100) : 0
      }));

      return {
        ingresosMensuales,
        distribucionCuentas: distribucionCuentasArray
      };
    } catch (error) {
      console.error('Error obteniendo datos para gráficos:', error);
      return {
        ingresosMensuales: [],
        distribucionCuentas: []
      };
    }
  }
};