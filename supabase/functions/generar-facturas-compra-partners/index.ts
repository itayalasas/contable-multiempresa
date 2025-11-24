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
 * LÓGICA CORRECTA DEL MARKETPLACE:
 *
 * La aplicación cobra TODO al cliente (subtotal_venta)
 * De ese total:
 *   - Se queda la comisión de la app (comision_monto - ya calculado)
 *   - Se descuenta la parte de comisión MP que le toca al aliado (50%)
 *   - El resto se le paga al aliado + IVA
 *
 * Ejemplo:
 *   Venta: $1000
 *   Comisión App (15%): $150 (ya en comisiones_partners.comision_monto)
 *   Comisión MP total (7%): $70
 *     - Parte App (50%): $35
 *     - Parte Aliado (50%): $35
 *
 *   Cálculo pago aliado:
 *   Subtotal: $1000 - $150 - $35 = $815
 *   IVA (22%): $815 * 0.22 = $179.30
 *   Total: $994.30
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

    console.log('📦 Iniciando generación de cuentas por pagar a partners...');

    const body = await req.json().catch(() => ({}));
    const { empresaId, partnerId } = body;

    if (!empresaId) {
      throw new Error('empresaId es requerido');
    }

    const resultado = await procesarCuentasPorPagar(supabase, empresaId, partnerId);

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

async function procesarCuentasPorPagar(supabase: any, empresaId: string, partnerId?: string) {
  try {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', empresaId)
      .maybeSingle();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    const { data: ivaConfig } = await supabase
      .from('impuestos_configuracion')
      .select('tasa')
      .eq('pais_id', empresa.pais_id)
      .eq('tipo', 'IVA')
      .eq('codigo', 'IVA_BASICO')
      .eq('activo', true)
      .maybeSingle();

    const tasaIVA = ivaConfig?.tasa ? parseFloat(ivaConfig.tasa) / 100 : 0.22;
    console.log(`⚙️ Tasa IVA: ${(tasaIVA * 100).toFixed(2)}%`);

    const { data: mpConfig } = await supabase
      .from('impuestos_configuracion')
      .select('tasa, configuracion')
      .eq('pais_id', empresa.pais_id)
      .eq('codigo', 'COMISION_MERCADOPAGO')
      .eq('activo', true)
      .maybeSingle();

    const tasaMP = mpConfig?.tasa ? parseFloat(mpConfig.tasa) / 100 : 0.07;
    const divisionMPAliado = mpConfig?.configuracion?.division_porcentaje_aliado || 50.0;

    console.log(`⚙️ Comisión MP: ${(tasaMP * 100).toFixed(2)}%`);
    console.log(`⚙️ División MP Aliado: ${divisionMPAliado}%`);

    let query = supabase
      .from('comisiones_partners')
      .select(`
        *,
        partner:partners_aliados!inner(*)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_comision', 'facturada')
      .not('factura_venta_comision_id', 'is', null)
      .is('factura_compra_id', null);

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data: comisiones, error: comisionesError } = await query;

    if (comisionesError) throw comisionesError;

    if (!comisiones || comisiones.length === 0) {
      console.log('✅ No hay comisiones facturadas pendientes de generar cuenta por pagar');
      return { facturas_generadas: 0, cuentas_por_pagar: 0, comisiones_procesadas: 0, errores: [] };
    }

    console.log(`📋 Encontradas ${comisiones.length} comisiones facturadas`);

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

    for (const [pid, comisionesPartner] of comisionesPorPartner) {
      try {
        const partner = comisionesPartner[0].partner;
        console.log(`\n👤 Procesando partner: ${partner.razon_social}`);

        const totalVentas = comisionesPartner.reduce((sum, c) => sum + parseFloat(c.subtotal_venta), 0);
        const totalComisionApp = comisionesPartner.reduce((sum, c) => sum + parseFloat(c.comision_monto), 0);
        const comisionMPTotal = totalVentas * tasaMP;
        const comisionMPAliado = comisionMPTotal * (divisionMPAliado / 100);
        const comisionMPApp = comisionMPTotal - comisionMPAliado;
        const subtotalAliado = totalVentas - totalComisionApp - comisionMPAliado;
        const ivaAliado = subtotalAliado * tasaIVA;
        const totalAPagar = subtotalAliado + ivaAliado;

        console.log(`💰 Cálculos:`);
        console.log(`   Total ventas cobradas: $${totalVentas.toFixed(2)}`);
        console.log(`   - Comisión App: $${totalComisionApp.toFixed(2)}`);
        console.log(`   - Comisión MP total: $${comisionMPTotal.toFixed(2)}`);
        console.log(`     · Parte App (${100 - divisionMPAliado}%): $${comisionMPApp.toFixed(2)}`);
        console.log(`     · Parte Aliado (${divisionMPAliado}%): $${comisionMPAliado.toFixed(2)}`);
        console.log(`   = Subtotal aliado: $${subtotalAliado.toFixed(2)}`);
        console.log(`   + IVA (${(tasaIVA * 100).toFixed(0)}%): $${ivaAliado.toFixed(2)}`);
        console.log(`   = TOTAL A PAGAR: $${totalAPagar.toFixed(2)}`);

        const proveedorId = await crearActualizarProveedor(supabase, empresaId, partner, empresa.pais_id);

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
            subtotal: subtotalAliado,
            total_iva: ivaAliado,
            total: totalAPagar,
            moneda: 'UYU',
            tipo_cambio: 1,
            retencion_porcentaje: 0,
            retencion_monto: comisionMPAliado,
            comision_sistema_porcentaje: (totalComisionApp / totalVentas) * 100,
            comision_sistema_monto: totalComisionApp,
            monto_transferir_partner: totalAPagar,
            observaciones: `Pago por servicios - ${comisionesPartner.length} órdenes`,
            metadata: {
              tipo: 'factura_compra_partner',
              partner_id: pid,
              partner_razon_social: partner.razon_social,
              comisiones_ids: comisionesPartner.map((c) => c.id),
              cantidad_ordenes: comisionesPartner.length,
              calculo: {
                total_ventas: totalVentas,
                comision_app: totalComisionApp,
                comision_mp_total: comisionMPTotal,
                comision_mp_app: comisionMPApp,
                comision_mp_aliado: comisionMPAliado,
                subtotal_aliado: subtotalAliado,
                iva: ivaAliado,
                total: totalAPagar
              }
            },
          })
          .select()
          .single();

        if (facturaError) throw facturaError;

        console.log(`✅ Factura de compra creada: ${facturaCompra.serie}-${facturaCompra.numero_factura}`);

        const { error: itemsError } = await supabase
          .from('facturas_compra_items')
          .insert({
            factura_id: facturaCompra.id,
            numero_linea: 1,
            descripcion: `Pago por servicios - ${partner.razon_social} (${comisionesPartner.length} órdenes)`,
            cantidad: comisionesPartner.length,
            precio_unitario: subtotalAliado / comisionesPartner.length,
            descuento_porcentaje: 0,
            descuento_monto: 0,
            tasa_iva: tasaIVA,
            monto_iva: ivaAliado,
            subtotal: subtotalAliado,
            total: totalAPagar,
            metadata: {
              comision_mp_descontada: comisionMPAliado,
              comision_app_descontada: totalComisionApp,
              total_ventas_base: totalVentas,
            },
          });

        if (itemsError) throw itemsError;

        const { data: cuentaPorPagar, error: cuentaError } = await supabase
          .from('facturas_por_pagar')
          .insert({
            empresa_id: empresaId,
            proveedor_id: proveedorId,
            numero: `PART-${siguienteNumero}`,
            tipo_documento: 'FACTURA_PARTNER',
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            descripcion: `Pago servicios ${partner.razon_social}`,
            monto_subtotal: subtotalAliado,
            monto_impuestos: ivaAliado,
            monto_total: totalAPagar,
            monto_pagado: 0,
            saldo_pendiente: totalAPagar,
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

        const comisionIds = comisionesPartner.map((c) => c.id);
        const { error: updateError } = await supabase
          .from('comisiones_partners')
          .update({
            factura_compra_id: facturaCompra.id,
            estado_pago: 'pendiente',
          })
          .in('id', comisionIds);

        if (updateError) throw updateError;

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
  const { data: proveedorExistente } = await supabase
    .from('proveedores')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('numero_documento', partner.documento)
    .maybeSingle();

  if (proveedorExistente) {
    await supabase
      .from('proveedores')
      .update({
        nombre_comercial: partner.nombre_comercial || partner.razon_social,
        razon_social: partner.razon_social,
        email: partner.email,
        telefono: partner.telefono,
        direccion: partner.direccion,
        activo: true,
      })
      .eq('id', proveedorExistente.id);

    return proveedorExistente.id;
  }

  const { data: nuevoProveedor, error } = await supabase
    .from('proveedores')
    .insert({
      empresa_id: empresaId,
      pais_id: paisId,
      nombre_comercial: partner.nombre_comercial || partner.razon_social,
      razon_social: partner.razon_social,
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
