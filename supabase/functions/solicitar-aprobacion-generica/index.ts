import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SolicitudBody {
  empresaId: string;
  tablaAfectada: string;
  registroId: string;
  tipoSolicitud: string;
  datosModificados?: any;
  motivo: string;
  usuarioId: string;
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

    const body: SolicitudBody = await req.json();
    const { empresaId, tablaAfectada, registroId, tipoSolicitud, datosModificados, motivo, usuarioId } = body;

    console.log("📝 Creando solicitud de aprobación genérica:", {
      empresaId,
      tablaAfectada,
      registroId,
      tipoSolicitud,
      usuarioId,
    });

    // Obtener el registro original de la tabla correspondiente
    const { data: registroOriginal, error: registroError } = await supabase
      .from(tablaAfectada)
      .select("*")
      .eq("id", registroId)
      .single();

    if (registroError || !registroOriginal) {
      throw new Error(`Registro no encontrado en ${tablaAfectada}: ${registroError?.message}`);
    }

    // Preparar datos de la solicitud
    const solicitudData: any = {
      empresa_id: empresaId,
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      tipo_solicitud: tipoSolicitud,
      solicitante_id: usuarioId,
      datos_originales: registroOriginal,
      datos_modificados: datosModificados || null,
      motivo,
      estado: "pendiente",
      fecha_solicitud: new Date().toISOString(),
    };

    // Si es una factura, mantener compatibilidad con el campo factura_id
    if (tablaAfectada === "facturas_venta") {
      solicitudData.factura_id = registroId;
    }

    const { data: solicitud, error: solicitudError } = await supabase
      .from("solicitudes_aprobacion")
      .insert(solicitudData)
      .select()
      .single();

    if (solicitudError) {
      console.error("❌ Error detallado al crear solicitud:", solicitudError);
      throw new Error(`Error al crear solicitud: ${solicitudError.message}`);
    }

    console.log("✅ Solicitud de aprobación creada:", solicitud.id);

    return new Response(
      JSON.stringify({
        success: true,
        solicitud,
        message: `Solicitud creada exitosamente`,
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
