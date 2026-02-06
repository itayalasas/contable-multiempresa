import { useState, useEffect } from 'react';
import {
  ConfiguracionAprobacion,
  obtenerConfiguracionAprobaciones,
  obtenerConfiguracionPorModulo,
  actualizarConfiguracionAprobacion,
  toggleRequiereAprobacion,
  verificarRequiereAprobacion,
  obtenerResumenPorModulo,
} from '../services/supabase/configuracionAprobaciones';

export const useConfiguracionAprobaciones = (empresaId?: string) => {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionAprobacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumenPorModulo, setResumenPorModulo] = useState<
    { modulo: string; total: number; activas: number; requieren_aprobacion: number }[]
  >([]);

  const cargarConfiguraciones = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await obtenerConfiguracionAprobaciones(empresaId);
      setConfiguraciones(data);

      const resumen = await obtenerResumenPorModulo(empresaId);
      setResumenPorModulo(resumen);
    } catch (err: any) {
      console.error('Error al cargar configuraciones:', err);
      setError(err.message || 'Error al cargar configuraciones de aprobaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfiguraciones();
  }, [empresaId]);

  const cargarPorModulo = async (modulo: string) => {
    if (!empresaId) return [];

    try {
      setLoading(true);
      setError(null);
      const data = await obtenerConfiguracionPorModulo(empresaId, modulo);
      return data;
    } catch (err: any) {
      console.error('Error al cargar configuraciones por módulo:', err);
      setError(err.message || 'Error al cargar configuraciones por módulo');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const actualizarConfiguracion = async (
    id: string,
    cambios: Partial<ConfiguracionAprobacion>,
    usuarioId?: string
  ) => {
    try {
      await actualizarConfiguracionAprobacion(id, cambios, usuarioId);
      await cargarConfiguraciones();
    } catch (err: any) {
      console.error('Error al actualizar configuración:', err);
      throw err;
    }
  };

  const cambiarRequiereAprobacion = async (
    id: string,
    requiere: boolean,
    usuarioId?: string
  ) => {
    try {
      await toggleRequiereAprobacion(id, requiere, usuarioId);
      await cargarConfiguraciones();
    } catch (err: any) {
      console.error('Error al cambiar requiere aprobación:', err);
      throw err;
    }
  };

  const verificarSiRequiereAprobacion = async (
    modulo: string,
    entidad: string,
    accion: 'crear' | 'editar' | 'eliminar'
  ): Promise<boolean> => {
    if (!empresaId) return false;

    try {
      return await verificarRequiereAprobacion(empresaId, modulo, entidad, accion);
    } catch (err: any) {
      console.error('Error al verificar si requiere aprobación:', err);
      return false;
    }
  };

  const obtenerConfiguracionesPorModulo = (modulo: string) => {
    return configuraciones.filter(c => c.modulo === modulo);
  };

  const obtenerModulosUnicos = () => {
    const modulos = [...new Set(configuraciones.map(c => c.modulo))];
    return modulos.sort();
  };

  return {
    configuraciones,
    loading,
    error,
    resumenPorModulo,
    cargarConfiguraciones,
    cargarPorModulo,
    actualizarConfiguracion,
    cambiarRequiereAprobacion,
    verificarSiRequiereAprobacion,
    obtenerConfiguracionesPorModulo,
    obtenerModulosUnicos,
  };
};
