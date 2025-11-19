import { supabase } from '../../config/supabase';

export interface NotaCredito {
  id: string;
  empresa_id: string;
  cliente_id: string;
  factura_referencia_id: string;
  numero_nota: string;
  serie: string;
  tipo_documento: string;
  fecha_emision: string;
  motivo: string;
  tipo_anulacion: 'total' | 'parcial';
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
  asiento_contable_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cliente?: {
    nombre: string;
    numero_documento: string;
  };
  factura_referencia?: {
    numero_factura: string;
    serie: string;
  };
  items?: NotaCreditoItem[];
}

export interface NotaCreditoItem {
  id: string;
  nota_credito_id: string;
  factura_item_id?: string;
  numero_linea: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  tasa_iva: number;
  monto_iva: number;
  subtotal: number;
  total: number;
  cuenta_contable_id?: string;
  metadata?: any;
  created_at: string;
}

export interface CrearNotaCreditoInput {
  empresa_id: string;
  factura_referencia_id: string;
  motivo: string;
  tipo_anulacion: 'total' | 'parcial';
  observaciones?: string;
  items?: {
    factura_item_id: string;
    cantidad_anular: number;
  }[];
}

export async function obtenerNotasCredito(empresaId: string) {
  const { data, error } = await supabase
    .from('notas_credito')
    .select(`
      *,
      cliente:clientes(nombre, numero_documento),
      factura_referencia:facturas_venta(numero_factura, serie)
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NotaCredito[];
}

export async function obtenerNotaCreditoPorId(notaId: string) {
  const { data: nota, error: notaError } = await supabase
    .from('notas_credito')
    .select(`
      *,
      cliente:clientes(nombre, numero_documento, email),
      factura_referencia:facturas_venta(numero_factura, serie, total)
    `)
    .eq('id', notaId)
    .single();

  if (notaError) throw notaError;

  const { data: items, error: itemsError } = await supabase
    .from('notas_credito_items')
    .select('*')
    .eq('nota_credito_id', notaId)
    .order('numero_linea', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...nota,
    items,
  } as NotaCredito;
}

export async function crearNotaCredito(input: CrearNotaCreditoInput) {
  const { data: facturaOriginal, error: facturaError } = await supabase
    .from('facturas_venta')
    .select('*')
    .eq('id', input.factura_referencia_id)
    .single();

  if (facturaError) throw facturaError;

  if (facturaOriginal.estado === 'anulada') {
    throw new Error('La factura ya está anulada');
  }

  const { data: ultimaNota } = await supabase
    .from('notas_credito')
    .select('numero_nota')
    .eq('empresa_id', input.empresa_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const siguienteNumero = ultimaNota
    ? String(parseInt(ultimaNota.numero_nota) + 1).padStart(8, '0')
    : '00000001';

  let subtotal = 0;
  let totalIva = 0;
  let total = 0;
  let itemsToInsert: any[] = [];

  if (input.tipo_anulacion === 'total') {
    subtotal = -parseFloat(facturaOriginal.subtotal);
    totalIva = -parseFloat(facturaOriginal.total_iva);
    total = -parseFloat(facturaOriginal.total);

    const { data: itemsFactura } = await supabase
      .from('facturas_venta_items')
      .select('*')
      .eq('factura_id', input.factura_referencia_id);

    itemsToInsert = (itemsFactura || []).map((item, index) => ({
      numero_linea: index + 1,
      factura_item_id: item.id,
      descripcion: item.descripcion,
      cantidad: -parseFloat(item.cantidad),
      precio_unitario: parseFloat(item.precio_unitario),
      tasa_iva: parseFloat(item.tasa_iva),
      monto_iva: -parseFloat(item.monto_iva),
      subtotal: -parseFloat(item.subtotal),
      total: -parseFloat(item.total),
      cuenta_contable_id: item.cuenta_contable_id,
    }));
  } else {
    const { data: itemsFactura } = await supabase
      .from('facturas_venta_items')
      .select('*')
      .eq('factura_id', input.factura_referencia_id);

    const itemsMap = new Map(itemsFactura?.map((i) => [i.id, i]));

    itemsToInsert = (input.items || []).map((inputItem, index) => {
      const facturaItem = itemsMap.get(inputItem.factura_item_id);
      if (!facturaItem) throw new Error('Item de factura no encontrado');

      const cantidadAnular = inputItem.cantidad_anular;
      const precioUnitario = parseFloat(facturaItem.precio_unitario);
      const tasaIva = parseFloat(facturaItem.tasa_iva);

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

  const { data: notaCredito, error: notaError } = await supabase
    .from('notas_credito')
    .insert({
      empresa_id: input.empresa_id,
      cliente_id: facturaOriginal.cliente_id,
      factura_referencia_id: input.factura_referencia_id,
      numero_nota: siguienteNumero,
      tipo_documento: 'e-nota-credito',
      fecha_emision: new Date().toISOString().split('T')[0],
      motivo: input.motivo,
      tipo_anulacion: input.tipo_anulacion,
      subtotal: subtotal.toFixed(2),
      total_iva: totalIva.toFixed(2),
      total: total.toFixed(2),
      moneda: facturaOriginal.moneda,
      tipo_cambio: facturaOriginal.tipo_cambio,
      observaciones: input.observaciones,
      dgi_enviada: false,
      metadata: {
        factura_anulada_id: input.factura_referencia_id,
      },
    })
    .select()
    .single();

  if (notaError) throw notaError;

  const itemsWithNotaId = itemsToInsert.map((item) => ({
    ...item,
    nota_credito_id: notaCredito.id,
  }));

  const { error: itemsError } = await supabase
    .from('notas_credito_items')
    .insert(itemsWithNotaId);

  if (itemsError) {
    await supabase.from('notas_credito').delete().eq('id', notaCredito.id);
    throw itemsError;
  }

  await supabase
    .from('facturas_venta')
    .update({
      estado: 'anulada',
      nota_credito_id: notaCredito.id,
      fecha_anulacion: new Date().toISOString(),
      motivo_anulacion: input.motivo,
    })
    .eq('id', input.factura_referencia_id);

  return notaCredito;
}

export async function enviarNotaCreditoDGI(notaId: string) {
  const nota = await obtenerNotaCreditoPorId(notaId);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const cae = `CAE-NC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('notas_credito')
    .update({
      dgi_enviada: true,
      dgi_cae: cae,
      dgi_fecha_envio: new Date().toISOString(),
      dgi_response: {
        success: true,
        cae,
        fecha: new Date().toISOString(),
        message: 'Nota de crédito aprobada por DGI (simulado)',
      },
    })
    .eq('id', notaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function obtenerNotasCreditoPorFactura(facturaId: string) {
  const { data, error } = await supabase
    .from('notas_credito')
    .select('*')
    .eq('factura_referencia_id', facturaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NotaCredito[];
}
