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
  fechaSolicitud: string;
  aprobadoPor?: string | null;
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
        tabla_afectada: params.tablaAfectada,
        registro_id: params.registroId,
        datos_registro: params.datosRegistro,
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
      tablaAfectada: data.tabla_afectada,
      registroId: data.registro_id,
      datosRegistro: data.datos_registro,
      motivo: data.motivo,
      estado: data.estado,
      solicitadoPor: data.solicitado_por,
      fechaSolicitud: data.fecha_solicitud,
      aprobadoPor: data.aprobado_por,
      fechaAprobacion: data.fecha_aprobacion,
      comentarioAprobacion: data.comentario_aprobacion,
      ejecutada: data.ejecutada,
      fechaEjecucion: data.fecha_ejecucion,
    };
  },

  async getSolicitudesPendientes(empresaId: string): Promise<SolicitudAutorizacion[]> {
    const { data, error } = await supabase
      .from('solicitudes_autorizacion')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('estado', 'PENDIENTE')
      .order('fecha_solicitud', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_operacion,
      tablaAfectada: item.tabla_afectada,
      registroId: item.registro_id,
      datosRegistro: item.datos_registro,
      motivo: item.motivo,
      estado: item.estado,
      solicitadoPor: item.solicitado_por,
      fechaSolicitud: item.fecha_solicitud,
      aprobadoPor: item.aprobado_por,
      fechaAprobacion: item.fecha_aprobacion,
      comentarioAprobacion: item.comentario_aprobacion,
      ejecutada: item.ejecutada,
      fechaEjecucion: item.fecha_ejecucion,
    }));
  },

  async getSolicitudes(empresaId: string, estado?: string): Promise<SolicitudAutorizacion[]> {
    let query = supabase
      .from('solicitudes_autorizacion')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_solicitud', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      empresaId: item.empresa_id,
      tipoOperacion: item.tipo_operacion,
      tablaAfectada: item.tabla_afectada,
      registroId: item.registro_id,
      datosRegistro: item.datos_registro,
      motivo: item.motivo,
      estado: item.estado,
      solicitadoPor: item.solicitado_por,
      fechaSolicitud: item.fecha_solicitud,
      aprobadoPor: item.aprobado_por,
      fechaAprobacion: item.fecha_aprobacion,
      comentarioAprobacion: item.comentario_aprobacion,
      ejecutada: item.ejecutada,
      fechaEjecucion: item.fecha_ejecucion,
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
