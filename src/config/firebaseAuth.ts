console.warn('FirebaseAuthService ha sido reemplazado por Supabase. Este archivo se mantiene para compatibilidad temporal.');

export class FirebaseAuthService {
  private static isAuthenticated = true;

  static async ensureAuthenticated(): Promise<boolean> {
    return true;
  }

  static isUserAuthenticated(): boolean {
    return true;
  }

  static getCurrentUser() {
    return { uid: 'dev-user-123' };
  }

  static getCurrentUserId(): string | null {
    return 'dev-user-123';
  }

  static async signOut(): Promise<void> {
    console.log('Logout - usando Supabase ahora');
  }

  static async initialize(): Promise<void> {
    console.log('Autenticación manejada por Supabase');
  }
}