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
};

export const getUsuariosByEmpresa = usuariosSupabaseService.getUsuariosByEmpresa;
