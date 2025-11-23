import { supabase } from '../../config/supabase';

export interface EmpresaConfigFiscal {
  id?: string;
  empresa_id: string;
  responsabilidad_iva_id?: string;
  numero_bps?: string;
  numero_mtss?: string;
  regimen_tributario?: string;
  alicuota_iva_defecto?: number;
  aplica_retencion_iva?: boolean;
  aplica_retencion_irpf?: boolean;
  aplica_retencion_irae?: boolean;
  certificado_dgi_path?: string;
  certificado_dgi_password?: string;
  certificado_dgi_vencimiento?: string;
  observaciones?: string;
}

export interface EmpresaConfigCFE {
  id?: string;
  empresa_id: string;
  rut_emisor: string;
  codigo_casa_principal?: string;
  codigo_sucursal?: string;
  ambiente?: 'testing' | 'produccion';
  certificado_path?: string;
  certificado_password?: string;
  certificado_vencimiento?: string;
  proveedor_certificado?: string;
  url_webservice?: string;
  timeout_webservice?: number;
  habilitar_envio_automatico?: boolean;
  email_notificacion?: string;
  observaciones?: string;
}

export interface EmpresaSerieDocumento {
  id?: string;
  empresa_id: string;
  tipo_documento_id: string;
  serie: string;
  numero_inicial?: number;
  numero_final?: number;
  numero_actual?: number;
  fecha_autorizacion?: string;
  monto_maximo?: number;
  rut_impresor?: string;
  activa?: boolean;
  observaciones?: string;
}

export interface EmpresaConfigBPS {
  id?: string;
  empresa_id: string;
  numero_empresa_bps: string;
  clase_bps?: string;
  subclase_bps?: string;
  especialidad?: string;
  fecha_alta_bps?: string;
  seguro_accidentes_porcentaje?: number;
  responsable_tecnico?: string;
  ci_responsable_tecnico?: string;
  encargado_nomina?: string;
  email_nomina?: string;
  observaciones?: string;
}

export interface EmpresaSucursal {
  id?: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  departamento_id?: string;
  localidad_id?: string;
  telefono?: string;
  email?: string;
  es_principal?: boolean;
  activa?: boolean;
}

export interface EmpresaActividad {
  id?: string;
  empresa_id: string;
  actividad_id: string;
  es_principal?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export const empresasConfiguracionService = {
  // =====================================================
  // CONFIGURACIÓN FISCAL
  // =====================================================
  async getConfigFiscal(empresaId: string): Promise<EmpresaConfigFiscal | null> {
    const { data, error } = await supabase
      .from('empresas_config_fiscal')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveConfigFiscal(config: EmpresaConfigFiscal): Promise<void> {
    if (config.id) {
      const { error } = await supabase
        .from('empresas_config_fiscal')
        .update({
          ...config,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_config_fiscal')
        .insert(config);

      if (error) throw error;
    }
  },

  // =====================================================
  // CONFIGURACIÓN CFE
  // =====================================================
  async getConfigCFE(empresaId: string): Promise<EmpresaConfigCFE | null> {
    const { data, error } = await supabase
      .from('empresas_config_cfe')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveConfigCFE(config: EmpresaConfigCFE): Promise<void> {
    if (config.id) {
      const { error } = await supabase
        .from('empresas_config_cfe')
        .update({
          ...config,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_config_cfe')
        .insert(config);

      if (error) throw error;
    }
  },

  // =====================================================
  // SERIES DE DOCUMENTOS
  // =====================================================
  async getSeriesDocumentos(empresaId: string): Promise<EmpresaSerieDocumento[]> {
    const { data, error } = await supabase
      .from('empresas_series_documentos')
      .select('*, tipo_documento:tipos_documento_electronico(*)')
      .eq('empresa_id', empresaId)
      .order('serie');

    if (error) throw error;
    return data || [];
  },

  async saveSerieDocumento(serie: EmpresaSerieDocumento): Promise<void> {
    if (serie.id) {
      const { error } = await supabase
        .from('empresas_series_documentos')
        .update({
          ...serie,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', serie.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_series_documentos')
        .insert(serie);

      if (error) throw error;
    }
  },

  async deleteSerieDocumento(serieId: string): Promise<void> {
    const { error } = await supabase
      .from('empresas_series_documentos')
      .delete()
      .eq('id', serieId);

    if (error) throw error;
  },

  // =====================================================
  // CONFIGURACIÓN BPS
  // =====================================================
  async getConfigBPS(empresaId: string): Promise<EmpresaConfigBPS | null> {
    const { data, error } = await supabase
      .from('empresas_config_bps')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveConfigBPS(config: EmpresaConfigBPS): Promise<void> {
    if (config.id) {
      const { error } = await supabase
        .from('empresas_config_bps')
        .update({
          ...config,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_config_bps')
        .insert(config);

      if (error) throw error;
    }
  },

  // =====================================================
  // SUCURSALES
  // =====================================================
  async getSucursales(empresaId: string): Promise<EmpresaSucursal[]> {
    const { data, error } = await supabase
      .from('empresas_sucursales')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw error;
    return data || [];
  },

  async saveSucursal(sucursal: EmpresaSucursal): Promise<void> {
    if (sucursal.id) {
      const { error } = await supabase
        .from('empresas_sucursales')
        .update({
          ...sucursal,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', sucursal.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_sucursales')
        .insert(sucursal);

      if (error) throw error;
    }
  },

  async deleteSucursal(sucursalId: string): Promise<void> {
    const { error } = await supabase
      .from('empresas_sucursales')
      .delete()
      .eq('id', sucursalId);

    if (error) throw error;
  },

  // =====================================================
  // ACTIVIDADES
  // =====================================================
  async getActividades(empresaId: string): Promise<EmpresaActividad[]> {
    const { data, error } = await supabase
      .from('empresas_actividades')
      .select('*, actividad:actividades_dgi(*)')
      .eq('empresa_id', empresaId);

    if (error) throw error;
    return data || [];
  },

  async saveActividad(actividad: EmpresaActividad): Promise<void> {
    if (actividad.id) {
      const { error } = await supabase
        .from('empresas_actividades')
        .update(actividad)
        .eq('id', actividad.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('empresas_actividades')
        .insert(actividad);

      if (error) throw error;
    }
  },

  async deleteActividad(actividadId: string): Promise<void> {
    const { error } = await supabase
      .from('empresas_actividades')
      .delete()
      .eq('id', actividadId);

    if (error) throw error;
  },
};
