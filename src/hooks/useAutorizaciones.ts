import { useState, useEffect } from 'react';
import { autorizacionesService, SolicitudAutorizacion } from '../services/supabase/autorizaciones';

export function useAutorizaciones(empresaId: string | undefined) {
  const [solicitudes, setSolicitudes] = useState<SolicitudAutorizacion[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudAutorizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contadorPendientes, setContadorPendientes] = useState(0);

  const cargarSolicitudes = async (estado?: string) => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await autorizacionesService.getSolicitudes(empresaId, estado);
      setSolicitudes(data);

      const pendientes = data.filter(s => s.estado === 'PENDIENTE');
      setSolicitudesPendientes(pendientes);
      setContadorPendientes(pendientes.length);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
      setError(err.message || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const cargarContadorPendientes = async () => {
    if (!empresaId) return;

    try {
      const contador = await autorizacionesService.contarSolicitudesPendientes(empresaId);
      setContadorPendientes(contador);
    } catch (err) {
      console.error('Error cargando contador:', err);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [empresaId]);

  const aprobarSolicitud = async (solicitudId: string, aprobadoPor: string, comentario?: string) => {
    try {
      const resultado = await autorizacionesService.aprobarSolicitud(solicitudId, aprobadoPor, comentario);
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error al aprobar');
      }
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error aprobando solicitud:', err);
      throw err;
    }
  };

  const rechazarSolicitud = async (solicitudId: string, rechazadoPor: string, comentario: string) => {
    try {
      const resultado = await autorizacionesService.rechazarSolicitud(solicitudId, rechazadoPor, comentario);
      if (!resultado.success) {
        throw new Error(resultado.error || 'Error al rechazar');
      }
      await cargarSolicitudes();
      return resultado;
    } catch (err: any) {
      console.error('Error rechazando solicitud:', err);
      throw err;
    }
  };

  const cancelarSolicitud = async (solicitudId: string) => {
    try {
      await autorizacionesService.cancelarSolicitud(solicitudId);
      await cargarSolicitudes();
    } catch (err: any) {
      console.error('Error cancelando solicitud:', err);
      throw err;
    }
  };

  return {
    solicitudes,
    solicitudesPendientes,
    loading,
    error,
    contadorPendientes,
    aprobarSolicitud,
    rechazarSolicitud,
    cancelarSolicitud,
    recargarSolicitudes: cargarSolicitudes,
    cargarContadorPendientes,
  };
}
