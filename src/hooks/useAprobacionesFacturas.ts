import { useState, useEffect } from 'react';
import { aprobacionesService, SolicitudAprobacion } from '../services/supabase/aprobaciones';

export function useAprobacionesFacturas(empresaId: string | undefined) {
  const [solicitudes, setSolicitudes] = useState<SolicitudAprobacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contadorPendientes, setContadorPendientes] = useState(0);

  const cargarSolicitudes = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await aprobacionesService.obtenerTodasSolicitudes(empresaId);
      setSolicitudes(data);

      const pendientes = data.filter(s => s.estado === 'pendiente');
      setContadorPendientes(pendientes.length);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
      setError(err.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [empresaId]);

  const solicitarModificacion = async (
    facturaId: string,
    datosModificados: any,
    motivo: string,
    usuarioId: string
  ) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      const resultado = await aprobacionesService.solicitarModificacion(
        empresaId,
        facturaId,
        datosModificados,
        motivo,
        usuarioId
      );
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error al solicitar modificación:', err);
      throw err;
    }
  };

  const solicitarEliminacion = async (
    facturaId: string,
    motivo: string,
    usuarioId: string
  ) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      const resultado = await aprobacionesService.solicitarEliminacion(
        empresaId,
        facturaId,
        motivo,
        usuarioId
      );
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error al solicitar eliminación:', err);
      throw err;
    }
  };

  const aprobarSolicitud = async (solicitudId: string, aprobadorId: string, comentarios?: string) => {
    try {
      const resultado = await aprobacionesService.aprobarSolicitud(solicitudId, aprobadorId, comentarios);
      if (!resultado.success) {
        throw new Error('Error al aprobar solicitud');
      }
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error aprobando solicitud:', err);
      throw err;
    }
  };

  const rechazarSolicitud = async (solicitudId: string, aprobadorId: string, comentarios: string) => {
    try {
      const resultado = await aprobacionesService.rechazarSolicitud(solicitudId, aprobadorId, comentarios);
      if (!resultado.success) {
        throw new Error('Error al rechazar solicitud');
      }
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error rechazando solicitud:', err);
      throw err;
    }
  };

  return {
    solicitudes,
    loading,
    error,
    contadorPendientes,
    solicitarModificacion,
    solicitarEliminacion,
    aprobarSolicitud,
    rechazarSolicitud,
    recargarSolicitudes: cargarSolicitudes,
  };
}
