import { supabase } from '../../config/supabase';

export interface SolicitudAutorizacion {
  id: string;
  empresaId: string;
  tipoOperacion: string;
  tablaAfectada: string;
  registroId: string;
  datosRegistro: any;
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
      .from('solicitudes_autorizacion')
      .insert({
        empresa_id: params.empresaId,
        tipo_operacion: params.tipoOperacion,
        tipo_entidad: params.tablaAfectada,
        entidad_id: params.registroId,
        entidad_data: params.datosRegistro,
        motivo: params.motivo,
        solicitado_por: params.solicitadoPor,
        estado: 'PENDIENTE',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      empresaId: data.empresa_id,
      tipoOperacion: data.tipo_operacion,
      tablaAfectada: data.tipo_entidad,
      registroId: data.entidad_id,
      datosRegistro: data.entidad_data,
      motivo: data.motivo,
      estado: data.estado,
      solicitadoPor: data.solicitado_por,
      fechaSolicitud: data.solicitado_en,
      aprobadoPor: data.revisado_por,
      fechaAprobacion: data.revisado_en,
      comentarioAprobacion: data.comentarios_revision,
      ejecutada: !!data.ejecutado_en,
      fechaEjecucion: data.ejecutado_en,
    };
  },

  async getSolicitudesPendientes(empresaId: string): Promise<SolicitudAutorizacion[]> {
    const { data, error } = await supabase
      .from('solicitudes_autorizacion')
      .select(`
        *,
        usuario_solicitante:usuarios!solicitudes_autorizacion_solicitado_por_fkey(id, nombre),
        usuario_revisor:usuarios!solicitudes_autorizacion_revisado_por_fkey(id, nombre)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado', 'PENDIENTE')
      .order('solicitado_en', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_operacion,
      tablaAfectada: item.tipo_entidad,
      registroId: item.entidad_id,
      datosRegistro: item.entidad_data,
      motivo: item.motivo,
      estado: item.estado,
      solicitadoPor: item.solicitado_por,
      solicitadoPorNombre: item.usuario_solicitante?.nombre || item.solicitado_por,
      fechaSolicitud: item.solicitado_en,
      aprobadoPor: item.revisado_por,
      aprobadoPorNombre: item.usuario_revisor?.nombre,
      fechaAprobacion: item.revisado_en,
      comentarioAprobacion: item.comentarios_revision,
      ejecutada: !!item.ejecutado_en,
      fechaEjecucion: item.ejecutado_en,
    }));
  },

  async getSolicitudes(empresaId: string, estado?: string): Promise<SolicitudAutorizacion[]> {
    let query = supabase
      .from('solicitudes_autorizacion')
      .select(`
        *,
        usuario_solicitante:usuarios!solicitudes_autorizacion_solicitado_por_fkey(id, nombre),
        usuario_revisor:usuarios!solicitudes_autorizacion_revisado_por_fkey(id, nombre)
      `)
      .eq('empresa_id', empresaId)
      .order('solicitado_en', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_operacion,
      tablaAfectada: item.tipo_entidad,
      registroId: item.entidad_id,
      datosRegistro: item.entidad_data,
      motivo: item.motivo,
      estado: item.estado,
      solicitadoPor: item.solicitado_por,
      solicitadoPorNombre: item.usuario_solicitante?.nombre || item.solicitado_por,
      fechaSolicitud: item.solicitado_en,
      aprobadoPor: item.revisado_por,
      aprobadoPorNombre: item.usuario_revisor?.nombre,
      fechaAprobacion: item.revisado_en,
      comentarioAprobacion: item.comentarios_revision,
      ejecutada: !!item.ejecutado_en,
      fechaEjecucion: item.ejecutado_en,
    }));
  },

  async aprobarSolicitud(solicitudId: string, aprobadoPor: string, comentario?: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('ejecutar_eliminacion_movimiento', {
      p_solicitud_id: solicitudId,
      p_aprobado_por: aprobadoPor,
      p_comentario: comentario || null,
    });

    if (error) throw error;

    return data;
  },

  async rechazarSolicitud(solicitudId: string, rechazadoPor: string, comentario: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rechazar_solicitud_autorizacion', {
      p_solicitud_id: solicitudId,
      p_rechazado_por: rechazadoPor,
      p_comentario: comentario,
    });

    if (error) throw error;

    return data;
  },

  async cancelarSolicitud(solicitudId: string): Promise<void> {
    const { error } = await supabase
      .from('solicitudes_autorizacion')
      .update({ estado: 'CANCELADA' })
      .eq('id', solicitudId)
      .eq('estado', 'PENDIENTE');

    if (error) throw error;
  },

  async contarSolicitudesPendientes(empresaId: string): Promise<number> {
    const { count, error } = await supabase
      .from('solicitudes_autorizacion')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('estado', 'PENDIENTE');

    if (error) throw error;

    return count || 0;
  },
};
