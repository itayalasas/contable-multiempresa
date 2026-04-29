import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EliminarFacturaBody {
  solicitudId: string;
  facturaId: string;
  usuarioId: string;
  auditoriaMetadata?: AuditoriaRequestMetadata;
}

interface AuditoriaRequestMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
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

    const body: EliminarFacturaBody = await req.json();
    const { solicitudId, facturaId, usuarioId } = body;
    const auditoriaMetadata = getAuditoriaRequestMetadata(req, body.auditoriaMetadata);

    console.log("🗑️ Eliminando factura y registros asociados:", facturaId);

    const { data: factura, error: facturaError } = await supabase
      .from("facturas_venta")
      .select("*")
      .eq("id", facturaId)
      .single();

    if (facturaError || !factura) {
      throw new Error(`Factura no encontrada: ${facturaError?.message}`);
    }

    const empresaId = factura.empresa_id;

    console.log("📝 Registrando auditoría - factura");
    const { error: auditFacturaError } = await supabase
      .from("auditoria_cambios")
      .insert({
        empresa_id: empresaId,
        tabla_afectada: "facturas_venta",
        registro_id: facturaId,
        tipo_operacion: "eliminar",
        datos_anteriores: factura,
        datos_nuevos: null,
        usuario_id: usuarioId,
        solicitud_aprobacion_id: solicitudId,
        ip_address: auditoriaMetadata.ip_address,
        user_agent: auditoriaMetadata.user_agent,
      });

    if (auditFacturaError) {
      console.warn("⚠️ Error al registrar auditoría factura:", auditFacturaError.message);
    }

    console.log("🗑️ Eliminando items de factura");
    const { data: items, error: itemsQueryError } = await supabase
      .from("facturas_venta_items")
      .select("*")
      .eq("factura_id", facturaId);

    if (!itemsQueryError && items && items.length > 0) {
      for (const item of items) {
        const { error: auditItemError } = await supabase
          .from("auditoria_cambios")
          .insert({
            empresa_id: empresaId,
            tabla_afectada: "facturas_venta_items",
            registro_id: item.id,
            tipo_operacion: "eliminar",
            datos_anteriores: item,
            datos_nuevos: null,
            usuario_id: usuarioId,
            solicitud_aprobacion_id: solicitudId,
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
          });

        if (auditItemError) {
          console.warn("⚠️ Error al registrar auditoría item:", auditItemError.message);
        }
      }

      const { error: deleteItemsError } = await supabase
        .from("facturas_venta_items")
        .delete()
        .eq("factura_id", facturaId);

      if (deleteItemsError) {
        throw new Error(`Error al eliminar items: ${deleteItemsError.message}`);
      }

      console.log(`✅ ${items.length} item(s) eliminado(s)`);
    }

    console.log("🗑️ Eliminando asientos contables");
    const { data: asientos, error: asientosQueryError } = await supabase
      .from("asientos_contables")
      .select("*")
      .eq("documento_origen_id", facturaId)
      .eq("documento_origen_tipo", "factura_venta");

    if (!asientosQueryError && asientos && asientos.length > 0) {
      for (const asiento of asientos) {
        const { error: auditAsientoError } = await supabase
          .from("auditoria_cambios")
          .insert({
            empresa_id: empresaId,
            tabla_afectada: "asientos_contables",
            registro_id: asiento.id,
            tipo_operacion: "eliminar",
            datos_anteriores: asiento,
            datos_nuevos: null,
            usuario_id: usuarioId,
            solicitud_aprobacion_id: solicitudId,
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
          });

        if (auditAsientoError) {
          console.warn("⚠️ Error al registrar auditoría asiento:", auditAsientoError.message);
        }
      }

      const { error: deleteAsientosError } = await supabase
        .from("asientos_contables")
        .delete()
        .eq("documento_origen_id", facturaId)
        .eq("documento_origen_tipo", "factura_venta");

      if (deleteAsientosError) {
        throw new Error(`Error al eliminar asientos: ${deleteAsientosError.message}`);
      }

      console.log(`✅ ${asientos.length} asiento(s) eliminado(s)`);
    }

    console.log("🗑️ Eliminando movimientos de tesorería");
    const { data: movimientos, error: movimientosQueryError } = await supabase
      .from("movimientos_tesoreria")
      .select("*")
      .eq("metadata->>factura_id", facturaId);

    if (!movimientosQueryError && movimientos && movimientos.length > 0) {
      for (const mov of movimientos) {
        const { error: auditMovError } = await supabase
          .from("auditoria_cambios")
          .insert({
            empresa_id: empresaId,
            tabla_afectada: "movimientos_tesoreria",
            registro_id: mov.id,
            tipo_operacion: "eliminar",
            datos_anteriores: mov,
            datos_nuevos: null,
            usuario_id: usuarioId,
            solicitud_aprobacion_id: solicitudId,
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
          });

        if (auditMovError) {
          console.warn("⚠️ Error al registrar auditoría movimiento:", auditMovError.message);
        }
      }

      const { error: deleteMovError } = await supabase
        .from("movimientos_tesoreria")
        .delete()
        .eq("metadata->>factura_id", facturaId);

      if (deleteMovError) {
        throw new Error(`Error al eliminar movimientos: ${deleteMovError.message}`);
      }

      console.log(`✅ ${movimientos.length} movimiento(s) eliminado(s)`);
    }

    console.log("🗑️ Eliminando pagos de cliente");
    const { data: pagos, error: pagosQueryError } = await supabase
      .from("pagos_cliente")
      .select("*")
      .eq("factura_id", facturaId);

    if (!pagosQueryError && pagos && pagos.length > 0) {
      for (const pago of pagos) {
        const { error: auditPagoError } = await supabase
          .from("auditoria_cambios")
          .insert({
            empresa_id: empresaId,
            tabla_afectada: "pagos_cliente",
            registro_id: pago.id,
            tipo_operacion: "eliminar",
            datos_anteriores: pago,
            datos_nuevos: null,
            usuario_id: usuarioId,
            solicitud_aprobacion_id: solicitudId,
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
          });

        if (auditPagoError) {
          console.warn("⚠️ Error al registrar auditoría pago:", auditPagoError.message);
        }
      }

      const { error: deletePagosError } = await supabase
        .from("pagos_cliente")
        .delete()
        .eq("factura_id", facturaId);

      if (deletePagosError) {
        throw new Error(`Error al eliminar pagos: ${deletePagosError.message}`);
      }

      console.log(`✅ ${pagos.length} pago(s) eliminado(s)`);
    }

    console.log("🗑️ Verificando si es factura de comisión");
    const { data: comisiones, error: comisionesQueryError } = await supabase
      .from("comisiones_partners")
      .select("*")
      .eq("factura_venta_comision_id", facturaId);

    if (!comisionesQueryError && comisiones && comisiones.length > 0) {
      console.log("💼 Factura de comisión encontrada, actualizando estado");

      for (const comision of comisiones) {
        const { error: auditComisionError } = await supabase
          .from("auditoria_cambios")
          .insert({
            empresa_id: empresaId,
            tabla_afectada: "comisiones_partners",
            registro_id: comision.id,
            tipo_operacion: "modificar",
            datos_anteriores: comision,
            datos_nuevos: { ...comision, factura_venta_comision_id: null, estado: "pendiente" },
            usuario_id: usuarioId,
            solicitud_aprobacion_id: solicitudId,
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
            metadata: { motivo: "factura_comision_eliminada" },
          });

        if (auditComisionError) {
          console.warn("⚠️ Error al registrar auditoría comisión:", auditComisionError.message);
        }
      }

      const { error: updateComisionesError } = await supabase
        .from("comisiones_partners")
        .update({
          factura_venta_comision_id: null,
          estado: "pendiente",
        })
        .eq("factura_venta_comision_id", facturaId);

      if (updateComisionesError) {
        console.warn("⚠️ Error al actualizar comisiones:", updateComisionesError.message);
      } else {
        console.log(`✅ ${comisiones.length} comisión(es) actualizada(s)`);
      }
    }

    console.log("🗑️ Eliminando factura principal");
    const { error: deleteFacturaError } = await supabase
      .from("facturas_venta")
      .delete()
      .eq("id", facturaId);

    if (deleteFacturaError) {
      throw new Error(`Error al eliminar factura: ${deleteFacturaError.message}`);
    }

    console.log("✅ Factura y todos los registros asociados eliminados exitosamente");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Factura y todos los registros asociados eliminados exitosamente",
        facturaId,
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
