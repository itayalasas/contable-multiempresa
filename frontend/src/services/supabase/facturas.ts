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

interface ConfigCFE {
  codigo_sucursal: string;
  rut_emisor: string;
  url_webservice?: string;
}

interface DGIPayload {
  tipo_comprobante: number;
  numero_interno: string;
  forma_pago: number;
  fecha_emision: string;
  sucursal: number;
  moneda: string;
  montos_brutos: number;
  numero_orden: string;
  lugar_entrega: string;
  cliente: string;
  items: Array<{
    codigo: string;
    cantidad: number;
    concepto: string;
    precio: number;
    indicador_facturacion: number;
    descuento_tipo: string;
    descuento_cantidad: number;
  }>;
  adenda: string;
}

async function obtenerConfigCFE(empresaId: string): Promise<ConfigCFE> {
  const { data, error } = await supabase
    .from('empresas_config_cfe')
    .select('codigo_sucursal, rut_emisor, url_webservice')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (error) throw new Error('Error obteniendo configuración CFE: ' + error.message);
  if (!data) throw new Error('No se encontró configuración CFE para esta empresa');
  if (!data.codigo_sucursal) throw new Error('La empresa no tiene código de sucursal configurado');

  return data as ConfigCFE;
}

function construirPayloadDGI(
  factura: FacturaVenta,
  configCFE: ConfigCFE
): DGIPayload {
  const tiposDocumento: Record<string, number> = {
    'e-ticket': 101,
    'e-factura': 111,
    'e-nota-credito': 112,
    'e-nota-debito': 113,
  };

  const formasPago: Record<string, number> = {
    'contado': 1,
    'credito': 2,
  };

  const fechaEmision = new Date(factura.fecha_emision);
  const fechaFormateada = `${fechaEmision.getDate().toString().padStart(2, '0')}/${(fechaEmision.getMonth() + 1).toString().padStart(2, '0')}/${fechaEmision.getFullYear()}`;

  return {
    tipo_comprobante: tiposDocumento[factura.tipo_documento] || 101,
    numero_interno: factura.id,
    forma_pago: formasPago[factura.estado === 'pagada' ? 'contado' : 'credito'] || 1,
    fecha_emision: fechaFormateada,
    sucursal: parseInt(configCFE.codigo_sucursal),
    moneda: factura.moneda || 'UYU',
    montos_brutos: 1,
    numero_orden: factura.numero_factura,
    lugar_entrega: factura.metadata?.lugar_entrega || 'Retiro en tienda',
    cliente: factura.cliente?.razon_social || '-',
    items: (factura.items || []).map((item) => ({
      codigo: item.metadata?.codigo || '',
      cantidad: parseFloat(item.cantidad.toString()),
      concepto: item.descripcion,
      precio: parseFloat(item.precio_unitario.toString()),
      indicador_facturacion: 3,
      descuento_tipo: item.descuento_porcentaje > 0 ? 'porcentaje' : '',
      descuento_cantidad: parseFloat(item.descuento_porcentaje.toString()),
    })),
    adenda: factura.metadata?.adenda || factura.observaciones || `Factura ${factura.numero_factura}`,
  };
}

interface DGICreateResponse {
  id: number;
  serie: string;
  numero: string;
  hash: string;
}

interface DGIDetailResponse {
  id: number;
  tipo_comprobante: number;
  serie: string;
  numero: number;
  sucursal: number;
  numero_interno: string;
  moneda: string;
  tasa_cambio: string;
  montos_brutos: number;
  numero_orden: string;
  lugar_entrega: string;
  items: any[];
  total: string;
  estado: string;
  fecha_creacion: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  adenda: string;
  cae: {
    numero: string;
    serie: string;
    inicio: number;
    fin: number;
    fecha_expiracion: string;
  };
}

async function obtenerDetalleCFE(cfeId: number): Promise<DGIDetailResponse> {
  const apiUrl = import.meta.env.VITE_DGI_API_DETAIL_URL;
  const detailKey = import.meta.env.VITE_DGI_API_DETAIL_KEY;

  if (!apiUrl || !detailKey) {
    throw new Error('Configuración de API DGI detalle incompleta en variables de entorno');
  }

  const url = `${apiUrl}?id=${cfeId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Integration-Key': detailKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || `Error HTTP ${response.status} al obtener detalle CFE`);
  }

  const responseData = await response.json();

  if (Array.isArray(responseData) && responseData.length > 0) {
    return responseData[0];
  }

  return responseData;
}

export async function enviarFacturaDGI(facturaId: string) {
  console.log('🚀 [enviarFacturaDGI] Iniciando envío de factura:', facturaId);

  console.log('📥 [enviarFacturaDGI] Obteniendo factura completa...');
  const factura = await obtenerFacturaPorId(facturaId);
  console.log('✅ [enviarFacturaDGI] Factura obtenida:', factura.numero_factura);

  if (factura.dgi_enviada) {
    throw new Error('Esta factura ya fue enviada a DGI');
  }

  console.log('⚙️ [enviarFacturaDGI] Obteniendo configuración CFE...');
  const configCFE = await obtenerConfigCFE(factura.empresa_id);
  console.log('✅ [enviarFacturaDGI] Configuración CFE obtenida:', configCFE);

  console.log('📦 [enviarFacturaDGI] Construyendo payload DGI...');
  const payload = construirPayloadDGI(factura, configCFE);
  console.log('✅ [enviarFacturaDGI] Payload construido');

  const apiCreateUrl = import.meta.env.VITE_DGI_API_CREATE_URL;
  const createKey = import.meta.env.VITE_DGI_API_CREATE_KEY;

  console.log('🔍 DEBUG - Variables de entorno:');
  console.log('apiCreateUrl:', apiCreateUrl);
  console.log('createKey:', createKey ? 'Configurada' : 'NO configurada');
  console.log('Todas las env:', import.meta.env);

  if (!apiCreateUrl || !createKey) {
    console.warn('⚠️ No hay configuración de API DGI. Usando modo simulación.');
    console.warn('apiCreateUrl:', apiCreateUrl);
    console.warn('createKey:', createKey);
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
        payload_enviado: payload,
      },
    });
  }

  try {
    console.log('Enviando CFE a DGI:', payload);

    const createResponse = await fetch(apiCreateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Integration-Key': createKey,
      },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error HTTP ${createResponse.status} al crear CFE`);
    }

    const createData: DGICreateResponse = await createResponse.json();

    console.log('CFE creado exitosamente:', createData);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const detalleData = await obtenerDetalleCFE(createData.id);

    console.log('Detalle CFE obtenido:', detalleData);

    const fechaVencimientoCAE = detalleData.cae?.fecha_expiracion
      ? new Date(detalleData.cae.fecha_expiracion).toISOString().split('T')[0]
      : null;

    return actualizarFactura(facturaId, {
      dgi_enviada: true,
      dgi_cae: detalleData.cae?.numero || createData.id.toString(),
      dgi_fecha_envio: new Date().toISOString(),
      dgi_id: createData.id,
      dgi_serie: createData.serie,
      dgi_numero: parseInt(createData.numero),
      dgi_hash: createData.hash,
      dgi_cae_numero: detalleData.cae?.numero,
      dgi_cae_serie: detalleData.cae?.serie,
      dgi_cae_vencimiento: fechaVencimientoCAE,
      dgi_detalle_completo: detalleData as any,
      estado: 'pendiente',
      dgi_response: {
        success: true,
        create_response: createData,
        detail_response: detalleData,
        payload_enviado: payload,
        fecha: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Error al enviar factura a DGI';

    await actualizarFactura(facturaId, {
      dgi_response: {
        success: false,
        error: errorMessage,
        fecha: new Date().toISOString(),
        payload_enviado: payload,
      },
    });

    throw new Error(errorMessage);
  }
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
