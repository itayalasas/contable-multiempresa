import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ModificarFacturaBody {
  solicitudId: string;
  facturaId: string;
  datosModificados: any;
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

    const body: ModificarFacturaBody = await req.json();
    const { solicitudId, facturaId, datosModificados, usuarioId } = body;

    console.log("🔄 Modificando factura:", facturaId);

    const { data: facturaOriginal, error: facturaError } = await supabase
      .from("facturas_venta")
      .select("*")
      .eq("id", facturaId)
      .single();

    if (facturaError || !facturaOriginal) {
      throw new Error(`Factura no encontrada: ${facturaError?.message}`);
    }

    const empresaId = facturaOriginal.empresa_id;

    console.log("📝 Registrando auditoría - factura original");
    const { error: auditFacturaError } = await supabase
      .from("auditoria_cambios")
      .insert({
        empresa_id: empresaId,
        tabla_afectada: "facturas_venta",
        registro_id: facturaId,
        tipo_operacion: "modificar",
        datos_anteriores: facturaOriginal,
        datos_nuevos: datosModificados,
        usuario_id: usuarioId,
        solicitud_aprobacion_id: solicitudId,
      });

    if (auditFacturaError) {
      console.warn("⚠️ Error al registrar auditoría factura:", auditFacturaError.message);
    }

    console.log("🗑️ Eliminando asientos contables anteriores");
    const { data: asientosAnteriores, error: asientosQueryError } = await supabase
      .from("asientos_contables")
      .select("*")
      .eq("documento_origen_id", facturaId)
      .eq("documento_origen_tipo", "factura_venta");

    if (!asientosQueryError && asientosAnteriores && asientosAnteriores.length > 0) {
      for (const asiento of asientosAnteriores) {
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
            metadata: { motivo: "regeneracion_por_modificacion_factura" },
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
        console.warn("⚠️ Error al eliminar asientos anteriores:", deleteAsientosError.message);
      } else {
        console.log(`✅ ${asientosAnteriores.length} asiento(s) eliminado(s)`);
      }
    }

    console.log("💾 Actualizando factura");
    const { error: updateFacturaError } = await supabase
      .from("facturas_venta")
      .update(datosModificados)
      .eq("id", facturaId);

    if (updateFacturaError) {
      throw new Error(`Error al actualizar factura: ${updateFacturaError.message}`);
    }

    console.log("🔄 Regenerando asientos contables");
    const regenerarUrl = `${supabaseUrl}/functions/v1/generar-asiento-factura`;
    const regenerarResponse = await fetch(regenerarUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        facturaId: facturaId,
      }),
    });

    if (!regenerarResponse.ok) {
      const error = await regenerarResponse.json();
      console.warn("⚠️ Error al regenerar asientos:", error.error);
    } else {
      console.log("✅ Asientos contables regenerados");
    }

    const montoAnterior = parseFloat(facturaOriginal.total || 0);
    const montoNuevo = parseFloat(datosModificados.total || montoAnterior);

    if (montoAnterior !== montoNuevo) {
      console.log("💰 Monto cambió, actualizando tesorería y pagos");

      const { data: movimientos, error: movimientosError } = await supabase
        .from("movimientos_tesoreria")
        .select("*")
        .eq("metadata->>factura_id", facturaId);

      if (!movimientosError && movimientos && movimientos.length > 0) {
        for (const mov of movimientos) {
          const { error: auditMovError } = await supabase
            .from("auditoria_cambios")
            .insert({
              empresa_id: empresaId,
              tabla_afectada: "movimientos_tesoreria",
              registro_id: mov.id,
              tipo_operacion: "modificar",
              datos_anteriores: mov,
              datos_nuevos: { ...mov, monto: montoNuevo },
              usuario_id: usuarioId,
              solicitud_aprobacion_id: solicitudId,
              metadata: { motivo: "actualizacion_por_modificacion_factura" },
            });

          if (auditMovError) {
            console.warn("⚠️ Error al registrar auditoría movimiento:", auditMovError.message);
          }
        }

        const { error: updateMovError } = await supabase
          .from("movimientos_tesoreria")
          .update({ monto: montoNuevo })
          .eq("metadata->>factura_id", facturaId);

        if (updateMovError) {
          console.warn("⚠️ Error al actualizar movimientos:", updateMovError.message);
        } else {
          console.log("✅ Movimientos de tesorería actualizados");
        }
      }

      const { data: pagos, error: pagosError } = await supabase
        .from("pagos_cliente")
        .select("*")
        .eq("factura_id", facturaId);

      if (!pagosError && pagos && pagos.length > 0) {
        for (const pago of pagos) {
          const { error: auditPagoError } = await supabase
            .from("auditoria_cambios")
            .insert({
              empresa_id: empresaId,
              tabla_afectada: "pagos_cliente",
              registro_id: pago.id,
              tipo_operacion: "modificar",
              datos_anteriores: pago,
              datos_nuevos: { ...pago, monto: montoNuevo },
              usuario_id: usuarioId,
              solicitud_aprobacion_id: solicitudId,
              metadata: { motivo: "actualizacion_por_modificacion_factura" },
            });

          if (auditPagoError) {
            console.warn("⚠️ Error al registrar auditoría pago:", auditPagoError.message);
          }
        }

        const { error: updatePagosError } = await supabase
          .from("pagos_cliente")
          .update({ monto: montoNuevo })
          .eq("factura_id", facturaId);

        if (updatePagosError) {
          console.warn("⚠️ Error al actualizar pagos:", updatePagosError.message);
        } else {
          console.log("✅ Pagos actualizados");
        }
      }
    }

    console.log("✅ Factura modificada exitosamente");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Factura modificada exitosamente con todos los registros asociados",
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
