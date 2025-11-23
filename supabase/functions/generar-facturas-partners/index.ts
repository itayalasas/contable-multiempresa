import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    console.log('Iniciando generacion de facturas a partners...');

    const { empresaId, forzar } = await req.json().catch(() => ({ empresaId: null, forzar: false }));

    if (!empresaId) {
      throw new Error('empresaId es requerido');
    }

    const resultado = await procesarEmpresa(supabase, empresaId, forzar);

    return new Response(
      JSON.stringify({
        success: true,
        facturas_generadas: resultado.facturas_generadas,
        comisiones_procesadas: resultado.comisiones_procesadas,
        errores: resultado.errores,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function procesarEmpresa(supabase: any, empresaId: string, forzar: boolean = false) {
  try {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', empresaId)
      .maybeSingle();

    if (!empresa?.pais_id) {
      throw new Error('La empresa no tiene un pais_id configurado');
    }

    const { data: ivaBasico } = await supabase
      .from('impuestos_configuracion')
      .select('tasa, id')
      .eq('pais_id', empresa.pais_id)
      .eq('tipo', 'IVA')
      .eq('codigo', 'IVA_BASICO')
      .eq('activo', true)
      .maybeSingle();

    const tasaIVA = ivaBasico?.tasa ? parseFloat(ivaBasico.tasa) / 100 : 0.22;
    console.log('Tasa IVA configurada para comisiones:', (tasaIVA * 100) + '%');

    const { data: partners, error: partnersError } = await supabase
      .from('partners_aliados')
      .select('id, partner_id_externo, razon_social, documento, email')
      .eq('empresa_id', empresaId)
      .eq('activo', true);

    if (partnersError) throw partnersError;

    console.log('Partners activos:', partners?.length || 0);

    let facturasGeneradas = 0;
    let comisionesProcesadas = 0;
    const errores = [];

    for (const partner of partners || []) {
      try {
        console.log('Procesando partner:', partner.razon_social);

        const { data: comisiones, error: comisionesError } = await supabase
          .from('comisiones_partners')
          .select('*')
          .eq('partner_id', partner.id)
          .eq('estado_comision', 'pendiente')
          .order('fecha', { ascending: true });

        if (comisionesError) throw comisionesError;

        if (!comisiones || comisiones.length === 0) {
          console.log(partner.razon_social, ': Sin comisiones pendientes');
          continue;
        }

        const totalComisiones = comisiones.reduce((sum, c) => sum + parseFloat(c.comision_monto), 0);
        const fechaInicio = comisiones[0].fecha;
        const fechaFin = comisiones[comisiones.length - 1].fecha;

        const montoIVA = totalComisiones * tasaIVA;
        const totalConIVA = totalComisiones + montoIVA;

        console.log('Total comisiones:', totalComisiones.toFixed(2), '+ IVA (' + (tasaIVA * 100) + '%):', montoIVA.toFixed(2), '= Total:', totalConIVA.toFixed(2));

        const { data: partnerCompleto } = await supabase
          .from('partners_aliados')
          .select('*')
          .eq('id', partner.id)
          .single();

        if (!partnerCompleto) throw new Error('Partner no encontrado');

        let clienteId;
        const { data: clienteExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('numero_documento', partnerCompleto.documento)
          .maybeSingle();

        const { data: tipoDoc } = await supabase
          .from('tipo_documento_identidad')
          .select('id')
          .eq('codigo', partnerCompleto.tipo_documento || 'RUT')
          .maybeSingle();

        if (clienteExistente) {
          clienteId = clienteExistente.id;

          const { error: updateError } = await supabase
            .from('clientes')
            .update({
              razon_social: partnerCompleto.razon_social,
              tipo_documento_id: tipoDoc?.id,
              numero_documento: partnerCompleto.documento,
              email: partnerCompleto.email,
              telefono: partnerCompleto.telefono,
              direccion: partnerCompleto.direccion,
            })
            .eq('id', clienteId);

          if (updateError) {
            console.error('Error actualizando cliente desde partner:', updateError);
          } else {
            console.log('Cliente actualizado con datos del partner:', partnerCompleto.razon_social);
          }
        } else {
          const { data: nuevoCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert({
              empresa_id: empresaId,
              pais_id: empresa.pais_id,
              razon_social: partnerCompleto.razon_social,
              tipo_documento_id: tipoDoc?.id,
              numero_documento: partnerCompleto.documento,
              email: partnerCompleto.email,
              telefono: partnerCompleto.telefono,
              direccion: partnerCompleto.direccion,
              activo: true,
            })
            .select()
            .single();

          if (clienteError) throw clienteError;
          clienteId = nuevoCliente.id;
          console.log('Nuevo cliente creado desde partner:', partnerCompleto.razon_social);
        }

        const { data: ultimaFacturaComision } = await supabase
          .from('facturas_venta')
          .select('numero_factura')
          .eq('empresa_id', empresaId)
          .eq('serie', 'COM')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let siguienteNumero;
        if (ultimaFacturaComision) {
          const ultimoNum = parseInt(ultimaFacturaComision.numero_factura);
          siguienteNumero = String(ultimoNum + 1).padStart(8, '0');
        } else {
          siguienteNumero = '00000001';
        }

        const fechaEmision = new Date().toISOString().split('T')[0];
        const fechaVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: factura, error: facturaError } = await supabase
          .from('facturas_venta')
          .insert({
            empresa_id: empresaId,
            cliente_id: clienteId,
            numero_factura: siguienteNumero,
            serie: 'COM',
            tipo_documento: 'e-factura',
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            estado: 'pendiente',
            dgi_enviada: false,
            subtotal: totalComisiones,
            total_iva: montoIVA,
            descuento: 0,
            total: totalConIVA,
            moneda: 'UYU',
            tipo_cambio: 1,
            observaciones: 'Comisiones periodo ' + fechaInicio + ' a ' + fechaFin,
            metadata: {
              tipo: 'factura_comisiones_partner',
              partner_id: partner.id,
              partner_id_externo: partnerCompleto.partner_id_externo,
              partner_razon_social: partnerCompleto.razon_social,
              tasa_iva_aplicada: tasaIVA,
            },
          })
          .select()
          .single();

        if (facturaError) throw facturaError;

        const itemsFactura = [{
          factura_id: factura.id,
          numero_linea: 1,
          codigo: 'COMISION',
          descripcion: 'Comisiones por ventas - ' + partner.razon_social + ' (' + fechaInicio + ' a ' + fechaFin + ')',
          cantidad: comisiones.length,
          precio_unitario: totalComisiones / comisiones.length,
          descuento_porcentaje: 0,
          descuento_monto: 0,
          tasa_iva: tasaIVA,
          monto_iva: montoIVA,
          subtotal: totalComisiones,
          total: totalConIVA,
        }];

        const { error: itemsError } = await supabase
          .from('facturas_venta_items')
          .insert(itemsFactura);

        if (itemsError) throw itemsError;

        const comisionIds = comisiones.map((c) => c.id);
        const { error: updateComisionesError } = await supabase
          .from('comisiones_partners')
          .update({
            estado_comision: 'facturada',
            fecha_facturada: new Date().toISOString(),
            factura_venta_comision_id: factura.id,
          })
          .in('id', comisionIds);

        if (updateComisionesError) throw updateComisionesError;

        try {
          const { error: asientoError } = await supabase.functions.invoke('generar-asiento-factura', {
            body: {
              type: 'INSERT',
              record: {
                table: 'facturas_venta',
                ...factura,
              },
            },
          });

          if (asientoError) {
            console.error('Error generando asiento para factura', factura.numero_factura, asientoError);
          } else {
            console.log('Asiento contable generado para factura', factura.numero_factura);
          }
        } catch (asientoErr: any) {
          console.error('Error al invocar generacion de asiento:', asientoErr.message);
        }

        console.log('Factura', factura.numero_factura, 'creada: Subtotal:', totalComisiones.toFixed(2), '+ IVA:', montoIVA.toFixed(2), '= Total:', totalConIVA.toFixed(2));

        facturasGeneradas++;
        comisionesProcesadas += comisiones.length;
      } catch (error: any) {
        console.error('Error procesando', partner.razon_social, error.message);
        errores.push({ partner: partner.razon_social, error: error.message });
      }
    }

    return {
      facturas_generadas: facturasGeneradas,
      comisiones_procesadas: comisionesProcesadas,
      errores: errores.length > 0 ? errores : undefined
    };
  } catch (error: any) {
    return { facturas_generadas: 0, comisiones_procesadas: 0, error: error.message };
  }
}