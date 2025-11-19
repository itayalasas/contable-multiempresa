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
  dgi_fecha_envio?: string;
  dgi_response?: any;
  nota_credito_id?: string;
  fecha_anulacion?: string;
  motivo_anulacion?: string;
  asiento_contable_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cliente?: {
    razon_social: string;
    numero_documento: string;
    email?: string;
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
  items: {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    tasa_iva?: number;
    cuenta_contable_id?: string;
  }[];
}

export async function obtenerFacturas(empresaId: string) {
  const { data, error } = await supabase
    .from('facturas_venta')
    .select(`
      *,
      cliente:clientes(razon_social, numero_documento, email)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FacturaVenta[];
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

  const subtotal = input.items.reduce((sum, item) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuento = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    return sum + (itemSubtotal - descuento);
  }, 0);

  const totalIva = input.items.reduce((sum, item) => {
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const descuento = item.descuento_porcentaje
      ? itemSubtotal * (item.descuento_porcentaje / 100)
      : 0;
    const baseImponible = itemSubtotal - descuento;
    const tasa = item.tasa_iva ?? 0.22;
    return sum + baseImponible * tasa;
  }, 0);

  const total = subtotal + totalIva;

  const { data: factura, error: facturaError } = await supabase
    .from('facturas_venta')
    .insert({
      empresa_id: input.empresa_id,
      cliente_id: input.cliente_id,
      numero_factura: siguienteNumero,
      tipo_documento: input.tipo_documento || 'e-ticket',
      fecha_emision: input.fecha_emision || new Date().toISOString().split('T')[0],
      fecha_vencimiento: input.fecha_vencimiento,
      estado: 'borrador',
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

  return factura;
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

export async function eliminarFactura(facturaId: string) {
  await supabase.from('facturas_venta_items').delete().eq('factura_id', facturaId);

  const { error } = await supabase
    .from('facturas_venta')
    .delete()
    .eq('id', facturaId);

  if (error) throw error;
}

export async function marcarFacturaComoPagada(facturaId: string) {
  return actualizarFactura(facturaId, { estado: 'pagada' });
}

export async function enviarFacturaDGI(facturaId: string) {
  const factura = await obtenerFacturaPorId(facturaId);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const cae = `CAE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return actualizarFactura(facturaId, {
    dgi_enviada: true,
    dgi_cae: cae,
    dgi_fecha_envio: new Date().toISOString(),
    dgi_response: {
      success: true,
      cae,
      fecha: new Date().toISOString(),
      message: 'Factura aprobada por DGI (simulado)',
    },
  });
}

export async function obtenerEstadisticasFacturas(empresaId: string) {
  const { data: facturas } = await supabase
    .from('facturas_venta')
    .select('estado, total, fecha_emision')
    .eq('empresa_id', empresaId);

  if (!facturas) return null;

  const totalFacturado = facturas.reduce(
    (sum, f) => sum + (f.estado !== 'anulada' ? parseFloat(f.total) : 0),
    0
  );

  const totalPagado = facturas
    .filter((f) => f.estado === 'pagada')
    .reduce((sum, f) => sum + parseFloat(f.total), 0);

  const totalPendiente = facturas
    .filter((f) => f.estado === 'pendiente')
    .reduce((sum, f) => sum + parseFloat(f.total), 0);

  return {
    total_facturado: totalFacturado,
    total_pagado: totalPagado,
    total_pendiente: totalPendiente,
    cantidad_facturas: facturas.length,
    facturas_pagadas: facturas.filter((f) => f.estado === 'pagada').length,
    facturas_pendientes: facturas.filter((f) => f.estado === 'pendiente').length,
    facturas_vencidas: facturas.filter((f) => f.estado === 'vencida').length,
    facturas_anuladas: facturas.filter((f) => f.estado === 'anulada').length,
  };
}
