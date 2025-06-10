import { Empresa, Usuario, ConfiguracionContable } from '../../types';
import { empresasFirebaseService } from '../firebase/empresas';
import { SeedDataEmpresasService } from '../firebase/seedDataEmpresas';

export class EmpresasService {
  // Obtener empresas por usuario (cargando desde Firebase)
  static async getEmpresasByUsuario(usuarioId: string): Promise<Empresa[]> {
    try {
      console.log('🔄 Cargando empresas para usuario:', usuarioId);
      
      // Verificar si existen empresas en Firebase
      const existenEmpresas = await SeedDataEmpresasService.existenEmpresas();
      
      // Si no existen empresas, insertar datos de prueba
      if (!existenEmpresas) {
        console.log('⚠️ No existen empresas en la base de datos, insertando datos de prueba...');
        await SeedDataEmpresasService.insertEmpresasPrueba();
      }
      
      // Obtener TODAS las empresas desde Firebase sin filtrar por usuario
      const empresas = await empresasFirebaseService.getEmpresasByUsuario(usuarioId);
      console.log('✅ Empresas cargadas desde Firebase:', empresas.length);
      
      return empresas;
    } catch (error) {
      console.error('❌ Error obteniendo empresas:', error);
      throw new Error('No se pudieron cargar las empresas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }
  
  // Obtener empresas por país (desde Firebase)
  static async getEmpresasByPais(paisId: string): Promise<Empresa[]> {
    try {
      console.log('🔄 Cargando empresas por país:', paisId);
      
      if (!paisId) {
        // Obtener todas las empresas si no se especifica país
        const empresas = await empresasFirebaseService.getEmpresas();
        console.log('✅ Todas las empresas cargadas:', empresas.length);
        return empresas;
      }
      
      // Obtener empresas filtradas por país
      const empresas = await empresasFirebaseService.getEmpresasByPais(paisId);
      console.log(`✅ Empresas filtradas para ${paisId}:`, empresas.length);
      return empresas;
    } catch (error) {
      console.error('❌ Error obteniendo empresas por país:', error);
      throw error;
    }
  }
  
  // Obtener empresa por ID (desde Firebase)
  static async getEmpresa(empresaId: string): Promise<Empresa | null> {
    try {
      console.log('🔄 Buscando empresa por ID:', empresaId);
      
      const empresa = await empresasFirebaseService.getEmpresa(empresaId);
      
      if (empresa) {
        console.log('✅ Empresa encontrada:', empresa.nombre);
      } else {
        console.log('⚠️ Empresa no encontrada');
      }
      
      return empresa;
    } catch (error) {
      console.error('❌ Error obteniendo empresa:', error);
      throw error;
    }
  }
  
  // Crear nueva empresa (en Firebase)
  static async crearEmpresa(empresa: Omit<Empresa, 'id'>, usuarioCreadorId: string): Promise<string> {
    try {
      console.log('🔄 Creando empresa en Firebase:', empresa.nombre);
      
      // Asegurarse de que el usuario creador esté en la lista de usuarios asignados
      if (!empresa.usuariosAsignados.includes(usuarioCreadorId)) {
        empresa.usuariosAsignados.push(usuarioCreadorId);
      }
      
      const empresaId = await empresasFirebaseService.crearEmpresa(empresa);
      console.log('✅ Empresa creada con ID:', empresaId);
      
      return empresaId;
    } catch (error) {
      console.error('❌ Error creando empresa:', error);
      throw error;
    }
  }
  
  // Actualizar empresa (en Firebase)
  static async actualizarEmpresa(empresaId: string, datos: Partial<Empresa>): Promise<void> {
    try {
      console.log('🔄 Actualizando empresa en Firebase:', empresaId);
      
      await empresasFirebaseService.actualizarEmpresa(empresaId, datos);
      console.log('✅ Empresa actualizada exitosamente');
    } catch (error) {
      console.error('❌ Error actualizando empresa:', error);
      throw error;
    }
  }
  
  // Asignar usuario a empresa (en Firebase)
  static async asignarUsuario(empresaId: string, usuarioId: string): Promise<void> {
    try {
      console.log('🔄 Asignando usuario a empresa:', { empresaId, usuarioId });
      
      // Obtener empresa actual
      const empresa = await empresasFirebaseService.getEmpresa(empresaId);
      if (!empresa) {
        throw new Error('Empresa no encontrada');
      }
      
      // Verificar si el usuario ya está asignado
      if (empresa.usuariosAsignados.includes(usuarioId)) {
        console.log('⚠️ El usuario ya está asignado a esta empresa');
        return;
      }
      
      // Actualizar lista de usuarios asignados
      const usuariosAsignados = [...empresa.usuariosAsignados, usuarioId];
      await empresasFirebaseService.actualizarEmpresa(empresaId, { usuariosAsignados });
      
      console.log('✅ Usuario asignado exitosamente');
    } catch (error) {
      console.error('❌ Error asignando usuario:', error);
      throw error;
    }
  }
  
  // Desasignar usuario de empresa (en Firebase)
  static async desasignarUsuario(empresaId: string, usuarioId: string): Promise<void> {
    try {
      console.log('🔄 Desasignando usuario de empresa:', { empresaId, usuarioId });
      
      // Obtener empresa actual
      const empresa = await empresasFirebaseService.getEmpresa(empresaId);
      if (!empresa) {
        throw new Error('Empresa no encontrada');
      }
      
      // Verificar si el usuario está asignado
      if (!empresa.usuariosAsignados.includes(usuarioId)) {
        console.log('⚠️ El usuario no está asignado a esta empresa');
        return;
      }
      
      // Actualizar lista de usuarios asignados
      const usuariosAsignados = empresa.usuariosAsignados.filter(id => id !== usuarioId);
      await empresasFirebaseService.actualizarEmpresa(empresaId, { usuariosAsignados });
      
      console.log('✅ Usuario desasignado exitosamente');
    } catch (error) {
      console.error('❌ Error desasignando usuario:', error);
      throw error;
    }
  }
  
  // Verificar acceso de usuario a empresa (en Firebase)
  static async verificarAccesoUsuario(empresaId: string, usuarioId: string): Promise<boolean> {
    try {
      // Obtener empresa
      const empresa = await empresasFirebaseService.getEmpresa(empresaId);
      const tieneAcceso = empresa?.usuariosAsignados.includes(usuarioId) || false;
      
      console.log(`🔍 Verificando acceso usuario ${usuarioId} a empresa ${empresaId}:`, tieneAcceso);
      return tieneAcceso;
    } catch (error) {
      console.error('❌ Error verificando acceso:', error);
      return false;
    }
  }
  
  // Obtener usuarios asignados a empresa (versión mock)
  static async getUsuariosEmpresa(empresaId: string): Promise<Usuario[]> {
    try {
      console.log('🔄 Cargando usuarios de empresa:', empresaId);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock de usuarios asignados
      const usuariosMock: Usuario[] = [
        {
          id: 'dev-user-123',
          nombre: 'Usuario de Desarrollo',
          email: 'dev@contaempresa.com',
          rol: 'super_admin', // Super admin para acceso completo
          empresasAsignadas: ['dev-empresa-pe', 'dev-empresa-co', 'dev-empresa-mx', 'dev-empresa-ar', 'dev-empresa-cl'],
          permisos: ['admin:all'],
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: 'contador-001',
          nombre: 'María González',
          email: 'maria.gonzalez@contaempresa.com',
          rol: 'contador',
          empresasAsignadas: [empresaId],
          permisos: ['contabilidad:read', 'contabilidad:write', 'reportes:read'],
          activo: true,
          fechaCreacion: new Date()
        },
        {
          id: 'usuario-001',
          nombre: 'Carlos Mendoza',
          email: 'carlos.mendoza@contaempresa.com',
          rol: 'usuario',
          empresasAsignadas: [empresaId],
          permisos: ['contabilidad:read'],
          activo: true,
          fechaCreacion: new Date()
        }
      ];
      
      console.log('✅ Usuarios de empresa cargados:', usuariosMock.length);
      return usuariosMock;
    } catch (error) {
      console.error('❌ Error obteniendo usuarios de empresa:', error);
      return [];
    }
  }
  
  // Validar número de identificación único por país (versión mock)
  static async validarNumeroIdentificacionUnico(
    numeroIdentificacion: string, 
    paisId: string, 
    empresaIdExcluir?: string
  ): Promise<boolean> {
    try {
      console.log('🔍 Validando número de identificación único:', { numeroIdentificacion, paisId, empresaIdExcluir });
      
      // Simular validación
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // En mock, siempre devolver true para permitir creación
      console.log('✅ Número de identificación válido');
      return true;
    } catch (error) {
      console.error('❌ Error validando número de identificación único:', error);
      return false;
    }
  }
  
  // Obtener estadísticas de empresa (versión mock)
  static async getEstadisticasEmpresa(empresaId: string): Promise<{
    totalUsuarios: number;
    totalAsientos: number;
    totalCuentas: number;
    ultimaActividad: Date | null;
  }> {
    try {
      console.log('🔄 Cargando estadísticas de empresa:', empresaId);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock de estadísticas
      const estadisticas = {
        totalUsuarios: Math.floor(Math.random() * 10) + 1,
        totalAsientos: Math.floor(Math.random() * 100) + 5,
        totalCuentas: Math.floor(Math.random() * 50) + 25,
        ultimaActividad: new Date()
      };
      
      console.log('✅ Estadísticas cargadas:', estadisticas);
      return estadisticas;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de empresa:', error);
      return { totalUsuarios: 0, totalAsientos: 0, totalCuentas: 0, ultimaActividad: null };
    }
  }
}