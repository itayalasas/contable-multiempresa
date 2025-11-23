interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

export class Auth0TokenService {
  private static cachedToken: CachedToken | null = null;
  private static readonly BUFFER_TIME = 300; // 5 minutos de buffer antes de expiración

  // Obtener token válido (usa caché si está disponible)
  static async getValidToken(): Promise<string> {
    // Verificar si tenemos un token en caché válido
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return this.cachedToken.token;
    }

    // Generar nuevo token
    const newToken = await this.generateNewToken();
    
    // Guardar en caché
    this.cachedToken = {
      token: newToken.access_token,
      expiresAt: Date.now() + (newToken.expires_in * 1000) - (this.BUFFER_TIME * 1000)
    };

    return newToken.access_token;
  }

  // Generar nuevo token desde Auth0
  private static async generateNewToken(): Promise<TokenResponse> {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientId = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_SECRET;

    if (!domain || !clientId || !clientSecret) {
      throw new Error('Faltan credenciales de Auth0 Management API en las variables de entorno');
    }

    try {
      const response = await fetch(`https://${domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          audience: `https://${domain}/api/v2/`,
          grant_type: 'client_credentials'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error obteniendo token: ${error.error_description || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generando token de Auth0:', error);
      throw error;
    }
  }

  // Verificar si el token en caché es válido
  private static isTokenValid(cachedToken: CachedToken): boolean {
    return Date.now() < cachedToken.expiresAt;
  }

  // Limpiar caché (útil para logout o errores)
  static clearTokenCache(): void {
    this.cachedToken = null;
  }

  // Forzar renovación del token
  static async refreshToken(): Promise<string> {
    this.clearTokenCache();
    return await this.getValidToken();
  }
}