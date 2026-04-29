import { supabase } from '../../config/supabase';
import { Empresa, Usuario } from '../../types';
import { empresasSupabaseService } from '../supabase/empresas';
import { sincronizarConfiguracionesAprobacionPredeterminadas } from '../supabase/configuracionAprobaciones';
import { usuariosSupabaseService } from '../supabase/usuarios';

export class EmpresasService {
  static async getEmpresasByUsuario(usuarioId: string): Promise<Empresa[]> {
    try {
      return await empresasSupabaseService.getEmpresasByUsuario(usuarioId);
    } catch (error) {
      console.error('Error obteniendo empresas por usuario:', error);
      throw new Error(`No se pudieron cargar las empresas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  static async getEmpresasByPais(paisId: string): Promise<Empresa[]> {
    return empresasSupabaseService.getEmpresasByPais(paisId);
  }

  static async getEmpresa(empresaId: string): Promise<Empresa | null> {
    return empresasSupabaseService.getEmpresa(empresaId);
  }

  static async crearEmpresa(empresa: Omit<Empresa, 'id'>, usuarioCreadorId: string): Promise<string> {
    const usuariosAsignados = empresa.usuariosAsignados.includes(usuarioCreadorId)
      ? empresa.usuariosAsignados
      : [...empresa.usuariosAsignados, usuarioCreadorId];

    const creada = await empresasSupabaseService.createEmpresa({
      ...empresa,
      usuariosAsignados,
    });

    await sincronizarConfiguracionesAprobacionPredeterminadas(creada.id, usuarioCreadorId);

    return creada.id;
  }

  static async actualizarEmpresa(empresaId: string, datos: Partial<Empresa>): Promise<void> {
    await empresasSupabaseService.updateEmpresa(empresaId, datos);
  }

  static async asignarUsuario(empresaId: string, usuarioId: string): Promise<void> {
    await usuariosSupabaseService.asignarEmpresa(usuarioId, empresaId);
  }

  static async desasignarUsuario(empresaId: string, usuarioId: string): Promise<void> {
    await usuariosSupabaseService.desasignarEmpresa(usuarioId, empresaId);
  }

  static async verificarAccesoUsuario(empresaId: string, usuarioId: string): Promise<boolean> {
    try {
      const empresa = await empresasSupabaseService.getEmpresa(empresaId);
      return empresa?.usuariosAsignados.includes(usuarioId) || false;
    } catch (error) {
      console.error('Error verificando acceso de usuario:', error);
      return false;
    }
  }

  static async getUsuariosEmpresa(empresaId: string): Promise<Usuario[]> {
    try {
      return await usuariosSupabaseService.getUsuariosByEmpresa(empresaId);
    } catch (error) {
      console.error('Error obteniendo usuarios de empresa:', error);
      return [];
    }
  }

  static async validarNumeroIdentificacionUnico(
    numeroIdentificacion: string,
    paisId: string,
    empresaIdExcluir?: string,
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('empresas')
        .select('id', { count: 'exact', head: true })
        .eq('numero_identificacion', numeroIdentificacion.trim())
        .eq('pais_id', paisId);

      if (empresaIdExcluir) {
        query = query.neq('id', empresaIdExcluir);
      }

      const { count, error } = await query;
      if (error) throw error;

      return (count || 0) === 0;
    } catch (error) {
      console.error('Error validando numero de identificacion unico:', error);
      return false;
    }
  }

  static async getEstadisticasEmpresa(empresaId: string): Promise<{
    totalUsuarios: number;
    totalAsientos: number;
    totalCuentas: number;
    ultimaActividad: Date | null;
  }> {
    try {
      const [usuarios, asientos, cuentas] = await Promise.all([
        supabase.from('usuarios').select('id, fecha_creacion', { count: 'exact' }).contains('empresas_asignadas', [empresaId]),
        supabase.from('asientos_contables').select('id, fecha_creacion', { count: 'exact' }).eq('empresa_id', empresaId),
        supabase.from('plan_cuentas').select('id, fecha_creacion', { count: 'exact' }).eq('empresa_id', empresaId).eq('activa', true),
      ]);

      if (usuarios.error) throw usuarios.error;
      if (asientos.error) throw asientos.error;
      if (cuentas.error) throw cuentas.error;

      const fechas = [
        ...(usuarios.data || []).map((row: any) => row.fecha_creacion),
        ...(asientos.data || []).map((row: any) => row.fecha_creacion),
        ...(cuentas.data || []).map((row: any) => row.fecha_creacion),
      ].filter(Boolean);

      const ultimaActividad = fechas.length > 0
        ? new Date(fechas.sort().slice(-1)[0])
        : null;

      return {
        totalUsuarios: usuarios.count || 0,
        totalAsientos: asientos.count || 0,
        totalCuentas: cuentas.count || 0,
        ultimaActividad,
      };
    } catch (error) {
      console.error('Error obteniendo estadisticas de empresa:', error);
      return {
        totalUsuarios: 0,
        totalAsientos: 0,
        totalCuentas: 0,
        ultimaActividad: null,
      };
    }
  }
}
