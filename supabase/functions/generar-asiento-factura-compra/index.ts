import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Edge Function: generar-asiento-factura-compra
 *
 * Genera asientos contables para facturas de compra, especialmente para partners.
 *
 * Para facturas de compra a partners (tipo_factura_compra = 'partner_pago'):
 *
 * DEBE (Gasto/Costo):
 * - Cuenta por Pagar a Partners (2212): Total comisión
 *
 * HABER (Acreditar):
 * - Ingreso Comisiones Sistema (7031): Comisión del sistema
 * - Ingreso Retención ML (7032): Retención Mercado Libre
 * - Cuentas por Pagar - Proveedores (2211): Monto a transferir al partner
 *
 * Este asiento refleja que:
 * 1. Reconocemos el total de la comisión como gasto
 * 2. Registramos las comisiones e impuestos retenidos como ingresos
 * 3. Quedamos debiendo solo el neto al partner
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { facturaCompraId } = await req.json();

    if (!facturaCompraId) {
      throw new Error('facturaCompraId es requerido');
    }

    console.log('📝 Generando asiento para factura de compra:', facturaCompraId);

    const { data: factura, error: facturaError } = await supabase
      .from('facturas_compra')
      .select('*')
      .eq('id', facturaCompraId)
      .single();

    if (facturaError || !factura) {
      throw new Error(`Factura de compra no encontrada: ${facturaError?.message}`);
    }

    // Verificar si ya tiene asiento
    if (factura.asiento_contable_id) {
      console.log('⚠️ La factura ya tiene un asiento contable asociado');

      // Si se solicita regenerar, eliminar el asiento anterior
      await supabase
        .from('asientos_contables')
        .delete()
        .eq('id', factura.asiento_contable_id);

      console.log('🗑️ Asiento anterior eliminado');
    }

    // Verificar período contable
    const { data: periodo } = await supabase
      .from('periodos_contables')
      .select('id, nombre, estado')
      .eq('empresa_id', factura.empresa_id)
      .lte('fecha_inicio', factura.fecha_emision)
      .gte('fecha_fin', factura.fecha_emision)
      .maybeSingle();

    if (periodo && periodo.estado === 'cerrado') {
      throw new Error(`El período contable ${periodo.nombre} está cerrado`);
    }

    // Obtener proveedor
    const { data: proveedor } = await supabase
      .from('proveedores')
      .select('razon_social')
      .eq('id', factura.proveedor_id)
      .maybeSingle();

    const proveedorNombre = proveedor?.razon_social || 'Proveedor';

    // Generar asiento según tipo de factura
    if (factura.tipo_factura_compra === 'partner_pago') {
      await generarAsientoPartner(supabase, factura, proveedorNombre, periodo?.id);
    } else {
      await generarAsientoNormal(supabase, factura, proveedorNombre, periodo?.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Asiento generado exitosamente' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generarAsientoPartner(supabase: any, factura: any, proveedorNombre: string, periodoId?: string) {
  console.log('💼 Generando asiento para factura de compra a partner');

  // Obtener cuentas necesarias
  const cuentaGastoComisionId = await obtenerCuentaId(supabase, factura.empresa_id, '6011'); // Gasto comisiones
  const cuentaIngresoComisionId = await obtenerCuentaId(supabase, factura.empresa_id, '7031'); // Ingreso comisiones sistema
  const cuentaIngresoRetencionId = await obtenerCuentaId(supabase, factura.empresa_id, '7032'); // Ingreso retención ML
  const cuentaPagarId = await obtenerCuentaId(supabase, factura.empresa_id, '2211'); // Cuentas por pagar

  if (!cuentaGastoComisionId || !cuentaIngresoComisionId || !cuentaIngresoRetencionId || !cuentaPagarId) {
    const faltantes = [];
    if (!cuentaGastoComisionId) faltantes.push('6011 (Gasto Comisiones Partners)');
    if (!cuentaIngresoComisionId) faltantes.push('7031 (Ingreso Comisiones Sistema)');
    if (!cuentaIngresoRetencionId) faltantes.push('7032 (Ingreso Retención ML)');
    if (!cuentaPagarId) faltantes.push('2211 (Cuentas por Pagar)');
    throw new Error(`Faltan cuentas: ${faltantes.join(', ')}`);
  }

  const totalComision = parseFloat(factura.subtotal);
  const retencion = parseFloat(factura.retencion_monto) || 0;
  const comisionSistema = parseFloat(factura.comision_sistema_monto) || 0;
  const montoTransferir = parseFloat(factura.monto_transferir_partner) || parseFloat(factura.total);

  console.log('💰 Montos:');
  console.log(`   Total comisión (DEBE): $${totalComision.toFixed(2)}`);
  console.log(`   Ingreso comisión sistema (HABER): $${comisionSistema.toFixed(2)}`);
  console.log(`   Ingreso retención ML (HABER): $${retencion.toFixed(2)}`);
  console.log(`   A pagar al partner (HABER): $${montoTransferir.toFixed(2)}`);

  // Generar número de asiento
  const numeroAsiento = await generarNumeroAsiento(supabase, factura.empresa_id);

  // Crear asiento
  const { data: asiento, error: asientoError } = await supabase
    .from('asientos_contables')
    .insert({
      empresa_id: factura.empresa_id,
      numero_asiento: numeroAsiento,
      fecha: factura.fecha_emision,
      tipo_asiento: 'COMPRA',
      descripcion: `Factura compra ${factura.serie}-${factura.numero_factura} - ${proveedorNombre}`,
      referencia: `FC-${factura.serie}-${factura.numero_factura}`,
      estado: 'APROBADO',
      periodo_contable_id: periodoId,
      metadata: {
        tipo: 'factura_compra_partner',
        factura_compra_id: factura.id,
        partner_id: factura.partner_id,
      },
    })
    .select()
    .single();

  if (asientoError) throw asientoError;

  // Crear detalle del asiento
  const detalles = [
    // DEBE: Gasto por comisiones (reconocemos el gasto total)
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaGastoComisionId,
      tipo_movimiento: 'DEBE',
      monto: totalComision,
      descripcion: `Gasto comisiones ${proveedorNombre}`,
    },
    // HABER: Ingreso comisión del sistema (lo que nos quedamos)
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaIngresoComisionId,
      tipo_movimiento: 'HABER',
      monto: comisionSistema,
      descripcion: 'Comisión del sistema',
    },
    // HABER: Ingreso retención ML (lo que retiene ML)
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaIngresoRetencionId,
      tipo_movimiento: 'HABER',
      monto: retencion,
      descripcion: 'Retención Mercado Libre',
    },
    // HABER: Cuenta por pagar (lo que debemos al partner)
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaPagarId,
      tipo_movimiento: 'HABER',
      monto: montoTransferir,
      descripcion: `Por pagar a ${proveedorNombre}`,
    },
  ];

  const { error: detalleError } = await supabase
    .from('asientos_contables_detalle')
    .insert(detalles);

  if (detalleError) throw detalleError;

  // Actualizar factura con referencia al asiento
  await supabase
    .from('facturas_compra')
    .update({
      asiento_contable_id: asiento.id,
      asiento_generado: true,
      asiento_error: null,
    })
    .eq('id', factura.id);

  console.log(`✅ Asiento ${numeroAsiento} generado para factura de compra a partner`);
}

async function generarAsientoNormal(supabase: any, factura: any, proveedorNombre: string, periodoId?: string) {
  console.log('📄 Generando asiento para factura de compra normal');

  // Asiento estándar de compra:
  // DEBE: Gasto/Compra
  // HABER: Cuenta por Pagar

  const cuentaGastoId = await obtenerCuentaId(supabase, factura.empresa_id, '6001'); // Gastos generales
  const cuentaPagarId = await obtenerCuentaId(supabase, factura.empresa_id, '2211'); // Cuentas por pagar

  if (!cuentaGastoId || !cuentaPagarId) {
    const faltantes = [];
    if (!cuentaGastoId) faltantes.push('6001 (Gastos)');
    if (!cuentaPagarId) faltantes.push('2211 (Cuentas por Pagar)');
    throw new Error(`Faltan cuentas: ${faltantes.join(', ')}`);
  }

  const total = parseFloat(factura.total);
  const numeroAsiento = await generarNumeroAsiento(supabase, factura.empresa_id);

  const { data: asiento, error: asientoError } = await supabase
    .from('asientos_contables')
    .insert({
      empresa_id: factura.empresa_id,
      numero_asiento: numeroAsiento,
      fecha: factura.fecha_emision,
      tipo_asiento: 'COMPRA',
      descripcion: `Factura compra ${factura.serie}-${factura.numero_factura} - ${proveedorNombre}`,
      referencia: `FC-${factura.serie}-${factura.numero_factura}`,
      estado: 'APROBADO',
      periodo_contable_id: periodoId,
      metadata: {
        tipo: 'factura_compra_normal',
        factura_compra_id: factura.id,
      },
    })
    .select()
    .single();

  if (asientoError) throw asientoError;

  const detalles = [
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaGastoId,
      tipo_movimiento: 'DEBE',
      monto: total,
      descripcion: `Compra ${proveedorNombre}`,
    },
    {
      asiento_id: asiento.id,
      cuenta_id: cuentaPagarId,
      tipo_movimiento: 'HABER',
      monto: total,
      descripcion: `Por pagar a ${proveedorNombre}`,
    },
  ];

  const { error: detalleError } = await supabase
    .from('asientos_contables_detalle')
    .insert(detalles);

  if (detalleError) throw detalleError;

  await supabase
    .from('facturas_compra')
    .update({
      asiento_contable_id: asiento.id,
      asiento_generado: true,
      asiento_error: null,
    })
    .eq('id', factura.id);

  console.log(`✅ Asiento ${numeroAsiento} generado para factura de compra normal`);
}

async function generarNumeroAsiento(supabase: any, empresaId: string): Promise<string> {
  const anio = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');

  const { data, error } = await supabase
    .from('asientos_contables')
    .select('numero_asiento')
    .eq('empresa_id', empresaId)
    .order('numero_asiento', { ascending: false })
    .limit(1);

  if (error) throw error;

  let siguienteNumero = 1;
  if (data && data.length > 0) {
    const ultimoNumero = parseInt(data[0].numero_asiento.split('-').pop() || '0');
    siguienteNumero = ultimoNumero + 1;
  }

  return `${anio}-${mes}-${String(siguienteNumero).padStart(4, '0')}`;
}

async function obtenerCuentaId(supabase: any, empresaId: string, codigo: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('plan_cuentas')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) {
    console.error(`Error obteniendo cuenta ${codigo}:`, error);
    return null;
  }

  return data?.id || null;
}
