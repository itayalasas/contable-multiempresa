import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret',
};

interface WebhookItem {
  tipo: 'servicio' | 'producto';
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal: number;
  tasa_iva: number;
  monto_iva: number;
  total: number;
  partner?: {
    id: string;
    nombre: string;
    documento: string;
    tipo_documento?: string;
    email: string;
    telefono?: string;
    direccion?: string;
    comision_porcentaje: number;
    comision_monto: number;
  };
}

interface OrderPaidPayloadV2 {
  event: 'order.paid';
  version: '2.0';
  order_id: string;
  empresa_id: string;
  crm_customer_id?: string;
  customer: {
    nombre: string;
    documento: string;
    tipo_documento?: string;
    email: string;
    telefono?: string;
    direccion?: string;
  };
  items: WebhookItem[];
  totales: {
    subtotal: number;
    descuento_total: number;
    subtotal_con_descuento: number;
    iva_total: number;
    total_factura: number;
    comision_partners_total: number;
    ganancia_plataforma: number;
    impuesto_gateway: number;
  };
  payment: {
    method: string;
    gateway: string;
    transaction_id: string;
    paid_at: string;
    impuesto_gateway_porcentaje: number;
    impuesto_gateway_monto: number;
    neto_recibido: number;
  };
  metadata?: Record<string, any>;
}

type WebhookPayload = OrderPaidPayloadV2;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WebhookPayload = await req.json();

    console.log('🔔 [Webhook] Recibido:', payload.event, payload.order_id);

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
      console.error('❌ [Webhook] Error registrando evento:', eventoError);
      return new Response(
        JSON.stringify({ error: 'Error al registrar evento', details: eventoError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Procesar el evento
    const result = await handleOrderPaid(supabase, payload, evento.id);

    if (result.success) {
      // Marcar evento como procesado
      await supabase
        .from('eventos_externos')
        .update({
          procesado: true,
          procesado_at: new Date().toISOString(),
          factura_id: result.factura_id,
        })
        .eq('id', evento.id);

      console.log('✅ [Webhook] Procesado exitosamente:', result);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Registrar error
      await supabase
        .from('eventos_externos')
        .update({
          error: result.error,
          reintentos: (evento.reintentos || 0) + 1,
        })
        .eq('id', evento.id);

      console.error('❌ [Webhook] Error procesando:', result.error);

      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ [Webhook] Error crítico:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleOrderPaid(
  supabase: any,
  payload: OrderPaidPayloadV2,
  eventoId: string
) {
  try {
    console.log('🔄 [OrderPaid] Procesando orden:', payload.order_id);

    // 1. Obtener empresa y país
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, pais_id')
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
      console.log('👤 [OrderPaid] Cliente existente:', clienteId);
    } else {
      const { data: nuevoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          empresa_id: payload.empresa_id,
          pais_id: empresa.pais_id,
          razon_social: payload.customer.nombre,
          numero_documento: payload.customer.documento,
          tipo_documento: payload.customer.tipo_documento || 'CI',
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
      console.log('✅ [OrderPaid] Cliente creado:', clienteId);
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

    console.log('📝 [OrderPaid] Número factura:', siguienteNumero);

    // 4. Crear factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .insert({
        empresa_id: payload.empresa_id,
        cliente_id: clienteId,
        numero_factura: siguienteNumero,
        tipo_documento: 'e-ticket',
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: 'pagada',
        subtotal: payload.totales.subtotal_con_descuento.toFixed(2),
        descuento: payload.totales.descuento_total.toFixed(2),
        total_iva: payload.totales.iva_total.toFixed(2),
        total: payload.totales.total_factura.toFixed(2),
        moneda: 'UYU',
        tipo_cambio: 1,
        dgi_enviada: false,
        metadata: {
          order_id: payload.order_id,
          payment_transaction: payload.payment.transaction_id,
          payment_method: payload.payment.method,
          gateway: payload.payment.gateway,
          gateway_fee: payload.payment.impuesto_gateway_monto,
          neto_recibido: payload.payment.neto_recibido,
          evento_id: eventoId,
          ...payload.metadata,
        },
      })
      .select()
      .single();

    if (facturaError) {
      return { success: false, error: `Error creando factura: ${facturaError.message}` };
    }

    console.log('✅ [OrderPaid] Factura creada:', factura.id);

    // 5. Crear items de factura y registrar comisiones
    const comisionesCreadas = [];

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];

      // Crear item de factura
      const { error: itemError } = await supabase
        .from('facturas_venta_items')
        .insert({
          factura_id: factura.id,
          numero_linea: i + 1,
          codigo: item.codigo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario.toFixed(2),
          descuento_porcentaje: item.descuento_porcentaje,
          descuento_monto: item.descuento_monto.toFixed(2),
          tasa_iva: item.tasa_iva,
          monto_iva: item.monto_iva.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
          total: item.total.toFixed(2),
          metadata: {
            tipo: item.tipo,
            partner_id: item.partner?.id,
          },
        });

      if (itemError) {
        console.error('❌ [OrderPaid] Error creando item:', itemError);
        return { success: false, error: `Error creando item: ${itemError.message}` };
      }

      console.log(`✅ [OrderPaid] Item ${i + 1} creado`);

      // Si tiene partner, procesar comisión
      if (item.partner) {
        const comisionResult = await procesarComisionPartner(
          supabase,
          payload.empresa_id,
          empresa.pais_id,
          factura.id,
          payload.order_id,
          item
        );

        if (comisionResult.success) {
          comisionesCreadas.push(comisionResult.comision_id);
        } else {
          console.warn('⚠️ [OrderPaid] Error en comisión:', comisionResult.error);
        }
      }
    }

    console.log(`💰 [OrderPaid] Comisiones registradas: ${comisionesCreadas.length}`);

    return {
      success: true,
      factura_id: factura.id,
      numero_factura: factura.numero_factura,
      cliente_id: clienteId,
      comisiones_registradas: comisionesCreadas.length,
      comision_ids: comisionesCreadas,
    };
  } catch (error) {
    console.error('❌ [OrderPaid] Error:', error);
    return { success: false, error: error.message };
  }
}

async function procesarComisionPartner(
  supabase: any,
  empresaId: string,
  paisId: string,
  facturaId: string,
  orderId: string,
  item: WebhookItem
) {
  try {
    if (!item.partner) {
      return { success: false, error: 'Item sin partner' };
    }

    console.log('🤝 [Comision] Procesando partner:', item.partner.id);

    // 1. Buscar o crear partner
    let partnerId;
    const { data: partnerExistente } = await supabase
      .from('partners_aliados')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('partner_id_externo', item.partner.id)
      .maybeSingle();

    if (partnerExistente) {
      partnerId = partnerExistente.id;
      console.log('🤝 [Comision] Partner existente:', partnerId);
    } else {
      // Crear nuevo partner
      const { data: nuevoPartner, error: partnerError } = await supabase
        .from('partners_aliados')
        .insert({
          empresa_id: empresaId,
          partner_id_externo: item.partner.id,
          razon_social: item.partner.nombre,
          documento: item.partner.documento,
          tipo_documento: item.partner.tipo_documento || 'RUT',
          email: item.partner.email,
          telefono: item.partner.telefono,
          direccion: item.partner.direccion,
          activo: true,
          comision_porcentaje_default: item.partner.comision_porcentaje,
          facturacion_frecuencia: 'quincenal',
          dia_facturacion: 15,
        })
        .select()
        .single();

      if (partnerError) {
        return { success: false, error: `Error creando partner: ${partnerError.message}` };
      }
      partnerId = nuevoPartner.id;
      console.log('✅ [Comision] Partner creado:', partnerId);
    }

    // 2. Registrar comisión
    const { data: comision, error: comisionError } = await supabase
      .from('comisiones_partners')
      .insert({
        empresa_id: empresaId,
        partner_id: partnerId,
        factura_venta_id: facturaId,
        order_id: orderId,
        item_codigo: item.codigo,
        fecha: new Date().toISOString().split('T')[0],
        subtotal_venta: item.subtotal,
        comision_porcentaje: item.partner.comision_porcentaje,
        comision_monto: item.partner.comision_monto,
        estado_comision: 'pendiente',
        estado_pago: 'pendiente',
        descripcion: item.descripcion,
      })
      .select()
      .single();

    if (comisionError) {
      return { success: false, error: `Error registrando comisión: ${comisionError.message}` };
    }

    console.log('✅ [Comision] Registrada:', comision.id);

    return {
      success: true,
      comision_id: comision.id,
      partner_id: partnerId,
    };
  } catch (error) {
    console.error('❌ [Comision] Error:', error);
    return { success: false, error: error.message };
  }
}
