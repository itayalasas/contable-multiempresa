import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          rol: 'super_admin' | 'admin_empresa' | 'contador' | 'usuario';
          empresas_asignadas: string[];
          permisos: string[];
          avatar: string | null;
          pais_id: string | null;
          auth0_id: string | null;
          fecha_creacion: string;
          ultima_conexion: string | null;
          activo: boolean;
          configuracion: any;
        };
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'fecha_creacion'>;
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>;
      };
      empresas: {
        Row: {
          id: string;
          nombre: string;
          razon_social: string;
          numero_identificacion: string;
          pais_id: string;
          subdominio: string | null;
          direccion: string | null;
          telefono: string | null;
          email: string | null;
          moneda_principal: string;
          logo: string | null;
          activa: boolean;
          usuarios_asignados: string[];
          plan_contable_id: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string | null;
          configuracion_contable: any;
        };
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'fecha_creacion'>;
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>;
      };
    };
  };
};
