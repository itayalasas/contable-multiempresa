import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://stztohoyzliwwyddfdea.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0enRvaG95emxpd3d5ZGRmZGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTE3MzcsImV4cCI6MjA3OTA4NzczN30.2IxQ96MRKf5Az-7VjhwJ-gGcPsLFCThI30FhKxH3jv8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'supabase-auth-disabled',
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
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
