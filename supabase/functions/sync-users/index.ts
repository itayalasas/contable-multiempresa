import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  metadata: Record<string, any>;
  created_at: string;
}

interface SyncUsersRequest {
  success: boolean;
  users: UserPayload[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validar método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parsear body
    const body: SyncUsersRequest = await req.json();

    if (!body.success || !Array.isArray(body.users)) {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crear cliente Supabase con service role para bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Procesar cada usuario
    for (const user of body.users) {
      try {
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from("usuarios")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        // Mapear rol del sistema externo al interno
        const rolMapping: Record<string, string> = {
          "Administrador": "admin_empresa",
          "Contador": "contador",
          "Usuario": "usuario",
        };

        const rolInterno = rolMapping[user.role] || user.role;

        const userData = {
          id: user.id,
          nombre: user.name,
          email: user.email,
          rol: rolInterno,
          permisos: user.permissions,
          metadata: user.metadata,
          auth0_id: user.id, // Usar el mismo ID
          fecha_creacion: user.created_at,
          activo: true,
          empresas_asignadas: user.metadata?.empresa_ids || [],
        };

        if (existingUser) {
          // Actualizar usuario existente
          const { error } = await supabase
            .from("usuarios")
            .update({
              nombre: userData.nombre,
              email: userData.email,
              rol: userData.rol,
              permisos: userData.permisos,
              metadata: userData.metadata,
              empresas_asignadas: userData.empresas_asignadas,
            })
            .eq("id", user.id);

          if (error) throw error;
          results.updated++;
        } else {
          // Insertar nuevo usuario
          const { error } = await supabase
            .from("usuarios")
            .insert(userData);

          if (error) throw error;
          results.inserted++;
        }
      } catch (error) {
        console.error(`Error procesando usuario ${user.id}:`, error);
        results.errors.push(`Usuario ${user.email}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuarios sincronizados correctamente",
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en sync-users:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
