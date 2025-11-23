import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setError(null);

        const code = AuthService.extractCodeFromUrl();
        const state = AuthService.extractStateFromUrl();

        if (code && state === 'authenticated') {
          console.log('🔐 Código de autenticación detectado, intercambiando por token...');

          try {
            const authResponse = await AuthService.exchangeCodeForToken(code);
            AuthService.saveSession(authResponse.data);

            await syncUserWithDatabase(authResponse.data.user);

            console.log('✅ Autenticación exitosa');
          } catch (error) {
            console.error('❌ Error al intercambiar código:', error);
            setError('Error al procesar la autenticación');
            setIsLoading(false);
            return;
          }
        }

        if (AuthService.isAuthenticated()) {
          const authUser = AuthService.getUser();

          if (authUser) {
            const dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);

            if (dbUser) {
              setUsuario(dbUser);
            } else {
              await syncUserWithDatabase(authUser);
            }
          }
        } else {
          const refreshed = await AuthService.refreshAccessToken();

          if (!refreshed) {
            console.log('🔓 No hay sesión activa');
          } else {
            const authUser = AuthService.getUser();
            if (authUser) {
              const dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);
              if (dbUser) {
                setUsuario(dbUser);
              }
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
        let dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);

        if (!dbUser) {
          console.log('👤 Creando nuevo usuario en base de datos...');

          const newUser: Omit<Usuario, 'fechaCreacion'> = {
            id: authUser.id,
            nombre: authUser.name,
            email: authUser.email,
            rol: authUser.role === 'admin' ? 'admin_empresa' : 'usuario',
            empresasAsignadas: [],
            permisos: Object.keys(authUser.permissions || {}),
            activo: true,
            configuracion: {
              idioma: 'es',
              timezone: 'America/Lima',
              formatoFecha: 'DD/MM/YYYY',
              formatoMoneda: 'es-PE'
            }
          };

          dbUser = await usuariosSupabaseService.createUsuario(newUser);
          console.log('✅ Usuario creado en base de datos');
        } else {
          await usuariosSupabaseService.updateUltimaConexion(authUser.id);
        }

        setUsuario(dbUser);
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
