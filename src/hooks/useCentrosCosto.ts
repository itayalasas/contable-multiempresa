import { useState, useEffect } from 'react';
import { centrosCostoService, CentroCosto, AnalisisRentabilidad } from '../services/supabase/centrosCosto';

export function useCentrosCosto(empresaId: string | undefined) {
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState({
    totalCentros: 0,
    activos: 0,
    inactivos: 0,
    totalPresupuesto: 0,
    porTipo: {} as Record<string, number>
  });

  const cargarCentros = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [data, stats] = await Promise.all([
        centrosCostoService.obtenerTodos(empresaId),
        centrosCostoService.obtenerEstadisticas(empresaId)
      ]);
      setCentros(data);
      setEstadisticas(stats);
    } catch (err: any) {
      console.error('Error al cargar centros de costo:', err);
      setError(err.message || 'Error al cargar centros de costo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCentros();
  }, [empresaId]);

  const crearCentro = async (centro: Omit<CentroCosto, 'id' | 'fecha_creacion' | 'fecha_modificacion'>) => {
    try {
      await centrosCostoService.crear(centro);
      await cargarCentros();
    } catch (err: any) {
      console.error('Error al crear centro de costo:', err);
      throw err;
    }
  };

  const actualizarCentro = async (id: string, cambios: Partial<CentroCosto>) => {
    try {
      await centrosCostoService.actualizar(id, cambios);
      await cargarCentros();
    } catch (err: any) {
      console.error('Error al actualizar centro de costo:', err);
      throw err;
    }
  };

  const eliminarCentro = async (id: string) => {
    try {
      await centrosCostoService.eliminar(id);
      await cargarCentros();
    } catch (err: any) {
      console.error('Error al eliminar centro de costo:', err);
      throw err;
    }
  };

  const obtenerAnalisis = async (
    fechaInicio: string,
    fechaFin: string
  ): Promise<AnalisisRentabilidad[]> => {
    if (!empresaId) return [];
    try {
      return await centrosCostoService.obtenerAnalisisRentabilidad(
        empresaId,
        fechaInicio,
        fechaFin
      );
    } catch (err: any) {
      console.error('Error al obtener análisis:', err);
      throw err;
    }
  };

  return {
    centros,
    loading,
    error,
    estadisticas,
    crearCentro,
    actualizarCentro,
    eliminarCentro,
    obtenerAnalisis,
    recargar: cargarCentros
  };
}
