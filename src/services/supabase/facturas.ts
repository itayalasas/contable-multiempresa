import { supabase } from '../../config/supabase';

export interface FacturaVenta {
  id: string;
  empresa_id: string;
  cliente_id: string;
  numero_factura: string;
  serie: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado: 'borrador' | 'pagada' | 'pendiente' | 'anulada' | 'vencida';
  subtotal: number;
  total_iva: number;
  total: number;
  moneda: string;
  tipo_cambio: number;
  observaciones?: string;
  dgi_enviada: boolean;
  dgi_cae?: string;
  dgi_cae_numero?: string;
  dgi_serie?: string;
  dgi_numero?: string;
  dgi_cae_vencimiento?: string;
  dgi_fecha_envio?: string;
  dgi_response?: any;
  nota_credito_id?: string;
  fecha_anulacion?: string;
  motivo_anulacion?: string;
  asiento_contable_id?: string;
  asiento_generado?: boolean;
  asiento_error?: string;
  asiento_intentos?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cliente?: {
    razon_social: string;
    numero_documento: string;
    email?: string;
    tipo_documento?: string;
    direccion?: string;
    telefono?: string;
  };
  items?: FacturaVentaItem[];
}

export interface FacturaVentaItem {
  id: string;
  factura_id: string;
  numero_linea: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  tasa_iva: number;
  monto_iva: number;
  subtotal: number;
  total: number;
  cuenta_contable_id?: string;
  metadata?: any;
  created_at: string;
}

export interface CrearFacturaInput {
  empresa_id: string;
  cliente_id: string;
  tipo_documento?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  moneda?: string;
  tipo_cambio?: number;
  observaciones?: string;
  metadata?: any;
  estado?: FacturaVenta['estado'];
  items: {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    tasa_iva?: number;
    cuenta_contable_id?: string;
  }[];
}

export interface PayloadActualizacionFacturaAprobable {
  cliente_id: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  subtotal: string;
  total_iva: string;
  total: string;
  moneda: string;
  tipo_cambio: number;
  observaciones?: string;
  metadata: any;
  items: {
    numero_linea: number;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    descuento_monto: string;
    tasa_iva: number;
    monto_iva: string;
    subtotal: string;
    total: string;
    cuenta_contable_id?: string;
  }[];
}

export const calcularTotalesFactura = (items: CrearFacturaInput['items']) => {
  const subtotal = items.reduce((sum, item) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuento = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    return sum + (itemSubtotal - descuento);
  }, 0);

  const totalIva = items.reduce((sum, item) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuento = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    const baseImponible = itemSubtotal - descuento;
    const tasa = item.tasa_iva ?? 0.22;
    return sum + baseImponible * tasa;
  }, 0);

  return {
    subtotal,
    totalIva,
    total: subtotal + totalIva,
  };
};

export const normalizarItemsFactura = (items: CrearFacturaInput['items']) => {
  return items.map((item, index) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuentoMonto = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    const baseImponible = itemSubtotal - descuentoMonto;
    const tasa = item.tasa_iva ?? 0.22;
    const montoIva = baseImponible * tasa;
    const itemTotal = baseImponible + montoIva;

    return {
      numero_linea: index + 1,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento_porcentaje: item.descuento_porcentaje || 0,
      descuento_monto: descuentoMonto.toFixed(2),
      tasa_iva: tasa,
      monto_iva: montoIva.toFixed(2),
      subtotal: baseImponible.toFixed(2),
      total: itemTotal.toFixed(2),
      cuenta_contable_id: item.cuenta_contable_id,
    };
  });
};

export const construirPayloadActualizacionFactura = (
  input: CrearFacturaInput
): PayloadActualizacionFacturaAprobable => {
  const { subtotal, totalIva, total } = calcularTotalesFactura(input.items);

  return {
    cliente_id: input.cliente_id,
    tipo_documento: input.tipo_documento || 'e-ticket',
    fecha_emision: input.fecha_emision || new Date().toISOString().split('T')[0],
    fecha_vencimiento: input.fecha_vencimiento,
    subtotal: subtotal.toFixed(2),
    total_iva: totalIva.toFixed(2),
    total: total.toFixed(2),
    moneda: input.moneda || 'UYU',
    tipo_cambio: input.tipo_cambio || 1,
    observaciones: input.observaciones,
    metadata: input.metadata || {},
    items: normalizarItemsFactura(input.items),
  };
};

const esFacturaNoVenta = (factura: { metadata?: any; serie?: string; numero_factura?: string }): boolean => {
  const tipo = factura.metadata?.tipo;
  const serie = factura.serie;
  const numero = factura.numero_factura;

  return (
    tipo === 'factura_comisiones_partner'
    || tipo === 'factura_promocion_partner'
    || serie === 'COM'
    || serie === 'PROM'
    || (typeof numero === 'string' && (numero.startsWith('COM-') || numero.startsWith('PROM-')))
  );
};

export async function obtenerFacturas(empresaId: string) {
  const { data, error } = await supabase
    .from('facturas_venta')
    .select(`
      *,
      cliente:clientes(razon_social, numero_documento, email)
    `)
    .eq('empresa_id', empresaId)
    .eq('ocultar_en_listados', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const facturasSoloVentas = (data || []).filter((f) => !esFacturaNoVenta(f));
  return facturasSoloVentas as FacturaVenta[];
}

export async function obtenerFacturaPorId(facturaId: string) {
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_venta')
    .select(`
      *,
      cliente:clientes(razon_social, numero_documento, email, telefono, direccion)
    `)
    .eq('id', facturaId)
    .single();

  if (facturaError) throw facturaError;

  const { data: items, error: itemsError } = await supabase
    .from('facturas_venta_items')
    .select('*')
    .eq('factura_id', facturaId)
    .order('numero_linea', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...factura,
    items,
  } as FacturaVenta;
}

export async function crearFactura(input: CrearFacturaInput) {
  const { data: ultimaFactura } = await supabase
    .from('facturas_venta')
    .select('numero_factura')
    .eq('empresa_id', input.empresa_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const siguienteNumero = ultimaFactura
    ? String(parseInt(ultimaFactura.numero_factura) + 1).padStart(8, '0')
    : '00000001';

  const { subtotal, totalIva, total } = calcularTotalesFactura(input.items);
  const estadoFactura = input.estado || 'borrador';

  const { data: factura, error: facturaError } = await supabase
    .from('facturas_venta')
    .insert({
      empresa_id: input.empresa_id,
      cliente_id: input.cliente_id,
      numero_factura: siguienteNumero,
      tipo_documento: input.tipo_documento || 'e-ticket',
      fecha_emision: input.fecha_emision || new Date().toISOString().split('T')[0],
      fecha_vencimiento: input.fecha_vencimiento,
      estado: estadoFactura,
      subtotal: subtotal.toFixed(2),
      total_iva: totalIva.toFixed(2),
      total: total.toFixed(2),
      moneda: input.moneda || 'UYU',
      tipo_cambio: input.tipo_cambio || 1,
      observaciones: input.observaciones,
      dgi_enviada: false,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (facturaError) throw facturaError;

  const itemsToInsert = input.items.map((item, index) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuentoMonto = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    const baseImponible = itemSubtotal - descuentoMonto;
    const tasa = item.tasa_iva ?? 0.22;
    const montoIva = baseImponible * tasa;
    const itemTotal = baseImponible + montoIva;

    return {
      factura_id: factura.id,
      numero_linea: index + 1,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento_porcentaje: item.descuento_porcentaje || 0,
      descuento_monto: descuentoMonto,
      tasa_iva: tasa,
      monto_iva: montoIva.toFixed(2),
      subtotal: baseImponible.toFixed(2),
      total: itemTotal.toFixed(2),
      cuenta_contable_id: item.cuenta_contable_id,
    };
  });

  const { error: itemsError } = await supabase
    .from('facturas_venta_items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('facturas_venta').delete().eq('id', factura.id);
    throw itemsError;
  }

  if (estadoFactura === 'borrador') {
    return factura;
  }

  try {
    console.log('🔄 [crearFactura] Generando asiento contable automático...');

    const { data: cliente } = await supabase
      .from('clientes')
      .select('razon_social')
      .eq('id', input.cliente_id)
      .maybeSingle();

    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', input.empresa_id)
      .single();

    if (!empresa?.pais_id) {
      console.warn('⚠️ [crearFactura] No se encontró pais_id de la empresa, no se puede crear asiento');
      return factura;
    }

    const { generarAsientoFacturaVenta } = await import('./asientosAutomaticos');

    await generarAsientoFacturaVenta(
      factura.id,
      input.empresa_id,
      empresa.pais_id,
      cliente?.razon_social || 'Cliente',
      siguienteNumero,
      subtotal,
      totalIva,
      total,
      factura.fecha_emision,
      factura.creado_por || undefined
    );

    console.log('✅ [crearFactura] Asiento contable generado exitosamente');
  } catch (asientoError: any) {
    console.error('⚠️ [crearFactura] Error al generar asiento contable:', asientoError);
    console.error('⚠️ [crearFactura] Detalle del error:', asientoError.message);
  }

  return factura;
}

export async function actualizarFacturaConItems(
  facturaId: string,
  input: CrearFacturaInput
) {
  const payload = construirPayloadActualizacionFactura(input);

  const { data: facturaActualizada, error: facturaError } = await supabase
    .from('facturas_venta')
    .update({
      cliente_id: payload.cliente_id,
      tipo_documento: payload.tipo_documento,
      fecha_emision: payload.fecha_emision,
      fecha_vencimiento: payload.fecha_vencimiento,
      subtotal: payload.subtotal,
      total_iva: payload.total_iva,
      total: payload.total,
      moneda: payload.moneda,
      tipo_cambio: payload.tipo_cambio,
      observaciones: payload.observaciones,
      metadata: payload.metadata,
    })
    .eq('id', facturaId)
    .select()
    .single();

  if (facturaError) throw facturaError;

  const { error: deleteError } = await supabase
    .from('facturas_venta_items')
    .delete()
    .eq('factura_id', facturaId);

  if (deleteError) throw deleteError;

  const itemsToInsert = payload.items.map((item) => ({
    factura_id: facturaId,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from('facturas_venta_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  return facturaActualizada as FacturaVenta;
}

export async function emitirFactura(facturaId: string) {
  const factura = await obtenerFacturaPorId(facturaId);

  if (factura.estado !== 'borrador') {
    throw new Error('Solo se pueden emitir facturas en borrador');
  }

  const { data: actualizada, error } = await supabase
    .from('facturas_venta')
    .update({
      estado: 'pendiente',
      dgi_enviada: false,
      dgi_response: null,
    })
    .eq('id', facturaId)
    .select()
    .single();

  if (error) throw error;

  try {
    console.log('🔄 [emitirFactura] Generando asiento contable...');

    const { data: cliente } = await supabase
      .from('clientes')
      .select('razon_social')
      .eq('id', factura.cliente_id)
      .maybeSingle();

    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .single();

    if (!empresa?.pais_id) {
      console.warn('⚠️ [emitirFactura] No se encontró pais_id de la empresa, no se puede crear asiento');
      return actualizada as FacturaVenta;
    }

    const { generarAsientoFacturaVenta } = await import('./asientosAutomaticos');

    await generarAsientoFacturaVenta(
      factura.id,
      factura.empresa_id,
      empresa.pais_id,
      cliente?.razon_social || 'Cliente',
      factura.numero_factura,
      parseFloat(factura.subtotal),
      parseFloat(factura.total_iva),
      parseFloat(factura.total),
      factura.fecha_emision,
      factura.creado_por || undefined
    );

    console.log('✅ [emitirFactura] Asiento contable generado exitosamente');
  } catch (asientoError: any) {
    console.error('⚠️ [emitirFactura] Error al generar asiento contable:', asientoError);
    console.error('⚠️ [emitirFactura] Detalle del error:', asientoError.message);
  }

  return actualizada as FacturaVenta;
}

export async function actualizarFactura(
  facturaId: string,
  updates: Partial<FacturaVenta>
) {
  const { data, error } = await supabase
    .from('facturas_venta')
    .update(updates)
    .eq('id', facturaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarFactura(facturaId: string, empresaId: string) {
  const { data, error } = await supabase
    .rpc('eliminar_factura_venta', {
      p_factura_id: facturaId,
      p_empresa_id: empresaId,
    });

  if (error) throw error;

  console.log('✅ Factura de venta eliminada completamente:', data);
}

export async function marcarFacturaComoPagada(
  facturaId: string,
  tipoPago: string = 'EFECTIVO',
  usuarioId?: string
) {
  const factura = await obtenerFacturaPorId(facturaId);

  const resultado = await actualizarFactura(facturaId, { estado: 'pagada' });

  try {
    console.log('🔄 [marcarFacturaComoPagada] Generando asiento de pago...');

    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', factura.empresa_id)
      .single();

    if (!empresa?.pais_id) {
      console.warn('⚠️ [marcarFacturaComoPagada] No se encontró pais_id de la empresa');
      return resultado;
    }

    const { generarAsientoPagoFacturaVenta } = await import('./asientosAutomaticos');

    await generarAsientoPagoFacturaVenta(
      facturaId,
      factura.empresa_id,
      empresa.pais_id,
      factura.numero_factura,
      parseFloat(factura.total),
      new Date().toISOString().split('T')[0],
      tipoPago,
      usuarioId || factura.creado_por || undefined
    );

    console.log('✅ [marcarFacturaComoPagada] Asiento de pago generado');
  } catch (asientoError: any) {
    console.error('⚠️ [marcarFacturaComoPagada] Error al generar asiento de pago:', asientoError);
    console.error('⚠️ [marcarFacturaComoPagada] Detalle del error:', asientoError.message);
  }

  return resultado;
}

export async function enviarFacturaDGI(facturaId: string) {
  const factura = await obtenerFacturaPorId(facturaId);

  if (factura.dgi_enviada && factura.dgi_cae) {
    throw new Error('Esta factura ya fue enviada exitosamente a DGI');
  }

  // Prevalidacion para dar feedback claro y evitar un 400 evitable en la Edge Function.
  const { data: configCfe, error: configCfeError } = await supabase
    .from('empresas_config_cfe')
    .select('activa')
    .eq('empresa_id', factura.empresa_id)
    .maybeSingle();

  if (!configCfeError && (!configCfe || !configCfe.activa)) {
    throw new Error('La empresa no tiene configuración CFE activa. Configure CFE en Administración antes de enviar a DGI.');
  }

  const getFunctionsErrorMessage = async (error: any): Promise<string> => {
    const fallback = error?.message || 'Error al invocar función de envío a DGI';

    const extractJsonError = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return parsed?.error || parsed?.message || null;
        } catch {
          return null;
        }
      }
      return value?.error || value?.message || null;
    };

    const fromContextBody = extractJsonError(error?.context?.body);
    if (fromContextBody) return fromContextBody;

    const context = error?.context;
    if (context && typeof context === 'object' && typeof context.text === 'function') {
      try {
        const text = await context.clone().text();
        const fromResponse = extractJsonError(text);
        if (fromResponse) return fromResponse;
      } catch {
        // Ignorar parse errors y usar fallback
      }
    }

    return fallback;
  };

  try {
    const { data, error } = await supabase.functions.invoke('auto-send-dgi', {
      body: { facturaId }
    });

    if (error) {
      const detalle = await getFunctionsErrorMessage(error);
      if (detalle.includes('Empresa sin configuración CFE')) {
        throw new Error('La empresa no tiene configuración CFE activa. Configure CFE en Administración antes de enviar a DGI.');
      }
      throw new Error(detalle);
    }

    if (!data) {
      throw new Error('No se recibió respuesta de la función de envío');
    }

    if (!data.success) {
      const detalle = data.error || data.message || 'Error desconocido al enviar factura a DGI';
      if (detalle.includes('Empresa sin configuración CFE')) {
        throw new Error('La empresa no tiene configuración CFE activa. Configure CFE en Administración antes de enviar a DGI.');
      }
      throw new Error(detalle);
    }

    return obtenerFacturaPorId(facturaId);
  } catch (error) {
    throw error;
  }
}

export async function obtenerEstadisticasFacturas(empresaId: string) {
  const { data: facturas } = await supabase
    .from('facturas_venta')
    .select('estado, total, fecha_emision, metadata, serie, numero_factura')
    .eq('empresa_id', empresaId)
    .eq('ocultar_en_listados', false);

  if (!facturas) return null;

  const facturasSinComision = facturas.filter((f) => !esFacturaNoVenta(f));

  const totalFacturado = facturasSinComision.reduce(
    (sum, f) => sum + (f.estado !== 'anulada' ? parseFloat(f.total) : 0),
    0
  );

  const totalPagado = facturasSinComision
    .filter((f) => f.estado === 'pagada')
    .reduce((sum, f) => sum + parseFloat(f.total), 0);

  const totalPendiente = facturasSinComision
    .filter((f) => f.estado === 'pendiente')
    .reduce((sum, f) => sum + parseFloat(f.total), 0);

  return {
    total_facturado: totalFacturado,
    total_pagado: totalPagado,
    total_pendiente: totalPendiente,
    cantidad_facturas: facturasSinComision.length,
    facturas_pagadas: facturasSinComision.filter((f) => f.estado === 'pagada').length,
    facturas_pendientes: facturasSinComision.filter((f) => f.estado === 'pendiente').length,
    facturas_vencidas: facturasSinComision.filter((f) => f.estado === 'vencida').length,
    facturas_anuladas: facturasSinComision.filter((f) => f.estado === 'anulada').length,
  };
}

export async function regenerarAsientoContable(facturaId: string) {
  const { data, error } = await supabase.functions.invoke('generar-asiento-factura', {
    body: { factura_id: facturaId, manual: true }
  });

  if (error) throw error;
  return data;
}
