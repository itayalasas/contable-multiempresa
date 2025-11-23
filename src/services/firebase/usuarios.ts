import { 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  collection,
  setDoc 
} from 'firebase/firestore';
import { Usuario, InvitacionUsuario, Rol, Permiso } from '../../types';
import { db } from '../../config/firebase';
import { getUsuarioRef, usuariosRef } from './collections';
import { Auth0ManagementService } from '../auth0/management';

export class UsuarioService {
  // Crear usuario completo (Auth0 + Firebase)
  static async crearUsuario(userData: {
    email: string;
    nombre: string;
    rol: string;
    empresas: string[];
    permisos: string[];
    password?: string;
    generatePassword?: boolean;
  }): Promise<Usuario> {
    try {
      // Generar contraseña si es necesario
      const password = userData.generatePassword ? 
        this.generateRandomPassword() : 
        userData.password || this.generateRandomPassword();

      // 1. Crear usuario en Auth0
      const auth0User = await Auth0ManagementService.createUser({
        email: userData.email,
        password: password,
        name: userData.nombre,
        metadata: {
          empresas: userData.empresas,
          rol: userData.rol,
          subdominio: userData.empresas[0] || '',
          permisos: userData.permisos
        }
      });

      // 2. Crear usuario en Firebase
      const nuevoUsuario: Usuario = {
        id: auth0User.user_id,
        nombre: userData.nombre,
        email: userData.email,
        rol: userData.rol as any,
        empresas: userData.empresas,
        permisos: userData.permisos,
        auth0Id: auth0User.user_id,
        activo: true,
        fechaCreacion: new Date()
      };

      const userRef = getUsuarioRef(auth0User.user_id);
      await setDoc(userRef, {
        ...nuevoUsuario,
        fechaCreacion: serverTimestamp()
      });

      // 3. Enviar email de verificación
      try {
        await Auth0ManagementService.sendVerificationEmail(auth0User.user_id);
      } catch (emailError) {
        console.warn('No se pudo enviar email de verificación:', emailError);
      }

      return nuevoUsuario;
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  // Actualizar usuario
  static async actualizarUsuario(userId: string, datos: Partial<Usuario>): Promise<void> {
    try {
      // 1. Actualizar en Firebase
      const userRef = getUsuarioRef(userId);
      await updateDoc(userRef, {
        ...datos,
        fechaActualizacion: serverTimestamp()
      });

      // 2. Actualizar metadatos en Auth0 si es necesario
      if (datos.rol || datos.empresas || datos.permisos) {
        const metadata: any = {};
        if (datos.rol) metadata.rol = datos.rol;
        if (datos.empresas) metadata.empresas = datos.empresas;
        if (datos.permisos) metadata.permisos = datos.permisos;

        await Auth0ManagementService.updateUserMetadata(userId, metadata);
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  // Eliminar usuario
  static async eliminarUsuario(userId: string): Promise<void> {
    try {
      // 1. Desactivar en Firebase
      await this.actualizarUsuario(userId, { activo: false });

      // 2. Eliminar de Auth0
      await Auth0ManagementService.deleteUser(userId);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // Obtener usuarios por empresa
  static async getUsuariosByEmpresa(empresaId: string): Promise<Usuario[]> {
    try {
      const q = query(
        usuariosRef, 
        where('empresas', 'array-contains', empresaId),
        where('activo', '==', true),
        orderBy('nombre')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios por empresa:', error);
      return [];
    }
  }

  // Generar contraseña aleatoria
  private static generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  // Invitar usuario
  static async invitarUsuario(invitacion: Omit<InvitacionUsuario, 'id' | 'token' | 'fechaCreacion' | 'fechaExpiracion'>): Promise<string> {
    try {
      const token = this.generateInvitationToken();
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 7); // 7 días

      const invitacionData: InvitacionUsuario = {
        ...invitacion,
        id: '',
        token,
        fechaCreacion: new Date(),
        fechaExpiracion,
        estado: 'PENDIENTE'
      };

      const invitacionesRef = collection(db, 'invitaciones');
      const docRef = await addDoc(invitacionesRef, {
        ...invitacionData,
        fechaCreacion: serverTimestamp(),
        fechaExpiracion: fechaExpiracion
      });

      // Enviar email de invitación (implementar con servicio de email)
      await this.enviarEmailInvitacion(invitacion.email, token);

      return docRef.id;
    } catch (error) {
      console.error('Error enviando invitación:', error);
      throw error;
    }
  }

  private static generateInvitationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private static async enviarEmailInvitacion(email: string, token: string): Promise<void> {
    // Implementar envío de email con el token de invitación
    console.log(`Enviar invitación a ${email} con token: ${token}`);
  }

  // Verificar conexión con Auth0
  static async verificarConexionAuth0(): Promise<boolean> {
    try {
      return await Auth0ManagementService.testConnection();
    } catch (error) {
      console.error('Error verificando conexión con Auth0:', error);
      return false;
    }
  }
}

// Servicio para gestión de roles y permisos
export class RolService {
  private static rolesRef = collection(db, 'roles');
  private static permisosRef = collection(db, 'permisos');

  // Obtener permisos disponibles con datos mock para desarrollo
  static async getPermisos(): Promise<Permiso[]> {
    try {
      const querySnapshot = await getDocs(this.permisosRef);
      const permisos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Permiso[];

      // Si no hay permisos en Firebase, devolver datos mock para desarrollo
      if (permisos.length === 0) {
        return this.getMockPermisos();
      }

      return permisos;
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      // En caso de error, devolver datos mock para desarrollo
      return this.getMockPermisos();
    }
  }

  // Obtener roles con datos mock para desarrollo
  static async getRoles(empresaId?: string): Promise<Rol[]> {
    try {
      let q = query(this.rolesRef, orderBy('nombre'));
      
      if (empresaId) {
        q = query(this.rolesRef, where('empresaId', '==', empresaId), orderBy('nombre'));
      }

      const querySnapshot = await getDocs(q);
      const roles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Rol[];

      // Si no hay roles en Firebase, devolver datos mock para desarrollo
      if (roles.length === 0) {
        return this.getMockRoles();
      }

      return roles;
    } catch (error) {
      console.error('Error obteniendo roles:', error);
      // En caso de error, devolver datos mock para desarrollo
      return this.getMockRoles();
    }
  }

  // Datos mock para desarrollo - Permisos
  private static getMockPermisos(): Permiso[] {
    return [
      {
        id: 'admin:all',
        nombre: 'Administración Total',
        descripcion: 'Acceso completo al sistema',
        categoria: 'admin'
      },
      {
        id: 'contabilidad:read',
        nombre: 'Ver Contabilidad',
        descripcion: 'Visualizar información contable',
        categoria: 'contabilidad'
      },
      {
        id: 'contabilidad:write',
        nombre: 'Editar Contabilidad',
        descripcion: 'Crear y modificar registros contables',
        categoria: 'contabilidad'
      },
      {
        id: 'usuarios:read',
        nombre: 'Ver Usuarios',
        descripcion: 'Visualizar lista de usuarios',
        categoria: 'usuarios'
      },
      {
        id: 'usuarios:write',
        nombre: 'Gestionar Usuarios',
        descripcion: 'Crear, editar y eliminar usuarios',
        categoria: 'usuarios'
      },
      {
        id: 'reportes:read',
        nombre: 'Ver Reportes',
        descripcion: 'Acceso a reportes del sistema',
        categoria: 'reportes'
      }
    ];
  }

  // Datos mock para desarrollo - Roles
  private static getMockRoles(): Rol[] {
    return [
      {
        id: 'admin',
        nombre: 'Administrador',
        descripcion: 'Acceso completo al sistema',
        permisos: ['admin:all'],
        activo: true
      },
      {
        id: 'contador',
        nombre: 'Contador',
        descripcion: 'Acceso a funciones contables',
        permisos: ['contabilidad:read', 'contabilidad:write', 'reportes:read'],
        activo: true
      },
      {
        id: 'usuario',
        nombre: 'Usuario',
        descripcion: 'Acceso básico al sistema',
        permisos: ['contabilidad:read', 'reportes:read'],
        activo: true
      }
    ];
  }

  // Crear rol
  static async crearRol(rol: Omit<Rol, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(this.rolesRef, rol);
      return docRef.id;
    } catch (error) {
      console.error('Error creando rol:', error);
      throw error;
    }
  }
}