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
 * El cliente paga $5000 (incluye IVA de compra)
 * De ese total se descuenta:
 *   - Comisión de la app (15%): $750
 *   - Comisión MP del aliado (50% de 7% = 3.5%): $175
 *
 * Lo que recibe el aliado:
 *   $5000 - $750 - $175 = $4075 (SIN IVA ADICIONAL)
 *
 * Ejemplo:
 *   Venta: $1000
 *   Comisión App (15%): $150
 *   Comisión MP aliado (3.5%): $35
 *   Total aliado: $1000 - $150 - $35 = $815
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

    // Usar SERVICE_ROLE_KEY sin pasar Authorization header para bypass RLS
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

    // Primero verificar cuántas comisiones hay en total
    const { data: todasComisiones, error: errorTodas } = await supabase
      .from('comisiones_partners')
      .select('id, estado_comision, estado_pago, factura_venta_comision_id, factura_compra_id', { count: 'exact' })
      .eq('empresa_id', empresaId);

    console.log('📊 Diagnóstico comisiones totales:', {
      total: todasComisiones?.length || 0,
      error: errorTodas?.message,
      estados: todasComisiones?.reduce((acc: any, c: any) => {
        const key = `${c.estado_comision}-${c.estado_pago}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    });

    console.log('🔍 Buscando comisiones con criterios:');
    console.log('  - empresa_id:', empresaId);
    console.log('  - estado_comision: facturada');
    console.log('  - factura_venta_id: NOT NULL (comisión en factura de venta)');
    console.log('  - factura_compra_id: NULL (sin cuenta por pagar generada)');
    if (partnerId) console.log('  - partner_id:', partnerId);

    let query = supabase
      .from('comisiones_partners')
      .select(`
        *,
        partner:partners_aliados!inner(*)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado_comision', 'facturada')
      .not('factura_venta_id', 'is', null) // Tiene factura de venta asociada
      .is('factura_compra_id', null) // No tiene factura de compra generada
      .neq('estado_pago', 'auto_cobrada'); // Excluir comisiones de marketplace/MP (ya cobradas automáticamente)

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data: comisiones, error: comisionesError } = await query;

    console.log('📊 Resultado query comisiones:', {
      encontradas: comisiones?.length || 0,
      error: comisionesError?.message,
      sample: comisiones?.[0] ? {
        id: comisiones[0].id,
        estado_comision: comisiones[0].estado_comision,
        estado_pago: comisiones[0].estado_pago,
        tiene_factura_venta: !!comisiones[0].factura_venta_id,
        tiene_factura_compra: !!comisiones[0].factura_compra_id
      } : null
    });

    if (comisionesError) {
      console.error('❌ Error en query comisiones:', comisionesError);
      throw comisionesError;
    }

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

        // IMPORTANTE: subtotal_venta viene SIN IVA (base imponible)
        const totalVentasSinIVA = comisionesPartner.reduce((sum, c) => sum + parseFloat(c.subtotal_venta), 0);

        // Las comisiones guardadas incluyen IVA, pero necesitamos separarlas
        const totalComisionAppConIVA = comisionesPartner.reduce((sum, c) => sum + parseFloat(c.comision_monto), 0);
        const totalComisionAppSinIVA = totalComisionAppConIVA / (1 + tasaIVA);

        // Comisión MP se calcula sobre el subtotal sin IVA
        const comisionMPTotal = totalVentasSinIVA * tasaMP;
        const comisionMPAliado = comisionMPTotal * (divisionMPAliado / 100);
        const comisionMPApp = comisionMPTotal - comisionMPAliado;

        // Comisión App neta (restando la parte de MP que absorbe la app)
        const comisionAppNetaSinIVA = totalComisionAppSinIVA - comisionMPApp;

        // Lo que recibe el partner = Ventas sin IVA - Comisiones sin IVA
        const subtotalAPagar = totalVentasSinIVA - comisionAppNetaSinIVA - comisionMPAliado;

        // Agregar IVA al total a pagar
        const ivaComisiones = subtotalAPagar * tasaIVA;
        const totalAPagar = subtotalAPagar + ivaComisiones;

        console.log(`💰 Cálculos:`);
        console.log(`   Total ventas base (sin IVA): $${totalVentasSinIVA.toFixed(2)}`);
        console.log(`   - Comisión App (sin IVA): $${totalComisionAppSinIVA.toFixed(2)}`);
        console.log(`   - Comisión MP total: $${comisionMPTotal.toFixed(2)}`);
        console.log(`     · Parte App (${100 - divisionMPAliado}%): $${comisionMPApp.toFixed(2)} (se resta de comisión app)`);
        console.log(`     · Parte Aliado (${divisionMPAliado}%): $${comisionMPAliado.toFixed(2)}`);
        console.log(`   - Comisión App NETA (sin IVA): $${comisionAppNetaSinIVA.toFixed(2)}`);
        console.log(`   = SUBTOTAL A PAGAR: $${subtotalAPagar.toFixed(2)}`);
        console.log(`   + IVA (${(tasaIVA * 100).toFixed(0)}%): $${ivaComisiones.toFixed(2)}`);
        console.log(`   = TOTAL A PAGAR AL ALIADO: $${totalAPagar.toFixed(2)}`);

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
        if (ultimaFactura && ultimaFactura.numero_factura) {
          // Solo parsear si el número de factura es un número válido
          const numeroStr = String(ultimaFactura.numero_factura).trim();
          if (/^\d+$/.test(numeroStr)) {
            const ultimoNum = parseInt(numeroStr);
            siguienteNumero = String(ultimoNum + 1).padStart(8, '0');
          } else {
            // Si no es un número válido, empezar desde 1
            siguienteNumero = '00000001';
          }
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
            subtotal: subtotalAPagar,
            total_iva: ivaComisiones,
            total: totalAPagar,
            moneda: 'UYU',
            tipo_cambio: 1,
            retencion_porcentaje: 0,
            retencion_monto: comisionMPAliado,
            comision_sistema_porcentaje: (comisionAppNetaSinIVA / totalVentasSinIVA) * 100,
            comision_sistema_monto: comisionAppNetaSinIVA,
            monto_transferir_partner: totalAPagar,
            observaciones: `Pago por servicios - ${comisionesPartner.length} órdenes`,
            metadata: {
              tipo: 'factura_compra_partner',
              partner_id: pid,
              partner_razon_social: partner.razon_social,
              comisiones_ids: comisionesPartner.map((c) => c.id),
              cantidad_ordenes: comisionesPartner.length,
              calculo: {
                total_ventas_sin_iva: totalVentasSinIVA,
                comision_app_con_iva: totalComisionAppConIVA,
                comision_app_sin_iva: totalComisionAppSinIVA,
                comision_mp_total: comisionMPTotal,
                comision_mp_app: comisionMPApp,
                comision_mp_aliado: comisionMPAliado,
                comision_app_neta: comisionAppNetaSinIVA,
                subtotal: subtotalAPagar,
                iva: ivaComisiones,
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
            descripcion: `Comisiones por ventas - ${partner.razon_social} (${comisionesPartner.length} órdenes)`,
            cantidad: comisionesPartner.length,
            precio_unitario: subtotalAPagar / comisionesPartner.length,
            descuento_porcentaje: 0,
            descuento_monto: 0,
            tasa_iva: tasaIVA * 100,
            monto_iva: ivaComisiones,
            subtotal: subtotalAPagar,
            total: totalAPagar,
            metadata: {
              comision_mp_descontada: comisionMPAliado,
              comision_app_descontada: comisionAppNetaSinIVA,
              comision_app_sin_iva: totalComisionAppSinIVA,
              comision_mp_app: comisionMPApp,
              total_ventas_sin_iva: totalVentasSinIVA,
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
            descripcion: `Comisiones por ventas - ${partner.razon_social}`,
            monto_subtotal: subtotalAPagar,
            monto_impuestos: ivaComisiones,
            monto_total: totalAPagar,
            monto_pagado: 0,
            saldo_pendiente: totalAPagar,
            estado: 'PENDIENTE',
            moneda: 'UYU',
            observaciones: `Factura de compra: ${facturaCompra.serie}-${facturaCompra.numero_factura}`,
            referencia: facturaCompra.id,
            creado_por: null,
          })
          .select()
          .single();

        if (cuentaError) throw cuentaError;

        console.log(`✅ Cuenta por pagar creada: ${cuentaPorPagar.numero}`);

        // Obtener números de orden legibles desde las facturas de venta
        const facturaIds = [...new Set(comisionesPartner.map(c => c.factura_venta_id))];
        const { data: facturasVenta } = await supabase
          .from('facturas_venta')
          .select('id, metadata')
          .in('id', facturaIds);

        const orderNumbersMap = new Map();
        facturasVenta?.forEach(fv => {
          if (fv.metadata?.order_number) {
            orderNumbersMap.set(fv.id, fv.metadata.order_number);
          }
        });

        const itemsCuentaPorPagar = [];

        comisionesPartner.forEach((comision, index) => {
          const subtotalVenta = parseFloat(comision.subtotal_venta);
          const orderNumber = orderNumbersMap.get(comision.factura_venta_id) || comision.order_id?.substring(0, 8) || 'N/A';

          itemsCuentaPorPagar.push({
            factura_id: cuentaPorPagar.id,
            descripcion: `Venta orden #${orderNumber}`,
            cantidad: 1,
            precio_unitario: subtotalVenta,
            descuento: 0,
            impuesto: 0,
            total: subtotalVenta,
          });
        });

        const porcentajeComisionReal = (totalComisionAppSinIVA / totalVentasSinIVA) * 100;
        const comisionMPPorcentaje = (comisionMPAliado / totalVentasSinIVA) * 100;

        itemsCuentaPorPagar.push({
          factura_id: cuentaPorPagar.id,
          descripcion: `Comisión aplicación (${porcentajeComisionReal.toFixed(2)}%)`,
          cantidad: 1,
          precio_unitario: -totalComisionAppSinIVA,
          descuento: 0,
          impuesto: 0,
          total: -totalComisionAppSinIVA,
        });

        itemsCuentaPorPagar.push({
          factura_id: cuentaPorPagar.id,
          descripcion: `Comisión MercadoPago - Parte aliado (${comisionMPPorcentaje.toFixed(2)}% = ${divisionMPAliado}% de ${(tasaMP * 100).toFixed(2)}%)`,
          cantidad: 1,
          precio_unitario: -comisionMPAliado,
          descuento: 0,
          impuesto: 0,
          total: -comisionMPAliado,
        });

        const { error: itemsCuentaError } = await supabase
          .from('items_factura_pagar')
          .insert(itemsCuentaPorPagar);

        if (itemsCuentaError) throw itemsCuentaError;

        console.log(`✅ ${itemsCuentaPorPagar.length} item(s) agregados a la cuenta por pagar:`);
        console.log(`   - ${comisionesPartner.length} ventas individuales`);
        console.log(`   - Comisión app: -$${totalComisionAppSinIVA.toFixed(2)}`);
        console.log(`   - Comisión MP aliado: -$${comisionMPAliado.toFixed(2)}`);

        const comisionIds = comisionesPartner.map((c) => c.id);
        const { error: updateError } = await supabase
          .from('comisiones_partners')
          .update({
            factura_compra_id: facturaCompra.id,
            estado_pago: 'pendiente',
          })
          .in('id', comisionIds);

        if (updateError) throw updateError;

        // Actualizar el estado de la factura de comisión (factura de venta de comisiones)
        // de "pendiente" a "validada" ya que ya se generó la factura de compra al partner
        const facturasComisionIds = comisionesPartner
          .map((c) => c.factura_venta_comision_id)
          .filter((id) => id != null);

        if (facturasComisionIds.length > 0) {
          const { error: updateFacturaError } = await supabase
            .from('facturas_venta')
            .update({ estado: 'validada' })
            .in('id', facturasComisionIds)
            .eq('estado', 'pendiente');

          if (updateFacturaError) {
            console.warn('⚠️ Error actualizando estado de facturas de comisión:', updateFacturaError.message);
          } else {
            console.log(`✅ ${facturasComisionIds.length} factura(s) de comisión actualizadas a estado "validada"`);
          }
        }

        console.log('📝 Generando asiento contable para factura de compra...');

        try {
          await generarAsientoContableFacturaCompra(
            supabase,
            empresaId,
            empresa.pais_id,
            facturaCompra,
            partner,
            totalAPagarSinIVA,
            ivaComisiones,
            totalAPagar
          );
          console.log('✅ Asiento contable generado exitosamente');
        } catch (asientoError: any) {
          console.error('⚠️ Error generando asiento contable:', asientoError.message);
        }

        facturasGeneradas++;
        cuentasPorPagarGeneradas++;
        comisionesProcesadas += comisionesPartner.length;

      } catch (error: any) {
        console.error(`❌ Error procesando partner ${pid}:`, error.message);
        console.error(`❌ Error completo:`, error);
        const partner = comisionesPartner[0]?.partner;
        errores.push({
          partner_id: pid,
          partner: partner?.razon_social || 'Desconocido',
          error: error.message,
          details: error.details || error.hint || null,
        });
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
      errores: [{ error: error.message }],
    };
  }
}

async function crearActualizarProveedor(supabase: any, empresaId: string, partner: any, paisId: string) {
  const { data: proveedorExistente } = await supabase
    .from('proveedores')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('numero_documento', partner.partner_id_externo)
    .maybeSingle();

  if (proveedorExistente) {
    return proveedorExistente.id;
  }

  const { data: nuevoProveedor, error } = await supabase
    .from('proveedores')
    .insert({
      empresa_id: empresaId,
      pais_id: paisId,
      razon_social: partner.razon_social,
      nombre_comercial: partner.razon_social,
      numero_documento: partner.partner_id_externo,
      email: partner.email || null,
      telefono: partner.telefono || null,
      activo: true,
      metadata: {
        tipo: 'proveedor_partner',
        partner_id: partner.id,
      },
    })
    .select('id')
    .single();

  if (error) throw error;

  return nuevoProveedor.id;
}

async function generarAsientoContableFacturaCompra(
  supabase: any,
  empresaId: string,
  paisId: string,
  facturaCompra: any,
  partner: any,
  subtotal: number,
  iva: number,
  total: number
) {
  try {
    console.log('📝 [Asiento] Generando para factura compra:', facturaCompra.numero_factura);

    const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';
    const numeroAsiento = await generarNumeroAsiento(supabase, empresaId);

    const cuentaGastoPartnersId = await obtenerCuentaId(supabase, empresaId, '612001');
    const cuentaIvaId = await obtenerCuentaId(supabase, empresaId, '2113');
    const cuentaPorPagarId = await obtenerCuentaId(supabase, empresaId, '213002');

    if (!cuentaGastoPartnersId || !cuentaIvaId || !cuentaPorPagarId) {
      const cuentasFaltantes = [];
      if (!cuentaGastoPartnersId) cuentasFaltantes.push('612001 (Comisiones a Partners)');
      if (!cuentaIvaId) cuentasFaltantes.push('2113 (IVA por Pagar)');
      if (!cuentaPorPagarId) cuentasFaltantes.push('213002 (Cuentas por Pagar - Partners)');

      const errorMsg = `Faltan cuentas en el plan de cuentas: ${cuentasFaltantes.join(', ')}`;
      console.error('❌ [Asiento]', errorMsg);

      await supabase
        .from('facturas_compra')
        .update({
          asiento_generado: false,
          asiento_error: errorMsg
        })
        .eq('id', facturaCompra.id);

      return;
    }

    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        empresa_id: empresaId,
        pais_id: paisId,
        numero: numeroAsiento,
        fecha: facturaCompra.fecha_emision,
        descripcion: `Factura Compra ${facturaCompra.serie}-${facturaCompra.numero_factura} - ${partner.razon_social}`,
        referencia: `FCOMP-${facturaCompra.numero_factura}`,
        estado: 'confirmado',
        creado_por: SISTEMA_USER_ID,
        documento_soporte: {
          tipo: 'factura_compra',
          id: facturaCompra.id,
          numero: facturaCompra.numero_factura,
          serie: facturaCompra.serie,
        },
      })
      .select()
      .single();

    if (asientoError) throw asientoError;

    const movimientos = [
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaGastoPartnersId,
        cuenta: '612001 - Comisiones a Partners',
        debito: parseFloat(subtotal.toFixed(2)),
        credito: 0,
        descripcion: `Servicios ${partner.razon_social}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaIvaId,
        cuenta: '2113 - IVA Compras',
        debito: parseFloat(iva.toFixed(2)),
        credito: 0,
        descripcion: `IVA Factura ${facturaCompra.serie}-${facturaCompra.numero_factura}`,
      },
      {
        asiento_id: asiento.id,
        cuenta_id: cuentaPorPagarId,
        cuenta: '213002 - Cuentas por Pagar - Partners',
        debito: 0,
        credito: parseFloat(total.toFixed(2)),
        descripcion: `Factura ${facturaCompra.serie}-${facturaCompra.numero_factura} - ${partner.razon_social}`,
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
      .from('facturas_compra')
      .update({
        asiento_generado: true,
        asiento_contable_id: asiento.id,
        asiento_error: null
      })
      .eq('id', facturaCompra.id);

    console.log('✅ [Asiento] Generado exitosamente:', numeroAsiento);
  } catch (error: any) {
    console.error('❌ [Asiento] Error:', error);

    const errorMsg = error.message || JSON.stringify(error);
    await supabase
      .from('facturas_compra')
      .update({
        asiento_generado: false,
        asiento_error: errorMsg.substring(0, 500)
      })
      .eq('id', facturaCompra.id);

    throw error;
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

async function obtenerCuentaId(supabase: any, empresaId: string, codigo: string): Promise<string | null> {
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