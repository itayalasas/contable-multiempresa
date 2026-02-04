import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret',
};

interface SimpleWebhookPayload {
  event: 'order.created' | 'order.paid' | 'order.cancelled' | 'order.updated';
  empresa_id: string;
  timestamp?: string;
  order: {
    order_id: string;
    order_number?: string;
    created_at?: string;
    status?: string;
    total: number;
    subtotal: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    currency: string;
    payment_method?: string;
    payment_status?: string;
  };
  customer: {
    customer_id?: string;
    name: string;
    email?: string;
    phone?: string;
    document_type?: string;
    document_number?: string;
    address?: any;
  };
  items: Array<{
    item_id?: string;
    sku?: string;
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    discount?: number;
    discount_percentage?: number;
    total: number;
    category?: string;
    partner?: {
      partner_id: string;
      name: string;
      email?: string;
      phone?: string;
      document_type?: string;
      document_number?: string;
      commission_percentage?: number;
      commission_default?: number;
      billing_frequency?: string;
      billing_day?: number;
    };
  }>;
  shipping?: any;
  partner?: {
    partner_id: string;
    name: string;
    email?: string;
    phone?: string;
    document_type?: string;
    document_number?: string;
    commission_default?: number;
    billing_frequency?: string;
    billing_day?: number;
  };
  partners?: Array<any>;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || 'default-secret-change-in-production';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const providedSecret = req.headers.get('X-Webhook-Secret');
    if (providedSecret && providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SimpleWebhookPayload = await req.json();

    console.log('🔔 [Webhook] Recibido:', payload.event, payload.order.order_id);

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
        JSON.stringify({ error: 'Error al registrar evento', details: eventoError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleOrder(supabase, payload, evento.id);

    if (result.success) {
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
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

async function handleOrder(
  supabase: any,
  payload: SimpleWebhookPayload,
  eventoId: string
) {
  try {
    console.log('🔄 [Order] Procesando orden:', payload.order.order_id);

    const { data: ordenExistente } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura')
      .eq('metadata->>order_id', payload.order.order_id)
      .maybeSingle();

    if (ordenExistente) {
      console.log('⚠️ [Order] Orden ya procesada:', ordenExistente.id);
      return {
        success: true,
        factura_id: ordenExistente.id,
        numero_factura: ordenExistente.numero_factura,
        mensaje: 'Orden ya fue procesada anteriormente',
      };
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, pais_id')
      .eq('id', payload.empresa_id)
      .maybeSingle();

    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    // Obtener configuración de comisión MercadoLibre desde impuestos
    const { data: impuestoML } = await supabase
      .from('impuestos')
      .select('tasa')
      .eq('empresa_id', payload.empresa_id)
      .ilike('nombre', '%Mercado%')
      .eq('activo', true)
      .maybeSingle();

    const comisionMLPorcentaje = impuestoML?.tasa || 7.0;
    console.log(`💳 [Order] Comisión ML configurada: ${comisionMLPorcentaje}%`);

    // Obtener configuración de cuenta bancaria ML
    const { data: cuentaBancariaML } = await supabase
      .from('cuentas_bancarias')
      .select('id')
      .eq('empresa_id', payload.empresa_id)
      .ilike('nombre', '%MercadoLibre%')
      .eq('activa', true)
      .maybeSingle();

    const cuentaBancariaMLId = cuentaBancariaML?.id || null;
    if (!cuentaBancariaMLId) {
      console.warn('⚠️ [Order] No se encontró cuenta bancaria MercadoLibre');
    }

    let clienteId;
    let clienteExistente = null;

    // 1. Buscar por customer_id si existe
    if (payload.customer.customer_id) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', payload.empresa_id)
        .eq('metadata->>customer_id_externo', payload.customer.customer_id)
        .maybeSingle();

      if (cliente) {
        clienteExistente = cliente;
        clienteId = cliente.id;
        console.log('👤 [Order] Cliente encontrado por customer_id externo:', clienteId);
      }
    }

    // 2. Si no se encontró, buscar por documento
    if (!clienteId && payload.customer.document_number) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', payload.empresa_id)
        .eq('numero_documento', payload.customer.document_number)
        .maybeSingle();

      if (cliente) {
        clienteExistente = cliente;
        clienteId = cliente.id;
        console.log('👤 [Order] Cliente encontrado por documento:', clienteId);
      }
    }

    // 3. Si no se encontró, buscar por email (último recurso)
    if (!clienteId && payload.customer.email) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', payload.empresa_id)
        .eq('email', payload.customer.email)
        .maybeSingle();

      if (cliente) {
        clienteExistente = cliente;
        clienteId = cliente.id;
        console.log('👤 [Order] Cliente encontrado por email:', clienteId);
      }
    }

    if (clienteId) {
      const clienteUpdateData: any = {
        razon_social: payload.customer.name,
        email: payload.customer.email,
        telefono: payload.customer.phone,
      };

      if (payload.customer.customer_id) {
        clienteUpdateData.metadata = {
          customer_id_externo: payload.customer.customer_id
        };
      }

      const { error: updateError } = await supabase
        .from('clientes')
        .update(clienteUpdateData)
        .eq('id', clienteId);

      if (updateError) {
        console.error('⚠️ [Order] Error actualizando cliente:', updateError);
      } else {
        console.log('✅ [Order] Cliente actualizado con datos de la orden');
      }
    }

    if (!clienteId) {
      const clienteData: any = {
        empresa_id: payload.empresa_id,
        pais_id: empresa.pais_id,
        razon_social: payload.customer.name,
        email: payload.customer.email,
        telefono: payload.customer.phone,
        activo: true,
        metadata: {},
      };

      if (payload.customer.customer_id) {
        clienteData.metadata.customer_id_externo = payload.customer.customer_id;
      }

      if (payload.customer.document_number) {
        clienteData.numero_documento = payload.customer.document_number;
      }
      if (payload.customer.document_type) {
        const { data: tipoDoc } = await supabase
          .from('tipo_documento_identidad')
          .select('id')
          .eq('pais_id', empresa.pais_id)
          .ilike('codigo', payload.customer.document_type)
          .maybeSingle();

        if (tipoDoc) {
          clienteData.tipo_documento_id = tipoDoc.id;
        }
      }

      if (payload.customer.address) {
        if (typeof payload.customer.address === 'string') {
          clienteData.direccion = payload.customer.address;
        } else {
          clienteData.direccion = payload.customer.address.street || '';
          clienteData.ciudad = payload.customer.address.city;
          clienteData.departamento = payload.customer.address.state;
          clienteData.codigo_postal = payload.customer.address.zip;
        }
      }

      const { data: nuevoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (clienteError) {
        return { success: false, error: `Error creando cliente: ${clienteError.message}` };
      }
      clienteId = nuevoCliente.id;
      console.log('✅ [Order] Cliente creado:', clienteId);
    }

    const serie = 'A';
    const { data: ultimaFactura } = await supabase
      .from('facturas_venta')
      .select('numero_factura')
      .eq('empresa_id', payload.empresa_id)
      .eq('serie', serie)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const siguienteNumero = ultimaFactura
      ? String(parseInt(ultimaFactura.numero_factura) + 1).padStart(8, '0')
      : '00000001';

    console.log('📝 [Order] Número factura:', `${serie}-${siguienteNumero}`);

    const esEnCentavos = payload.metadata?.amounts_in_cents === true || payload.order.amounts_in_cents === true;
    const divisor = esEnCentavos ? 100 : 1;

    // Los totales de Dogcatify vienen CON IVA INCLUIDO
    const total = (payload.order.total || 0) / divisor;
    const impuestos = (payload.order.tax || 0) / divisor;
    const subtotal = total - impuestos; // Subtotal sin IVA
    const descuento = (payload.order.discount || 0) / divisor;

    const estadosPagados = ['paid', 'approved', 'completed', 'confirmed'];
    const estaPagada = estadosPagados.includes(payload.order.payment_status?.toLowerCase() || '');

    console.log(`💳 [Order] Payment status recibido: "${payload.order.payment_status}" → Estado factura: "${estaPagada ? 'pagada' : 'pendiente'}"`);

    // Calcular comisión MercadoLibre sobre el total
    const comisionMLMonto = total * (comisionMLPorcentaje / 100);

    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .insert({
        empresa_id: payload.empresa_id,
        cliente_id: clienteId,
        numero_factura: siguienteNumero,
        serie: serie,
        tipo_documento: 'e-ticket',
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: estaPagada ? 'pagada' : 'pendiente',
        subtotal: subtotal.toFixed(2),
        descuento: descuento.toFixed(2),
        total_iva: impuestos.toFixed(2),
        total: total.toFixed(2),
        moneda: payload.order.currency || 'UYU',
        tipo_cambio: 1,
        dgi_enviada: false,
        metadata: {
          order_id: payload.order.order_id,
          order_number: payload.order.order_number,
          payment_method: payload.order.payment_method,
          payment_status: payload.order.payment_status,
          forma_pago: estaPagada ? 'contado' : null,
          fecha_pago: estaPagada ? new Date().toISOString() : null,
          customer_id: payload.customer.customer_id,
          evento_id: eventoId,
          comision_ml_porcentaje: comisionMLPorcentaje,
          comision_ml_monto: comisionMLMonto.toFixed(2),
          cuenta_bancaria_ml_id: cuentaBancariaMLId,
          origen_marketplace: true,
          ...payload.metadata,
        },
      })
      .select()
      .single();

    if (facturaError) {
      return { success: false, error: `Error creando factura: ${facturaError.message}` };
    }

    console.log('✅ [Order] Factura creada:', factura.id);

    try {
      await generarAsientoContable(supabase, factura, empresa.pais_id);
    } catch (error) {
      console.warn('⚠️ [Order] Error generando asiento contable:', error);
    }

    const comisionesCreadas = [];

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];

      // Los precios de Dogcatify vienen CON IVA INCLUIDO
      const itemTotalConIva = (item.total || 0) / divisor;
      const itemTaxRate = item.tax_rate || 0.22;

      // Calcular base imponible (precio sin IVA)
      const itemSubtotalSinIva = itemTotalConIva / (1 + itemTaxRate);
      const itemTaxAmount = itemTotalConIva - itemSubtotalSinIva;

      // Precio unitario sin IVA
      const itemUnitPrice = itemSubtotalSinIva / item.quantity;

      // Calcular descuento: puede venir como monto o como porcentaje
      let itemDescuento = 0;
      let itemDescuentoPorcentaje = 0;

      if (item.discount && item.discount > 0) {
        // Si viene descuento como monto
        itemDescuento = item.discount / divisor;
        itemDescuentoPorcentaje = itemSubtotalSinIva > 0 ? (itemDescuento / itemSubtotalSinIva) * 100 : 0;
      } else if (item.discount_percentage && item.discount_percentage > 0) {
        // Si viene descuento como porcentaje
        itemDescuentoPorcentaje = item.discount_percentage;
        itemDescuento = itemSubtotalSinIva * (itemDescuentoPorcentaje / 100);
      }

      const itemTotal = itemTotalConIva;

      const { error: itemError } = await supabase
        .from('facturas_venta_items')
        .insert({
          factura_id: factura.id,
          numero_linea: i + 1,
          codigo: item.sku || item.item_id || `ITEM-${i + 1}`,
          descripcion: item.description || item.name,
          cantidad: item.quantity,
          precio_unitario: itemUnitPrice.toFixed(2),
          descuento_porcentaje: itemDescuentoPorcentaje.toFixed(2),
          descuento_monto: itemDescuento.toFixed(2),
          tasa_iva: itemTaxRate.toFixed(4),
          monto_iva: itemTaxAmount.toFixed(2),
          subtotal: itemSubtotalSinIva.toFixed(2),
          total: itemTotal.toFixed(2),
          metadata: {
            item_id: item.item_id,
            sku: item.sku,
            category: item.category,
            partner_id: item.partner?.partner_id,
          },
        });

      if (itemError) {
        console.error('❌ [Order] Error creando item:', itemError);
        return { success: false, error: `Error creando item: ${itemError.message}` };
      }

      console.log(`✅ [Order] Item ${i + 1} creado`);

      if (item.partner) {
        const comisionResult = await procesarComisionPartner(
          supabase,
          payload.empresa_id,
          empresa.pais_id,
          factura.id,
          payload.order.order_id,
          item,
          item.partner,
          esEnCentavos
        );

        if (comisionResult.success) {
          comisionesCreadas.push(comisionResult.comision_id);
        } else {
          console.warn('⚠️ [Order] Error en comisión:', comisionResult.error);
        }
      }
    }

    console.log(`💰 [Order] Comisiones registradas: ${comisionesCreadas.length}`);

    // 💳 Registrar cobro del cliente si está pagada
    if (estaPagada && cuentaBancariaMLId) {
      try {
        console.log('💳 [Order] Registrando cobro de cliente en tesorería...');

        // Crear movimiento de INGRESO en MercadoLibre
        const { error: ingresoError } = await supabase
          .from('movimientos_tesoreria')
          .insert({
            empresa_id: payload.empresa_id,
            cuenta_bancaria_id: cuentaBancariaMLId,
            tipo_movimiento: 'INGRESO',
            fecha: new Date().toISOString().split('T')[0],
            monto: total.toFixed(2),
            descripcion: `Cobro orden ${payload.order.order_number || payload.order.order_id} - ${payload.customer.name}`,
            referencia: payload.order.order_id,
            beneficiario: payload.customer.name,
            categoria: 'COBRO_CLIENTE',
            asiento_contable_id: null, // Se vinculará después
            documento_origen_tipo: 'factura_venta',
            documento_origen_id: factura.id,
            metadata: {
              order_id: payload.order.order_id,
              payment_method: payload.order.payment_method,
              customer_id: payload.customer.customer_id,
              origen: 'marketplace',
              automatico: true,
            },
          });

        if (ingresoError) {
          console.error('⚠️ [Order] Error registrando ingreso:', ingresoError);
        } else {
          console.log('✅ [Order] Ingreso registrado en MercadoLibre');
        }

        // Registrar comisión de MercadoLibre como EGRESO
        if (comisionMLMonto > 0) {
          const { error: egresoError } = await supabase
            .from('movimientos_tesoreria')
            .insert({
              empresa_id: payload.empresa_id,
              cuenta_bancaria_id: cuentaBancariaMLId,
              tipo_movimiento: 'EGRESO',
              fecha: new Date().toISOString().split('T')[0],
              monto: comisionMLMonto.toFixed(2),
              descripcion: `Comisión MercadoLibre ${comisionMLPorcentaje}% - Orden ${payload.order.order_number || payload.order.order_id}`,
              referencia: payload.order.order_id,
              beneficiario: 'MercadoLibre',
              categoria: 'COMISION_MARKETPLACE',
              asiento_contable_id: null,
              documento_origen_tipo: 'factura_venta',
              documento_origen_id: factura.id,
              metadata: {
                order_id: payload.order.order_id,
                comision_porcentaje: comisionMLPorcentaje,
                total_venta: total.toFixed(2),
                origen: 'marketplace',
                automatico: true,
              },
            });

          if (egresoError) {
            console.error('⚠️ [Order] Error registrando comisión ML:', egresoError);
          } else {
            console.log(`✅ [Order] Comisión ML registrada: $${comisionMLMonto.toFixed(2)}`);
          }
        }

        // Actualizar saldo de cuenta bancaria
        const saldoDisponible = total - comisionMLMonto;
        console.log(`💰 [Order] Saldo disponible después de comisión ML: $${saldoDisponible.toFixed(2)}`);

      } catch (tesoreriaError) {
        console.error('⚠️ [Order] Error en tesorería (no crítico):', tesoreriaError);
      }
    }

    // 🚀 Envío automático a DGI
    try {
      console.log('🚀 [Order] Iniciando envío automático a DGI para factura:', factura.id);

      // Verificar si la empresa tiene auto-send habilitado
      const { data: autoSendConfig } = await supabase
        .from('empresas_auto_send_dgi')
        .select('auto_send_enabled')
        .eq('empresa_id', payload.empresa_id)
        .maybeSingle();

      if (autoSendConfig?.auto_send_enabled) {
        console.log('✅ [Order] Auto-send habilitado, enviando a DGI...');

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const autoSendUrl = `${supabaseUrl}/functions/v1/auto-send-dgi`;

        // Llamada asíncrona para no bloquear la respuesta
        fetch(autoSendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ facturaId: factura.id }),
        }).then(async (response) => {
          if (response.ok) {
            const result = await response.json();
            console.log('✅ [Order] Factura enviada a DGI exitosamente:', result);
          } else {
            const errorText = await response.text();
            console.error('⚠️ [Order] Error al enviar a DGI (no crítico):', errorText);
          }
        }).catch((error) => {
          console.error('⚠️ [Order] Error en llamada a auto-send-dgi (no crítico):', error.message);
        });

        console.log('🔄 [Order] Envío a DGI iniciado en background');
      } else {
        console.log('ℹ️ [Order] Auto-send DGI deshabilitado para esta empresa');
      }
    } catch (autoSendError) {
      console.error('⚠️ [Order] Error verificando auto-send (no crítico):', autoSendError);
    }

    return {
      success: true,
      factura_id: factura.id,
      numero_factura: factura.numero_factura,
      serie: factura.serie,
      cliente_id: clienteId,
      order_id: payload.order.order_id,
      order_number: payload.order.order_number || payload.order.order_id,
      comisiones_registradas: comisionesCreadas.length,
      comision_ids: comisionesCreadas,
    };
  } catch (error) {
    console.error('❌ [Order] Error:', error);
    return { success: false, error: error.message };
  }
}

async function procesarComisionPartner(
  supabase: any,
  empresaId: string,
  paisId: string,
  facturaId: string,
  orderId: string,
  item: any,
  partnerData: any,
  esEnCentavos: boolean = false
) {
  try {
    console.log('🤝 [Comision] Procesando partner:', partnerData.partner_id);

    let partnerId;
    const { data: partnerExistente } = await supabase
      .from('partners_aliados')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('partner_id_externo', partnerData.partner_id)
      .maybeSingle();

    if (partnerExistente) {
      partnerId = partnerExistente.id;
      console.log('🤝 [Comision] Partner existente:', partnerId);
    } else {
      const { data: nuevoPartner, error: partnerError } = await supabase
        .from('partners_aliados')
        .insert({
          empresa_id: empresaId,
          partner_id_externo: partnerData.partner_id,
          razon_social: partnerData.name,
          documento: partnerData.document_number || '',
          tipo_documento: partnerData.document_type || 'RUT',
          email: partnerData.email,
          telefono: partnerData.phone,
          activo: true,
          comision_porcentaje_default: partnerData.commission_percentage || partnerData.commission_default || 15,
          facturacion_frecuencia: partnerData.billing_frequency || 'quincenal',
          dia_facturacion: partnerData.billing_day || 15,
        })
        .select()
        .single();

      if (partnerError) {
        return { success: false, error: `Error creando partner: ${partnerError.message}` };
      }
      partnerId = nuevoPartner.id;
      console.log('✅ [Comision] Partner creado:', partnerId);
    }

    const divisor = esEnCentavos ? 100 : 1;
    const itemSubtotal = (item.subtotal || (item.quantity * item.unit_price)) / divisor;
    const comisionPorcentaje = partnerData.commission_percentage || partnerData.commission_default || 15;
    const comisionMonto = itemSubtotal * (comisionPorcentaje / 100);

    console.log(`💰 [Comision] Subtotal: ${itemSubtotal.toFixed(2)}, Porcentaje: ${comisionPorcentaje}%, Monto: ${comisionMonto.toFixed(2)}`);

    const { data: comision, error: comisionError } = await supabase
      .from('comisiones_partners')
      .insert({
        empresa_id: empresaId,
        partner_id: partnerId,
        factura_venta_id: facturaId,
        order_id: orderId,
        item_codigo: item.sku || item.item_id,
        fecha: new Date().toISOString().split('T')[0],
        subtotal_venta: itemSubtotal.toFixed(2),
        comision_porcentaje: comisionPorcentaje,
        comision_monto: comisionMonto.toFixed(2),
        estado_comision: 'pendiente',
        estado_pago: 'pendiente',
        descripcion: item.description || item.name,
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

async function generarAsientoContable(supabase: any, factura: any, paisId: string) {
  try {
    console.log('📝 [Asiento] Generando para factura:', factura.numero_factura);

    await supabase
      .from('facturas_venta')
      .update({ asiento_intentos: (factura.asiento_intentos || 0) + 1 })
      .eq('id', factura.id);

    const { data: cliente } = await supabase
      .from('clientes')
      .select('razon_social')
      .eq('id', factura.cliente_id)
      .maybeSingle();

    const clienteNombre = cliente?.razon_social || 'Cliente';
    const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';
    const numeroAsiento = await generarNumeroAsiento(supabase, factura.empresa_id);
    const cuentaCobrarId = await obtenerCuentaIdAsiento(supabase, factura.empresa_id, '1212');
    const cuentaVentasId = await obtenerCuentaIdAsiento(supabase, factura.empresa_id, '7011');
    const cuentaIvaId = await obtenerCuentaIdAsiento(supabase, factura.empresa_id, '2113');

    if (!cuentaCobrarId || !cuentaVentasId || !cuentaIvaId) {
      const cuentasFaltantes = [];
      if (!cuentaCobrarId) cuentasFaltantes.push('1212 (Cuentas por Cobrar)');
      if (!cuentaVentasId) cuentasFaltantes.push('7011 (Ventas)');
      if (!cuentaIvaId) cuentasFaltantes.push('2113 (IVA por Pagar)');

      const errorMsg = `Faltan cuentas en el plan de cuentas: ${cuentasFaltantes.join(', ')}`;
      console.error('❌ [Asiento]', errorMsg);

      await supabase
        .from('facturas_venta')
        .update({
          asiento_generado: false,
          asiento_error: errorMsg
        })
        .eq('id', factura.id);

      return;
    }

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        empresa_id: factura.empresa_id,
        pais_id: paisId,
        numero: numeroAsiento,
        fecha: factura.fecha_emision,
        descripcion: `Factura de Venta ${factura.numero_factura} - ${clienteNombre}`,
        referencia: `FACT-${factura.numero_factura}`,
        estado: 'confirmado',
        creado_por: SISTEMA_USER_ID,
        documento_soporte: {
          tipo: 'factura_venta',
          id: factura.id,
          numero: factura.numero_factura,
        },
      })
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientos = [
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaCobrarId,
        cuenta: '1212 - Cuentas por Cobrar - Comerciales',
        debito: parseFloat(factura.total),
        credito: 0,
        descripcion: `Factura ${factura.numero_factura} - ${clienteNombre}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaVentasId,
        cuenta: '7011 - Ventas',
        debito: 0,
        credito: parseFloat(factura.subtotal),
        descripcion: `Factura ${factura.numero_factura} - ${clienteNombre}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaIvaId,
        cuenta: '2113 - IVA por Pagar',
        debito: 0,
        credito: parseFloat(factura.total_iva),
        descripcion: `IVA Factura ${factura.numero_factura}`,
      },
    ];

    const { error: movError } = await supabase
      .from('movimientos_contables')
      .insert(movimientos);

    if (movError) {
      await supabase.from('asientos_contables').delete().eq('id', asiento.id);
      throw movError;
    }

    await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: true,
        asiento_contable_id: asiento.id,
        asiento_error: null
      })
      .eq('id', factura.id);

    console.log('✅ [Asiento] Generado exitosamente:', numeroAsiento);
  } catch (error) {
    console.error('❌ [Asiento] Error:', error);

    const errorMsg = error.message || JSON.stringify(error);
    await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: false,
        asiento_error: errorMsg.substring(0, 500)
      })
      .eq('id', factura.id);
  }
}

async function generarNumeroAsiento(supabase: any, empresaId: string): Promise<string> {
  const { data: ultimoAsiento } = await supabase
    .from('asientos_contables')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimoAsiento) return 'ASI-00001';

  const match = ultimoAsiento.numero.match(/ASI-(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `ASI-${String(num + 1).padStart(5, '0')}`;
  }

  return `ASI-${Date.now().toString().slice(-5)}`;
}

async function obtenerCuentaIdAsiento(supabase: any, empresaId: string, codigo: string): Promise<string | null> {
  const { data: cuenta } = await supabase
    .from('plan_cuentas')
    .select('id, nombre')
    .eq('empresa_id', empresaId)
    .eq('codigo', codigo)
    .maybeSingle();

  if (!cuenta) {
    console.warn(`⚠️ [Asiento] No se encontró cuenta con código ${codigo} para empresa ${empresaId}`);
    return null;
  }

  return cuenta.id;
}
