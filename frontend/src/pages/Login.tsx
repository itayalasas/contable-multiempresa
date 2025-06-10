import React, { useState } from 'react';
import { Building2, AlertCircle, Copy, ExternalLink, Settings, RefreshCw, CheckCircle, Globe, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuth0 } from '@auth0/auth0-react';
import { getAuthConfigInfo } from '../config/auth0';

export const Login: React.FC = () => {
  const [showConfig, setShowConfig] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [show403Help, setShow403Help] = useState(false);
  
  const { login } = useAuth();
  const { error: auth0Error, isLoading } = useAuth0();
  
  const configInfo = getAuthConfigInfo();

  const handleLogin = () => {
    if (!configInfo.isConfigValid) {
      alert('Por favor configura las variables de entorno de Auth0 antes de continuar');
      return;
    }
    
    login();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const reloadPage = () => {
    window.location.reload();
  };

  // Detectar si el dominio es problemático
  const isProblematicDomain = configInfo.domain.includes('dev-b1y4amcniivy4nc') || 
                             configInfo.domain.includes('demo.auth0.com');

  // Detectar error 403
  const is403Error = auth0Error?.message?.includes('403') || 
                    auth0Error?.message?.includes('Forbidden') ||
                    window.location.href.includes('403');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ContaEmpresa</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestión Contable</p>
          <p className="text-sm text-gray-500 mt-1">Acceso al portal empresarial</p>
        </div>

        {/* Error 403 Forbidden - Ayuda específica */}
        {is403Error && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  🚫 Error 403 Forbidden
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  El dominio personalizado está configurado pero la aplicación no tiene permisos para acceder.
                </p>
                
                <div className="bg-red-100 p-4 rounded border border-red-200 mb-4">
                  <h4 className="text-sm font-medium text-red-800 mb-3">
                    🔧 Soluciones paso a paso:
                  </h4>
                  
                  <div className="space-y-4 text-sm text-red-700">
                    <div className="bg-red-200 p-3 rounded">
                      <p className="font-medium mb-2">1. Verifica que el dominio esté verificado en Auth0:</p>
                      <p className="text-xs">• Ve a Auth0 Dashboard → Branding → Custom Domains</p>
                      <p className="text-xs">• El estado debe ser "Verified" (no "Pending")</p>
                      <p className="text-xs">• Si está pendiente, verifica los registros DNS</p>
                    </div>

                    <div className="bg-red-200 p-3 rounded">
                      <p className="font-medium mb-2">2. Configura las URLs en tu aplicación Auth0:</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium">Allowed Callback URLs:</p>
                          <div className="flex items-center justify-between bg-white p-2 rounded">
                            <code className="text-xs">{configInfo.requiredUrls.callback}</code>
                            <button
                              onClick={() => copyToClipboard(configInfo.requiredUrls.callback)}
                              className="text-red-700 hover:text-red-900"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs font-medium">Allowed Logout URLs:</p>
                          <div className="flex items-center justify-between bg-white p-2 rounded">
                            <code className="text-xs">{configInfo.requiredUrls.logout}</code>
                            <button
                              onClick={() => copyToClipboard(configInfo.requiredUrls.logout)}
                              className="text-red-700 hover:text-red-900"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs font-medium">Allowed Web Origins:</p>
                          <div className="flex items-center justify-between bg-white p-2 rounded">
                            <code className="text-xs">{configInfo.requiredUrls.webOrigins}</code>
                            <button
                              onClick={() => copyToClipboard(configInfo.requiredUrls.webOrigins)}
                              className="text-red-700 hover:text-red-900"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium">Application Login URI (MUY IMPORTANTE):</p>
                          <div className="flex items-center justify-between bg-white p-2 rounded">
                            <code className="text-xs">{configInfo.requiredUrls.loginUri}</code>
                            <button
                              onClick={() => copyToClipboard(configInfo.requiredUrls.loginUri)}
                              className="text-red-700 hover:text-red-900"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-200 p-3 rounded">
                      <p className="font-medium mb-2">3. Habilita Cross-Origin Authentication:</p>
                      <p className="text-xs">• En Auth0 Dashboard → Applications → Tu App → Settings</p>
                      <p className="text-xs">• Marca "Allow Cross-Origin Authentication"</p>
                      <p className="text-xs">• En "Allowed Origins (CORS)" agrega: <code>{configInfo.requiredUrls.webOrigins}</code></p>
                    </div>

                    <div className="bg-red-200 p-3 rounded">
                      <p className="font-medium mb-2">4. Verifica el tipo de aplicación:</p>
                      <p className="text-xs">• Debe ser "Single Page Application"</p>
                      <p className="text-xs">• NO debe ser "Regular Web Application"</p>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">!</div>
                      <div>
                        <p className="font-medium">Después de hacer cambios:</p>
                        <button
                          onClick={reloadPage}
                          className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center space-x-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Recargar página</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShow403Help(!show403Help)}
                  className="text-sm text-red-800 underline hover:no-underline"
                >
                  {show403Help ? 'Ocultar información técnica' : 'Ver información técnica del error'}
                </button>

                {show403Help && (
                  <div className="mt-3 p-3 bg-red-100 rounded border text-xs">
                    <p className="font-medium mb-2">Información técnica:</p>
                    <div className="space-y-1 text-red-700">
                      <p>• URL actual: {configInfo.debugInfo.fullUrl}</p>
                      <p>• Dominio Auth0: {configInfo.domain}</p>
                      <p>• Client ID: {configInfo.clientId.substring(0, 8)}...</p>
                      <p>• Protocolo: {configInfo.debugInfo.protocol}</p>
                      <p>• Puerto: {configInfo.debugInfo.port || 'default'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Estado del dominio personalizado */}
        {configInfo.isCustomDomain && !is403Error && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  ✅ Dominio Personalizado Configurado
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Usando dominio personalizado: <code className="bg-green-200 px-2 py-1 rounded font-mono">{configInfo.domain}</code>
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Los usuarios verán tu dominio en lugar del dominio estándar de Auth0
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error crítico: Dominio incorrecto */}
        {isProblematicDomain && !is403Error && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  🚨 Dominio Auth0 Incorrecto
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  El dominio <code className="bg-red-200 px-2 py-1 rounded font-mono">{configInfo.domain}</code> no es válido o no existe.
                </p>
                
                <div className="bg-red-100 p-4 rounded border border-red-200 mb-4">
                  <h4 className="text-sm font-medium text-red-800 mb-3">
                    📋 Usa tu dominio personalizado:
                  </h4>
                  
                  <div className="space-y-4 text-sm text-red-700">
                    <div className="bg-red-200 p-3 rounded">
                      <p className="font-medium mb-2">Actualiza tu archivo .env:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono">
                          VITE_AUTH0_DOMAIN=auth-dev.contaempresa.online
                        </code>
                        <button
                          onClick={() => copyToClipboard('VITE_AUTH0_DOMAIN=auth-dev.contaempresa.online')}
                          className="text-red-700 hover:text-red-900"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">!</div>
                      <div>
                        <p className="font-medium">Recarga la página después del cambio:</p>
                        <button
                          onClick={reloadPage}
                          className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center space-x-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Recargar página</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error de configuración */}
        {!configInfo.isConfigValid && !isProblematicDomain && !is403Error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Configuración Requerida</h3>
                <p className="text-sm text-red-700 mt-1">
                  Debes configurar las variables de entorno de Auth0 para continuar.
                </p>
                <div className="mt-3 p-3 bg-red-100 rounded border">
                  <p className="text-xs text-red-800 font-medium mb-2">
                    Variables requeridas en el archivo .env:
                  </p>
                  <div className="space-y-1 text-xs text-red-700">
                    <div>• VITE_AUTH0_DOMAIN=auth-dev.contaempresa.online</div>
                    <div>• VITE_AUTH0_CLIENT_ID=tu-client-id</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error general de Auth0 */}
        {auth0Error && !is403Error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error de Autenticación</h3>
                <p className="text-sm text-red-700 mt-1">
                  {auth0Error.message || 'Ocurrió un error durante la autenticación'}
                </p>
                {auth0Error.message?.includes('Unknown host') && (
                  <p className="text-xs text-red-600 mt-2">
                    Este error indica que el dominio de Auth0 no existe. Verifica tu configuración.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="space-y-6">
            <button
              onClick={handleLogin}
              disabled={!configInfo.isConfigValid || isLoading || isProblematicDomain}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : !configInfo.isConfigValid || isProblematicDomain ? (
                <span>Configuración Requerida</span>
              ) : (
                <span>Iniciar Sesión con Auth0</span>
              )}
            </button>
          </div>

          {/* Información de configuración para Bolt.new */}
          {configInfo.isBolt && configInfo.isConfigValid && !isProblematicDomain && !is403Error && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="text-sm font-medium text-green-800">
                  ✅ Configuración Auth0 Válida {configInfo.isCustomDomain && '(Dominio Personalizado)'}
                </h4>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-green-600 hover:text-green-800 ml-auto"
                >
                  {showConfig ? 'Ocultar URLs' : 'Ver URLs para Auth0'}
                </button>
              </div>
              
              {showConfig && (
                <div className="text-sm text-green-700 space-y-4">
                  <div>
                    <p className="font-medium mb-2">📍 Configura estas URLs en Auth0 Dashboard → Applications → Tu App → Settings</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">1. Allowed Callback URLs:</span>
                        <button
                          onClick={() => copyToClipboard(configInfo.callbackUrl)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="text-xs">Copiar</span>
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 p-2 rounded block break-all">
                        {configInfo.callbackUrl}
                      </code>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">2. Allowed Logout URLs:</span>
                        <button
                          onClick={() => copyToClipboard(configInfo.callbackUrl)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="text-xs">Copiar</span>
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 p-2 rounded block break-all">
                        {configInfo.callbackUrl}
                      </code>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">3. Allowed Web Origins:</span>
                        <button
                          onClick={() => copyToClipboard(configInfo.callbackUrl)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="text-xs">Copiar</span>
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 p-2 rounded block break-all">
                        {configInfo.callbackUrl}
                      </code>
                    </div>

                    <div className="border-t border-green-200 pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">4. Application Login URI:</span>
                        <button
                          onClick={() => copyToClipboard(configInfo.callbackUrl)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="text-xs">Copiar</span>
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 p-2 rounded block break-all">
                        {configInfo.callbackUrl}
                      </code>
                      <p className="text-xs text-green-600 mt-1">
                        ⚠️ Esta configuración es <strong>obligatoria</strong> para que funcione el login
                      </p>
                    </div>

                    <div className="border-t border-green-200 pt-3">
                      <p className="font-medium mb-2">5. Configuraciones adicionales:</p>
                      <div className="space-y-2 text-xs">
                        <div className="bg-green-100 p-2 rounded">
                          <p className="font-medium">Cross-Origin Authentication:</p>
                          <p>• Activar "Allow Cross-Origin Authentication"</p>
                          <p>• En "Allowed Origins (CORS)" agregar: <code>{configInfo.callbackUrl}</code></p>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <p className="font-medium">Application Type:</p>
                          <p>• Debe ser: "Single Page Application"</p>
                        </div>
                        {configInfo.isCustomDomain && (
                          <div className="bg-blue-100 p-2 rounded">
                            <p className="font-medium">Dominio Personalizado:</p>
                            <p>• Configurado: <code>{configInfo.domain}</code></p>
                            <p>• Estado: {configInfo.domainStatus}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-green-800">
                      🚀 Después de configurar todo, guarda los cambios en Auth0 y recarga esta página
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información de desarrollo */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-800">Información de Desarrollo</h4>
                <Settings className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• Entorno: {configInfo.environment}</p>
                <p>• URL de callback: {configInfo.callbackUrl}</p>
                <p>• Hostname: {configInfo.hostname}</p>
                <p>• Dominio Auth0: {configInfo.domain}</p>
                <p>• Client ID: {configInfo.clientId.substring(0, 8)}...</p>
                <p>• Configuración válida: {configInfo.isConfigValid ? '✅' : '❌'}</p>
                <p>• Dominio personalizado: {configInfo.isCustomDomain ? '✅' : '❌'}</p>
                <p>• Dominio problemático: {isProblematicDomain ? '❌' : '✅'}</p>
                <p>• Error 403: {is403Error ? '❌' : '✅'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2024 ContaEmpresa. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};