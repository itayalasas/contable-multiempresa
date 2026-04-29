import { supabase } from '../../config/supabase';

export type IntegracionTipo =
  | 'CRM'
  | 'DGI'
  | 'PASARELA_PAGO'
  | 'NOTIFICACIONES'
  | 'ERP'
  | 'ECOMMERCE'
  | 'CUSTOM';

export interface IntegracionConfig {
  id?: string;
  empresa_id: string;
  nombre: string;
  tipo: IntegracionTipo;
  proveedor: string;
  descripcion?: string;
  url_base: string;
  api_key?: string;
  api_secret?: string;
  token_acceso?: string;
  token_refresh?: string;
  fecha_expiracion_token?: string;
  configuracion?: Record<string, unknown>;
  headers?: Record<string, string>;
  estado?: 'activo' | 'inactivo' | 'error' | 'mantenimiento';
  ultima_sincronizacion?: string;
  proximo_intento?: string;
  errores_consecutivos?: number;
  activo?: boolean;
  creado_por?: string;
}

export interface LogIntegracion {
  id?: string;
  empresa_id: string;
  integracion_id?: string;
  webhook_id?: string;
  tipo_operacion: 'API_REQUEST' | 'API_RESPONSE' | 'WEBHOOK_SENT' | 'WEBHOOK_RECEIVED' | 'ERROR' | 'RETRY';
  metodo?: string;
  url?: string;
  headers?: Record<string, unknown>;
  request_body?: string;
  response_body?: string;
  status_code?: number;
  tiempo_respuesta_ms?: number;
  evento?: string;
  resultado?: 'EXITO' | 'ERROR' | 'TIMEOUT' | 'PENDIENTE';
  mensaje_error?: string;
  stack_trace?: string;
  intento_numero?: number;
  metadata?: Record<string, unknown>;
  fecha_creacion?: string;
}

export interface ApiKeyConfig {
  id?: string;
  empresa_id: string;
  nombre: string;
  key_hash: string;
  prefijo: string;
  descripcion?: string;
  permisos?: string[];
  ip_whitelist?: string[];
  rate_limit?: number;
  rate_limit_periodo?: 'second' | 'minute' | 'hour' | 'day';
  ultima_utilizacion?: string;
  total_requests?: number;
  fecha_expiracion?: string;
  activo?: boolean;
  creado_por?: string;
  fecha_creacion?: string;
}

export interface AutoSendDGIConfig {
  empresa_id: string;
  auto_send_enabled: boolean;
  enviar_solo_si_estado?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ComisionMPConfig {
  id?: string;
  empresa_id: string;
  activo: boolean;
  porcentaje: number;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

export const integracionesSupabaseService = {
  async getIntegraciones(empresaId: string): Promise<IntegracionConfig[]> {
    const { data, error } = await supabase
      .from('integraciones_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return (data || []) as IntegracionConfig[];
  },

  async saveIntegracion(config: IntegracionConfig): Promise<IntegracionConfig> {
    if (config.id) {
      const { data, error } = await supabase
        .from('integraciones_config')
        .update({
          ...config,
          fecha_modificacion: new Date().toISOString(),
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data as IntegracionConfig;
    }

    const { data, error } = await supabase
      .from('integraciones_config')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data as IntegracionConfig;
  },

  async setIntegracionActiva(id: string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('integraciones_config')
      .update({
        activo,
        estado: activo ? 'activo' : 'inactivo',
        fecha_modificacion: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async getLogs(empresaId: string, limit = 100): Promise<LogIntegracion[]> {
    const { data, error } = await supabase
      .from('logs_integracion')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_creacion', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LogIntegracion[];
  },

  async registrarLog(log: LogIntegracion): Promise<void> {
    const { error } = await supabase
      .from('logs_integracion')
      .insert(log);

    if (error) {
      console.warn('No se pudo registrar log de integracion:', error.message);
    }
  },

  async getAutoSendDGI(empresaId: string): Promise<AutoSendDGIConfig | null> {
    const { data, error } = await supabase
      .from('empresas_auto_send_dgi')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data as AutoSendDGIConfig | null;
  },

  async saveAutoSendDGI(config: AutoSendDGIConfig): Promise<void> {
    const { error } = await supabase
      .from('empresas_auto_send_dgi')
      .upsert({
        ...config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) throw error;
  },

  async getComisionMP(empresaId: string): Promise<ComisionMPConfig | null> {
    const { data, error } = await supabase
      .from('empresas_comision_mp')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data as ComisionMPConfig | null;
  },

  async saveComisionMP(config: ComisionMPConfig): Promise<void> {
    const { error } = await supabase
      .from('empresas_comision_mp')
      .upsert({
        ...config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) throw error;
  },

  async getApiKeys(empresaId: string): Promise<ApiKeyConfig[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return (data || []) as ApiKeyConfig[];
  },

  async createApiKey(input: ApiKeyConfig): Promise<ApiKeyConfig> {
    const { data, error } = await supabase
      .from('api_keys')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ApiKeyConfig;
  },

  async setApiKeyActiva(id: string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ activo })
      .eq('id', id);

    if (error) throw error;
  },
};
