import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Edge Function: generar-facturas-compra-partners
 *
 * Convierte las comisiones facturadas de partners en facturas de compra y cuentas por pagar.
 *
 * Flujo:
 * 1. Obtiene comisiones con estado 'facturada' (tienen factura_venta_comision_id)
 * 2. Agrupa por partner
 * 3. Calcula: Total venta - Retención ML - Comisión Sistema = Monto a transferir
 * 4. Crea proveedor si no existe (desde partner)
 * 5. Crea factura de compra con los montos calculados
 * 6. Crea cuenta por pagar
 * 7. Actualiza comisiones a estado 'pendiente_pago'
 * 8. Genera asiento contable
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📦 Iniciando generación de facturas de compra a partners...');

    const body = await req.json().catch(() => ({}));
    const { empresaId, partnerId } = body;

    if (!empresaId) {
      throw new Error('empresaId es requerido');
    }

    const resultado = await procesarFacturasCompra(supabase, empresaId, partnerId);

    return new Response(
      JSON.stringify({
        success: true,
        facturas_compra_generadas: resultado.facturas_generadas,
        cuentas_por_pagar_generadas: resultado.cuentas_por_pagar,
        comisiones_procesadas: resultado.comisiones_procesadas,
        errores: resultado.errores,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function procesarFacturasCompra(supabase: any, empresaId: string, partnerId?: string) {
  try {
    // Obtener configuración de retenciones y comisiones desde metadata de empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('metadata, pais_id')
      .eq('id', empresaId)
      .maybeSingle();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Configuración por defecto o desde metadata
    const retencionML = empresa.metadata?.retencion_mercadolibre || 7.0; // 7% retención ML
    const comisionSistema = empresa.metadata?.comision_sistema || 15.0; // 15% comisión sistema

    console.log(`⚙️ Config: Retención ML: ${retencionML}%, Comisión Sistema: ${comisionSistema}%`);

    // Query base para comisiones facturadas
    let query = supabase
      .from('comisiones_partners')
      .select(`
        *,
        partner:partners_aliados!inner(*)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_comision', 'facturada')
      .not('factura_venta_comision_id', 'is', null);

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data: comisiones, error: comisionesError } = await query;

    if (comisionesError) throw comisionesError;

    if (!comisiones || comisiones.length === 0) {
      console.log('✅ No hay comisiones facturadas pendientes de generar factura de compra');
      return { facturas_generadas: 0, cuentas_por_pagar: 0, comisiones_procesadas: 0, errores: [] };
    }

    console.log(`📋 Encontradas ${comisiones.length} comisiones facturadas`);

    // Agrupar por partner
    const comisionesPorPartner = new Map<string, any[]>();
    comisiones.forEach((comision: any) => {
      const pid = comision.partner_id;
      if (!comisionesPorPartner.has(pid)) {
        comisionesPorPartner.set(pid, []);
      }
      comisionesPorPartner.get(pid)!.push(comision);
    });

    let facturasGeneradas = 0;
    let cuentasPorPagarGeneradas = 0;
    let comisionesProcesadas = 0;
    const errores: any[] = [];

    // Procesar cada partner
    for (const [pid, comisionesPartner] of comisionesPorPartner) {
      try {
        const partner = comisionesPartner[0].partner;
        console.log(`\n👤 Procesando partner: ${partner.razon_social}`);

        // Calcular totales
        // Total comisión (lo que facturamos al cliente)
        const totalComision = comisionesPartner.reduce((sum, c) => sum + parseFloat(c.comision_monto), 0);

        // Retención ML (se deduce del total)
        const montoRetencionML = totalComision * (retencionML / 100);

        // Comisión del sistema (se deduce del total)
        const montoComisionSistema = totalComision * (comisionSistema / 100);

        // Lo que realmente transferimos al partner
        const montoTransferir = totalComision - montoRetencionML - montoComisionSistema;

        console.log(`💰 Totales:`);
        console.log(`   Total comisión facturada: $${totalComision.toFixed(2)}`);
        console.log(`   - Retención ML (${retencionML}%): $${montoRetencionML.toFixed(2)}`);
        console.log(`   - Comisión Sistema (${comisionSistema}%): $${montoComisionSistema.toFixed(2)}`);
        console.log(`   = A transferir al partner: $${montoTransferir.toFixed(2)}`);

        // 1. Crear o actualizar proveedor desde partner
        const proveedorId = await crearActualizarProveedor(supabase, empresaId, partner, empresa.pais_id);

        // 2. Generar número de factura de compra
        const { data: ultimaFactura } = await supabase
          .from('facturas_compra')
          .select('numero_factura')
          .eq('empresa_id', empresaId)
          .eq('serie', 'PART')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let siguienteNumero: string;
        if (ultimaFactura) {
          const ultimoNum = parseInt(ultimaFactura.numero_factura);
          siguienteNumero = String(ultimoNum + 1).padStart(8, '0');
        } else {
          siguienteNumero = '00000001';
        }

        const fechaEmision = new Date().toISOString().split('T')[0];
        const fechaVencimiento = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 3. Crear factura de compra
        const { data: facturaCompra, error: facturaError } = await supabase
          .from('facturas_compra')
          .insert({
            empresa_id: empresaId,
            proveedor_id: proveedorId,
            partner_id: pid,
            numero_factura: siguienteNumero,
            serie: 'PART',
            tipo_documento: 'factura',
            tipo_factura_compra: 'partner_pago',
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            estado: 'pendiente',
            subtotal: totalComision,
            total_iva: 0, // Sin IVA en facturas a partners
            total: montoTransferir, // El total es lo que realmente pagaremos
            moneda: 'UYU',
            tipo_cambio: 1,
            retencion_porcentaje: retencionML,
            retencion_monto: montoRetencionML,
            comision_sistema_porcentaje: comisionSistema,
            comision_sistema_monto: montoComisionSistema,
            monto_transferir_partner: montoTransferir,
            observaciones: `Pago de comisiones - ${comisionesPartner.length} órdenes`,
            metadata: {
              tipo: 'factura_compra_partner',
              partner_id: pid,
              partner_razon_social: partner.razon_social,
              comisiones_ids: comisionesPartner.map((c) => c.id),
              cantidad_ordenes: comisionesPartner.length,
            },
          })
          .select()
          .single();

        if (facturaError) throw facturaError;

        console.log(`✅ Factura de compra creada: ${facturaCompra.serie}-${facturaCompra.numero_factura}`);

        // 4. Crear items de factura
        const { error: itemsError } = await supabase
          .from('facturas_compra_items')
          .insert({
            factura_id: facturaCompra.id,
            numero_linea: 1,
            descripcion: `Pago de comisiones - ${partner.razon_social} (${comisionesPartner.length} órdenes)`,
            cantidad: comisionesPartner.length,
            precio_unitario: montoTransferir / comisionesPartner.length,
            descuento_porcentaje: 0,
            descuento_monto: 0,
            tasa_iva: 0,
            monto_iva: 0,
            subtotal: montoTransferir,
            total: montoTransferir,
            metadata: {
              retencion_ml: montoRetencionML,
              comision_sistema: montoComisionSistema,
              total_comision_bruta: totalComision,
            },
          });

        if (itemsError) throw itemsError;

        // 5. Crear cuenta por pagar
        const { data: cuentaPorPagar, error: cuentaError } = await supabase
          .from('facturas_por_pagar')
          .insert({
            empresa_id: empresaId,
            proveedor_id: proveedorId,
            numero: `PART-${siguienteNumero}`,
            tipo_documento: 'FACTURA_PARTNER',
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            descripcion: `Pago comisiones ${partner.razon_social}`,
            monto_subtotal: montoTransferir,
            monto_impuestos: 0,
            monto_total: montoTransferir,
            monto_pagado: 0,
            saldo_pendiente: montoTransferir,
            estado: 'PENDIENTE',
            moneda: 'UYU',
            observaciones: `Factura de compra: ${facturaCompra.serie}-${facturaCompra.numero_factura}`,
            referencia: facturaCompra.id,
            creado_por: 'system',
          })
          .select()
          .single();

        if (cuentaError) throw cuentaError;

        console.log(`✅ Cuenta por pagar creada: ${cuentaPorPagar.numero}`);

        // 6. Actualizar comisiones
        const comisionIds = comisionesPartner.map((c) => c.id);
        const { error: updateError } = await supabase
          .from('comisiones_partners')
          .update({
            factura_compra_id: facturaCompra.id,
            estado_pago: 'pendiente', // Ahora está pendiente de pago
          })
          .in('id', comisionIds);

        if (updateError) throw updateError;

        // 7. Generar asiento contable
        try {
          await supabase.functions.invoke('generar-asiento-factura-compra', {
            body: {
              facturaCompraId: facturaCompra.id,
            },
          });
          console.log('✅ Asiento contable generado');
        } catch (asientoErr: any) {
          console.error('⚠️ Error generando asiento:', asientoErr.message);
        }

        facturasGeneradas++;
        cuentasPorPagarGeneradas++;
        comisionesProcesadas += comisionesPartner.length;

      } catch (error: any) {
        console.error(`❌ Error procesando partner ${pid}:`, error.message);
        errores.push({ partner_id: pid, error: error.message });
      }
    }

    console.log(`\n✅ Proceso completado:`);
    console.log(`   Facturas de compra: ${facturasGeneradas}`);
    console.log(`   Cuentas por pagar: ${cuentasPorPagarGeneradas}`);
    console.log(`   Comisiones procesadas: ${comisionesProcesadas}`);

    return {
      facturas_generadas: facturasGeneradas,
      cuentas_por_pagar: cuentasPorPagarGeneradas,
      comisiones_procesadas: comisionesProcesadas,
      errores: errores.length > 0 ? errores : undefined,
    };
  } catch (error: any) {
    console.error('❌ Error general:', error);
    return {
      facturas_generadas: 0,
      cuentas_por_pagar: 0,
      comisiones_procesadas: 0,
      error: error.message,
    };
  }
}

async function crearActualizarProveedor(supabase: any, empresaId: string, partner: any, paisId: string) {
  // Buscar proveedor existente
  const { data: proveedorExistente } = await supabase
    .from('proveedores')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('numero_documento', partner.documento)
    .maybeSingle();

  if (proveedorExistente) {
    // Actualizar datos del proveedor
    await supabase
      .from('proveedores')
      .update({
        nombre: partner.nombre_comercial || partner.razon_social,
        razon_social: partner.razon_social,
        tipo_documento: partner.tipo_documento || 'RUT',
        email: partner.email,
        telefono: partner.telefono,
        direccion: partner.direccion,
        activo: true,
      })
      .eq('id', proveedorExistente.id);

    return proveedorExistente.id;
  }

  // Crear nuevo proveedor
  const { data: nuevoProveedor, error } = await supabase
    .from('proveedores')
    .insert({
      empresa_id: empresaId,
      nombre: partner.nombre_comercial || partner.razon_social,
      razon_social: partner.razon_social,
      tipo_documento: partner.tipo_documento || 'RUT',
      numero_documento: partner.documento,
      email: partner.email,
      telefono: partner.telefono,
      direccion: partner.direccion,
      activo: true,
      observaciones: `Proveedor creado automáticamente desde partner: ${partner.partner_id_externo}`,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`✅ Proveedor creado: ${nuevoProveedor.razon_social}`);
  return nuevoProveedor.id;
}
