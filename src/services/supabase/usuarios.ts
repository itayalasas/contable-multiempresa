import { supabase } from '../../config/supabase';
import type { Usuario } from '../../types';

export const usuariosSupabaseService = {
  async getUsuarioById(usuarioId: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      empresasAsignadas: data.empresas_asignadas,
      paisId: data.pais_id,
      auth0Id: data.auth0_id,
      fechaCreacion: new Date(data.fecha_creacion),
      ultimaConexion: data.ultima_conexion ? new Date(data.ultima_conexion) : undefined,
    };
  },

  async createUsuario(usuario: Omit<Usuario, 'fechaCreacion'>): Promise<Usuario> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresas_asignadas: usuario.empresasAsignadas,
        permisos: usuario.permisos,
        avatar: usuario.avatar,
        pais_id: usuario.paisId,
        auth0_id: usuario.auth0Id,
        activo: usuario.activo,
        configuracion: usuario.configuracion,
        metadata: usuario.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      empresasAsignadas: data.empresas_asignadas,
      paisId: data.pais_id,
      auth0Id: data.auth0_id,
      fechaCreacion: new Date(data.fecha_creacion),
      ultimaConexion: data.ultima_conexion ? new Date(data.ultima_conexion) : undefined,
      metadata: data.metadata || {},
    };
  },

  async updateUsuario(usuarioId: string, updates: Partial<Usuario>): Promise<void> {
    const updateData: any = {};

    if (updates.nombre) updateData.nombre = updates.nombre;
    if (updates.email) updateData.email = updates.email;
    if (updates.rol) updateData.rol = updates.rol;
    if (updates.empresasAsignadas) updateData.empresas_asignadas = updates.empresasAsignadas;
    if (updates.permisos) updateData.permisos = updates.permisos;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.paisId !== undefined) updateData.pais_id = updates.paisId;
    if (updates.activo !== undefined) updateData.activo = updates.activo;
    if (updates.configuracion) updateData.configuracion = updates.configuracion;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', usuarioId);

    if (error) throw error;
  },

  async updateUltimaConexion(usuarioId: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ ultima_conexion: new Date().toISOString() })
      .eq('id', usuarioId);

    if (error) throw error;
  },

  async getAllUsuarios(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(user => ({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      empresasAsignadas: user.empresas_asignadas || [],
      permisos: user.permisos || [],
      avatar: user.avatar,
      paisId: user.pais_id,
      auth0Id: user.auth0_id,
      fechaCreacion: new Date(user.fecha_creacion),
      ultimaConexion: user.ultima_conexion ? new Date(user.ultima_conexion) : undefined,
      activo: user.activo,
      configuracion: user.configuracion,
      metadata: user.metadata || {},
    }));
  },

  async getUsuariosByEmpresa(empresaId: string): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .contains('empresas_asignadas', [empresaId])
      .order('nombre');

    if (error) throw error;

    return data.map(user => ({
      ...user,
      empresasAsignadas: user.empresas_asignadas,
      paisId: user.pais_id,
      auth0Id: user.auth0_id,
      fechaCreacion: new Date(user.fecha_creacion),
      ultimaConexion: user.ultima_conexion ? new Date(user.ultima_conexion) : undefined,
    }));
  },

  async asignarEmpresa(usuarioId: string, empresaId: string): Promise<void> {
    // Obtener usuario actual
    const { data: usuario, error: getUserError } = await supabase
      .from('usuarios')
      .select('empresas_asignadas')
      .eq('id', usuarioId)
      .single();

    if (getUserError) throw getUserError;

    // Agregar empresa si no está asignada
    const empresasActuales = usuario.empresas_asignadas || [];
    if (!empresasActuales.includes(empresaId)) {
      // 1. Actualizar tabla usuarios
      const { error } = await supabase
        .from('usuarios')
        .update({
          empresas_asignadas: [...empresasActuales, empresaId]
        })
        .eq('id', usuarioId);

      if (error) throw error;

      // 2. Actualizar tabla empresas (sincronizar)
      const { data: empresa, error: getEmpresaError } = await supabase
        .from('empresas')
        .select('usuarios_asignados')
        .eq('id', empresaId)
        .single();

      if (getEmpresaError) throw getEmpresaError;

      const usuariosActuales = empresa.usuarios_asignados || [];
      if (!usuariosActuales.includes(usuarioId)) {
        const { error: updateEmpresaError } = await supabase
          .from('empresas')
          .update({
            usuarios_asignados: [...usuariosActuales, usuarioId]
          })
          .eq('id', empresaId);

        if (updateEmpresaError) throw updateEmpresaError;
      }
    }
  },

  async desasignarEmpresa(usuarioId: string, empresaId: string): Promise<void> {
    // Obtener usuario actual
    const { data: usuario, error: getUserError } = await supabase
      .from('usuarios')
      .select('empresas_asignadas')
      .eq('id', usuarioId)
      .single();

    if (getUserError) throw getUserError;

    // 1. Remover empresa de usuario
    const empresasActuales = usuario.empresas_asignadas || [];
    const { error } = await supabase
      .from('usuarios')
      .update({
        empresas_asignadas: empresasActuales.filter(id => id !== empresaId)
      })
      .eq('id', usuarioId);

    if (error) throw error;

    // 2. Remover usuario de empresa (sincronizar)
    const { data: empresa, error: getEmpresaError } = await supabase
      .from('empresas')
      .select('usuarios_asignados')
      .eq('id', empresaId)
      .single();

    if (getEmpresaError) throw getEmpresaError;

    const usuariosActuales = empresa.usuarios_asignados || [];
    const { error: updateEmpresaError } = await supabase
      .from('empresas')
      .update({
        usuarios_asignados: usuariosActuales.filter(id => id !== usuarioId)
      })
      .eq('id', empresaId);

    if (updateEmpresaError) throw updateEmpresaError;
  },

  async actualizarRol(usuarioId: string, nuevoRol: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', usuarioId);

    if (error) throw error;
  },

  async getUsuariosDisponiblesParaEmpresa(empresaId: string): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    // Filtrar usuarios que NO tienen esta empresa asignada
    return data
      .filter(user => !user.empresas_asignadas?.includes(empresaId))
      .map(user => ({
        ...user,
        empresasAsignadas: user.empresas_asignadas,
        paisId: user.pais_id,
        auth0Id: user.auth0_id,
        fechaCreacion: new Date(user.fecha_creacion),
        ultimaConexion: user.ultima_conexion ? new Date(user.ultima_conexion) : undefined,
      }));
  },
};

export const getUsuariosByEmpresa = usuariosSupabaseService.getUsuariosByEmpresa;
