import { Auth0Provider } from '@auth0/auth0-react';

// Detectar si estamos en el entorno de Bolt.new
const isBoltEnvironment = (): boolean => {
  return window.location.hostname.includes('webcontainer-api.io') || 
         window.location.hostname.includes('local-credentialless') ||
         window.location.hostname.includes('bolt.new') ||
         window.location.hostname.includes('stackblitz.io');
};

// Obtener la URL actual completa para Bolt.new
const getBoltCallbackUrl = (): string => {
  return window.location.origin;
};

// Validar configuración de Auth0
const validateAuth0Config = () => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  
  if (!domain || !clientId) {
    console.warn('Faltan variables de entorno de Auth0: VITE_AUTH0_DOMAIN y VITE_AUTH0_CLIENT_ID son requeridas');
    return {
      domain: 'demo.auth0.com',
      clientId: 'demo-client-id',
      isValid: false
    };
  }
  
  // Verificar formato del dominio (incluir dominios personalizados)
  const isValidDomain = domain.includes('.auth0.com') || 
                       domain.includes('.eu.auth0.com') || 
                       domain.includes('.au.auth0.com') ||
                       domain.includes('contaempresa.online') || // Tu dominio personalizado
                       domain.includes('auth-dev.contaempresa.online'); // Tu dominio específico
  
  if (!isValidDomain) {
    console.warn('El dominio de Auth0 podría no tener el formato correcto:', domain);
  }
  
  return { domain, clientId, isValid: true };
};

// Obtener configuración validada
const getValidatedConfig = () => {
  return validateAuth0Config();
};

const { domain, clientId, isValid } = getValidatedConfig();

// Determinar la URL de callback correcta
const getCallbackUrl = (): string => {
  // En Bolt.new, usar la URL actual
  if (isBoltEnvironment()) {
    return window.location.origin;
  }
  
  // En producción, usar el dominio personalizado
  const hostname = window.location.hostname;
  if (hostname === 'app-dev.contaempresa.online') {
    return 'https://app-dev.contaempresa.online';
  }
  
  // Fallback a la URL actual
  return window.location.origin;
};

const auth0Config = {
  domain,
  clientId,
  authorizationParams: {
    redirect_uri: getCallbackUrl(),
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || `https://${domain}/api/v2/`,
    scope: 'openid profile email read:current_user update:current_user_metadata'
  },
  cacheLocation: 'localstorage' as const,
  useRefreshTokens: true,
  // Configuraciones adicionales para resolver problemas comunes
  skipRedirectCallback: false,
  onRedirectCallback: (appState: any) => {
    // Limpiar la URL después del callback
    const targetUrl = appState?.returnTo || window.location.pathname;
    window.history.replaceState({}, document.title, targetUrl);
  },
  // Configuración para evitar bucles infinitos
  maxAge: 86400, // 24 horas
  leeway: 60 // 1 minuto de tolerancia
};

// Configuración para multi-tenant basado en subdominio
const getTenantFromDomain = (): string | null => {
  const hostname = window.location.hostname;
  
  // Si es localhost, desarrollo local o Bolt.new, no hay tenant
  if (hostname === 'localhost' || 
      hostname.includes('localhost') || 
      isBoltEnvironment()) {
    return null;
  }
  
  // Si no termina con el dominio base esperado, no hay tenant
  const baseDomain = 'contaempresa.com';
  if (!hostname.endsWith(baseDomain)) {
    return null;
  }
  
  const parts = hostname.split('.');
  
  // Si es un subdominio válido (ej: empresa1.contaempresa.com)
  if (parts.length > 2 && hostname.endsWith(baseDomain)) {
    const subdomain = parts[0];
    // Verificar que el subdominio no sea 'www' o similar
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'auth-dev') {
      return subdomain;
    }
  }
  
  // Si es dominio principal, usar tenant por defecto
  return null;
};

const getAuth0Domain = (tenant?: string): string => {
  const baseDomain = domain;
  
  // Si hay tenant específico, usar custom domain
  if (tenant) {
    return `${tenant}.${baseDomain}`;
  }
  
  return baseDomain;
};

const buildRedirectUri = (tenant?: string): string => {
  // En entorno Bolt.new, usar la URL actual
  if (isBoltEnvironment()) {
    return window.location.origin;
  }
  
  const baseUrl = import.meta.env.VITE_APP_BASE_URL;
  
  if (tenant) {
    return `https://${tenant}.${baseUrl.replace('https://', '').replace('app.', '')}`;
  }
  
  return baseUrl || window.location.origin;
};

// Función para mostrar información de configuración (útil para debugging)
export const getAuthConfigInfo = () => {
  const isCustomDomain = domain.includes('contaempresa.online');
  const currentUrl = getCallbackUrl();
  
  return {
    environment: isBoltEnvironment() ? 'Bolt.new' : import.meta.env.DEV ? 'Development' : 'Production',
    callbackUrl: currentUrl,
    hostname: window.location.hostname,
    origin: window.location.origin,
    isBolt: isBoltEnvironment(),
    domain: domain,
    clientId: clientId,
    isConfigValid: isValid && domain !== 'demo.auth0.com',
    isCustomDomain: isCustomDomain,
    domainStatus: isCustomDomain ? 'Dominio personalizado configurado' : 'Dominio estándar de Auth0',
    // URLs específicas para configurar en Auth0
    requiredUrls: {
      callback: currentUrl,
      logout: currentUrl,
      webOrigins: currentUrl,
      loginUri: currentUrl
    },
    // Información adicional para debugging del error 403
    debugInfo: {
      fullUrl: window.location.href,
      protocol: window.location.protocol,
      port: window.location.port,
      pathname: window.location.pathname,
      search: window.location.search
    }
  };
};