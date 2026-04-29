import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EliminarAsientoBody {
  asientoId: string;
  usuarioId: string;
  motivo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as EliminarAsientoBody;
    const { asientoId, usuarioId, motivo } = body;
    const auditoriaMetadata = getAuditoriaRequestMetadata(req);

    if (!asientoId || !usuarioId) {
      throw new Error("Faltan datos requeridos para eliminar el asiento");
    }

    const { data: asiento, error: asientoError } = await supabase
      .from("asientos_contables")
      .select("*, movimientos_contables(*)")
      .eq("id", asientoId)
      .single();

    if (asientoError || !asiento) {
      throw new Error(`Asiento no encontrado: ${asientoError?.message}`);
    }

    const motivoEliminacion = motivo?.trim() || "Eliminacion directa desde el modulo de asientos";

    const { error: auditAsientoError } = await supabase
      .from("auditoria_cambios")
      .insert({
        empresa_id: asiento.empresa_id,
        tabla_afectada: "asientos_contables",
        registro_id: asiento.id,
        tipo_operacion: "eliminar",
        datos_anteriores: asiento,
        datos_nuevos: null,
        usuario_id: usuarioId,
        ip_address: auditoriaMetadata.ip_address,
        user_agent: auditoriaMetadata.user_agent,
        metadata: {
          origen: "eliminar-asiento-directo",
          motivo: motivoEliminacion,
          incluye_movimientos: true,
          ...(auditoriaMetadata.ip_address ? { ip_address: auditoriaMetadata.ip_address } : {}),
          ...(auditoriaMetadata.user_agent ? { user_agent: auditoriaMetadata.user_agent } : {}),
        },
      });

    if (auditAsientoError) {
      throw new Error(`No se pudo registrar la auditoria del asiento: ${auditAsientoError.message}`);
    }

    const movimientos = Array.isArray(asiento.movimientos_contables) ? asiento.movimientos_contables : [];
    if (movimientos.length > 0) {
      const auditoriaMovimientos = movimientos.map((movimiento: any) => ({
        empresa_id: asiento.empresa_id,
        tabla_afectada: "movimientos_contables",
        registro_id: movimiento.id,
        tipo_operacion: "eliminar",
        datos_anteriores: movimiento,
        datos_nuevos: null,
        usuario_id: usuarioId,
        ip_address: auditoriaMetadata.ip_address,
        user_agent: auditoriaMetadata.user_agent,
        metadata: {
          origen: "eliminar-asiento-directo",
          asiento_id: asiento.id,
          motivo: motivoEliminacion,
          ...(auditoriaMetadata.ip_address ? { ip_address: auditoriaMetadata.ip_address } : {}),
          ...(auditoriaMetadata.user_agent ? { user_agent: auditoriaMetadata.user_agent } : {}),
        },
      }));

      const { error: auditMovimientosError } = await supabase
        .from("auditoria_cambios")
        .insert(auditoriaMovimientos);

      if (auditMovimientosError) {
        throw new Error(`No se pudo registrar la auditoria de movimientos: ${auditMovimientosError.message}`);
      }
    }

    const { error: updateError } = await supabase
      .from("asientos_contables")
      .update({
        eliminado: true,
        eliminado_por: usuarioId,
        fecha_eliminacion: new Date().toISOString(),
        motivo_eliminacion: motivoEliminacion,
        estado: "anulado",
        ocultar_en_listados: true,
        updated_by: usuarioId,
        fecha_modificacion: new Date().toISOString(),
      })
      .eq("id", asientoId);

    if (updateError) {
      throw new Error(`No se pudo eliminar logicamente el asiento: ${updateError.message}`);
    }

    return jsonResponse({
      success: true,
      message: "Asiento eliminado correctamente",
      asientoId,
    });
  } catch (error) {
    console.error("Error eliminando asiento directo:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al eliminar el asiento",
      },
      400,
    );
  }
});

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getAuditoriaRequestMetadata(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return {
    ip_address: req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || forwardedFor?.split(",")[0]?.trim()
      || null,
    user_agent: req.headers.get("user-agent"),
  };
}
