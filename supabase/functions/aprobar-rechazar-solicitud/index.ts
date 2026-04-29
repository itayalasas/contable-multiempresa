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

interface AuditoriaRequestMetadata {
  ip_address: string | null;
  user_agent: string | null;
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
    const auditoriaMetadata = getAuditoriaRequestMetadata(req);

    console.log(`Procesando solicitud ${solicitudId}: ${accion.toUpperCase()}`);

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
      .select("id, rol, empresas_asignadas, permisos, metadata, activo")
      .eq("id", aprobadorId)
      .single();

    if (usuarioError || !usuario) {
      throw new Error(`Usuario no encontrado: ${usuarioError?.message}`);
    }

    if (!usuario.activo) {
      throw new Error("El usuario aprobador se encuentra inactivo");
    }

    if (solicitud.solicitante_id === aprobadorId) {
      throw new Error("No puedes aprobar o rechazar tu propia solicitud");
    }

    if (!tienePermisoAprobacion(usuario)) {
      throw new Error(
        "No tienes permisos para aprobar o rechazar solicitudes. Solo supervisores o administradores pueden realizar esta acción.",
      );
    }

    if (!Array.isArray(usuario.empresas_asignadas) || !usuario.empresas_asignadas.includes(solicitud.empresa_id)) {
      throw new Error("El usuario no tiene acceso a esta empresa");
    }

    if (accion === "aprobar") {
      console.log(`Ejecutando solicitud ${solicitud.tipo_solicitud} sobre ${solicitud.tabla_afectada}`);
      await ejecutarSolicitudAprobada(supabase, supabaseUrl, supabaseKey, solicitud, aprobadorId, auditoriaMetadata);
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
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al procesar la solicitud",
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

function tienePermisoAprobacion(usuario: any): boolean {
  const rolesPermitidos = new Set(["super_admin", "admin", "admin_empresa", "supervisor"]);
  if (rolesPermitidos.has(usuario.rol)) {
    return true;
  }

  const permisosFila = Array.isArray(usuario.permisos) ? usuario.permisos : [];
  if (permisosFila.includes("admin:all") || permisosFila.includes("usuarios:gestionar")) {
    return true;
  }

  const metadata = usuario.metadata || {};
  const permissions = metadata.permissions;

  if (Array.isArray(permissions)) {
    return permissions.includes("admin:all") || permissions.includes("usuarios:gestionar");
  }

  if (permissions && typeof permissions === "object") {
    const modulos = ["administracion", "usuarios", "autorizaciones", "configuracion-aprobaciones"];
    return modulos.some((modulo) => Array.isArray(permissions[modulo]) && permissions[modulo].length > 0);
  }

  return false;
}

async function ejecutarSolicitudAprobada(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  solicitud: any,
  aprobadorId: string,
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  switch (solicitud.tipo_solicitud) {
    case "modificar_factura":
      await invocarFuncionSupabase(supabaseUrl, supabaseKey, "modificar-factura-aprobada", {
        solicitudId: solicitud.id,
        facturaId: solicitud.factura_id || solicitud.registro_id,
        datosModificados: solicitud.datos_modificados,
        usuarioId: aprobadorId,
        auditoriaMetadata,
      });
      return;
    case "eliminar_factura":
      await invocarFuncionSupabase(supabaseUrl, supabaseKey, "eliminar-factura-aprobada", {
        solicitudId: solicitud.id,
        facturaId: solicitud.factura_id || solicitud.registro_id,
        usuarioId: aprobadorId,
        auditoriaMetadata,
      });
      return;
    case "modificar_nota_credito":
      await invocarFuncionSupabase(supabaseUrl, supabaseKey, "modificar-nota-credito-aprobada", {
        solicitudId: solicitud.id,
        notaCreditoId: solicitud.registro_id,
        datosModificados: solicitud.datos_modificados,
        usuarioId: aprobadorId,
        auditoriaMetadata,
      });
      return;
    case "eliminar_nota_credito":
      await invocarFuncionSupabase(supabaseUrl, supabaseKey, "eliminar-nota-credito-aprobada", {
        solicitudId: solicitud.id,
        notaCreditoId: solicitud.registro_id,
        usuarioId: aprobadorId,
        auditoriaMetadata,
      });
      return;
    case "modificar_asiento":
      await modificarAsientoAprobado(supabase, solicitud, aprobadorId, auditoriaMetadata);
      return;
    case "eliminar_asiento":
      await eliminarAsientoAprobado(supabase, solicitud, aprobadorId, auditoriaMetadata);
      return;
    case "modificar_movimiento_tesoreria":
      await modificarMovimientoTesoreriaAprobado(supabase, solicitud, aprobadorId, auditoriaMetadata);
      return;
    case "eliminar_movimiento_tesoreria":
      await eliminarMovimientoTesoreriaAprobado(supabase, solicitud, aprobadorId, auditoriaMetadata);
      return;
    case "modificar_pago_cliente":
      await modificarPagoAprobado(supabase, solicitud, aprobadorId, "pagos_cliente", auditoriaMetadata);
      return;
    case "eliminar_pago_cliente":
      await eliminarPagoAprobado(supabase, solicitud, aprobadorId, "pagos_cliente", auditoriaMetadata);
      return;
    case "modificar_pago_proveedor":
      await modificarPagoAprobado(supabase, solicitud, aprobadorId, "pagos_proveedor", auditoriaMetadata);
      return;
    case "eliminar_pago_proveedor":
      await eliminarPagoAprobado(supabase, solicitud, aprobadorId, "pagos_proveedor", auditoriaMetadata);
      return;
    default:
      throw new Error(`Tipo de solicitud no soportado todavía: ${solicitud.tipo_solicitud}`);
  }
}

async function invocarFuncionSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  functionName: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Error al ejecutar ${functionName}`);
  }
}

async function modificarAsientoAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const asientoId = solicitud.registro_id;
  const updates = solicitud.datos_modificados || {};

  const { data: asiento, error } = await supabase
    .from("asientos_contables")
    .select("*, movimientos_contables(*)")
    .eq("id", asientoId)
    .single();

  if (error || !asiento) {
    throw new Error(`Asiento no encontrado: ${error?.message}`);
  }

  await registrarAuditoriaCambio(
    supabase,
    asiento.empresa_id,
    "asientos_contables",
    asientoId,
    "modificar",
    asiento,
    updates,
    usuarioId,
    solicitud.id,
    { incluye_movimientos: true },
    auditoriaMetadata,
  );

  const asientoUpdates: Record<string, unknown> = {
    fecha_modificacion: new Date().toISOString(),
  };

  if (updates.fecha) asientoUpdates.fecha = updates.fecha;
  if (updates.descripcion) asientoUpdates.descripcion = updates.descripcion;
  if (updates.referencia !== undefined) asientoUpdates.referencia = updates.referencia;
  if (updates.estado) asientoUpdates.estado = updates.estado;
  if (updates.documentoSoporte !== undefined) asientoUpdates.documento_soporte = updates.documentoSoporte;
  if (updates.centroCosto !== undefined) asientoUpdates.centro_costo = updates.centroCosto;
  if (updates.proyecto !== undefined) asientoUpdates.proyecto = updates.proyecto;

  const { error: updateError } = await supabase
    .from("asientos_contables")
    .update(asientoUpdates)
    .eq("id", asientoId);

  if (updateError) {
    throw new Error(`No se pudo actualizar el asiento: ${updateError.message}`);
  }

  if (Array.isArray(updates.movimientos) && updates.movimientos.length > 0) {
    const { error: deleteMovsError } = await supabase
      .from("movimientos_contables")
      .delete()
      .eq("asiento_id", asientoId);

    if (deleteMovsError) {
      throw new Error(`No se pudieron reemplazar los movimientos del asiento: ${deleteMovsError.message}`);
    }

    const movimientosPayload = updates.movimientos.map((mov: any) => ({
      asiento_id: asientoId,
      cuenta_id: mov.cuentaId || mov.cuenta_id,
      cuenta: mov.cuenta || "",
      debito: mov.debito || 0,
      credito: mov.credito || 0,
      descripcion: mov.descripcion || "",
      tercero_id: mov.terceroId || mov.tercero_id || null,
      tercero: mov.tercero || null,
      documento_referencia: mov.documentoReferencia || mov.documento_referencia || null,
      centro_costo: mov.centroCosto || mov.centro_costo || null,
    }));

    const { error: insertMovsError } = await supabase
      .from("movimientos_contables")
      .insert(movimientosPayload);

    if (insertMovsError) {
      throw new Error(`No se pudieron guardar los movimientos del asiento: ${insertMovsError.message}`);
    }
  }
}

async function eliminarAsientoAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const asientoId = solicitud.registro_id;
  const { data: asiento, error } = await supabase
    .from("asientos_contables")
    .select("*, movimientos_contables(*)")
    .eq("id", asientoId)
    .single();

  if (error || !asiento) {
    throw new Error(`Asiento no encontrado: ${error?.message}`);
  }

  await registrarAuditoriaCambio(
    supabase,
    asiento.empresa_id,
    "asientos_contables",
    asientoId,
    "eliminar",
    asiento,
    null,
    usuarioId,
    solicitud.id,
    { motivo: solicitud.motivo, incluye_movimientos: true },
    auditoriaMetadata,
  );

  const movimientos = Array.isArray(asiento.movimientos_contables) ? asiento.movimientos_contables : [];
  for (const movimiento of movimientos) {
    await registrarAuditoriaCambio(
      supabase,
      asiento.empresa_id,
      "movimientos_contables",
      movimiento.id,
      "eliminar",
      movimiento,
      null,
      usuarioId,
      solicitud.id,
      { asiento_id: asientoId },
      auditoriaMetadata,
    );
  }

  const { error: updateError } = await supabase
    .from("asientos_contables")
    .update({
      eliminado: true,
      eliminado_por: usuarioId,
      fecha_eliminacion: new Date().toISOString(),
      motivo_eliminacion: solicitud.motivo,
      estado: "anulado",
      ocultar_en_listados: true,
    })
    .eq("id", asientoId);

  if (updateError) {
    throw new Error(`No se pudo eliminar lógicamente el asiento: ${updateError.message}`);
  }
}

async function modificarMovimientoTesoreriaAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const movimientoId = solicitud.registro_id;
  const updates = solicitud.datos_modificados || {};

  const { data: movimiento, error } = await supabase
    .from("movimientos_tesoreria")
    .select("*")
    .eq("id", movimientoId)
    .single();

  if (error || !movimiento) {
    throw new Error(`Movimiento no encontrado: ${error?.message}`);
  }

  await registrarAuditoriaCambio(
    supabase,
    movimiento.empresa_id,
    "movimientos_tesoreria",
    movimientoId,
    "modificar",
    movimiento,
    updates,
    usuarioId,
    solicitud.id,
    undefined,
    auditoriaMetadata,
  );

  const payload: Record<string, unknown> = {};
  if (updates.fecha) payload.fecha = updates.fecha;
  if (updates.descripcion || updates.concepto) payload.descripcion = updates.descripcion || updates.concepto;
  if (updates.referencia !== undefined) payload.referencia = updates.referencia;
  if (updates.beneficiario !== undefined) payload.beneficiario = updates.beneficiario;
  if (updates.categoria !== undefined) payload.categoria = updates.categoria;
  if (updates.monto !== undefined) payload.monto = updates.monto;

  const { error: updateError } = await supabase
    .from("movimientos_tesoreria")
    .update(payload)
    .eq("id", movimientoId);

  if (updateError) {
    throw new Error(`No se pudo actualizar el movimiento: ${updateError.message}`);
  }
}

async function eliminarMovimientoTesoreriaAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const movimientoId = solicitud.registro_id;
  const { data: movimiento, error } = await supabase
    .from("movimientos_tesoreria")
    .select("*")
    .eq("id", movimientoId)
    .single();

  if (error || !movimiento) {
    throw new Error(`Movimiento no encontrado: ${error?.message}`);
  }

  await registrarAuditoriaCambio(
    supabase,
    movimiento.empresa_id,
    "movimientos_tesoreria",
    movimientoId,
    "eliminar",
    movimiento,
    null,
    usuarioId,
    solicitud.id,
    { motivo: solicitud.motivo },
    auditoriaMetadata,
  );

  const { error: deleteError } = await supabase
    .from("movimientos_tesoreria")
    .update({
      eliminado: true,
      eliminado_por: usuarioId,
      fecha_eliminacion: new Date().toISOString(),
      motivo_eliminacion: solicitud.motivo,
    })
    .eq("id", movimientoId);

  if (deleteError) {
    throw new Error(`No se pudo eliminar lógicamente el movimiento: ${deleteError.message}`);
  }

  if (movimiento.asiento_contable_id) {
    const { data: asiento } = await supabase
      .from("asientos_contables")
      .select("*")
      .eq("id", movimiento.asiento_contable_id)
      .maybeSingle();

    if (asiento) {
      await registrarAuditoriaCambio(
        supabase,
        movimiento.empresa_id,
        "asientos_contables",
        asiento.id,
        "eliminar",
        asiento,
        null,
        usuarioId,
        solicitud.id,
        { motivo: `Asiento asociado al movimiento ${movimientoId}` },
        auditoriaMetadata,
      );

      const { error: asientoDeleteError } = await supabase
        .from("asientos_contables")
        .update({
          eliminado: true,
          eliminado_por: usuarioId,
          fecha_eliminacion: new Date().toISOString(),
          motivo_eliminacion: `Asiento asociado a movimiento eliminado: ${solicitud.motivo}`,
          estado: "anulado",
          ocultar_en_listados: true,
        })
        .eq("id", asiento.id);

      if (asientoDeleteError) {
        throw new Error(`No se pudo eliminar el asiento asociado: ${asientoDeleteError.message}`);
      }
    }
  }
}

async function modificarPagoAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  tabla: "pagos_cliente" | "pagos_proveedor",
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const { data: pago, error } = await supabase
    .from(tabla)
    .select("*")
    .eq("id", solicitud.registro_id)
    .single();

  if (error || !pago) {
    throw new Error(`Registro no encontrado en ${tabla}: ${error?.message}`);
  }

  const updates = solicitud.datos_modificados || {};
  await registrarAuditoriaCambio(
    supabase,
    pago.empresa_id,
    tabla,
    pago.id,
    "modificar",
    pago,
    updates,
    usuarioId,
    solicitud.id,
    undefined,
    auditoriaMetadata,
  );

  const payload: Record<string, unknown> = {};
  for (const field of ["fecha_pago", "monto", "referencia", "observaciones", "metodo_pago", "cuenta_bancaria_id"]) {
    if (updates[field] !== undefined) {
      payload[field] = updates[field];
    }
  }

  const { error: updateError } = await supabase
    .from(tabla)
    .update(payload)
    .eq("id", pago.id);

  if (updateError) {
    throw new Error(`No se pudo actualizar ${tabla}: ${updateError.message}`);
  }
}

async function eliminarPagoAprobado(
  supabase: ReturnType<typeof createClient>,
  solicitud: any,
  usuarioId: string,
  tabla: "pagos_cliente" | "pagos_proveedor",
  auditoriaMetadata: AuditoriaRequestMetadata,
) {
  const { data: pago, error } = await supabase
    .from(tabla)
    .select("*")
    .eq("id", solicitud.registro_id)
    .single();

  if (error || !pago) {
    throw new Error(`Registro no encontrado en ${tabla}: ${error?.message}`);
  }

  await registrarAuditoriaCambio(
    supabase,
    pago.empresa_id,
    tabla,
    pago.id,
    "eliminar",
    pago,
    null,
    usuarioId,
    solicitud.id,
    { motivo: solicitud.motivo },
    auditoriaMetadata,
  );

  const { error: deleteError } = await supabase
    .from(tabla)
    .update({
      eliminado: true,
      eliminado_por: usuarioId,
      fecha_eliminacion: new Date().toISOString(),
      motivo_eliminacion: solicitud.motivo,
    })
    .eq("id", pago.id);

  if (deleteError) {
    throw new Error(`No se pudo eliminar lógicamente ${tabla}: ${deleteError.message}`);
  }
}

async function registrarAuditoriaCambio(
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

function getAuditoriaRequestMetadata(req: Request): AuditoriaRequestMetadata {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return {
    ip_address: req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || forwardedFor?.split(",")[0]?.trim()
      || null,
    user_agent: req.headers.get("user-agent"),
  };
}
