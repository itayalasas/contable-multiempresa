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

    // Validar webhook secret (opcional)
    const providedSecret = req.headers.get('X-Webhook-Secret');
    if (providedSecret && providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SimpleWebhookPayload = await req.json();

    console.log('🔔 [Webhook] Recibido:', payload.event, payload.order.order_id);

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
        JSON.stringify({ error: 'Error al registrar evento', details: eventoError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Procesar el evento
    const result = await handleOrder(supabase, payload, evento.id);

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

    // 1. Verificar si la orden ya fue procesada
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

    // 2. Obtener empresa y país
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, pais_id')
      .eq('id', payload.empresa_id)
      .maybeSingle();

    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    // 3. Buscar o crear cliente
    let clienteId;
    
    // Buscar por documento si existe
    if (payload.customer.document_number) {
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', payload.empresa_id)
        .eq('numero_documento', payload.customer.document_number)
        .maybeSingle();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
        console.log('👤 [Order] Cliente existente:', clienteId);
      }
    }

    // Si no existe, crear nuevo cliente
    if (!clienteId) {
      const clienteData: any = {
        empresa_id: payload.empresa_id,
        pais_id: empresa.pais_id,
        razon_social: payload.customer.name,
        email: payload.customer.email,
        telefono: payload.customer.phone,
        activo: true,
      };

      // Agregar documento solo si existe
      if (payload.customer.document_number) {
        clienteData.numero_documento = payload.customer.document_number;
      }
      if (payload.customer.document_type) {
        // Buscar tipo_documento_id
        const { data: tipoDoc } = await supabase
          .from('tipos_documento')
          .select('id')
          .eq('pais_id', empresa.pais_id)
          .ilike('nombre', payload.customer.document_type)
          .maybeSingle();
        
        if (tipoDoc) {
          clienteData.tipo_documento_id = tipoDoc.id;
        }
      }

      // Agregar dirección si existe
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

    // 4. Obtener siguiente número de factura (serie A por defecto)
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

    // 5. Calcular totales (convertir de centavos a unidades si es necesario)
    const esEnCentavos = payload.order.total > 1000;
    const divisor = esEnCentavos ? 100 : 1;

    const subtotal = (payload.order.subtotal || 0) / divisor;
    const descuento = (payload.order.discount || 0) / divisor;
    const impuestos = (payload.order.tax || 0) / divisor;
    const total = (payload.order.total || 0) / divisor;

    // 6. Crear factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_venta')
      .insert({
        empresa_id: payload.empresa_id,
        cliente_id: clienteId,
        numero_factura: siguienteNumero,
        serie: serie,
        tipo_documento: 'e-ticket',
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: payload.order.payment_status === 'paid' ? 'pagada' : 'pendiente',
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
          customer_id: payload.customer.customer_id,
          evento_id: eventoId,
          ...payload.metadata,
        },
      })
      .select()
      .single();

    if (facturaError) {
      return { success: false, error: `Error creando factura: ${facturaError.message}` };
    }

    console.log('✅ [Order] Factura creada:', factura.id);

    // 7. Generar asiento contable
    try {
      await generarAsientoContable(supabase, factura, empresa.pais_id);
    } catch (error) {
      console.warn('⚠️ [Order] Error generando asiento contable:', error);
    }

    // 8. Crear items de factura
    const comisionesCreadas = [];

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];

      // Calcular valores (convertir de centavos si es necesario)
      const itemUnitPrice = (item.unit_price || 0) / divisor;
      const itemSubtotal = item.subtotal ? item.subtotal / divisor : (item.quantity * itemUnitPrice);
      const itemDescuento = (item.discount || 0) / divisor;
      const itemTaxRate = item.tax_rate || 0.22; // Guardar como decimal 0.22 (22%)
      const itemTaxAmount = item.tax_amount ? item.tax_amount / divisor : (itemSubtotal - itemDescuento) * itemTaxRate;
      const itemTotal = (item.total || 0) / divisor;

      // Crear item de factura
      const { error: itemError } = await supabase
        .from('facturas_venta_items')
        .insert({
          factura_id: factura.id,
          numero_linea: i + 1,
          codigo: item.sku || item.item_id || `ITEM-${i + 1}`,
          descripcion: item.description || item.name,
          cantidad: item.quantity,
          precio_unitario: itemUnitPrice.toFixed(2),
          descuento_porcentaje: itemDescuento > 0 ? ((itemDescuento / itemSubtotal) * 100).toFixed(2) : 0,
          descuento_monto: itemDescuento.toFixed(2),
          tasa_iva: itemTaxRate.toFixed(4),
          monto_iva: itemTaxAmount.toFixed(2),
          subtotal: itemSubtotal.toFixed(2),
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

      // Si tiene partner, procesar comisión
      if (item.partner) {
        const comisionResult = await procesarComisionPartner(
          supabase,
          payload.empresa_id,
          empresa.pais_id,
          factura.id,
          payload.order.order_id,
          item,
          item.partner
        );

        if (comisionResult.success) {
          comisionesCreadas.push(comisionResult.comision_id);
        } else {
          console.warn('⚠️ [Order] Error en comisión:', comisionResult.error);
        }
      }
    }

    console.log(`💰 [Order] Comisiones registradas: ${comisionesCreadas.length}`);

    return {
      success: true,
      factura_id: factura.id,
      numero_factura: factura.numero_factura,
      cliente_id: clienteId,
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
  partnerData: any
) {
  try {
    console.log('🤝 [Comision] Procesando partner:', partnerData.partner_id);

    // 1. Buscar o crear partner
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
      // Crear nuevo partner
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

    // 2. Calcular comisión (ya debe venir en unidades correctas desde handleOrder)
    const esEnCentavos = item.total > 1000;
    const divisor = esEnCentavos ? 100 : 1;
    const itemSubtotal = (item.subtotal || (item.quantity * item.unit_price)) / divisor;
    const comisionPorcentaje = partnerData.commission_percentage || partnerData.commission_default || 15;
    const comisionMonto = itemSubtotal * (comisionPorcentaje / 100);

    // 3. Registrar comisión
    const { data: comision, error: comisionError } = await supabase
      .from('comisiones_partners')
      .insert({
        empresa_id: empresaId,
        partner_id: partnerId,
        factura_venta_id: facturaId,
        order_id: orderId,
        item_codigo: item.sku || item.item_id,
        fecha: new Date().toISOString().split('T')[0],
        subtotal_venta: itemSubtotal,
        comision_porcentaje: comisionPorcentaje,
        comision_monto: comisionMonto,
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

    // Incrementar contador de intentos
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

    // Usar el usuario Sistema para operaciones automáticas
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

      // Guardar error en la factura
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

    // Marcar como exitoso
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

    // Guardar el error en la factura
    const errorMsg = error.message || JSON.stringify(error);
    await supabase
      .from('facturas_venta')
      .update({
        asiento_generado: false,
        asiento_error: errorMsg.substring(0, 500) // Limitar tamaño
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
