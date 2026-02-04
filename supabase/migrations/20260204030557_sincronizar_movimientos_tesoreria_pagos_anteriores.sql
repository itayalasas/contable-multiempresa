/*
  # Sincronizar Movimientos de Tesorería de Pagos Anteriores

  1. Problema
    - Los pagos a proveedores/partners generaban asientos contables
    - Pero NO creaban movimientos de tesorería
    - Esto causa descuadratura entre saldo contable y saldo real de bancos

  2. Solución
    - Identificar pagos con asiento contable pero sin movimiento de tesorería
    - Crear movimientos de tesorería retroactivos
    - Sincronizar saldos de cuentas bancarias

  3. Importante
    - Solo procesa pagos que tienen cuenta_bancaria_id
    - Crea movimientos de EGRESO (sale dinero)
    - Vincula con el asiento contable existente
*/

DO $$
DECLARE
  v_pago RECORD;
  v_proveedor_nombre TEXT;
  v_cuenta_bancaria RECORD;
  v_factura_por_pagar RECORD;
  v_asiento RECORD;
  v_total_creados INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando sincronización de movimientos de tesorería...';

  -- Buscar pagos que tienen asiento contable pero NO tienen movimiento de tesorería
  FOR v_pago IN 
    SELECT pp.* 
    FROM pagos_proveedor pp
    WHERE pp.asiento_contable_id IS NOT NULL
      AND pp.cuenta_bancaria_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM movimientos_tesoreria mt
        WHERE mt.documento_origen_tipo = 'pago_proveedor'
          AND mt.documento_origen_id = pp.id
      )
    ORDER BY pp.fecha_pago
  LOOP
    BEGIN
      -- Obtener datos del asiento contable
      SELECT * INTO v_asiento
      FROM asientos_contables
      WHERE id = v_pago.asiento_contable_id;

      IF v_asiento.id IS NULL THEN
        RAISE NOTICE '⚠️ Pago % no tiene asiento contable válido', v_pago.id;
        CONTINUE;
      END IF;

      -- Obtener datos de la factura por pagar
      SELECT * INTO v_factura_por_pagar
      FROM facturas_por_pagar
      WHERE id = v_pago.factura_id;

      IF v_factura_por_pagar.id IS NULL THEN
        RAISE NOTICE '⚠️ Pago % no tiene factura por pagar válida', v_pago.id;
        CONTINUE;
      END IF;

      -- Obtener nombre del proveedor
      SELECT razon_social INTO v_proveedor_nombre
      FROM proveedores
      WHERE id = v_factura_por_pagar.proveedor_id;

      v_proveedor_nombre := COALESCE(v_proveedor_nombre, 'Proveedor');

      -- Obtener datos de la cuenta bancaria
      SELECT * INTO v_cuenta_bancaria
      FROM cuentas_bancarias
      WHERE id = v_pago.cuenta_bancaria_id;

      IF v_cuenta_bancaria.id IS NULL THEN
        RAISE NOTICE '⚠️ Pago % no tiene cuenta bancaria válida', v_pago.id;
        CONTINUE;
      END IF;

      -- Crear movimiento de tesorería de EGRESO
      INSERT INTO movimientos_tesoreria (
        empresa_id,
        cuenta_bancaria_id,
        tipo_movimiento,
        fecha,
        monto,
        descripcion,
        referencia,
        beneficiario,
        categoria,
        asiento_contable_id,
        documento_origen_tipo,
        documento_origen_id,
        creado_por,
        metadata
      ) VALUES (
        v_pago.empresa_id,
        v_pago.cuenta_bancaria_id,
        'EGRESO',
        v_pago.fecha_pago,
        v_pago.monto,
        COALESCE(v_asiento.descripcion, 'Pago a ' || v_proveedor_nombre),
        v_pago.referencia,
        v_proveedor_nombre,
        'PAGO_PROVEEDOR',
        v_pago.asiento_contable_id,
        'pago_proveedor',
        v_pago.id,
        NULL, -- Sistema
        jsonb_build_object(
          'tipo_pago', v_pago.tipo_pago,
          'banco', v_cuenta_bancaria.banco,
          'numero_cuenta', v_cuenta_bancaria.numero_cuenta,
          'factura_id', v_factura_por_pagar.id,
          'numero_operacion', COALESCE(v_pago.referencia, ''),
          'sincronizado_retroactivamente', true
        )
      );

      v_total_creados := v_total_creados + 1;

      RAISE NOTICE '✅ Creado movimiento tesorería para pago % - $% - %', 
        v_factura_por_pagar.numero, v_pago.monto, v_proveedor_nombre;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Error procesando pago %: %', v_pago.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Sincronización completada: % movimientos creados', v_total_creados;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;
