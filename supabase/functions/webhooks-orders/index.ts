import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret',
};

interface OrderPaidPayload {
  event: 'order.paid';
  order_id: string;
  empresa_id: string;
  crm_customer_id?: string;
  customer: {
    nombre: string;
    documento: string;
    email: string;
    telefono?: string;
    direccion?: string;
  };
  service: {
    tipo: string;
    descripcion: string;
    partner_id?: string;
    partner_name?: string;
  };
  amounts: {
    total: number;
    partner_commission?: number;
    platform_fee?: number;
    tax: number;
  };
  payment: {
    method: string;
    transaction_id: string;
    paid_at: string;
  };
}

interface OrderCancelledPayload {
  event: 'order.cancelled';
  order_id: string;
  empresa_id: string;
  factura_id?: string;
  motivo: string;
  tipo_anulacion: 'total' | 'parcial';
  monto_devolver: number;
  refund?: {
    method: string;
    transaction_id: string;
    status: string;
  };
  metadata: {
    cancelled_by: string;
    cancelled_at: string;
    reason_detail: string;
  };
}

type WebhookPayload = OrderPaidPayload | OrderCancelledPayload;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || 'default-secret-change-in-production';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar webhook secret
    const providedSecret = req.headers.get('X-Webhook-Secret');
    if (providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload: WebhookPayload = await req.json();

    // Registrar el evento
    const { data: evento, error: eventoError } = await supabase
      .from('eventos_externos')
      .insert({
        empresa_id: payload.empresa_id,
        tipo_evento: payload.event,
        origen: 'webhook',
        payload: payload,
        procesado: false,
      })
      .select()
      .single();

    if (eventoError) {
      console.error('Error registrando evento:', eventoError);
      return new Response(
        JSON.stringify({ error: 'Error al registrar evento', details: eventoError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Procesar el evento según el tipo
    let result;
    if (payload.event === 'order.paid') {
      result = await handleOrderPaid(supabase, payload, evento.id);
    } else if (payload.event === 'order.cancelled') {
      result = await handleOrderCancelled(supabase, payload, evento.id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Evento no soportado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (result.success) {
      // Marcar evento como procesado
      await supabase
        .from('eventos_externos')
        .update({
          procesado: true,
          procesado_at: new Date().toISOString(),
          factura_id: result.factura_id,
          nota_credito_id: result.nota_credito_id,
        })
        .eq('id', evento.id);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Registrar error
      await supabase
        .from('eventos_externos')
        .update({
          error: result.error,
          reintentos: evento.reintentos + 1,
        })
        .eq('id', evento.id);

      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleOrderPaid(
  supabase: any,
  payload: OrderPaidPayload,
  eventoId: string
) {
  try {
    // 1. Obtener país de la empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', payload.empresa_id)
      .single();

    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    // 2. Buscar o crear cliente
    let clienteId;
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', payload.empresa_id)
      .eq('numero_documento', payload.customer.documento)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      // Crear nuevo cliente
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          empresa_id: payload.empresa_id,
          pais_id: empresa.pais_id,
          razon_social: payload.customer.nombre,
          numero_documento: payload.customer.documento,
          email: payload.customer.email,
          telefono: payload.customer.telefono,
          direccion: payload.customer.direccion,
          activo: true,
        })
        .select()
        .single();

      if (clienteError) {
        return { success: false, error: `Error creando cliente: ${clienteError.message}` };
      }
      clienteId = nuevoCliente.id;
    }

    // 3. Obtener siguiente número de factura
    const { data: ultimaFactura } = await supabase
      .from('facturas_venta')
      .select('numero_factura')
      .eq('empresa_id', payload.empresa_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const siguienteNumero = ultimaFactura
      ? String(parseInt(ultimaFactura.numero_factura) + 1).padStart(8, '0')
      : '00000001';

    // 4. Calcular montos
    const subtotal = payload.amounts.total / (1 + 0.22);
    const totalIva = payload.amounts.tax;

    // 5. Crear factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .insert({
        empresa_id: payload.empresa_id,
        cliente_id: clienteId,
        numero_factura: siguienteNumero,
        tipo_documento: 'e-ticket',
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: 'pagada',
        subtotal: subtotal.toFixed(2),
        total_iva: totalIva.toFixed(2),
        total: payload.amounts.total.toFixed(2),
        moneda: 'UYU',
        tipo_cambio: 1,
        dgi_enviada: false,
        metadata: {
          crm_order_id: payload.order_id,
          partner_id: payload.service.partner_id,
          payment_transaction: payload.payment.transaction_id,
          payment_method: payload.payment.method,
          evento_id: eventoId,
        },
      })
      .select()
      .single();

    if (facturaError) {
      return { success: false, error: `Error creando factura: ${facturaError.message}` };
    }

    // 6. Crear item de factura
    const { error: itemError } = await supabase
      .from('facturas_venta_items')
      .insert({
        factura_id: factura.id,
        numero_linea: 1,
        descripcion: payload.service.descripcion,
        cantidad: 1,
        precio_unitario: subtotal.toFixed(2),
        tasa_iva: 0.22,
        monto_iva: totalIva.toFixed(2),
        subtotal: subtotal.toFixed(2),
        total: payload.amounts.total.toFixed(2),
        metadata: {
          service_type: payload.service.tipo,
          partner_id: payload.service.partner_id,
        },
      });

    if (itemError) {
      return { success: false, error: `Error creando item: ${itemError.message}` };
    }

    return {
      success: true,
      factura_id: factura.id,
      numero_factura: factura.numero_factura,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleOrderCancelled(
  supabase: any,
  payload: OrderCancelledPayload,
  eventoId: string
) {
  try {
    // 1. Buscar la factura original
    let facturaOriginal;
    if (payload.factura_id) {
      const { data } = await supabase
        .from('facturas_venta')
        .select('*')
        .eq('id', payload.factura_id)
        .single();
      facturaOriginal = data;
    } else {
      const { data } = await supabase
        .from('facturas_venta')
        .select('*')
        .eq('empresa_id', payload.empresa_id)
        .eq('metadata->>crm_order_id', payload.order_id)
        .single();
      facturaOriginal = data;
    }

    if (!facturaOriginal) {
      return { success: false, error: 'Factura no encontrada' };
    }

    if (facturaOriginal.estado === 'anulada') {
      return { success: false, error: 'La factura ya está anulada' };
    }

    // 2. Si no está enviada a DGI, simplemente eliminar
    if (!facturaOriginal.dgi_enviada) {
      await supabase
        .from('facturas_venta_items')
        .delete()
        .eq('factura_id', facturaOriginal.id);

      await supabase
        .from('facturas_venta')
        .delete()
        .eq('id', facturaOriginal.id);

      return {
        success: true,
        method: 'deleted',
        factura_id: facturaOriginal.id,
      };
    }

    // 3. Obtener siguiente número de nota de crédito
    const { data: ultimaNota } = await supabase
      .from('notas_credito')
      .select('numero_nota')
      .eq('empresa_id', payload.empresa_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const siguienteNumero = ultimaNota
      ? String(parseInt(ultimaNota.numero_nota) + 1).padStart(8, '0')
      : '00000001';

    // 4. Crear nota de crédito
    const { data: notaCredito, error: notaError } = await supabase
      .from('notas_credito')
      .insert({
        empresa_id: payload.empresa_id,
        cliente_id: facturaOriginal.cliente_id,
        factura_referencia_id: facturaOriginal.id,
        numero_nota: siguienteNumero,
        tipo_documento: 'e-nota-credito',
        fecha_emision: new Date().toISOString().split('T')[0],
        motivo: payload.motivo,
        tipo_anulacion: payload.tipo_anulacion,
        subtotal: -facturaOriginal.subtotal,
        total_iva: -facturaOriginal.total_iva,
        total: -facturaOriginal.total,
        moneda: facturaOriginal.moneda,
        tipo_cambio: facturaOriginal.tipo_cambio,
        dgi_enviada: false,
        metadata: {
          factura_anulada_id: facturaOriginal.id,
          crm_order_id: payload.order_id,
          motivo_cancelacion: payload.metadata.reason_detail,
          refund_transaction: payload.refund?.transaction_id,
          evento_id: eventoId,
        },
      })
      .select()
      .single();

    if (notaError) {
      return { success: false, error: `Error creando nota de crédito: ${notaError.message}` };
    }

    // 5. Copiar items con valores negativos
    const { data: itemsFactura } = await supabase
      .from('facturas_venta_items')
      .select('*')
      .eq('factura_id', facturaOriginal.id);

    for (const item of itemsFactura || []) {
      await supabase.from('notas_credito_items').insert({
        nota_credito_id: notaCredito.id,
        factura_item_id: item.id,
        numero_linea: item.numero_linea,
        descripcion: item.descripcion,
        cantidad: -item.cantidad,
        precio_unitario: item.precio_unitario,
        tasa_iva: item.tasa_iva,
        monto_iva: -item.monto_iva,
        subtotal: -item.subtotal,
        total: -item.total,
        cuenta_contable_id: item.cuenta_contable_id,
      });
    }

    // 6. Actualizar factura original
    await supabase
      .from('facturas_venta')
      .update({
        estado: 'anulada',
        nota_credito_id: notaCredito.id,
        fecha_anulacion: new Date().toISOString(),
        motivo_anulacion: payload.motivo,
      })
      .eq('id', facturaOriginal.id);

    return {
      success: true,
      nota_credito_id: notaCredito.id,
      numero_nota: notaCredito.numero_nota,
      factura_anulada_id: facturaOriginal.id,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
