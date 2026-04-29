import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ModificarNotaCreditoBody {
  solicitudId: string;
  notaCreditoId: string;
  datosModificados: {
    empresa_id: string;
    factura_referencia_id: string;
    motivo: string;
    tipo_anulacion: "total" | "parcial";
    observaciones?: string;
    simulacion?: boolean;
    items?: Array<{
      factura_item_id: string;
      cantidad_anular: number;
    }>;
  };
  usuarioId: string;
  auditoriaMetadata?: AuditoriaRequestMetadata;
}

interface AuditoriaRequestMetadata {
  ip_address?: string | null;
  user_agent?: string | null;
}

interface NotaCreditoItemCalculado {
  numero_linea: number;
  factura_item_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  tasa_iva: number;
  monto_iva: number;
  subtotal: number;
  total: number;
  cuenta_contable_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as ModificarNotaCreditoBody;
    const { solicitudId, notaCreditoId, datosModificados, usuarioId } = body;
    const auditoriaMetadata = getAuditoriaRequestMetadata(req, body.auditoriaMetadata);

    if (!datosModificados || typeof datosModificados !== "object") {
      throw new Error("La solicitud aprobada no contiene datos validos para modificar la nota de credito");
    }

    const { data: notaActual, error: notaError } = await supabase
      .from("notas_credito")
      .select("*")
      .eq("id", notaCreditoId)
      .single();

    if (notaError || !notaActual) {
      throw new Error(`Nota de credito no encontrada: ${notaError?.message}`);
    }

    if (notaActual.dgi_enviada) {
      throw new Error("No se puede modificar una nota de credito enviada a DGI");
    }

    if (notaActual.factura_referencia_id !== datosModificados.factura_referencia_id) {
      throw new Error("No se puede cambiar la factura de referencia en una nota de credito aprobada");
    }

    const { data: itemsOriginales, error: itemsOriginalesError } = await supabase
      .from("notas_credito_items")
      .select("*")
      .eq("nota_credito_id", notaCreditoId)
      .order("numero_linea", { ascending: true });

    if (itemsOriginalesError) {
      throw new Error(`No se pudieron obtener los items originales: ${itemsOriginalesError.message}`);
    }

    const { data: facturaOriginal, error: facturaError } = await supabase
      .from("facturas_venta")
      .select("*")
      .eq("id", datosModificados.factura_referencia_id)
      .single();

    if (facturaError || !facturaOriginal) {
      throw new Error(`Factura de referencia no encontrada: ${facturaError?.message}`);
    }

    const empresaId = notaActual.empresa_id;
    const calculo = await construirCalculoNota(supabase, datosModificados);

    const payloadNota = {
      motivo: datosModificados.motivo,
      tipo_anulacion: datosModificados.tipo_anulacion,
      observaciones: datosModificados.observaciones || null,
      subtotal: calculo.subtotal.toFixed(2),
      total_iva: calculo.totalIva.toFixed(2),
      total: calculo.total.toFixed(2),
      updated_at: new Date().toISOString(),
      updated_by: usuarioId,
      metadata: {
        ...(notaActual.metadata || {}),
        factura_anulada_id: datosModificados.factura_referencia_id,
      },
    };

    await registrarAuditoria(
      supabase,
      empresaId,
      "notas_credito",
      notaCreditoId,
      "modificar",
      {
        ...notaActual,
        items: itemsOriginales || [],
      },
      {
        ...payloadNota,
        items: calculo.itemsToInsert,
      },
      usuarioId,
      solicitudId,
      undefined,
      auditoriaMetadata,
    );

    for (const itemOriginal of itemsOriginales || []) {
      const itemNuevo = calculo.itemsToInsert.find((item) => item.numero_linea === itemOriginal.numero_linea) || null;
      await registrarAuditoria(
        supabase,
        empresaId,
        "notas_credito_items",
        itemOriginal.id,
        itemNuevo ? "modificar" : "eliminar",
        itemOriginal,
        itemNuevo,
        usuarioId,
        solicitudId,
        { nota_credito_id: notaCreditoId, numero_linea: itemOriginal.numero_linea },
        auditoriaMetadata,
      );
    }

    const nuevosItems = calculo.itemsToInsert.filter((item) => {
      return !(itemsOriginales || []).some((original) => original.numero_linea === item.numero_linea);
    });

    for (const itemNuevo of nuevosItems) {
      await registrarAuditoria(
        supabase,
        empresaId,
        "notas_credito_items",
        `${notaCreditoId}:${itemNuevo.numero_linea}`,
        "crear",
        null,
        itemNuevo,
        usuarioId,
        solicitudId,
        { nota_credito_id: notaCreditoId, numero_linea: itemNuevo.numero_linea },
        auditoriaMetadata,
      );
    }

    if (notaActual.tipo_anulacion === "total" && datosModificados.tipo_anulacion !== "total") {
      await supabase
        .from("facturas_venta")
        .update({
          estado: "pendiente",
          nota_credito_id: null,
          fecha_anulacion: null,
          motivo_anulacion: null,
          updated_by: usuarioId,
        })
        .eq("id", datosModificados.factura_referencia_id)
        .eq("nota_credito_id", notaCreditoId);
    }

    const { error: notaUpdateError } = await supabase
      .from("notas_credito")
      .update(payloadNota)
      .eq("id", notaCreditoId);

    if (notaUpdateError) {
      throw new Error(`No se pudo actualizar la nota de credito: ${notaUpdateError.message}`);
    }

    const { error: deleteItemsError } = await supabase
      .from("notas_credito_items")
      .delete()
      .eq("nota_credito_id", notaCreditoId);

    if (deleteItemsError) {
      throw new Error(`No se pudieron reemplazar los items de la nota: ${deleteItemsError.message}`);
    }

    if (calculo.itemsToInsert.length > 0) {
      const { error: insertItemsError } = await supabase
        .from("notas_credito_items")
        .insert(
          calculo.itemsToInsert.map((item) => ({
            ...item,
            nota_credito_id: notaCreditoId,
          })),
        );

      if (insertItemsError) {
        throw new Error(`No se pudieron insertar los items actualizados: ${insertItemsError.message}`);
      }
    }

    if (datosModificados.tipo_anulacion === "total" && !datosModificados.simulacion) {
      await supabase
        .from("facturas_venta")
        .update({
          estado: "anulada",
          nota_credito_id: notaCreditoId,
          fecha_anulacion: new Date().toISOString(),
          motivo_anulacion: datosModificados.motivo,
          updated_by: usuarioId,
        })
        .eq("id", datosModificados.factura_referencia_id);
    }

    if (notaActual.asiento_contable_id) {
      const { data: asientoAnterior } = await supabase
        .from("asientos_contables")
        .select("*")
        .eq("id", notaActual.asiento_contable_id)
        .maybeSingle();

      if (asientoAnterior) {
        await registrarAuditoria(
          supabase,
          empresaId,
          "asientos_contables",
          asientoAnterior.id,
          "eliminar",
          asientoAnterior,
          null,
          usuarioId,
          solicitudId,
          { motivo: "regeneracion_por_modificacion_nota_credito" },
          auditoriaMetadata,
        );
      }

      const { error: asientoDeleteError } = await supabase
        .from("asientos_contables")
        .update({
          eliminado: true,
          eliminado_por: usuarioId,
          fecha_eliminacion: new Date().toISOString(),
          motivo_eliminacion: `Asiento reemplazado por edición de nota de crédito: ${notaCreditoId}`,
          estado: "anulado",
          ocultar_en_listados: true,
          updated_by: usuarioId,
        })
        .eq("id", notaActual.asiento_contable_id);

      if (asientoDeleteError) {
        throw new Error(`No se pudo anular el asiento anterior: ${asientoDeleteError.message}`);
      }

      await supabase
        .from("notas_credito")
        .update({ asiento_contable_id: null, updated_by: usuarioId })
        .eq("id", notaCreditoId);
    }

    if (!datosModificados.simulacion) {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("pais_id")
        .eq("id", empresaId)
        .single();

      const { data: cliente } = await supabase
        .from("clientes")
        .select("razon_social")
        .eq("id", notaActual.cliente_id)
        .maybeSingle();

      if (empresa?.pais_id) {
        await generarAsientoNotaCredito(
          supabase,
          notaCreditoId,
          empresaId,
          empresa.pais_id,
          cliente?.razon_social || "Cliente",
          notaActual.numero_nota,
          facturaOriginal.numero_factura,
          calculo.subtotal,
          calculo.totalIva,
          calculo.total,
          notaActual.fecha_emision,
          usuarioId,
        );
      }
    }

    return jsonResponse({
      success: true,
      message: "Nota de credito modificada exitosamente",
      notaCreditoId,
    });
  } catch (error) {
    console.error("Error modificando nota de credito aprobada:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Error desconocido" },
      400,
    );
  }
});

async function construirCalculoNota(
  supabase: ReturnType<typeof createClient>,
  input: ModificarNotaCreditoBody["datosModificados"],
) {
  let subtotal = 0;
  let totalIva = 0;
  let total = 0;
  let itemsToInsert: NotaCreditoItemCalculado[] = [];

  const { data: itemsFactura, error: itemsFacturaError } = await supabase
    .from("facturas_venta_items")
    .select("*")
    .eq("factura_id", input.factura_referencia_id);

  if (itemsFacturaError) {
    throw new Error(`No se pudieron obtener los items de factura: ${itemsFacturaError.message}`);
  }

  if (input.tipo_anulacion === "total") {
    itemsToInsert = (itemsFactura || []).map((item, index) => ({
      numero_linea: index + 1,
      factura_item_id: item.id,
      descripcion: item.descripcion,
      cantidad: -Math.abs(Number(item.cantidad)),
      precio_unitario: Number(item.precio_unitario),
      tasa_iva: Number(item.tasa_iva),
      monto_iva: -Math.abs(Number(item.monto_iva)),
      subtotal: -Math.abs(Number(item.subtotal)),
      total: -Math.abs(Number(item.total)),
      cuenta_contable_id: item.cuenta_contable_id,
    }));

    subtotal = -Math.abs(Number((itemsFactura || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0)));
    totalIva = -Math.abs(Number((itemsFactura || []).reduce((sum, item) => sum + Number(item.monto_iva || 0), 0)));
    total = -Math.abs(Number((itemsFactura || []).reduce((sum, item) => sum + Number(item.total || 0), 0)));
  } else {
    const itemsMap = new Map((itemsFactura || []).map((item) => [item.id, item]));

    itemsToInsert = (input.items || []).map((inputItem, index) => {
      const facturaItem = itemsMap.get(inputItem.factura_item_id);
      if (!facturaItem) {
        throw new Error("Item de factura no encontrado");
      }

      const cantidadAnular = Number(inputItem.cantidad_anular || 0);
      const precioUnitario = Number(facturaItem.precio_unitario || 0);
      const tasaIva = Number(facturaItem.tasa_iva || 0);
      const itemSubtotal = cantidadAnular * precioUnitario;
      const itemIva = itemSubtotal * tasaIva;
      const itemTotal = itemSubtotal + itemIva;

      subtotal -= itemSubtotal;
      totalIva -= itemIva;
      total -= itemTotal;

      return {
        numero_linea: index + 1,
        factura_item_id: facturaItem.id,
        descripcion: facturaItem.descripcion,
        cantidad: -cantidadAnular,
        precio_unitario: precioUnitario,
        tasa_iva: tasaIva,
        monto_iva: -itemIva,
        subtotal: -itemSubtotal,
        total: -itemTotal,
        cuenta_contable_id: facturaItem.cuenta_contable_id,
      };
    });
  }

  return { subtotal, totalIva, total, itemsToInsert };
}

async function generarAsientoNotaCredito(
  supabase: ReturnType<typeof createClient>,
  notaCreditoId: string,
  empresaId: string,
  paisId: string,
  clienteNombre: string,
  numeroNota: string,
  numeroFactura: string,
  subtotal: number,
  totalIva: number,
  total: number,
  fechaEmision: string,
  usuarioId: string,
) {
  const numeroAsiento = await generarNumeroAsiento(supabase, empresaId);
  const montoSubtotal = Math.abs(subtotal);
  const montoIva = Math.abs(totalIva);
  const montoTotal = Math.abs(total);

  const movimientos = [
    {
      cuenta_id: await obtenerCuentaId(supabase, empresaId, "7011"),
      cuenta: "7011 - Ventas",
      debito: montoSubtotal,
      credito: 0,
      descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
    },
    {
      cuenta_id: await obtenerCuentaId(supabase, empresaId, "2113"),
      cuenta: "2113 - IVA por Pagar",
      debito: montoIva,
      credito: 0,
      descripcion: `IVA Nota de Crédito ${numeroNota}`,
    },
    {
      cuenta_id: await obtenerCuentaId(supabase, empresaId, "1212"),
      cuenta: "1212 - Cuentas por Cobrar - Comerciales",
      debito: 0,
      credito: montoTotal,
      descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
    },
  ];

  const { data: asiento, error: asientoError } = await supabase
    .from("asientos_contables")
    .insert({
      empresa_id: empresaId,
      pais_id: paisId,
      numero: numeroAsiento,
      fecha: fechaEmision,
      descripcion: `Nota de Crédito ${numeroNota} - ${clienteNombre}`,
      referencia: `NC-${numeroNota}`,
      estado: "confirmado",
      creado_por: usuarioId,
      documento_soporte: {
        tipo: "nota_credito",
        id: notaCreditoId,
        numero: numeroNota,
        factura_referencia: numeroFactura,
      },
    })
    .select()
    .single();

  if (asientoError || !asiento) {
    throw new Error(`No se pudo generar el asiento de la nota: ${asientoError?.message}`);
  }

  const { error: movimientosError } = await supabase
    .from("movimientos_contables")
    .insert(
      movimientos.map((movimiento) => ({
        asiento_id: asiento.id,
        ...movimiento,
      })),
    );

  if (movimientosError) {
    await supabase.from("asientos_contables").delete().eq("id", asiento.id);
    throw new Error(`No se pudieron guardar los movimientos del asiento: ${movimientosError.message}`);
  }

  await supabase
    .from("notas_credito")
    .update({ asiento_contable_id: asiento.id, updated_by: usuarioId })
    .eq("id", notaCreditoId);
}

async function generarNumeroAsiento(supabase: ReturnType<typeof createClient>, empresaId: string) {
  const { data: ultimoAsiento } = await supabase
    .from("asientos_contables")
    .select("numero")
    .eq("empresa_id", empresaId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimoAsiento?.numero) {
    return "ASI-00001";
  }

  const match = String(ultimoAsiento.numero).match(/ASI-(\d+)/);
  if (!match) {
    return `ASI-${Date.now().toString().slice(-5)}`;
  }

  return `ASI-${String(Number(match[1]) + 1).padStart(5, "0")}`;
}

async function obtenerCuentaId(supabase: ReturnType<typeof createClient>, empresaId: string, codigo: string) {
  const { data: cuenta, error } = await supabase
    .from("plan_cuentas")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("codigo", codigo)
    .maybeSingle();

  if (error || !cuenta?.id) {
    throw new Error(`No existe la cuenta contable ${codigo} para esta empresa`);
  }

  return cuenta.id;
}

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
