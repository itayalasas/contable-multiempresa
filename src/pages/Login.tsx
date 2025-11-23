import React from 'react';
import { Building2, LogIn, Shield, TrendingUp, BarChart3, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02em0wIDJjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>

      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="text-white space-y-6 md:space-y-8 lg:pr-12 order-2 lg:order-1">
            <div className="inline-flex items-center space-x-2 md:space-x-3 bg-white/10 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/20">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
              <span className="text-xs md:text-sm font-medium">Plataforma de Gestión Empresarial</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                ContaEmpresa
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6 md:mb-8">
                La solución integral para la gestión contable y financiera de tu empresa
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="flex items-start space-x-3 md:space-x-4 bg-white/5 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm md:text-base">Control Financiero Total</h3>
                  <p className="text-xs md:text-sm text-blue-200">Gestiona contabilidad, cuentas por cobrar y pagar en tiempo real</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 md:space-x-4 bg-white/5 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm md:text-base">Reportes Inteligentes</h3>
                  <p className="text-xs md:text-sm text-blue-200">Toma decisiones informadas con reportes financieros automatizados</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 md:space-x-4 bg-white/5 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm md:text-base">Multi-Empresa</h3>
                  <p className="text-xs md:text-sm text-blue-200">Administra múltiples empresas desde una sola plataforma</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:pl-12 order-1 lg:order-2">
            <div className="bg-white/95 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 md:p-8 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-white rounded-full mb-3 md:mb-4">
                  <Building2 className="h-7 w-7 md:h-8 md:w-8 text-blue-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Bienvenido</h2>
                <p className="text-sm md:text-base text-blue-100">Inicia sesión para continuar</p>
              </div>

              <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:ring-4 focus:ring-blue-500/50 font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span>Iniciar Sesión</span>
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Acceso seguro empresarial</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Autenticación empresarial segura</span>
                  </div>

                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700">Datos protegidos con encriptación</span>
                  </div>

                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-gray-700">Cumplimiento normativo garantizado</span>
                  </div>
                </div>

                {import.meta.env.DEV && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-800 mb-2">Modo Desarrollo</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Auth: {import.meta.env.VITE_AUTH_URL?.substring(0, 30)}...</p>
                      <p>App: {import.meta.env.VITE_AUTH_APP_ID}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mt-4 md:mt-6 text-xs md:text-sm text-blue-200">
              <p>© 2024 ContaEmpresa. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};
