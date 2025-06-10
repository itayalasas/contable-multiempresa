import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';

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
    // Simular carga inicial y crear usuario mock
    const initializeAuth = async () => {
      try {
        setError(null);
        
        // Simular tiempo de carga
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Crear usuario mock para desarrollo con múltiples empresas
        const mockUser: Usuario = {
          id: 'dev-user-123',
          nombre: 'Usuario de Desarrollo',
          email: 'dev@contaempresa.com',
          rol: 'super_admin', // Super admin para acceso completo
          empresasAsignadas: ['dev-empresa-pe', 'dev-empresa-co', 'dev-empresa-mx'],
          permisos: ['admin:all'],
          paisId: 'peru',
          activo: true,
          fechaCreacion: new Date(),
          configuracion: {
            idioma: 'es',
            timezone: 'America/Lima',
            formatoFecha: 'DD/MM/YYYY',
            formatoMoneda: 'es-PE'
          }
        };
        
        setUsuario(mockUser);
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        setError('Error inicializando la aplicación');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = () => {
    // En modo desarrollo, simplemente marcar como autenticado
    console.log('Login simulado - ya estás autenticado en modo desarrollo');
  };

  const logout = () => {
    setUsuario(null);
    setError(null);
    // En desarrollo, podrías recargar la página o resetear el estado
    window.location.reload();
  };

  const hasAccess = (empresaId: string): boolean => {
    if (!usuario) return false;
    return usuario.empresasAsignadas.includes(empresaId);
  };

  // Mock user object para compatibilidad
  const mockAuth0User = {
    sub: usuario?.id || 'dev-user-123',
    name: usuario?.nombre || 'Usuario de Desarrollo',
    email: usuario?.email || 'dev@contaempresa.com',
    picture: usuario?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'
  };

  return (
    <AuthContext.Provider value={{
      user: mockAuth0User,
      usuario,
      isLoading,
      isAuthenticated: !!usuario,
      login,
      logout,
      hasAccess,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};