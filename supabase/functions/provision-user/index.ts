import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type RolUsuario = "super_admin" | "admin" | "admin_empresa" | "supervisor" | "contador" | "usuario";

interface ProvisionUserRequest {
  nombre: string;
  email: string;
  rol: RolUsuario;
  empresasAsignadas: string[];
  permisos: string[];
  paisId?: string | null;
  metadata?: Record<string, unknown>;
  configuracion?: Record<string, unknown>;
  solicitadoPorId?: string;
  modo?: "create" | "invite";
}

const ROLES_ADMINISTRATIVOS = new Set<RolUsuario>(["super_admin", "admin", "admin_empresa"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const body = (await req.json()) as ProvisionUserRequest;
    validarPayload(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan variables de entorno de Supabase para provisionar usuarios");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (body.solicitadoPorId) {
      const { data: solicitante, error: solicitanteError } = await supabase
        .from("usuarios")
        .select("id, rol, activo")
        .eq("id", body.solicitadoPorId)
        .maybeSingle();

      if (solicitanteError) {
        throw solicitanteError;
      }

      if (!solicitante || !solicitante.activo || !ROLES_ADMINISTRATIVOS.has(solicitante.rol)) {
        return jsonResponse(
          { success: false, error: "El usuario solicitante no tiene permisos para provisionar usuarios" },
          403,
        );
      }
    }

    const email = body.email.trim().toLowerCase();
    const nombre = body.nombre.trim();
    const nowIso = new Date().toISOString();
    const modo = body.modo === "create" ? "create" : "invite";
    const redirectTo = Deno.env.get("USER_INVITE_REDIRECT_URL")
      || Deno.env.get("SITE_URL")
      || Deno.env.get("PUBLIC_APP_URL")
      || undefined;

    const userMetadata = {
      nombre,
      rol: body.rol,
      permisos: body.permisos,
      empresasAsignadas: body.empresasAsignadas,
      paisId: body.paisId || null,
      origenProvisionamiento: "admin_ui",
      provisionadoEn: nowIso,
      ...(body.metadata || {}),
    };

    let authUser = await findAuthUserByEmail(supabase, email);
    let accionAuth: "invited" | "reused" = "reused";

    if (!authUser) {
      const inviteResponse = await supabase.auth.admin.inviteUserByEmail(email, {
        data: userMetadata,
        redirectTo,
      });

      if (inviteResponse.error) {
        throw inviteResponse.error;
      }

      authUser = inviteResponse.data.user;
      accionAuth = "invited";
    } else {
      const updateResponse = await supabase.auth.admin.updateUserById(authUser.id, {
        email,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          ...userMetadata,
        },
        app_metadata: {
          ...(authUser.app_metadata || {}),
          rol: body.rol,
          permisos: body.permisos,
          empresasAsignadas: body.empresasAsignadas,
          paisId: body.paisId || null,
          origenProvisionamiento: "admin_ui",
        },
      });

      if (updateResponse.error) {
        throw updateResponse.error;
      }

      authUser = updateResponse.data.user;
    }

    if (!authUser) {
      throw new Error("No fue posible obtener el usuario de Supabase Auth");
    }

    const metadataSistema = {
      ...(body.metadata || {}),
      gestion_origen: modo === "invite" ? "invitacion_supabase_auth" : "creacion_supabase_auth",
      estado_provisionamiento: "provisionado_supabase_auth",
      provisionado_auth_en: nowIso,
      supabase_auth_user_id: authUser.id,
      invitacion_enviada: accionAuth === "invited",
    };

    const { data: usuarioExistente, error: usuarioExistenteError } = await supabase
      .from("usuarios")
      .select("id, email, metadata, configuracion")
      .eq("email", email)
      .maybeSingle();

    if (usuarioExistenteError) {
      throw usuarioExistenteError;
    }

    const payloadUsuario = {
      nombre,
      email,
      rol: body.rol,
      empresas_asignadas: body.empresasAsignadas,
      permisos: body.permisos,
      pais_id: body.paisId || null,
      auth0_id: authUser.id,
      activo: true,
      configuracion: body.configuracion || usuarioExistente?.configuracion || null,
      metadata: {
        ...(usuarioExistente?.metadata || {}),
        ...metadataSistema,
      },
    };

    let publicUser;

    if (usuarioExistente) {
      const { data, error } = await supabase
        .from("usuarios")
        .update(payloadUsuario)
        .eq("id", usuarioExistente.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      publicUser = data;
    } else {
      const { data, error } = await supabase
        .from("usuarios")
        .insert({
          id: authUser.id,
          ...payloadUsuario,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      publicUser = data;
    }

    for (const empresaId of body.empresasAsignadas) {
      await sincronizarUsuarioEnEmpresa(supabase, empresaId, publicUser.id);
    }

    return jsonResponse({
      success: true,
      message: accionAuth === "invited"
        ? "Usuario provisionado e invitacion enviada"
        : "Usuario sincronizado con Supabase Auth",
      authUserId: authUser.id,
      usuarioId: publicUser.id,
      invitacionEnviada: accionAuth === "invited",
      publicUser,
    });
  } catch (error) {
    console.error("Error provisionando usuario:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al provisionar usuario",
      },
      500,
    );
  }
});

function validarPayload(body: ProvisionUserRequest) {
  if (!body.nombre?.trim()) {
    throw new Error("El nombre es requerido");
  }

  if (!body.email?.trim()) {
    throw new Error("El email es requerido");
  }

  if (!Array.isArray(body.empresasAsignadas) || body.empresasAsignadas.length === 0) {
    throw new Error("Debe asignar al menos una empresa");
  }

  if (!Array.isArray(body.permisos)) {
    throw new Error("Los permisos deben ser una lista");
  }
}

async function findAuthUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  let page = 1;

  while (page <= 20) {
    const response = await supabase.auth.admin.listUsers({ page, perPage: 200 });

    if (response.error) {
      throw response.error;
    }

    const found = response.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) {
      return found;
    }

    if (!response.data.nextPage) {
      break;
    }

    page = response.data.nextPage;
  }

  return null;
}

async function sincronizarUsuarioEnEmpresa(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
  usuarioId: string,
) {
  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("id, usuarios_asignados")
    .eq("id", empresaId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!empresa) {
    throw new Error(`La empresa ${empresaId} no existe`);
  }

  const usuariosAsignados = empresa.usuarios_asignados || [];
  if (usuariosAsignados.includes(usuarioId)) {
    return;
  }

  const { error: updateError } = await supabase
    .from("empresas")
    .update({
      usuarios_asignados: [...usuariosAsignados, usuarioId],
    })
    .eq("id", empresaId);

  if (updateError) {
    throw updateError;
  }
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
