import { supabase } from '../../config/supabase';

export interface SolicitudAprobacion {
  id: string;
  empresa_id: string;
  tipo_solicitud: 'modificar_factura' | 'eliminar_factura';
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  solicitante_id: string;
  aprobador_id?: string;
  factura_id: string;
  datos_originales: any;
  datos_modificados?: any;
  motivo: string;
  comentarios_aprobador?: string;
  fecha_solicitud: string;
  fecha_respuesta?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface AuditoriaCambio {
  id: string;
  empresa_id: string;
  tabla_afectada: string;
  registro_id: string;
  tipo_operacion: 'crear' | 'modificar' | 'eliminar';
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id: string;
  solicitud_aprobacion_id?: string;
  fecha: string;
  metadata?: any;
  creado_en: string;
}

export const aprobacionesService = {
  async solicitarModificacion(
    empresaId: string,
    facturaId: string,
    datosModificados: any,
    motivo: string,
    usuarioId: string
  ) {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solicitar-aprobacion-factura`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresaId,
          facturaId,
          tipoSolicitud: 'modificar_factura',
          datosModificados,
          motivo,
          usuarioId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear solicitud de modificación');
      }

      return data;
    } catch (error) {
      console.error('Error al solicitar modificación:', error);
      throw error;
    }
  },

  async solicitarEliminacion(
    empresaId: string,
    facturaId: string,
    motivo: string,
    usuarioId: string
  ) {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solicitar-aprobacion-factura`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresaId,
          facturaId,
          tipoSolicitud: 'eliminar_factura',
          motivo,
          usuarioId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear solicitud de eliminación');
      }

      return data;
    } catch (error) {
      console.error('Error al solicitar eliminación:', error);
      throw error;
    }
  },

  async aprobarSolicitud(
    solicitudId: string,
    aprobadorId: string,
    comentarios?: string
  ) {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aprobar-rechazar-solicitud`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solicitudId,
          accion: 'aprobar',
          aprobadorId,
          comentarios,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al aprobar solicitud');
      }

      return data;
    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      throw error;
    }
  },

  async rechazarSolicitud(
    solicitudId: string,
    aprobadorId: string,
    comentarios: string
  ) {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aprobar-rechazar-solicitud`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solicitudId,
          accion: 'rechazar',
          aprobadorId,
          comentarios,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al rechazar solicitud');
      }

      return data;
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      throw error;
    }
  },

  async obtenerSolicitudesPendientes(empresaId: string): Promise<SolicitudAprobacion[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_aprobacion')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('estado', 'pendiente')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      throw error;
    }
  },

  async obtenerTodasSolicitudes(empresaId: string): Promise<SolicitudAprobacion[]> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_aprobacion')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error al obtener todas las solicitudes:', error);
      throw error;
    }
  },

  async obtenerSolicitud(solicitudId: string): Promise<SolicitudAprobacion | null> {
    try {
      const { data, error } = await supabase
        .from('solicitudes_aprobacion')
        .select('*')
        .eq('id', solicitudId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error al obtener solicitud:', error);
      throw error;
    }
  },

  async obtenerAuditoriaFactura(facturaId: string): Promise<AuditoriaCambio[]> {
    try {
      const { data, error } = await supabase
        .from('auditoria_cambios')
        .select('*')
        .eq('tabla_afectada', 'facturas_venta')
        .eq('registro_id', facturaId)
        .order('fecha', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error al obtener auditoría de factura:', error);
      throw error;
    }
  },

  async obtenerAuditoria(
    empresaId: string,
    filtros?: {
      tabla?: string;
      registroId?: string;
      usuarioId?: string;
      tipoOperacion?: 'crear' | 'modificar' | 'eliminar';
    }
  ): Promise<AuditoriaCambio[]> {
    try {
      let query = supabase
        .from('auditoria_cambios')
        .select('*')
        .eq('empresa_id', empresaId);

      if (filtros?.tabla) {
        query = query.eq('tabla_afectada', filtros.tabla);
      }

      if (filtros?.registroId) {
        query = query.eq('registro_id', filtros.registroId);
      }

      if (filtros?.usuarioId) {
        query = query.eq('usuario_id', filtros.usuarioId);
      }

      if (filtros?.tipoOperacion) {
        query = query.eq('tipo_operacion', filtros.tipoOperacion);
      }

      query = query.order('fecha', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error al obtener auditoría:', error);
      throw error;
    }
  },
};
