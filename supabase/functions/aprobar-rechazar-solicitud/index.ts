import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AprobacionBody {
  solicitudId: string;
  accion: "aprobar" | "rechazar";
  aprobadorId: string;
  comentarios?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: AprobacionBody = await req.json();
    const { solicitudId, accion, aprobadorId, comentarios } = body;

    console.log(`📋 Procesando solicitud ${solicitudId}: ${accion.toUpperCase()}`);

    const { data: solicitud, error: solicitudError } = await supabase
      .from("solicitudes_aprobacion")
      .select("*")
      .eq("id", solicitudId)
      .single();

    if (solicitudError || !solicitud) {
      throw new Error(`Solicitud no encontrada: ${solicitudError?.message}`);
    }

    if (solicitud.estado !== "pendiente") {
      throw new Error(`La solicitud ya fue ${solicitud.estado}`);
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("rol, empresas_asignadas")
      .eq("id", aprobadorId)
      .single();

    if (usuarioError || !usuario) {
      throw new Error(`Usuario no encontrado: ${usuarioError?.message}`);
    }

    if (!["supervisor", "admin", "super_admin", "admin_empresa"].includes(usuario.rol)) {
      throw new Error("El usuario no tiene permisos para aprobar o rechazar solicitudes. Solo los roles: supervisor, admin, super_admin y admin_empresa pueden realizar esta acción.");
    }

    if (!usuario.empresas_asignadas.includes(solicitud.empresa_id)) {
      throw new Error("El usuario no tiene acceso a esta empresa");
    }

    const { error: updateError } = await supabase
      .from("solicitudes_aprobacion")
      .update({
        estado: accion === "aprobar" ? "aprobada" : "rechazada",
        aprobador_id: aprobadorId,
        comentarios_aprobador: comentarios,
        fecha_respuesta: new Date().toISOString(),
      })
      .eq("id", solicitudId);

    if (updateError) {
      throw new Error(`Error al actualizar solicitud: ${updateError.message}`);
    }

    console.log(`✅ Solicitud ${accion === "aprobar" ? "APROBADA" : "RECHAZADA"}`);

    if (accion === "aprobar") {
      console.log(`🚀 Ejecutando ${solicitud.tipo_solicitud}...`);

      if (solicitud.tipo_solicitud === "modificar_factura") {
        const modifyUrl = `${supabaseUrl}/functions/v1/modificar-factura-aprobada`;
        const modifyResponse = await fetch(modifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            solicitudId: solicitud.id,
            facturaId: solicitud.factura_id,
            datosModificados: solicitud.datos_modificados,
            usuarioId: aprobadorId,
          }),
        });

        if (!modifyResponse.ok) {
          const error = await modifyResponse.json();
          throw new Error(`Error al modificar factura: ${error.error}`);
        }

        console.log("✅ Factura modificada exitosamente");
      } else if (solicitud.tipo_solicitud === "eliminar_factura") {
        const deleteUrl = `${supabaseUrl}/functions/v1/eliminar-factura-aprobada`;
        const deleteResponse = await fetch(deleteUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            solicitudId: solicitud.id,
            facturaId: solicitud.factura_id,
            usuarioId: aprobadorId,
          }),
        });

        if (!deleteResponse.ok) {
          const error = await deleteResponse.json();
          throw new Error(`Error al eliminar factura: ${error.error}`);
        }

        console.log("✅ Factura eliminada exitosamente");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Solicitud ${accion === "aprobar" ? "aprobada" : "rechazada"} exitosamente`,
        solicitud: {
          id: solicitud.id,
          estado: accion === "aprobar" ? "aprobada" : "rechazada",
          tipo: solicitud.tipo_solicitud,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
