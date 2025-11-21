import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Obtener el token de autorización del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Crear cliente con el token del usuario autenticado
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    console.log('📅 [Job] Iniciando generación de facturas a partners...');

    const { empresaId, forzar } = await req.json().catch(() => ({ empresaId: null, forzar: false }));

    const empresasQuery = supabase.from('empresas').select('id, razon_social, pais_id');

    if (empresaId) {
      empresasQuery.eq('id', empresaId);
    }

    const { data: empresas, error: empresasError } = await empresasQuery;

    if (empresasError) {
      throw new Error(`Error obteniendo empresas: ${empresasError.message}`);
    }

    console.log(`🏛️ [Job] Procesando ${empresas?.length || 0} empresas`);

    const resultados = [];

    for (const empresa of empresas || []) {
      console.log(`\n🔄 [Job] Procesando empresa: ${empresa.razon_social}`);
      const resultado = await procesarEmpresa(supabase, empresa.id, empresa.pais_id, forzar);
      resultados.push({ empresa_id: empresa.id, empresa: empresa.razon_social, ...resultado });
    }

    const totalFacturas = resultados.reduce((sum, r) => sum + r.facturas_generadas, 0);
    const totalComisiones = resultados.reduce((sum, r) => sum + r.comisiones_procesadas, 0);

    return new Response(
      JSON.stringify({
        success: true,
        empresas_procesadas: empresas?.length || 0,
        facturas_generadas: totalFacturas,
        comisiones_procesadas: totalComisiones,
        resultados,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [Job] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function procesarEmpresa(supabase: any, empresaId: string, paisId: string, forzar: boolean = false) {
  try {
    const { data: partners, error: partnersError } = await supabase
      .from('partners_aliados')
      .select('id, partner_id_externo, razon_social, documento, email, facturacion_frecuencia, dia_facturacion, proxima_facturacion')
      .eq('empresa_id', empresaId)
      .eq('activo', true);

    if (partnersError) throw partnersError;

    console.log(`   🤝 Partners activos: ${partners?.length || 0}`);

    let facturasGeneradas = 0;
    let comisionesProcesadas = 0;
    const errores = [];

    for (const partner of partners || []) {
      try {
        const debeFacturar = forzar || debeFacturarPartner(partner);

        if (!debeFacturar) {
          console.log(`   ⏰ ${partner.razon_social}: No es momento de facturar`);
          continue;
        }

        console.log(`   💰 Procesando: ${partner.razon_social}`);

        const { data: comisiones, error: comisionesError } = await supabase
          .from('comisiones_partners')
          .select('*')
          .eq('partner_id', partner.id)
          .eq('estado_comision', 'pendiente')
          .order('fecha', { ascending: true });

        if (comisionesError) throw comisionesError;

        if (!comisiones || comisiones.length === 0) {
          console.log(`   ⚠️ ${partner.razon_social}: Sin comisiones pendientes`);
          continue;
        }

        const totalComisiones = comisiones.reduce((sum, c) => sum + parseFloat(c.comision_monto), 0);
        const fechaInicio = comisiones[0].fecha;
        const fechaFin = comisiones[comisiones.length - 1].fecha;

        console.log(`   💵 Total: $${totalComisiones.toFixed(2)} (${comisiones.length} items)`);

        const { data: lote, error: loteError } = await supabase
          .from('lotes_facturacion_partners')
          .insert({
            empresa_id: empresaId,
            partner_id: partner.id,
            periodo_inicio: fechaInicio,
            periodo_fin: fechaFin,
            cantidad_ordenes: comisiones.length,
            total_comisiones: totalComisiones,
            estado: 'pendiente',
            fecha_generada: new Date().toISOString(),
          })
          .select()
          .single();

        if (loteError) throw loteError;

        let proveedorId;
        const { data: proveedorExistente } = await supabase
          .from('proveedores')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('numero_documento', partner.documento)
          .maybeSingle();

        if (proveedorExistente) {
          proveedorId = proveedorExistente.id;
        } else {
          const { data: nuevoProveedor, error: proveedorError } = await supabase
            .from('proveedores')
            .insert({
              empresa_id: empresaId,
              razon_social: partner.razon_social,
              tipo_documento: 'RUT',
              numero_documento: partner.documento,
              email: partner.email,
              activo: true,
            })
            .select()
            .single();

          if (proveedorError) throw proveedorError;
          proveedorId = nuevoProveedor.id;
        }

        const { data: ultimaFactura } = await supabase
          .from('facturas_compra')
          .select('numero_factura')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const siguienteNumero = ultimaFactura
          ? String(parseInt(ultimaFactura.numero_factura) + 1).padStart(8, '0')
          : 'FC-000001';

        const { data: factura, error: facturaError } = await supabase
          .from('facturas_compra')
          .insert({
            empresa_id: empresaId,
            proveedor_id: proveedorId,
            numero_factura: siguienteNumero,
            fecha_emision: new Date().toISOString().split('T')[0],
            fecha_vencimiento: calcularFechaVencimiento(30),
            estado: 'pendiente',
            subtotal: totalComisiones,
            total_iva: 0,
            total: totalComisiones,
            moneda: 'UYU',
            tipo_cambio: 1,
            observaciones: `Comisiones ${fechaInicio} a ${fechaFin}`,
          })
          .select()
          .single();

        if (facturaError) throw facturaError;

        console.log(`   ✅ Factura ${factura.numero_factura}: $${totalComisiones.toFixed(2)}`);

        await supabase.from('lotes_facturacion_partners').update({ factura_compra_id: factura.id, estado: 'facturada' }).eq('id', lote.id);

        const comisionIds = comisiones.map((c) => c.id);
        await supabase
          .from('comisiones_partners')
          .update({
            estado_comision: 'facturada',
            fecha_facturada: new Date().toISOString(),
            lote_facturacion_id: lote.id,
            factura_compra_id: factura.id,
          })
          .in('id', comisionIds);

        const proximaFecha = calcularProximaFacturacion(partner.facturacion_frecuencia);
        await supabase.from('partners_aliados').update({ proxima_facturacion: proximaFecha }).eq('id', partner.id);

        facturasGeneradas++;
        comisionesProcesadas += comisiones.length;
      } catch (error: any) {
        console.error(`   ❌ Error ${partner.razon_social}:`, error.message);
        errores.push({ partner: partner.razon_social, error: error.message });
      }
    }

    return { facturas_generadas: facturasGeneradas, comisiones_procesadas: comisionesProcesadas, errores: errores.length > 0 ? errores : undefined };
  } catch (error: any) {
    return { facturas_generadas: 0, comisiones_procesadas: 0, error: error.message };
  }
}

function debeFacturarPartner(partner: any): boolean {
  if (!partner.proxima_facturacion) return true;
  const hoy = new Date();
  const proximaFecha = new Date(partner.proxima_facturacion);
  return hoy >= proximaFecha;
}

function calcularProximaFacturacion(frecuencia: string): string {
  const hoy = new Date();
  switch (frecuencia) {
    case 'semanal': hoy.setDate(hoy.getDate() + 7); break;
    case 'quincenal': hoy.setDate(hoy.getDate() + 15); break;
    case 'mensual': hoy.setMonth(hoy.getMonth() + 1); break;
    case 'bimensual': hoy.setMonth(hoy.getMonth() + 2); break;
    default: hoy.setDate(hoy.getDate() + 15);
  }
  return hoy.toISOString().split('T')[0];
}

function calcularFechaVencimiento(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().split('T')[0];
}
