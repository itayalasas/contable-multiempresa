import { supabase } from '../../config/supabase';

export interface EventoExterno {
  id: string;
  empresa_id: string;
  tipo_evento: 'order.paid' | 'order.cancelled' | 'order.updated' | 'refund.completed';
  origen: string;
  payload: any;
  procesado: boolean;
  procesado_at?: string;
  factura_id?: string;
  nota_credito_id?: string;
  error?: string;
  reintentos: number;
  created_at: string;
}

export async function obtenerEventosExternos(empresaId: string) {
  const { data, error } = await supabase
    .from('eventos_externos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as EventoExterno[];
}

export async function obtenerEventosPendientes(empresaId: string) {
  const { data, error } = await supabase
    .from('eventos_externos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('procesado', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EventoExterno[];
}

export async function reintentarEvento(eventoId: string) {
  const { data: evento, error: eventoError } = await supabase
    .from('eventos_externos')
    .select('*')
    .eq('id', eventoId)
    .single();

  if (eventoError) throw eventoError;

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-orders`;
  const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET || 'default-secret-change-in-production';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': webhookSecret,
    },
    body: JSON.stringify(evento.payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al reintentar evento');
  }

  const result = await response.json();
  return result;
}

export async function marcarEventoComoProcesado(eventoId: string) {
  const { data, error } = await supabase
    .from('eventos_externos')
    .update({
      procesado: true,
      procesado_at: new Date().toISOString(),
    })
    .eq('id', eventoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function obtenerEstadisticasEventos(empresaId: string) {
  const { data: eventos } = await supabase
    .from('eventos_externos')
    .select('procesado, tipo_evento, error')
    .eq('empresa_id', empresaId);

  if (!eventos) return null;

  return {
    total: eventos.length,
    procesados: eventos.filter((e) => e.procesado).length,
    pendientes: eventos.filter((e) => !e.procesado && !e.error).length,
    errores: eventos.filter((e) => e.error).length,
    por_tipo: {
      'order.paid': eventos.filter((e) => e.tipo_evento === 'order.paid').length,
      'order.cancelled': eventos.filter((e) => e.tipo_evento === 'order.cancelled').length,
      'order.updated': eventos.filter((e) => e.tipo_evento === 'order.updated').length,
      'refund.completed': eventos.filter((e) => e.tipo_evento === 'refund.completed').length,
    },
  };
}
