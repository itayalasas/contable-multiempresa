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
  datosModificados: Record<string, unknown> & { items?: unknown[] };
  usuarioId: string;
  auditoriaMetadata?: AuditoriaRequestMetadata;
}

interface AuditoriaRequestMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
}

function normalizarItemsFactura(items: unknown[] = []) {
  return items.map((item, index) => {
    const row = (item && typeof item === "object") ? item as Record<string, unknown> : {};
    const cantidad = Number(row.cantidad || 0);
    const precioUnitario = Number(row.precio_unitario || 0);
    const descuentoPorcentaje = Number(row.descuento_porcentaje || 0);
    const itemSubtotal = cantidad * precioUnitario;
    const descuentoMonto = itemSubtotal * (descuentoPorcentaje / 100);
    const baseImponible = itemSubtotal - descuentoMonto;
    const tasaIva = Number(row.tasa_iva ?? 0.22);
    const montoIva = baseImponible * tasaIva;
    const total = baseImponible + montoIva;

    return {
      numero_linea: Number(row.numero_linea || index + 1),
      descripcion: String(row.descripcion || ""),
      cantidad,
      precio_unitario: precioUnitario,
      descuento_porcentaje: descuentoPorcentaje,
      descuento_monto: descuentoMonto.toFixed(2),
      tasa_iva: tasaIva,
      monto_iva: montoIva.toFixed(2),
      subtotal: baseImponible.toFixed(2),
      total: total.toFixed(2),
      cuenta_contable_id: row.cuenta_contable_id || null,
    };
  });
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
    const auditoriaMetadata = getAuditoriaRequestMetadata(req, body.auditoriaMetadata);

    if (!datosModificados || typeof datosModificados !== "object") {
      throw new Error("La solicitud aprobada no contiene datos validos para modificar la factura");
    }

    console.log("Modificando factura aprobada:", facturaId);

    const { data: facturaOriginal, error: facturaError } = await supabase
      .from("facturas_venta")
      .select("*")
      .eq("id", facturaId)
      .single();

    if (facturaError || !facturaOriginal) {
      throw new Error(`Factura no encontrada: ${facturaError?.message}`);
    }

    const { data: itemsOriginales, error: itemsOriginalesError } = await supabase
      .from("facturas_venta_items")
      .select("*")
      .eq("factura_id", facturaId)
      .order("numero_linea", { ascending: true });

    if (itemsOriginalesError) {
      throw new Error(`No se pudieron obtener los items originales: ${itemsOriginalesError.message}`);
    }

    const empresaId = facturaOriginal.empresa_id;
    const itemsNormalizados = Array.isArray(datosModificados.items)
      ? normalizarItemsFactura(datosModificados.items)
      : [];

    const payloadFactura = {
      cliente_id: datosModificados.cliente_id ?? facturaOriginal.cliente_id,
      tipo_documento: datosModificados.tipo_documento ?? facturaOriginal.tipo_documento,
      fecha_emision: datosModificados.fecha_emision ?? facturaOriginal.fecha_emision,
      fecha_vencimiento: datosModificados.fecha_vencimiento ?? facturaOriginal.fecha_vencimiento,
      subtotal: datosModificados.subtotal ?? facturaOriginal.subtotal,
      total_iva: datosModificados.total_iva ?? facturaOriginal.total_iva,
      total: datosModificados.total ?? facturaOriginal.total,
      moneda: datosModificados.moneda ?? facturaOriginal.moneda,
      tipo_cambio: datosModificados.tipo_cambio ?? facturaOriginal.tipo_cambio,
      observaciones: datosModificados.observaciones ?? facturaOriginal.observaciones,
      metadata: datosModificados.metadata ?? facturaOriginal.metadata,
      updated_by: usuarioId,
      updated_at: new Date().toISOString(),
    };

    const { error: auditFacturaError } = await supabase
      .from("auditoria_cambios")
      .insert({
        empresa_id: empresaId,
        tabla_afectada: "facturas_venta",
        registro_id: facturaId,
        tipo_operacion: "modificar",
        datos_anteriores: {
          ...facturaOriginal,
          items: itemsOriginales || [],
        },
        datos_nuevos: {
          ...payloadFactura,
          items: itemsNormalizados,
        },
        usuario_id: usuarioId,
        solicitud_aprobacion_id: solicitudId,
        ip_address: auditoriaMetadata.ip_address,
        user_agent: auditoriaMetadata.user_agent,
      });

    if (auditFacturaError) {
      console.warn("Error al registrar auditoria de factura:", auditFacturaError.message);
    }

    for (const itemOriginal of itemsOriginales || []) {
      const itemNuevo = itemsNormalizados.find((item) => item.numero_linea === itemOriginal.numero_linea) || null;
      const { error: auditItemError } = await supabase
        .from("auditoria_cambios")
        .insert({
          empresa_id: empresaId,
          tabla_afectada: "facturas_venta_items",
          registro_id: itemOriginal.id,
          tipo_operacion: itemNuevo ? "modificar" : "eliminar",
          datos_anteriores: itemOriginal,
          datos_nuevos: itemNuevo,
          usuario_id: usuarioId,
          solicitud_aprobacion_id: solicitudId,
          ip_address: auditoriaMetadata.ip_address,
          user_agent: auditoriaMetadata.user_agent,
          metadata: {
            factura_id: facturaId,
            numero_linea: itemOriginal.numero_linea,
          },
        });

      if (auditItemError) {
        console.warn("Error al registrar auditoria de item:", auditItemError.message);
      }
    }

    const lineasNuevasSinOriginal = itemsNormalizados.filter((itemNuevo) => {
      return !(itemsOriginales || []).some((itemOriginal) => itemOriginal.numero_linea === itemNuevo.numero_linea);
    });

    for (const itemNuevo of lineasNuevasSinOriginal) {
      const { error: auditNewItemError } = await supabase
        .from("auditoria_cambios")
        .insert({
          empresa_id: empresaId,
          tabla_afectada: "facturas_venta_items",
          registro_id: `${facturaId}:${itemNuevo.numero_linea}`,
          tipo_operacion: "crear",
          datos_anteriores: null,
          datos_nuevos: itemNuevo,
          usuario_id: usuarioId,
          solicitud_aprobacion_id: solicitudId,
          ip_address: auditoriaMetadata.ip_address,
          user_agent: auditoriaMetadata.user_agent,
          metadata: {
            factura_id: facturaId,
            numero_linea: itemNuevo.numero_linea,
          },
        });

      if (auditNewItemError) {
        console.warn("Error al registrar auditoria del nuevo item:", auditNewItemError.message);
      }
    }

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
            ip_address: auditoriaMetadata.ip_address,
            user_agent: auditoriaMetadata.user_agent,
            metadata: { motivo: "regeneracion_por_modificacion_factura" },
          });

        if (auditAsientoError) {
          console.warn("Error al registrar auditoria de asiento:", auditAsientoError.message);
        }
      }

      const { error: deleteAsientosError } = await supabase
        .from("asientos_contables")
        .delete()
        .eq("documento_origen_id", facturaId)
        .eq("documento_origen_tipo", "factura_venta");

      if (deleteAsientosError) {
        console.warn("Error al eliminar asientos anteriores:", deleteAsientosError.message);
      }
    }

    const { error: updateFacturaError } = await supabase
      .from("facturas_venta")
      .update(payloadFactura)
      .eq("id", facturaId);

    if (updateFacturaError) {
      throw new Error(`Error al actualizar factura: ${updateFacturaError.message}`);
    }

    if (itemsNormalizados.length > 0) {
      const { error: deleteItemsError } = await supabase
        .from("facturas_venta_items")
        .delete()
        .eq("factura_id", facturaId);

      if (deleteItemsError) {
        throw new Error(`No se pudieron eliminar los items anteriores: ${deleteItemsError.message}`);
      }

      const { error: insertItemsError } = await supabase
        .from("facturas_venta_items")
        .insert(itemsNormalizados.map((item) => ({
          factura_id: facturaId,
          ...item,
        })));

      if (insertItemsError) {
        throw new Error(`No se pudieron insertar los items actualizados: ${insertItemsError.message}`);
      }
    }

    const regenerarResponse = await fetch(`${supabaseUrl}/functions/v1/generar-asiento-factura`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ facturaId }),
    });

    if (!regenerarResponse.ok) {
      const error = await regenerarResponse.json().catch(() => ({}));
      console.warn("Error al regenerar asientos:", error.error || "desconocido");
    }

    const montoAnterior = parseFloat(facturaOriginal.total || 0);
    const montoNuevo = parseFloat(String(payloadFactura.total || montoAnterior));

    if (montoAnterior !== montoNuevo) {
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
              ip_address: auditoriaMetadata.ip_address,
              user_agent: auditoriaMetadata.user_agent,
              metadata: { motivo: "actualizacion_por_modificacion_factura" },
            });

          if (auditMovError) {
            console.warn("Error al registrar auditoria de movimiento:", auditMovError.message);
          }
        }

        const { error: updateMovError } = await supabase
          .from("movimientos_tesoreria")
          .update({ monto: montoNuevo })
          .eq("metadata->>factura_id", facturaId);

        if (updateMovError) {
          console.warn("Error al actualizar movimientos:", updateMovError.message);
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
              ip_address: auditoriaMetadata.ip_address,
              user_agent: auditoriaMetadata.user_agent,
              metadata: { motivo: "actualizacion_por_modificacion_factura" },
            });

          if (auditPagoError) {
            console.warn("Error al registrar auditoria de pago:", auditPagoError.message);
          }
        }

        const { error: updatePagosError } = await supabase
          .from("pagos_cliente")
          .update({ monto: montoNuevo })
          .eq("factura_id", facturaId);

        if (updatePagosError) {
          console.warn("Error al actualizar pagos:", updatePagosError.message);
        }
      }
    }

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
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al modificar la factura aprobada",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
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
