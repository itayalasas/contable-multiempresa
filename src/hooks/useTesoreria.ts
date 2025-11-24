import { useState, useEffect } from 'react';
import { tesoreriaSupabaseService, CuentaBancaria, MovimientoTesoreria } from '../services/supabase/tesoreria';

interface ResumenTesoreria {
  totalCuentas: number;
  saldoTotal: number;
  saldoDisponible: number;
  ingresosDelMes: number;
  egresosDelMes: number;
  movimientosPendientes: number;
  saldoPorMoneda: {
    moneda: string;
    saldo: number;
  }[];
  saldoPorTipoCuenta: {
    tipo: string;
    saldo: number;
  }[];
}

export function useTesoreria(empresaId: string | undefined) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoTesoreria[]>([]);
  const [resumen, setResumen] = useState<ResumenTesoreria>({
    totalCuentas: 0,
    saldoTotal: 0,
    saldoDisponible: 0,
    ingresosDelMes: 0,
    egresosDelMes: 0,
    movimientosPendientes: 0,
    saldoPorMoneda: [],
    saldoPorTipoCuenta: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [cuentasData, movimientosData] = await Promise.all([
        tesoreriaSupabaseService.getCuentasBancarias(empresaId),
        tesoreriaSupabaseService.getMovimientos(empresaId),
      ]);

      // Adaptar formato de cuentas para la vista
      const cuentasAdaptadas = cuentasData.map(cuenta => ({
        ...cuenta,
        id: cuenta.id,
        nombre: cuenta.nombre,
        numero: cuenta.numeroCuenta,
        banco: cuenta.banco,
        tipo: cuenta.tipoCuenta,
        moneda: cuenta.moneda,
        saldoActual: cuenta.saldoActual,
        activa: cuenta.activa,
      }));

      // Adaptar formato de movimientos para la vista
      const movimientosAdaptados = movimientosData.map(mov => ({
        ...mov,
        id: mov.id,
        cuentaId: mov.cuentaBancariaId,
        tipo: mov.tipoMovimiento,
        fecha: mov.fecha,
        monto: mov.monto,
        concepto: mov.descripcion,
        referencia: mov.referencia,
        beneficiario: mov.beneficiario,
        estado: mov.estado || 'CONFIRMADO',
      }));

      setCuentas(cuentasAdaptadas as any);
      setMovimientos(movimientosAdaptados as any);

      // Calcular resumen
      const saldoTotal = cuentasData.reduce((sum, cuenta) => sum + cuenta.saldoActual, 0);
      const cuentasActivas = cuentasData.filter(c => c.activa).length;

      // Calcular ingresos y egresos del mes actual
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const movimientosMes = movimientosData.filter(mov => {
        const fechaMov = new Date(mov.fecha);
        return fechaMov >= primerDiaMes;
      });

      const ingresosMes = movimientosMes
        .filter(m => m.tipoMovimiento === 'INGRESO')
        .reduce((sum, m) => sum + m.monto, 0);

      const egresosMes = movimientosMes
        .filter(m => m.tipoMovimiento === 'EGRESO')
        .reduce((sum, m) => sum + m.monto, 0);

      const movimientosPendientes = movimientosData.filter(m => m.estado === 'PENDIENTE').length;

      // Distribución por tipo de cuenta
      const distribucionPorTipo: { [key: string]: number } = {};
      cuentasData.forEach(cuenta => {
        if (!distribucionPorTipo[cuenta.tipoCuenta]) {
          distribucionPorTipo[cuenta.tipoCuenta] = 0;
        }
        distribucionPorTipo[cuenta.tipoCuenta] += cuenta.saldoActual;
      });

      // Convertir a array para el componente
      const saldoPorTipoCuenta = Object.entries(distribucionPorTipo).map(([tipo, saldo]) => ({
        tipo,
        saldo,
      }));

      // Distribución por moneda
      const distribucionPorMoneda: { [key: string]: number } = {};
      cuentasData.forEach(cuenta => {
        if (!distribucionPorMoneda[cuenta.moneda]) {
          distribucionPorMoneda[cuenta.moneda] = 0;
        }
        distribucionPorMoneda[cuenta.moneda] += cuenta.saldoActual;
      });

      // Convertir a array para el componente
      const saldoPorMoneda = Object.entries(distribucionPorMoneda).map(([moneda, saldo]) => ({
        moneda,
        saldo,
      }));

      setResumen({
        totalCuentas: cuentasActivas,
        saldoTotal,
        saldoDisponible: saldoTotal, // Por ahora es el mismo
        ingresosDelMes: ingresosMes,
        egresosDelMes: egresosMes,
        movimientosPendientes,
        saldoPorMoneda,
        saldoPorTipoCuenta,
      });

    } catch (err: any) {
      console.error('Error cargando datos de tesorería:', err);
      setError(err.message || 'Error al cargar datos de tesorería');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  const crearCuentaBancaria = async (cuenta: Omit<CuentaBancaria, 'id'>) => {
    try {
      const nuevaCuenta = await tesoreriaSupabaseService.createCuentaBancaria(cuenta);
      setCuentas([...cuentas, nuevaCuenta]);
      await cargarDatos(); // Recargar para actualizar resumen
      return nuevaCuenta;
    } catch (err: any) {
      console.error('Error creando cuenta bancaria:', err);
      throw err;
    }
  };

  const crearMovimiento = async (movimiento: Omit<MovimientoTesoreria, 'id'>) => {
    try {
      const nuevoMovimiento = await tesoreriaSupabaseService.createMovimiento(movimiento);
      setMovimientos([nuevoMovimiento, ...movimientos]);
      await cargarDatos(); // Recargar para actualizar saldos
      return nuevoMovimiento;
    } catch (err: any) {
      console.error('Error creando movimiento:', err);
      throw err;
    }
  };

  const actualizarMovimiento = async (movimientoId: string, updates: Partial<MovimientoTesoreria>) => {
    try {
      await tesoreriaSupabaseService.updateMovimiento(movimientoId, updates);
      await cargarDatos(); // Recargar datos
    } catch (err: any) {
      console.error('Error actualizando movimiento:', err);
      throw err;
    }
  };

  return {
    cuentas,
    movimientos,
    resumen,
    loading,
    error,
    crearCuentaBancaria,
    crearMovimiento,
    actualizarMovimiento,
    recargarDatos: cargarDatos,
  };
}
