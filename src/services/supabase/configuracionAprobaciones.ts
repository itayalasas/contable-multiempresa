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

const CONFIGURACIONES_APROBACION_PREDETERMINADAS: Omit<
  ConfiguracionAprobacionInput,
  'empresa_id' | 'creado_por'
>[] = [
  {
    modulo: 'ventas',
    entidad: 'facturas_venta',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de facturas de venta ya emitidas',
    icono: 'Receipt',
    activo: true,
  },
  {
    modulo: 'ventas',
    entidad: 'facturas_venta',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de facturas de venta ya emitidas',
    icono: 'Receipt',
    activo: true,
  },
  {
    modulo: 'compras',
    entidad: 'facturas_compra',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de facturas de compra registradas',
    icono: 'Receipt',
    activo: true,
  },
  {
    modulo: 'compras',
    entidad: 'facturas_compra',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de facturas de compra registradas',
    icono: 'Receipt',
    activo: true,
  },
  {
    modulo: 'contabilidad',
    entidad: 'asientos_contables',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de asientos contables',
    icono: 'BookOpen',
    activo: true,
  },
  {
    modulo: 'contabilidad',
    entidad: 'asientos_contables',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de asientos contables',
    icono: 'BookOpen',
    activo: true,
  },
  {
    modulo: 'tesoreria',
    entidad: 'movimientos_tesoreria',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de movimientos de tesorería registrados',
    icono: 'DollarSign',
    activo: true,
  },
  {
    modulo: 'tesoreria',
    entidad: 'movimientos_tesoreria',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de movimientos de tesorería registrados',
    icono: 'DollarSign',
    activo: true,
  },
  {
    modulo: 'finanzas',
    entidad: 'pagos_cliente',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de cobros de clientes registrados',
    icono: 'Wallet',
    activo: true,
  },
  {
    modulo: 'finanzas',
    entidad: 'pagos_cliente',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de cobros de clientes registrados',
    icono: 'Wallet',
    activo: true,
  },
  {
    modulo: 'finanzas',
    entidad: 'pagos_proveedor',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de pagos a proveedores registrados',
    icono: 'CreditCard',
    activo: true,
  },
  {
    modulo: 'finanzas',
    entidad: 'pagos_proveedor',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de pagos a proveedores registrados',
    icono: 'CreditCard',
    activo: true,
  },
  {
    modulo: 'ventas',
    entidad: 'notas_credito',
    accion: 'editar',
    requiere_aprobacion: true,
    descripcion: 'Modificación de notas de crédito emitidas',
    icono: 'FileText',
    activo: true,
  },
  {
    modulo: 'ventas',
    entidad: 'notas_credito',
    accion: 'eliminar',
    requiere_aprobacion: true,
    descripcion: 'Eliminación de notas de crédito emitidas',
    icono: 'FileText',
    activo: true,
  },
];

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
  const consultarConfiguracion = async () => {
    return await supabase
      .from('configuracion_aprobaciones')
      .select('requiere_aprobacion')
      .eq('empresa_id', empresaId)
      .eq('modulo', modulo)
      .eq('entidad', entidad)
      .eq('accion', accion)
      .eq('activo', true)
      .maybeSingle();
  };

  let { data, error } = await consultarConfiguracion();

  if (error) {
    console.error('Error al verificar si requiere aprobación:', error);
    return false;
  }

  if (!data) {
    try {
      await sincronizarConfiguracionesAprobacionPredeterminadas(empresaId);
      const retry = await consultarConfiguracion();
      data = retry.data;
      error = retry.error;
    } catch (syncError) {
      console.error('Error sincronizando configuraciones predeterminadas:', syncError);
      return false;
    }
  }

  if (error) {
    console.error('Error al verificar si requiere aprobaciÃ³n luego de sincronizar:', error);
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

export const sincronizarConfiguracionesAprobacionPredeterminadas = async (
  empresaId: string,
  usuarioId?: string
): Promise<number> => {
  const payload = CONFIGURACIONES_APROBACION_PREDETERMINADAS.map((config) => ({
    ...config,
    empresa_id: empresaId,
    creado_por: usuarioId,
    modificado_por: usuarioId,
  }));

  const { data, error } = await supabase
    .from('configuracion_aprobaciones')
    .upsert(payload, {
      onConflict: 'empresa_id,modulo,entidad,accion',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    console.error('Error sincronizando configuraciones de aprobacion:', error);
    throw new Error(`No se pudieron sincronizar las configuraciones de aprobacion: ${error.message}`);
  }

  return data?.length || 0;
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
