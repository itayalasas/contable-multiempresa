/*
  # Sincronizar Movimientos de Tesorería - INGRESOS de Cobros Clientes

  1. Problema
    - Existen cobros de clientes registrados en pagos_cliente
    - Pero NO tienen movimientos de tesorería asociados
    - Resultado: Solo se ven EGRESOS, saldo negativo

  2. Solución
    - Crear movimientos de tesorería de INGRESO para todos los cobros existentes
    - Depositar en cuenta bancaria MercadoLibre (cuenta temporal del marketplace)
    - Vincular con asiento contable existente

  3. Importante
    - Solo procesa cobros que tienen asiento contable
    - Crea movimientos de INGRESO (entra dinero)
    - Los deposita en la cuenta MercadoLibre configurada
*/

DO $$
DECLARE
  v_pago RECORD;
  v_factura RECORD;
  v_cliente_nombre TEXT;
  v_cuenta_bancaria_ml_id uuid;
  v_empresa_id uuid;
  v_total_creados INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando sincronización de INGRESOS de cobros a clientes...';

  -- Obtener empresa y cuenta bancaria MercadoLibre
  SELECT id INTO v_empresa_id FROM empresas LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró empresa';
    RETURN;
  END IF;

  -- Obtener cuenta bancaria MercadoLibre
  SELECT id INTO v_cuenta_bancaria_ml_id
  FROM cuentas_bancarias
  WHERE empresa_id = v_empresa_id
    AND nombre = 'Cuenta MercadoLibre';

  IF v_cuenta_bancaria_ml_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró cuenta bancaria MercadoLibre';
    RAISE NOTICE 'ℹ️ Los ingresos no se pueden registrar sin una cuenta bancaria';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Usando cuenta bancaria MercadoLibre: %', v_cuenta_bancaria_ml_id;

  -- Buscar pagos de clientes que NO tienen movimiento de tesorería
  FOR v_pago IN 
    SELECT pc.* 
    FROM pagos_cliente pc
    WHERE pc.asiento_contable_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM movimientos_tesoreria mt
        WHERE mt.documento_origen_tipo = 'pago_cliente'
          AND mt.documento_origen_id = pc.id
      )
    ORDER BY pc.fecha_pago
  LOOP
    BEGIN
      -- Obtener datos de la factura
      SELECT fv.*, c.razon_social as cliente_nombre
      INTO v_factura
      FROM facturas_venta fv
      LEFT JOIN clientes c ON c.id = fv.cliente_id
      WHERE fv.id = v_pago.factura_id;

      IF v_factura.id IS NULL THEN
        RAISE NOTICE '⚠️ Pago % no tiene factura válida', v_pago.id;
        CONTINUE;
      END IF;

      v_cliente_nombre := COALESCE(v_factura.cliente_nombre, 'Cliente');

      -- Crear movimiento de tesorería de INGRESO
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
        v_factura.empresa_id,
        v_cuenta_bancaria_ml_id,
        'INGRESO',
        v_pago.fecha_pago,
        v_pago.monto,
        'Cobro factura ' || v_factura.numero_factura || ' - ' || v_cliente_nombre,
        COALESCE(v_pago.referencia, v_factura.numero_factura),
        v_cliente_nombre,
        'COBRO_CLIENTE',
        v_pago.asiento_contable_id,
        'pago_cliente',
        v_pago.id,
        NULL, -- Sistema
        jsonb_build_object(
          'tipo_pago', v_pago.tipo_pago,
          'banco', 'MercadoLibre',
          'numero_cuenta', 'ML-TEMP-001',
          'factura_id', v_factura.id,
          'numero_operacion', COALESCE(v_pago.referencia, ''),
          'sincronizado_retroactivamente', true,
          'origen', 'marketplace'
        )
      );

      v_total_creados := v_total_creados + 1;

      RAISE NOTICE '✅ INGRESO: % - $% - %', 
        v_factura.numero_factura, v_pago.monto, v_cliente_nombre;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Error procesando pago %: %', v_pago.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Sincronización completada:';
  RAISE NOTICE '   - % movimientos de INGRESO creados', v_total_creados;
  RAISE NOTICE '   - Todos depositados en Cuenta MercadoLibre';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;
