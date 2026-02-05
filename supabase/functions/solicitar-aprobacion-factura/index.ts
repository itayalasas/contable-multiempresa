import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SolicitudBody {
  empresaId: string;
  facturaId: string;
  tipoSolicitud: "modificar_factura" | "eliminar_factura";
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
    const { empresaId, facturaId, tipoSolicitud, datosModificados, motivo, usuarioId } = body;

    console.log("📝 Creando solicitud de aprobación:", {
      empresaId,
      facturaId,
      tipoSolicitud,
      usuarioId,
    });

    const { data: factura, error: facturaError } = await supabase
      .from("facturas_venta")
      .select("*")
      .eq("id", facturaId)
      .single();

    if (facturaError || !factura) {
      throw new Error(`Factura no encontrada: ${facturaError?.message}`);
    }

    const solicitudData = {
      empresa_id: empresaId,
      factura_id: facturaId,
      tipo_solicitud: tipoSolicitud,
      solicitante_id: usuarioId,
      datos_originales: factura,
      datos_modificados: datosModificados || null,
      motivo,
      estado: "pendiente",
      fecha_solicitud: new Date().toISOString(),
    };

    const { data: solicitud, error: solicitudError } = await supabase
      .from("solicitudes_aprobacion")
      .insert(solicitudData)
      .select()
      .single();

    if (solicitudError) {
      throw new Error(`Error al crear solicitud: ${solicitudError.message}`);
    }

    console.log("✅ Solicitud de aprobación creada:", solicitud.id);

    return new Response(
      JSON.stringify({
        success: true,
        solicitud,
        message: `Solicitud de ${tipoSolicitud === "modificar_factura" ? "modificación" : "eliminación"} creada exitosamente`,
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
