import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  conciliacionSupabaseService,
  MovimientoBancarioConciliacion,
  MovimientoContableConciliacion,
  ResumenConciliacion,
} from '../services/supabase/conciliacion';

export const useConciliacion = (empresaId: string | undefined) => {
  const { usuario } = useAuth();
  const [movimientosBancarios, setMovimientosBancarios] = useState<MovimientoBancarioConciliacion[]>([]);
  const [movimientosContables, setMovimientosContables] = useState<MovimientoContableConciliacion[]>([]);
  const [resumen, setResumen] = useState<ResumenConciliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string | undefined>(undefined);
  const [fechaInicio, setFechaInicio] = useState<string | undefined>(undefined);
  const [fechaFin, setFechaFin] = useState<string | undefined>(undefined);

  const cargarDatos = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [bancarios, contables, resumenData] = await Promise.all([
        conciliacionSupabaseService.getMovimientosBancarios(empresaId, cuentaSeleccionada, fechaInicio, fechaFin),
        conciliacionSupabaseService.getMovimientosContables(empresaId, cuentaSeleccionada, fechaInicio, fechaFin),
        conciliacionSupabaseService.getResumen(empresaId, cuentaSeleccionada, fechaInicio, fechaFin),
      ]);

      setMovimientosBancarios(bancarios);
      setMovimientosContables(contables);
      setResumen(resumenData);
    } catch (err) {
      console.error('Error cargando conciliación:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId, cuentaSeleccionada, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const conciliarMovimientos = useCallback(async (
    movimientoBancario: MovimientoBancarioConciliacion,
    movimientoContable: MovimientoContableConciliacion,
  ) => {
    await conciliacionSupabaseService.conciliarMovimientos(movimientoBancario.id, movimientoContable.id);
    await cargarDatos();
    return true;
  }, [cargarDatos]);

  const revertirConciliacion = useCallback(async (
    movimientoBancarioId: string,
    movimientoContableId: string,
  ) => {
    await conciliacionSupabaseService.revertirConciliacion(movimientoBancarioId, movimientoContableId);
    await cargarDatos();
    return true;
  }, [cargarDatos]);

  const importarExtractoBancario = useCallback(async (
    file: File,
    cuentaId: string,
    _formato: string,
    _configuracionId?: string,
  ) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');
    if (!usuario?.id) throw new Error('No se pudo identificar el usuario actual');

    const cantidad = await conciliacionSupabaseService.importarExtractoBancario({
      empresaId,
      cuentaId,
      usuarioId: usuario.id,
      file,
    });

    setCuentaSeleccionada(cuentaId);
    await cargarDatos();
    return cantidad;
  }, [empresaId, usuario?.id, cargarDatos]);

  return {
    movimientosBancarios,
    movimientosContables,
    resumen,
    loading,
    error,
    isLoadingMockData: false,
    cuentaSeleccionada,
    fechaInicio,
    fechaFin,
    setCuentaSeleccionada,
    setFechaInicio,
    setFechaFin,
    conciliarMovimientos,
    revertirConciliacion,
    importarExtractoBancario,
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null),
  };
};
