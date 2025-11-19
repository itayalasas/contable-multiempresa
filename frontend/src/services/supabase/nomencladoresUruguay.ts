import { supabase } from '../../config/supabase';

export interface DepartamentoUY {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface LocalidadUY {
  id: string;
  codigo: string;
  nombre: string;
  departamento_id: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface ActividadDGI {
  id: string;
  codigo: string;
  descripcion: string;
  categoria?: string;
  pais_id?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface TipoContribuyente {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  pais_id?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface ResponsabilidadIVA {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  pais_id?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface TipoDocumentoElectronico {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  pais_id?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface OcupacionBPS {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  grupo?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface CategoriaLaboral {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface TipoContrato {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface ModalidadTrabajo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

export const nomencladoresUruguayService = {
  // Departamentos
  async getDepartamentos(): Promise<DepartamentoUY[]> {
    const { data, error } = await supabase
      .from('departamentos_uy')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Localidades
  async getLocalidades(departamentoId?: string): Promise<LocalidadUY[]> {
    let query = supabase
      .from('localidades_uy')
      .select('*')
      .eq('activo', true);

    if (departamentoId) {
      query = query.eq('departamento_id', departamentoId);
    }

    const { data, error } = await query.order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Actividades DGI
  async getActividadesDGI(paisId?: string): Promise<ActividadDGI[]> {
    let query = supabase
      .from('actividades_dgi')
      .select('*')
      .eq('activo', true);

    if (paisId) {
      query = query.eq('pais_id', paisId);
    }

    const { data, error } = await query.order('descripcion');

    if (error) throw error;
    return data || [];
  },

  // Tipos de Contribuyente
  async getTiposContribuyente(paisId?: string): Promise<TipoContribuyente[]> {
    let query = supabase
      .from('tipos_contribuyente')
      .select('*')
      .eq('activo', true);

    if (paisId) {
      query = query.eq('pais_id', paisId);
    }

    const { data, error } = await query.order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Responsabilidad IVA
  async getResponsabilidadIVA(paisId?: string): Promise<ResponsabilidadIVA[]> {
    let query = supabase
      .from('responsabilidad_iva')
      .select('*')
      .eq('activo', true);

    if (paisId) {
      query = query.eq('pais_id', paisId);
    }

    const { data, error } = await query.order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Tipos de Documento Electrónico
  async getTiposDocumentoElectronico(paisId?: string): Promise<TipoDocumentoElectronico[]> {
    let query = supabase
      .from('tipos_documento_electronico')
      .select('*')
      .eq('activo', true);

    if (paisId) {
      query = query.eq('pais_id', paisId);
    }

    const { data, error } = await query.order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Ocupaciones BPS
  async getOcupacionesBPS(): Promise<OcupacionBPS[]> {
    const { data, error } = await supabase
      .from('ocupaciones_bps')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Categorías Laborales
  async getCategoriasLaborales(): Promise<CategoriaLaboral[]> {
    const { data, error } = await supabase
      .from('categorias_laborales')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Tipos de Contrato
  async getTiposContrato(): Promise<TipoContrato[]> {
    const { data, error } = await supabase
      .from('tipos_contrato')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  // Modalidades de Trabajo
  async getModalidadesTrabajo(): Promise<ModalidadTrabajo[]> {
    const { data, error } = await supabase
      .from('modalidades_trabajo')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return data || [];
  },
};
