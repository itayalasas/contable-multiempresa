import { useState, useEffect, useCallback } from 'react';
import { TesoreriaFirebaseService } from '../services/firebase/tesoreriaFirebase';
import { CuentaBancaria, MovimientoTesoreria, ResumenTesoreria } from '../services/firebase/tesoreria';

export const useTesoreriaFirebase = (empresaId: string | undefined) => {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoTesoreria[]>([]);
  const [resumen, setResumen] = useState<ResumenTesoreria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMockData, setIsLoadingMockData] = useState(false);

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de tesorería desde Firebase...');
      
      // Cargar cuentas bancarias
      const cuentasData = await TesoreriaFirebaseService.getCuentasBancarias(empresaId);
      setCuentas(cuentasData);
      
      // Cargar movimientos de tesorería
      const movimientosData = await TesoreriaFirebaseService.getMovimientosTesoreria(empresaId);
      setMovimientos(movimientosData);
      
      // Calcular resumen
      const resumenData = calcularResumen(cuentasData, movimientosData);
      setResumen(resumenData);
      
      console.log(`✅ Datos cargados: ${cuentasData.length} cuentas, ${movimientosData.length} movimientos`);
    } catch (err) {
      console.error('❌ Error al cargar datos de tesorería:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Cargar datos cuando cambie la empresa
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Calcular resumen de tesorería
  const calcularResumen = (cuentasData: CuentaBancaria[], movimientosData: MovimientoTesoreria[]): ResumenTesoreria => {
    // Calcular saldos totales
    const saldoTotal = cuentasData.reduce((sum, cuenta) => sum + cuenta.saldoActual, 0);
    const saldoDisponible = cuentasData.reduce((sum, cuenta) => sum + cuenta.saldoDisponible, 0);
    
    // Calcular ingresos y egresos del mes actual
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const movimientosDelMes = movimientosData.filter(m => 
      new Date(m.fecha) >= inicioMes && 
      new Date(m.fecha) <= hoy
    );
    
    const ingresosDelMes = movimientosDelMes
      .filter(m => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + m.monto, 0);
    
    const egresosDelMes = movimientosDelMes
      .filter(m => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + m.monto, 0);
    
    // Contar movimientos pendientes
    const movimientosPendientes = movimientosData.filter(m => m.estado === 'PENDIENTE').length;
    
    // Calcular saldos por moneda
    const saldoPorMoneda = new Map<string, number>();
    cuentasData.forEach(cuenta => {
      const saldoActual = saldoPorMoneda.get(cuenta.moneda) || 0;
      saldoPorMoneda.set(cuenta.moneda, saldoActual + cuenta.saldoActual);
    });
    
    // Calcular saldos por tipo de cuenta
    const saldoPorTipoCuenta = new Map<string, number>();
    cuentasData.forEach(cuenta => {
      const saldoActual = saldoPorTipoCuenta.get(cuenta.tipo) || 0;
      saldoPorTipoCuenta.set(cuenta.tipo, saldoActual + cuenta.saldoActual);
    });
    
    return {
      totalCuentas: cuentasData.length,
      saldoTotal,
      saldoDisponible,
      ingresosDelMes,
      egresosDelMes,
      movimientosPendientes,
      saldoPorMoneda: Array.from(saldoPorMoneda.entries()).map(([moneda, saldo]) => ({ moneda, saldo })),
      saldoPorTipoCuenta: Array.from(saldoPorTipoCuenta.entries()).map(([tipo, saldo]) => ({ tipo, saldo }))
    };
  };

  // Cargar datos mock en Firebase
  const cargarDatosMockEnFirebase = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setIsLoadingMockData(true);
      setError(null);
      
      console.log('🔄 Cargando datos mock en Firebase...');
      
      await TesoreriaFirebaseService.cargarDatosMockEnFirebase(empresaId);
      
      // Recargar datos después de cargar los mock
      await cargarDatos();
      
      console.log('✅ Datos mock cargados exitosamente en Firebase');
      return true;
    } catch (err) {
      console.error('❌ Error al cargar datos mock en Firebase:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setIsLoadingMockData(false);
    }
  }, [empresaId, cargarDatos]);

  // Crear cuenta bancaria
  const crearCuentaBancaria = useCallback(async (cuenta: Omit<CuentaBancaria, 'id' | 'fechaCreacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      const cuentaId = await TesoreriaFirebaseService.crearCuentaBancaria(empresaId, cuenta);
      
      // Actualizar estado local
      const nuevaCuenta: CuentaBancaria = {
        ...cuenta,
        id: cuentaId,
        empresaId,
        fechaCreacion: new Date()
      };
      
      setCuentas(prev => [...prev, nuevaCuenta]);
      
      // Actualizar resumen
      const nuevoResumen = calcularResumen([...cuentas, nuevaCuenta], movimientos);
      setResumen(nuevoResumen);
      
      return cuentaId;
    } catch (error) {
      console.error('Error creando cuenta bancaria:', error);
      throw error;
    }
  }, [empresaId, cuentas, movimientos]);

  // Actualizar cuenta bancaria
  const actualizarCuentaBancaria = useCallback(async (cuentaId: string, datos: Partial<CuentaBancaria>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      await TesoreriaFirebaseService.actualizarCuentaBancaria(empresaId, cuentaId, datos);
      
      // Actualizar estado local
      setCuentas(prev => prev.map(cuenta => 
        cuenta.id === cuentaId ? { ...cuenta, ...datos } : cuenta
      ));
      
      // Actualizar resumen
      const cuentasActualizadas = cuentas.map(cuenta => 
        cuenta.id === cuentaId ? { ...cuenta, ...datos } : cuenta
      );
      const nuevoResumen = calcularResumen(cuentasActualizadas, movimientos);
      setResumen(nuevoResumen);
    } catch (error) {
      console.error('Error actualizando cuenta bancaria:', error);
      throw error;
    }
  }, [empresaId, cuentas, movimientos]);

  // Eliminar cuenta bancaria
  const eliminarCuentaBancaria = useCallback(async (cuentaId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      await TesoreriaFirebaseService.eliminarCuentaBancaria(empresaId, cuentaId);
      
      // Actualizar estado local
      setCuentas(prev => prev.filter(cuenta => cuenta.id !== cuentaId));
      
      // Actualizar resumen
      const cuentasActualizadas = cuentas.filter(cuenta => cuenta.id !== cuentaId);
      const nuevoResumen = calcularResumen(cuentasActualizadas, movimientos);
      setResumen(nuevoResumen);
    } catch (error) {
      console.error('Error eliminando cuenta bancaria:', error);
      throw error;
    }
  }, [empresaId, cuentas, movimientos]);

  // Crear movimiento de tesorería
  const crearMovimientoTesoreria = useCallback(async (movimiento: Omit<MovimientoTesoreria, 'id' | 'fechaCreacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      const movimientoId = await TesoreriaFirebaseService.crearMovimientoTesoreria(empresaId, movimiento);
      
      // Actualizar estado local
      const nuevoMovimiento: MovimientoTesoreria = {
        ...movimiento,
        id: movimientoId,
        empresaId,
        fechaCreacion: new Date().toISOString()
      };
      
      setMovimientos(prev => [nuevoMovimiento, ...prev]);
      
      // Actualizar cuentas y resumen
      await cargarDatos(); // Recargar todos los datos para tener saldos actualizados
      
      return movimientoId;
    } catch (error) {
      console.error('Error creando movimiento de tesorería:', error);
      throw error;
    }
  }, [empresaId, cargarDatos]);

  // Actualizar movimiento de tesorería
  const actualizarMovimientoTesoreria = useCallback(async (movimientoId: string, datos: Partial<MovimientoTesoreria>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      await TesoreriaFirebaseService.actualizarMovimientoTesoreria(empresaId, movimientoId, datos);
      
      // Actualizar estado local
      setMovimientos(prev => prev.map(movimiento => 
        movimiento.id === movimientoId ? { ...movimiento, ...datos } : movimiento
      ));
    } catch (error) {
      console.error('Error actualizando movimiento de tesorería:', error);
      throw error;
    }
  }, [empresaId]);

  // Eliminar movimiento de tesorería
  const eliminarMovimientoTesoreria = useCallback(async (movimientoId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      await TesoreriaFirebaseService.eliminarMovimientoTesoreria(empresaId, movimientoId);
      
      // Actualizar estado local
      setMovimientos(prev => prev.filter(movimiento => movimiento.id !== movimientoId));
      
      // Actualizar cuentas y resumen
      await cargarDatos(); // Recargar todos los datos para tener saldos actualizados
    } catch (error) {
      console.error('Error eliminando movimiento de tesorería:', error);
      throw error;
    }
  }, [empresaId, cargarDatos]);

  return {
    // Estado
    cuentas,
    movimientos,
    resumen,
    loading,
    error,
    isLoadingMockData,
    
    // Operaciones
    crearCuentaBancaria,
    actualizarCuentaBancaria,
    eliminarCuentaBancaria,
    crearMovimientoTesoreria,
    actualizarMovimientoTesoreria,
    eliminarMovimientoTesoreria,
    cargarDatosMockEnFirebase,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};