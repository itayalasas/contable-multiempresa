import { useState, useEffect, useCallback } from 'react';
import { PlanCuenta } from '../types';
import { 
  obtenerPlanCuentas, 
  crearCuenta, 
  actualizarCuenta, 
  eliminarCuenta 
} from '../services/firebase/planCuentas';

export const usePlanCuentas = (empresaId: string | undefined) => {
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar cuentas inicialmente
  const cargarCuentas = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      const cuentasData = await obtenerPlanCuentas(empresaId);
      setCuentas(cuentasData);
    } catch (err) {
      console.error('Error al cargar cuentas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Cargar cuentas cuando cambie la empresa
  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  // Crear cuenta con actualización optimista
  const crearCuentaOptimista = useCallback(async (nuevaCuenta: Omit<PlanCuenta, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // ID temporal para la cuenta optimista
    const tempId = `temp_${Date.now()}`;
    const cuentaOptimista: PlanCuenta = {
      ...nuevaCuenta,
      id: tempId,
      empresaId,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };

    // 1. Actualización optimista - agregar inmediatamente a la UI
    setCuentas(prev => [...prev, cuentaOptimista]);

    try {
      // 2. Crear en Firebase
      const realId = await crearCuenta(empresaId, nuevaCuenta);
      
      // 3. Actualizar con el ID real
      setCuentas(prev => prev.map(cuenta => 
        cuenta.id === tempId 
          ? { ...cuenta, id: realId }
          : cuenta
      ));

      return realId;
    } catch (error) {
      // 4. Revertir si hay error
      setCuentas(prev => prev.filter(cuenta => cuenta.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  // Actualizar cuenta con actualización optimista
  const actualizarCuentaOptimista = useCallback(async (cuentaId: string, datos: Partial<PlanCuenta>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // Guardar estado anterior para poder revertir
    const cuentaAnterior = cuentas.find(c => c.id === cuentaId);
    if (!cuentaAnterior) throw new Error('Cuenta no encontrada');

    // 1. Actualización optimista - actualizar inmediatamente en la UI
    setCuentas(prev => prev.map(cuenta => 
      cuenta.id === cuentaId 
        ? { ...cuenta, ...datos, fechaModificacion: new Date() }
        : cuenta
    ));

    try {
      // 2. Actualizar en Firebase
      await actualizarCuenta(empresaId, cuentaId, datos);
    } catch (error) {
      // 3. Revertir si hay error
      setCuentas(prev => prev.map(cuenta => 
        cuenta.id === cuentaId ? cuentaAnterior : cuenta
      ));
      throw error;
    }
  }, [empresaId, cuentas]);

  // Eliminar cuenta con actualización optimista
  const eliminarCuentaOptimista = useCallback(async (cuentaId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // Guardar cuenta para poder revertir
    const cuentaEliminada = cuentas.find(c => c.id === cuentaId);
    if (!cuentaEliminada) throw new Error('Cuenta no encontrada');

    // 1. Actualización optimista - remover inmediatamente de la UI
    setCuentas(prev => prev.filter(cuenta => cuenta.id !== cuentaId));

    try {
      // 2. Eliminar en Firebase
      await eliminarCuenta(empresaId, cuentaId);
    } catch (error) {
      // 3. Revertir si hay error - restaurar la cuenta
      setCuentas(prev => [...prev, cuentaEliminada].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      throw error;
    }
  }, [empresaId, cuentas]);

  // Actualizar una cuenta específica (útil para cambios externos)
  const actualizarCuentaLocal = useCallback((cuentaId: string, datos: Partial<PlanCuenta>) => {
    setCuentas(prev => prev.map(cuenta => 
      cuenta.id === cuentaId 
        ? { ...cuenta, ...datos }
        : cuenta
    ));
  }, []);

  // Agregar cuenta local (útil para sincronización)
  const agregarCuentaLocal = useCallback((nuevaCuenta: PlanCuenta) => {
    setCuentas(prev => {
      // Verificar si ya existe
      const existe = prev.some(c => c.id === nuevaCuenta.id);
      if (existe) return prev;
      
      // Agregar y ordenar
      return [...prev, nuevaCuenta].sort((a, b) => a.codigo.localeCompare(b.codigo));
    });
  }, []);

  // Remover cuenta local
  const removerCuentaLocal = useCallback((cuentaId: string) => {
    setCuentas(prev => prev.filter(cuenta => cuenta.id !== cuentaId));
  }, []);

  return {
    // Estado
    cuentas,
    loading,
    error,
    
    // Operaciones con actualización optimista
    crearCuenta: crearCuentaOptimista,
    actualizarCuenta: actualizarCuentaOptimista,
    eliminarCuenta: eliminarCuentaOptimista,
    
    // Operaciones locales
    actualizarCuentaLocal,
    agregarCuentaLocal,
    removerCuentaLocal,
    
    // Utilidades
    recargarCuentas: cargarCuentas,
    limpiarError: () => setError(null)
  };
};