import { supabase } from '../../config/supabase';

export interface ConfiguracionAprobacion {
  id: string;
  empresa_id: string;
  modulo: string;
  entidad: string;
  accion: 'crear' | 'editar' | 'eliminar';
  requiere_aprobacion: boolean;
  descripcion: string;
  icono: string;
  activo: boolean;
  creado_por?: string;
  modificado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracionAprobacionInput {
  empresa_id: string;
  modulo: string;
  entidad: string;
  accion: 'crear' | 'editar' | 'eliminar';
  requiere_aprobacion: boolean;
  descripcion?: string;
  icono?: string;
  activo?: boolean;
  creado_por?: string;
}

export const obtenerConfiguracionAprobaciones = async (
  empresaId: string
): Promise<ConfiguracionAprobacion[]> => {
  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('modulo', { ascending: true })
    .order('entidad', { ascending: true })
    .order('accion', { ascending: true });

  if (error) {
    console.error('Error al obtener configuración de aprobaciones:', error);
    throw new Error(`Error al obtener configuración: ${error.message}`);
  }

  return data || [];
};

export const obtenerConfiguracionPorModulo = async (
  empresaId: string,
  modulo: string
): Promise<ConfiguracionAprobacion[]> => {
  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('modulo', modulo)
    .eq('activo', true)
    .order('entidad', { ascending: true })
    .order('accion', { ascending: true });

  if (error) {
    console.error('Error al obtener configuración de aprobaciones por módulo:', error);
    throw new Error(`Error al obtener configuración: ${error.message}`);
  }

  return data || [];
};

export const verificarRequiereAprobacion = async (
  empresaId: string,
  modulo: string,
  entidad: string,
  accion: 'crear' | 'editar' | 'eliminar'
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .select('requiere_aprobacion')
    .eq('empresa_id', empresaId)
    .eq('modulo', modulo)
    .eq('entidad', entidad)
    .eq('accion', accion)
    .eq('activo', true)
    .maybeSingle();

  if (error) {
    console.error('Error al verificar si requiere aprobación:', error);
    return false;
  }

  return data?.requiere_aprobacion || false;
};

export const crearConfiguracionAprobacion = async (
  config: ConfiguracionAprobacionInput
): Promise<ConfiguracionAprobacion> => {
  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .insert({
      ...config,
      activo: config.activo !== undefined ? config.activo : true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error al crear configuración de aprobación:', error);
    throw new Error(`Error al crear configuración: ${error.message}`);
  }

  return data;
};

export const actualizarConfiguracionAprobacion = async (
  id: string,
  cambios: Partial<ConfiguracionAprobacion>,
  usuarioId?: string
): Promise<ConfiguracionAprobacion> => {
  const actualizacion = {
    ...cambios,
    modificado_por: usuarioId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .update(actualizacion)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar configuración de aprobación:', error);
    throw new Error(`Error al actualizar configuración: ${error.message}`);
  }

  return data;
};

export const toggleRequiereAprobacion = async (
  id: string,
  requiere: boolean,
  usuarioId?: string
): Promise<ConfiguracionAprobacion> => {
  return actualizarConfiguracionAprobacion(
    id,
    { requiere_aprobacion: requiere },
    usuarioId
  );
};

export const desactivarConfiguracionAprobacion = async (
  id: string,
  usuarioId?: string
): Promise<void> => {
  await actualizarConfiguracionAprobacion(
    id,
    { activo: false },
    usuarioId
  );
};

export const obtenerResumenPorModulo = async (
  empresaId: string
): Promise<{ modulo: string; total: number; activas: number; requieren_aprobacion: number }[]> => {
  const configuraciones = await obtenerConfiguracionAprobaciones(empresaId);

  const resumen = configuraciones.reduce((acc, config) => {
    const moduloExiste = acc.find(m => m.modulo === config.modulo);

    if (moduloExiste) {
      moduloExiste.total++;
      if (config.activo) moduloExiste.activas++;
      if (config.requiere_aprobacion) moduloExiste.requieren_aprobacion++;
    } else {
      acc.push({
        modulo: config.modulo,
        total: 1,
        activas: config.activo ? 1 : 0,
        requieren_aprobacion: config.requiere_aprobacion ? 1 : 0,
      });
    }

    return acc;
  }, [] as { modulo: string; total: number; activas: number; requieren_aprobacion: number }[]);

  return resumen;
};
