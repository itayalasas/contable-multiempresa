interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

interface AuthTenant {
  id: string;
  name: string;
  owner_user_id: string;
  owner_email: string;
  organization_name: string;
  status: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: AuthUser;
    tenant: AuthTenant;
    application: {
      id: string;
    };
    has_access: boolean;
    available_plans: any[];
  };
}

export class AuthService {
  private static readonly AUTH_URL = import.meta.env.VITE_AUTH_URL;
  private static readonly AUTH_APP_ID = import.meta.env.VITE_AUTH_APP_ID;
  private static readonly AUTH_API_KEY = import.meta.env.VITE_AUTH_API_KEY;
  private static readonly AUTH_CALLBACK_URL = import.meta.env.VITE_AUTH_CALLBACK_URL;
  private static readonly AUTH_EXCHANGE_URL = import.meta.env.VITE_AUTH_EXCHANGE_URL;

  static getLoginUrl(): string {
    const params = new URLSearchParams({
      app_id: this.AUTH_APP_ID,
      redirect_uri: this.AUTH_CALLBACK_URL,
      api_key: this.AUTH_API_KEY,
    });

    return `${this.AUTH_URL}/login?${params.toString()}`;
  }

  static redirectToLogin(): void {
    window.location.href = this.getLoginUrl();
  }

  static async exchangeCodeForToken(code: string): Promise<AuthResponse> {
    const response = await fetch(this.AUTH_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        application_id: this.AUTH_APP_ID,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al intercambiar el código de autenticación');
    }

    const data: AuthResponse = await response.json();

    if (!data.success) {
      throw new Error('La respuesta de autenticación no fue exitosa');
    }

    return data;
  }

  static saveSession(authData: AuthResponse['data']): void {
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('tenant', JSON.stringify(authData.tenant));
    localStorage.setItem('token_expiry', (Date.now() + authData.expires_in * 1000).toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  static getUser(): AuthUser | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  static getTenant(): AuthTenant | null {
    const tenantJson = localStorage.getItem('tenant');
    return tenantJson ? JSON.parse(tenantJson) : null;
  }

  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem('token_expiry');

    if (!token || !expiry) {
      return false;
    }

    return Date.now() < parseInt(expiry);
  }

  static logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('token_expiry');
  }

  static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.AUTH_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
          application_id: this.AUTH_APP_ID,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.success) {
        this.saveSession(data.data);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      return false;
    }
  }

  static extractCodeFromUrl(url: string = window.location.href): string | null {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('code');
  }

  static extractStateFromUrl(url: string = window.location.href): string | null {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('state');
  }
}
