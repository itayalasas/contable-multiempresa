import { supabase } from '../../config/supabase';

export interface CentroCosto {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: 'ALIADO' | 'SUCURSAL' | 'SERVICIO' | 'PROYECTO' | 'DEPARTAMENTO' | 'OTRO';
  centro_padre?: string;
  nivel: number;
  responsable_id?: string;
  responsable_nombre?: string;
  presupuesto_anual: number;
  presupuesto_mensual: number;
  cuenta_contable_id?: string;
  activo: boolean;
  metadata?: any;
  fecha_creacion: string;
  fecha_modificacion: string;
  creado_por?: string;
}

export interface AnalisisRentabilidad {
  centro_costo_id: string;
  centro_nombre: string;
  total_ingresos: number;
  total_egresos: number;
  resultado: number;
  presupuesto: number;
  variacion: number;
  porcentaje_ejecucion: number;
}

export const centrosCostoService = {
  async obtenerTodos(empresaId: string): Promise<CentroCosto[]> {
    const { data, error } = await supabase
      .from('centros_costo')
      .select(`
        *,
        usuario_responsable:usuarios!centros_costo_responsable_id_fkey(id, nombre)
      `)
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      responsable_nombre: item.usuario_responsable?.nombre
    }));
  },

  async obtenerPorId(id: string): Promise<CentroCosto | null> {
    const { data, error } = await supabase
      .from('centros_costo')
      .select(`
        *,
        usuario_responsable:usuarios!centros_costo_responsable_id_fkey(id, nombre)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      responsable_nombre: data.usuario_responsable?.nombre
    } : null;
  },

  async crear(centro: Omit<CentroCosto, 'id' | 'fecha_creacion' | 'fecha_modificacion'>) {
    const { data, error } = await supabase
      .from('centros_costo')
      .insert({
        empresa_id: centro.empresa_id,
        codigo: centro.codigo,
        nombre: centro.nombre,
        descripcion: centro.descripcion,
        tipo: centro.tipo,
        centro_padre: centro.centro_padre,
        nivel: centro.nivel,
        responsable_id: centro.responsable_id,
        presupuesto_anual: centro.presupuesto_anual,
        presupuesto_mensual: centro.presupuesto_mensual,
        cuenta_contable_id: centro.cuenta_contable_id,
        activo: centro.activo,
        metadata: centro.metadata,
        creado_por: centro.creado_por
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async actualizar(id: string, cambios: Partial<CentroCosto>) {
    const { data, error } = await supabase
      .from('centros_costo')
      .update({
        ...cambios,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async eliminar(id: string) {
    const { error } = await supabase
      .from('centros_costo')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async obtenerAnalisisRentabilidad(
    empresaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<AnalisisRentabilidad[]> {
    const { data, error } = await supabase
      .rpc('analizar_rentabilidad_centros', {
        p_empresa_id: empresaId,
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin
      });

    if (error) {
      console.error('Error al obtener análisis de rentabilidad:', error);
      return [];
    }

    return data || [];
  },

  async obtenerEstadisticas(empresaId: string) {
    const centros = await this.obtenerTodos(empresaId);

    const totalCentros = centros.length;
    const activos = centros.filter(c => c.activo).length;
    const totalPresupuesto = centros.reduce((sum, c) => sum + c.presupuesto_anual, 0);
    const porTipo = centros.reduce((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCentros,
      activos,
      inactivos: totalCentros - activos,
      totalPresupuesto,
      porTipo
    };
  }
};
