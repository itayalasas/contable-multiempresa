import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Usuario } from '../types';
import { AuthService } from '../services/auth/authService';
import { usuariosSupabaseService } from '../services/supabase/usuarios';

interface AuthContextType {
  user: any;
  usuario: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  hasAccess: (empresaId: string) => boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const initializeAuth = async () => {
      try {
        setError(null);

        const code = AuthService.extractCodeFromUrl();
        const state = AuthService.extractStateFromUrl();

        if (code && state === 'authenticated') {
          console.log('🔐 Código de autenticación detectado, intercambiando por token...');

          try {
            const authResponse = await AuthService.exchangeCodeForToken(code);
            console.log('✅ Token obtenido exitosamente');

            AuthService.saveSession(authResponse.data);
            console.log('✅ Sesión guardada');

            window.history.replaceState({}, document.title, window.location.pathname);

            const authUser = authResponse.data.user;
            await syncUserWithDatabase(authUser);

            return;
          } catch (exchangeError) {
            console.error('❌ Error intercambiando código por token:', exchangeError);
            setError('Error al validar la autenticación');
            setIsLoading(false);
            return;
          }
        }

        if (AuthService.isAuthenticated()) {
          const authUser = AuthService.getUser();

          if (authUser) {
            await syncUserWithDatabase(authUser);
          }
        } else {
          const refreshed = await AuthService.refreshAccessToken();

          if (!refreshed) {
            console.log('🔓 No hay sesión activa');
          } else {
            const authUser = AuthService.getUser();
            if (authUser) {
              await syncUserWithDatabase(authUser);
            }
          }
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        setError('Error inicializando la aplicación');
      } finally {
        setIsLoading(false);
      }
    };

    const syncUserWithDatabase = async (authUser: any) => {
      try {
        console.log('🔍 Datos del sistema de autenticación:', authUser);

        let dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);

        const metadataFromAuth = authUser.metadata || {};
        const permissionsFromAuth = authUser.permissions || {};
        const roleFromAuth = authUser.role || 'usuario';

        console.log('📋 Metadata del sistema externo:', metadataFromAuth);
        console.log('🔐 Permisos del sistema externo:', permissionsFromAuth);
        console.log('👤 Rol del sistema externo:', roleFromAuth);

        const roleMapping: Record<string, string> = {
          'administrador_del_sistema': 'admin',
          'admin': 'admin',
          'supervisor': 'supervisor',
          'contador': 'contador',
          'usuario': 'usuario',
          'super_admin': 'super_admin',
          'admin_empresa': 'admin_empresa',
        };

        const externalRole = metadataFromAuth.role || roleFromAuth;
        const mappedRole = roleMapping[externalRole] || 'usuario';

        console.log('🔄 Rol mapeado:', externalRole, '→', mappedRole);

        const userMetadata = {
          role: externalRole,
          permissions: metadataFromAuth.permissions || permissionsFromAuth || {}
        };

        if (!dbUser) {
          console.log('👤 Creando nuevo usuario en base de datos...');

          const newUser: Omit<Usuario, 'fechaCreacion'> = {
            id: authUser.id,
            nombre: authUser.name || authUser.email,
            email: authUser.email,
            rol: mappedRole,
            empresasAsignadas: [],
            permisos: [],
            activo: true,
            configuracion: {
              idioma: 'es',
              timezone: 'America/Lima',
              formatoFecha: 'DD/MM/YYYY',
              formatoMoneda: 'es-PE'
            },
            metadata: userMetadata
          };

          console.log('📝 Creando usuario con metadata:', userMetadata);
          dbUser = await usuariosSupabaseService.createUsuario(newUser);
          console.log('✅ Usuario creado en base de datos');
        } else {
          console.log('👤 Usuario existente, actualizando metadata si cambió...');

          const shouldUpdateMetadata = JSON.stringify(dbUser.metadata) !== JSON.stringify(userMetadata);

          if (shouldUpdateMetadata) {
            console.log('📝 Actualizando metadata del usuario...');
            console.log('Metadata anterior:', dbUser.metadata);
            console.log('Metadata nueva:', userMetadata);

            await usuariosSupabaseService.updateUsuario(authUser.id, {
              metadata: userMetadata,
              rol: mappedRole
            });

            dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);
            console.log('✅ Metadata actualizado');
          }

          try {
            await usuariosSupabaseService.updateUltimaConexion(authUser.id);
          } catch (ultimaConexionError) {
            console.warn('No se pudo actualizar la ultima conexion sin bloquear el login:', ultimaConexionError);
          }
        }

        const enrichedUser: Usuario = {
          ...dbUser,
          metadata: dbUser.metadata || userMetadata
        };

        console.log('👤 Usuario enriquecido con permisos:', enrichedUser);
        console.log('🔐 Permisos finales:', enrichedUser.metadata?.permissions);
        setUsuario(enrichedUser);
      } catch (error) {
        console.error('Error sincronizando usuario:', error);
        throw error;
      }
    };

    initializeAuth();
  }, []);

  const login = () => {
    AuthService.redirectToLogin();
  };

  const logout = () => {
    AuthService.logout();
    setUsuario(null);
    setError(null);
    window.location.href = '/';
  };

  const hasAccess = (empresaId: string): boolean => {
    if (!usuario) return false;
    return usuario.empresasAsignadas.includes(empresaId);
  };

  const mockAuth0User = usuario ? {
    sub: usuario.id,
    name: usuario.nombre,
    email: usuario.email,
    picture: usuario.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
  } : null;

  return (
    <AuthContext.Provider value={{
      user: mockAuth0User,
      usuario,
      isLoading,
      isAuthenticated: !!usuario && AuthService.isAuthenticated(),
      login,
      logout,
      hasAccess,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};
