import { Auth0UserMetadata } from '../../types';
import { Auth0TokenService } from './token';

export class Auth0ManagementService {
  private static baseUrl = `https://${import.meta.env.VITE_AUTH0_DOMAIN}/api/v2`;

  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      // Verificar si estamos en modo desarrollo sin credenciales reales
      if (this.isDevelopmentMode()) {
        throw new Error('Auth0 Management API no configurado para desarrollo');
      }

      // Obtener token válido automáticamente
      const token = await Auth0TokenService.getValidToken();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        // Si el token expiró, intentar renovarlo una vez
        if (response.status === 401) {
          const newToken = await Auth0TokenService.refreshToken();
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (!retryResponse.ok) {
            const error = await retryResponse.json();
            throw new Error(`Auth0 API Error: ${error.message || retryResponse.statusText}`);
          }

          return retryResponse.json();
        }

        const error = await response.json();
        throw new Error(`Auth0 API Error: ${error.message || response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error en Auth0 Management API:', error);
      throw error;
    }
  }

  private static isDevelopmentMode(): boolean {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientId = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_AUTH0_MANAGEMENT_CLIENT_SECRET;

    return !domain || !clientId || !clientSecret || 
           domain.includes('dev-') || 
           clientId.includes('dev-') || 
           clientSecret.includes('dev-');
  }

  // Crear usuario en Auth0
  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    metadata: Auth0UserMetadata;
  }) {
    try {
      if (this.isDevelopmentMode()) {
        // Simular creación de usuario en desarrollo
        return {
          user_id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: userData.email,
          name: userData.name,
          created_at: new Date().toISOString()
        };
      }

      const user = await this.makeRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          connection: 'Username-Password-Authentication',
          email_verified: true,
          app_metadata: userData.metadata,
          user_metadata: {
            created_by: 'admin_panel',
            creation_date: new Date().toISOString()
          }
        }),
      });

      return user;
    } catch (error) {
      console.error('Error creando usuario en Auth0:', error);
      throw error;
    }
  }

  // Actualizar metadatos de usuario
  static async updateUserMetadata(userId: string, metadata: Partial<Auth0UserMetadata>) {
    try {
      if (this.isDevelopmentMode()) {
        console.log('Simulando actualización de metadatos en desarrollo:', { userId, metadata });
        return { user_id: userId, app_metadata: metadata };
      }

      const user = await this.makeRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          app_metadata: metadata
        }),
      });

      return user;
    } catch (error) {
      console.error('Error actualizando metadatos:', error);
      throw error;
    }
  }

  // Obtener usuario por email
  static async getUserByEmail(email: string) {
    try {
      if (this.isDevelopmentMode()) {
        return null;
      }

      const users = await this.makeRequest(`/users-by-email?email=${encodeURIComponent(email)}`);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error obteniendo usuario por email:', error);
      throw error;
    }
  }

  // Eliminar usuario
  static async deleteUser(userId: string) {
    try {
      if (this.isDevelopmentMode()) {
        console.log('Simulando eliminación de usuario en desarrollo:', userId);
        return;
      }

      await this.makeRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // Enviar email de verificación
  static async sendVerificationEmail(userId: string) {
    try {
      if (this.isDevelopmentMode()) {
        console.log('Simulando envío de email de verificación en desarrollo:', userId);
        return;
      }

      await this.makeRequest('/jobs/verification-email', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId
        }),
      });
    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      throw error;
    }
  }

  // Resetear contraseña
  static async sendPasswordResetEmail(email: string) {
    try {
      if (this.isDevelopmentMode()) {
        console.log('Simulando reset de contraseña en desarrollo:', email);
        return;
      }

      await this.makeRequest('/dbconnections/change_password', {
        method: 'POST',
        body: JSON.stringify({
          client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
          email: email,
          connection: 'Username-Password-Authentication'
        }),
      });
    } catch (error) {
      console.error('Error enviando reset de contraseña:', error);
      throw error;
    }
  }

  // Listar usuarios con filtros
  static async getUsers(filters: {
    page?: number;
    per_page?: number;
    search?: string;
    sort?: string;
  } = {}) {
    try {
      if (this.isDevelopmentMode()) {
        return [];
      }

      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.search) params.append('q', filters.search);
      if (filters.sort) params.append('sort', filters.sort);

      const users = await this.makeRequest(`/users?${params.toString()}`);
      return users;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  // Verificar conexión con la API
  static async testConnection(): Promise<boolean> {
    try {
      if (this.isDevelopmentMode()) {
        return false; // Indicar que no está configurado en desarrollo
      }

      await this.makeRequest('/users?per_page=1');
      return true;
    } catch (error) {
      console.error('Error verificando conexión con Auth0:', error);
      return false;
    }
  }
}