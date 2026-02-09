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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { movimientoTesoreriaId } = await req.json();

    if (!movimientoTesoreriaId) {
      throw new Error('movimientoTesoreriaId es requerido');
    }

    // Obtener movimiento de tesorería
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos_tesoreria')
      .select('*')
      .eq('id', movimientoTesoreriaId)
      .single();

    if (movError || !movimiento) {
      throw new Error(`Movimiento no encontrado: ${movError?.message}`);
    }

    // Si ya tiene asiento, retornar
    if (movimiento.asiento_contable_id) {
      return new Response(
        JSON.stringify({ success: true, message: 'Ya tiene asiento contable', asiento_id: movimiento.asiento_contable_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener país de la empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('pais_id')
      .eq('id', movimiento.empresa_id)
      .single();

    // Obtener cuenta contable del banco
    const { data: cuentaBancaria } = await supabase
      .from('cuentas_bancarias')
      .select('cuenta_contable_id')
      .eq('id', movimiento.cuenta_bancaria_id)
      .single();

    if (!cuentaBancaria?.cuenta_contable_id) {
      throw new Error('Cuenta bancaria sin cuenta contable vinculada');
    }

    // Determinar cuenta contraparte según categoría
    let codigoCuentaContraparte: string | null = null;
    let descripcion = '';

    if (movimiento.tipo_movimiento === 'TRANSFERENCIA' && movimiento.metadata?.cuenta_destino_id) {
      descripcion = `Transferencia bancaria - ${movimiento.descripcion}`;
    } else {
      switch (movimiento.categoria) {
        case 'COBRO_CLIENTE':
          codigoCuentaContraparte = '1212'; // Cuentas por Cobrar
          descripcion = `Cobro de cliente - ${movimiento.descripcion}`;
          break;
        case 'GANANCIA_MARKETPLACE':
        case 'INGRESO_OTRO':
          codigoCuentaContraparte = '751002'; // Otros ingresos diversos
          descripcion = `Ingreso - ${movimiento.descripcion}`;
          break;
        case 'COMISION_MARKETPLACE':
          codigoCuentaContraparte = '651003'; // Otros gastos diversos
          descripcion = `Comisión marketplace - ${movimiento.descripcion}`;
          break;
        case 'COMISION_PASARELA':
          // Comisión de Mercado Pago (gasto)
          codigoCuentaContraparte = '630501'; // Gastos Comisiones Mercado Pago
          descripcion = `Comisión Mercado Pago - ${movimiento.descripcion}`;
          break;
        case 'INGRESO_COMISION':
          codigoCuentaContraparte = '412001'; // Ingreso Comisión Marketplace
          descripcion = `Ingreso por comisión marketplace - ${movimiento.descripcion}`;
          break;
        case 'PAGO_PROVEEDOR':
          codigoCuentaContraparte = '213001'; // Facturas emitidas por pagar
          descripcion = `Pago a proveedor - ${movimiento.descripcion}`;
          break;
        case 'PAGO_PARTNER':
          codigoCuentaContraparte = '212001'; // Comisiones por Pagar - Partners
          descripcion = `Pago a partner - ${movimiento.descripcion}`;
          break;
        case 'PAGO_IMPUESTO':
        case 'PAGO_IVA':
        case 'PAGO_DGI':
          codigoCuentaContraparte = '2113'; // IVA por Pagar
          descripcion = `Pago de impuestos - ${movimiento.descripcion}`;
          break;
        case 'GASTO_OTRO':
          codigoCuentaContraparte = '651003'; // Otros gastos diversos
          descripcion = `Gasto - ${movimiento.descripcion}`;
          break;
        default:
          return new Response(
            JSON.stringify({ success: false, message: `Categoría ${movimiento.categoria} no requiere asiento automático` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    let cuentaContraparte: { id: string } | null = null;
    if (codigoCuentaContraparte) {
      const { data: cuentaContraparteData } = await supabase
        .from('plan_cuentas')
        .select('id')
        .eq('empresa_id', movimiento.empresa_id)
        .eq('codigo', codigoCuentaContraparte)
        .maybeSingle();

      if (!cuentaContraparteData) {
        throw new Error(`No se encontró cuenta contraparte: ${codigoCuentaContraparte}`);
      }

      cuentaContraparte = cuentaContraparteData;
    }

    // Generar número de asiento
    const { data: ultimoAsiento } = await supabase
      .from('asientos_contables')
      .select('numero')
      .eq('empresa_id', movimiento.empresa_id)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    let siguienteNumero = 1;
    if (ultimoAsiento?.numero) {
      const match = ultimoAsiento.numero.match(/ASI-(\d+)/);
      if (match) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }
    const numeroAsiento = `ASI-${String(siguienteNumero).padStart(5, '0')}`;

    // Crear asiento contable
    const { data: asiento, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        empresa_id: movimiento.empresa_id,
        pais_id: empresa?.pais_id,
        numero: numeroAsiento,
        fecha: movimiento.fecha,
        descripcion: descripcion,
        referencia: movimiento.referencia,
        estado: 'confirmado',
        creado_por: movimiento.creado_por,
        documento_soporte: {
          tipo: 'movimiento_tesoreria',
          id: movimiento.id,
          categoria: movimiento.categoria,
          cuenta_bancaria_id: movimiento.cuenta_bancaria_id,
        },
      })
      .select()
      .single();

    if (asientoError) throw asientoError;

    // Crear movimientos contables
    const movimientos = [];
    if (movimiento.tipo_movimiento === 'TRANSFERENCIA' && movimiento.metadata?.cuenta_destino_id) {
      const { data: cuentaDestino } = await supabase
        .from('cuentas_bancarias')
        .select('cuenta_contable_id')
        .eq('id', movimiento.metadata.cuenta_destino_id)
        .single();

      if (!cuentaDestino?.cuenta_contable_id) {
        throw new Error('Cuenta destino sin cuenta contable vinculada');
      }

      movimientos.push(
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaDestino.cuenta_contable_id,
          debito: parseFloat(movimiento.monto),
          credito: 0,
          descripcion: descripcion,
        },
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaBancaria.cuenta_contable_id,
          debito: 0,
          credito: parseFloat(movimiento.monto),
          descripcion: descripcion,
        }
      );
    } else if (movimiento.tipo_movimiento === 'INGRESO') {
      // INGRESO: Debe → Banco, Haber → Cuenta Contraparte
      movimientos.push(
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaBancaria.cuenta_contable_id,
          debito: parseFloat(movimiento.monto),
          credito: 0,
          descripcion: descripcion,
        },
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaContraparte!.id,
          debito: 0,
          credito: parseFloat(movimiento.monto),
          descripcion: descripcion,
        }
      );
    } else if (movimiento.tipo_movimiento === 'EGRESO') {
      // EGRESO: Debe → Cuenta Contraparte, Haber → Banco
      movimientos.push(
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaContraparte!.id,
          debito: parseFloat(movimiento.monto),
          credito: 0,
          descripcion: descripcion,
        },
        {
          asiento_id: asiento.id,
          cuenta_id: cuentaBancaria.cuenta_contable_id,
          debito: 0,
          credito: parseFloat(movimiento.monto),
          descripcion: descripcion,
        }
      );
    }

    const { error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientos);

    if (movimientosError) throw movimientosError;

    // Actualizar movimiento de tesorería con el asiento
    const { error: updateError } = await supabase
      .from('movimientos_tesoreria')
      .update({ asiento_contable_id: asiento.id })
      .eq('id', movimiento.id);

    if (updateError) throw updateError;

    console.log(`✅ Asiento ${numeroAsiento} generado para movimiento ${movimiento.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        asiento_id: asiento.id,
        numero_asiento: numeroAsiento,
      }),
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
