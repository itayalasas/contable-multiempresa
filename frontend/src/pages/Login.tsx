import React from 'react';
import { Building2, LogIn, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ContaEmpresa</h1>
          <p className="text-gray-600">Sistema de Gestión Contable Empresarial</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Bienvenido
              </h2>
              <p className="text-sm text-gray-600">
                Inicia sesión con tu cuenta empresarial
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Autenticación Segura
                  </p>
                  <p className="text-xs text-blue-700">
                    Tu información está protegida con los más altos estándares de seguridad
                  </p>
                </div>
              </div>
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-800 mb-2">Información de Desarrollo</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• URL Auth: {import.meta.env.VITE_AUTH_URL}</p>
                <p>• App ID: {import.meta.env.VITE_AUTH_APP_ID}</p>
                <p>• Callback: {import.meta.env.VITE_AUTH_CALLBACK_URL}</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 ContaEmpresa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};
