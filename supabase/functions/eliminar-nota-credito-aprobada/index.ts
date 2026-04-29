import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EliminarNotaCreditoBody {
  solicitudId: string;
  notaCreditoId: string;
  usuarioId: string;
  auditoriaMetadata?: AuditoriaRequestMetadata;
}

interface AuditoriaRequestMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as EliminarNotaCreditoBody;
    const { solicitudId, notaCreditoId, usuarioId } = body;
    const auditoriaMetadata = getAuditoriaRequestMetadata(req, body.auditoriaMetadata);

    const { data: nota, error: notaError } = await supabase
      .from("notas_credito")
      .select("*")
      .eq("id", notaCreditoId)
      .single();

    if (notaError || !nota) {
      throw new Error(`Nota de credito no encontrada: ${notaError?.message}`);
    }

    const empresaId = nota.empresa_id;

    await registrarAuditoria(supabase, empresaId, "notas_credito", nota.id, "eliminar", nota, null, usuarioId, solicitudId, undefined, auditoriaMetadata);

    const { data: items } = await supabase
      .from("notas_credito_items")
      .select("*")
      .eq("nota_credito_id", notaCreditoId);

    for (const item of items || []) {
      await registrarAuditoria(
        supabase,
        empresaId,
        "notas_credito_items",
        item.id,
        "eliminar",
        item,
        null,
        usuarioId,
        solicitudId,
        { nota_credito_id: notaCreditoId, numero_linea: item.numero_linea },
        auditoriaMetadata,
      );
    }

    if (nota.tipo_anulacion === "total") {
      const { data: facturaAnterior } = await supabase
        .from("facturas_venta")
        .select("*")
        .eq("id", nota.factura_referencia_id)
        .maybeSingle();

      if (facturaAnterior) {
        await registrarAuditoria(
          supabase,
          empresaId,
          "facturas_venta",
          facturaAnterior.id,
          "modificar",
          facturaAnterior,
          {
            ...facturaAnterior,
            estado: "pendiente",
            nota_credito_id: null,
            fecha_anulacion: null,
            motivo_anulacion: null,
          },
          usuarioId,
          solicitudId,
          { motivo: "reversion_por_eliminacion_nota_credito" },
          auditoriaMetadata,
        );
      }

      await supabase
        .from("facturas_venta")
        .update({
          estado: "pendiente",
          nota_credito_id: null,
          fecha_anulacion: null,
          motivo_anulacion: null,
          updated_by: usuarioId,
        })
        .eq("id", nota.factura_referencia_id)
        .eq("nota_credito_id", notaCreditoId);
    }

    const { data: eventos } = await supabase
      .from("eventos_externos")
      .select("*")
      .eq("nota_credito_id", notaCreditoId);

    for (const evento of eventos || []) {
      await registrarAuditoria(
        supabase,
        empresaId,
        "eventos_externos",
        evento.id,
        "eliminar",
        evento,
        null,
        usuarioId,
        solicitudId,
        undefined,
        auditoriaMetadata,
      );
    }

    await supabase
      .from("eventos_externos")
      .delete()
      .eq("nota_credito_id", notaCreditoId);

    if (nota.asiento_contable_id) {
      const { data: asiento } = await supabase
        .from("asientos_contables")
        .select("*")
        .eq("id", nota.asiento_contable_id)
        .maybeSingle();

      if (asiento) {
        await registrarAuditoria(
          supabase,
          empresaId,
          "asientos_contables",
          asiento.id,
          "eliminar",
          asiento,
          null,
          usuarioId,
          solicitudId,
          { motivo: "asiento_asociado_a_nota_credito_eliminada" },
          auditoriaMetadata,
        );
      }

      await supabase
        .from("asientos_contables")
        .update({
          eliminado: true,
          eliminado_por: usuarioId,
          fecha_eliminacion: new Date().toISOString(),
          motivo_eliminacion: `Asiento asociado a nota de crédito eliminada: ${notaCreditoId}`,
          estado: "anulado",
          ocultar_en_listados: true,
          updated_by: usuarioId,
        })
        .eq("id", nota.asiento_contable_id);
    }

    const { error: deleteNotaError } = await supabase
      .from("notas_credito")
      .delete()
      .eq("id", notaCreditoId);

    if (deleteNotaError) {
      throw new Error(`No se pudo eliminar la nota de credito: ${deleteNotaError.message}`);
    }

    return jsonResponse({
      success: true,
      message: "Nota de credito eliminada exitosamente",
      notaCreditoId,
    });
  } catch (error) {
    console.error("Error eliminando nota de credito aprobada:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Error desconocido" },
      400,
    );
  }
});

async function registrarAuditoria(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
  tablaAfectada: string,
  registroId: string,
  tipoOperacion: "crear" | "modificar" | "eliminar",
  datosAnteriores: unknown,
  datosNuevos: unknown,
  usuarioId: string,
  solicitudId: string,
  metadata?: Record<string, unknown>,
  auditoriaMetadata?: AuditoriaRequestMetadata,
) {
  const metadataFinal = {
    ...(metadata || {}),
    ...(auditoriaMetadata?.ip_address ? { ip_address: auditoriaMetadata.ip_address } : {}),
    ...(auditoriaMetadata?.user_agent ? { user_agent: auditoriaMetadata.user_agent } : {}),
  };

  const { error } = await supabase
    .from("auditoria_cambios")
    .insert({
      empresa_id: empresaId,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      tipo_operacion: tipoOperacion,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datosNuevos,
      usuario_id: usuarioId,
      solicitud_aprobacion_id: solicitudId,
      ip_address: auditoriaMetadata?.ip_address || null,
      user_agent: auditoriaMetadata?.user_agent || null,
      metadata: Object.keys(metadataFinal).length > 0 ? metadataFinal : null,
    });

  if (error) {
    throw new Error(`No se pudo registrar auditoría en ${tablaAfectada}: ${error.message}`);
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

function getAuditoriaRequestMetadata(req: Request, metadata?: AuditoriaRequestMetadata): Required<AuditoriaRequestMetadata> {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return {
    ip_address: metadata?.ip_address
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || forwardedFor?.split(",")[0]?.trim()
      || null,
    user_agent: metadata?.user_agent || req.headers.get("user-agent") || null,
  };
}
