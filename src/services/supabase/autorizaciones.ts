import { supabase } from '../../config/supabase';
import { AuthService } from '../auth/authService';

export interface SolicitudAutorizacion {
  id: string;
  empresaId: string;
  tipoOperacion: string;
  tablaAfectada: string;
  registroId: string;
  datosRegistro: any;
  datosModificados?: any;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
  solicitadoPor: string;
  solicitadoPorNombre?: string;
  fechaSolicitud: string;
  aprobadoPor?: string | null;
  aprobadoPorNombre?: string | null;
  fechaAprobacion?: string | null;
  comentarioAprobacion?: string | null;
  ejecutada: boolean;
  fechaEjecucion?: string | null;
}

export const autorizacionesService = {
  async crearSolicitudEliminacion(params: {
    empresaId: string;
    tipoOperacion: string;
    tablaAfectada: string;
    registroId: string;
    datosRegistro: any;
    motivo: string;
    solicitadoPor: string;
  }): Promise<SolicitudAutorizacion> {
    const { data, error } = await supabase
      .from('solicitudes_aprobacion')
      .insert({
        empresa_id: params.empresaId,
        tipo_solicitud: params.tipoOperacion,
        tabla_afectada: params.tablaAfectada,
        registro_id: params.registroId,
        datos_originales: params.datosRegistro,
        motivo: params.motivo,
        solicitante_id: params.solicitadoPor,
        estado: 'pendiente',
        fecha_solicitud: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      empresaId: data.empresa_id,
      tipoOperacion: data.tipo_solicitud,
      tablaAfectada: data.tabla_afectada,
      registroId: data.registro_id,
      datosRegistro: data.datos_originales,
      datosModificados: data.datos_modificados,
      motivo: data.motivo,
      estado: data.estado.toUpperCase() as 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA',
      solicitadoPor: data.solicitante_id,
      fechaSolicitud: data.fecha_solicitud,
      aprobadoPor: data.aprobador_id,
      fechaAprobacion: data.fecha_respuesta,
      comentarioAprobacion: data.comentarios_aprobador,
      ejecutada: data.estado === 'aprobada',
      fechaEjecucion: data.fecha_respuesta,
    };
  },

  async getSolicitudesPendientes(empresaId: string): Promise<SolicitudAutorizacion[]> {
    const { data, error } = await supabase
      .from('solicitudes_aprobacion')
      .select(`
        *,
        usuario_solicitante:usuarios!solicitudes_aprobacion_solicitante_id_fkey(id, nombre),
        usuario_aprobador:usuarios!solicitudes_aprobacion_aprobador_id_fkey(id, nombre)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado', 'pendiente')
      .order('fecha_solicitud', { ascending: false });

    if (error) {
      console.error('Error obteniendo solicitudes pendientes:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_solicitud,
      tablaAfectada: item.tabla_afectada,
      registroId: item.registro_id,
      datosRegistro: item.datos_originales,
      datosModificados: item.datos_modificados,
      motivo: item.motivo,
      estado: item.estado.toUpperCase() as 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA',
      solicitadoPor: item.solicitante_id,
      solicitadoPorNombre: item.usuario_solicitante?.nombre || item.solicitante_id,
      fechaSolicitud: item.fecha_solicitud,
      aprobadoPor: item.aprobador_id,
      aprobadoPorNombre: item.usuario_aprobador?.nombre,
      fechaAprobacion: item.fecha_respuesta,
      comentarioAprobacion: item.comentarios_aprobador,
      ejecutada: item.estado === 'aprobada',
      fechaEjecucion: item.fecha_respuesta,
    }));
  },

  async getSolicitudes(empresaId: string, estado?: string): Promise<SolicitudAutorizacion[]> {
    let query = supabase
      .from('solicitudes_aprobacion')
      .select(`
        *,
        usuario_solicitante:usuarios!solicitudes_aprobacion_solicitante_id_fkey(id, nombre),
        usuario_aprobador:usuarios!solicitudes_aprobacion_aprobador_id_fkey(id, nombre)
      `)
      .eq('empresa_id', empresaId)
      .order('fecha_solicitud', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado.toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo solicitudes:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_solicitud,
      tablaAfectada: item.tabla_afectada,
      registroId: item.registro_id,
      datosRegistro: item.datos_originales,
      datosModificados: item.datos_modificados,
      motivo: item.motivo,
      estado: item.estado.toUpperCase() as 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA',
      solicitadoPor: item.solicitante_id,
      solicitadoPorNombre: item.usuario_solicitante?.nombre || item.solicitante_id,
      fechaSolicitud: item.fecha_solicitud,
      aprobadoPor: item.aprobador_id,
      aprobadoPorNombre: item.usuario_aprobador?.nombre,
      fechaAprobacion: item.fecha_respuesta,
      comentarioAprobacion: item.comentarios_aprobador,
      ejecutada: item.estado === 'aprobada',
      fechaEjecucion: item.fecha_respuesta,
    }));
  },

  async aprobarSolicitud(solicitudId: string, aprobadoPor: string, comentario?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aprobar-rechazar-solicitud`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...AuthService.getSupabaseEdgeHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solicitudId,
          accion: 'aprobar',
          aprobadorId: aprobadoPor,
          comentarios: comentario || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al aprobar solicitud' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error aprobando solicitud:', error);
      return { success: false, error: error.message };
    }
  },

  async rechazarSolicitud(solicitudId: string, rechazadoPor: string, comentario: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aprobar-rechazar-solicitud`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...AuthService.getSupabaseEdgeHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solicitudId,
          accion: 'rechazar',
          aprobadorId: rechazadoPor,
          comentarios: comentario,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al rechazar solicitud' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error rechazando solicitud:', error);
      return { success: false, error: error.message };
    }
  },

  async cancelarSolicitud(solicitudId: string): Promise<void> {
    const { error } = await supabase
      .from('solicitudes_aprobacion')
      .update({ estado: 'cancelada' })
      .eq('id', solicitudId)
      .eq('estado', 'pendiente');

    if (error) throw error;
  },

  async contarSolicitudesPendientes(empresaId: string): Promise<number> {
    const { count, error } = await supabase
      .from('solicitudes_aprobacion')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('estado', 'pendiente');

    if (error) throw error;

    return count || 0;
  },
};
