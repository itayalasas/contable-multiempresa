import { useState, useEffect, useCallback } from 'react';
import { AsientoContable } from '../types';
import { asientosService } from '../services/firebase/asientos';

export const useAsientosContables = (empresaId: string | undefined) => {
  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar asientos inicialmente
  const cargarAsientos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      const asientosData = await asientosService.getAsientos(empresaId);
      setAsientos(asientosData);
    } catch (err) {
      console.error('Error al cargar asientos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Cargar asientos cuando cambie la empresa
  useEffect(() => {
    cargarAsientos();
  }, [cargarAsientos]);

  // Crear asiento con actualización optimista
  const crearAsiento = useCallback(async (nuevoAsiento: Omit<AsientoContable, 'id'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // ID temporal para el asiento optimista
    const tempId = `temp_${Date.now()}`;
    const asientoOptimista: AsientoContable = {
      ...nuevoAsiento,
      id: tempId
    };

    // 1. Actualización optimista - agregar inmediatamente a la UI
    setAsientos(prev => [asientoOptimista, ...prev]);

    try {
      // 2. Crear en Firebase
      const realId = await asientosService.createAsiento(empresaId, nuevoAsiento);
      
      // 3. Actualizar con el ID real
      setAsientos(prev => prev.map(asiento => 
        asiento.id === tempId 
          ? { ...asiento, id: realId }
          : asiento
      ));

      return realId;
    } catch (error) {
      // 4. Revertir si hay error
      setAsientos(prev => prev.filter(asiento => asiento.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  // Actualizar asiento con actualización optimista
  const actualizarAsiento = useCallback(async (asientoId: string, datos: Partial<AsientoContable>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // Guardar estado anterior para poder revertir
    const asientoAnterior = asientos.find(a => a.id === asientoId);
    if (!asientoAnterior) throw new Error('Asiento no encontrado');

    // 1. Actualización optimista - actualizar inmediatamente en la UI
    setAsientos(prev => prev.map(asiento => 
      asiento.id === asientoId 
        ? { ...asiento, ...datos, fechaModificacion: new Date().toISOString() }
        : asiento
    ));

    try {
      // 2. Actualizar en Firebase
      await asientosService.updateAsiento(empresaId, asientoId, datos);
    } catch (error) {
      // 3. Revertir si hay error
      setAsientos(prev => prev.map(asiento => 
        asiento.id === asientoId ? asientoAnterior : asiento
      ));
      throw error;
    }
  }, [empresaId, asientos]);

  // Eliminar asiento con actualización optimista
  const eliminarAsiento = useCallback(async (asientoId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    // Guardar asiento para poder revertir
    const asientoEliminado = asientos.find(a => a.id === asientoId);
    if (!asientoEliminado) throw new Error('Asiento no encontrado');

    // 1. Actualización optimista - remover inmediatamente de la UI
    setAsientos(prev => prev.filter(asiento => asiento.id !== asientoId));

    try {
      // 2. Eliminar en Firebase
      await asientosService.deleteAsiento(empresaId, asientoId);
    } catch (error) {
      // 3. Revertir si hay error - restaurar el asiento en su posición original
      setAsientos(prev => {
        const newAsientos = [...prev, asientoEliminado];
        // Ordenar por fecha de creación descendente para mantener el orden
        return newAsientos.sort((a, b) => 
          new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
        );
      });
      throw error;
    }
  }, [empresaId, asientos]);

  // Actualizar un asiento específico (útil para cambios externos)
  const actualizarAsientoLocal = useCallback((asientoId: string, datos: Partial<AsientoContable>) => {
    setAsientos(prev => prev.map(asiento => 
      asiento.id === asientoId 
        ? { ...asiento, ...datos }
        : asiento
    ));
  }, []);

  // Agregar asiento local (útil para sincronización)
  const agregarAsientoLocal = useCallback((nuevoAsiento: AsientoContable) => {
    setAsientos(prev => {
      // Verificar si ya existe
      const existe = prev.some(a => a.id === nuevoAsiento.id);
      if (existe) return prev;
      
      // Agregar al inicio y ordenar por fecha
      return [nuevoAsiento, ...prev].sort((a, b) => 
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      );
    });
  }, []);

  // Remover asiento local
  const removerAsientoLocal = useCallback((asientoId: string) => {
    setAsientos(prev => prev.filter(asiento => asiento.id !== asientoId));
  }, []);

  return {
    // Estado
    asientos,
    loading,
    error,
    
    // Operaciones con actualización optimista
    crearAsiento,
    actualizarAsiento,
    eliminarAsiento,
    
    // Operaciones locales
    actualizarAsientoLocal,
    agregarAsientoLocal,
    removerAsientoLocal,
    
    // Utilidades
    recargarAsientos: cargarAsientos,
    limpiarError: () => setError(null)
  };
};