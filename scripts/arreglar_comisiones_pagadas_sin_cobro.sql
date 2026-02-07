-- Script para arreglar facturas de comisión pagadas sin registro de cobro
-- Problema: Facturas marcadas como pagadas pero sin registro en pagos_cliente ni movimientos_tesoreria
-- Esto impide el cierre de períodos contables

DO $$
DECLARE
  factura_record RECORD;
  cuenta_bancaria_id_ml UUID;
  nuevo_pago_id UUID;
  fecha_pago DATE;
  SISTEMA_USER_ID UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  RAISE NOTICE '🔧 Iniciando corrección de facturas de comisión pagadas...';

  -- Iterar sobre facturas de comisión pagadas sin registro de cobro
  FOR factura_record IN
    SELECT
      fv.id,
      fv.empresa_id,
      fv.numero_factura,
      fv.serie,
      fv.total,
      fv.fecha_emision,
      fv.cliente_id,
      fv.metadata,
      c.razon_social as cliente_nombre
    FROM facturas_venta fv
    LEFT JOIN clientes c ON c.id = fv.cliente_id
    WHERE fv.estado = 'pagada'
      AND fv.serie LIKE 'COM-%'
      AND NOT EXISTS (
        SELECT 1 FROM pagos_cliente pc WHERE pc.factura_id = fv.id
      )
    ORDER BY fv.fecha_emision
  LOOP

    RAISE NOTICE '';
    RAISE NOTICE '📝 Procesando factura: % (ID: %)', factura_record.numero_factura, factura_record.id;

    -- Obtener cuenta bancaria de Mercado Libre/Marketplace
    SELECT id INTO cuenta_bancaria_id_ml
    FROM cuentas_bancarias
    WHERE empresa_id = factura_record.empresa_id
      AND (
        nombre ILIKE '%mercado%libre%'
        OR nombre ILIKE '%marketplace%'
        OR nombre ILIKE '%mercadopago%'
        OR metadata->>'tipo' = 'mercadolibre'
      )
    LIMIT 1;

    IF cuenta_bancaria_id_ml IS NULL THEN
      -- Si no hay cuenta ML, usar la primera cuenta activa
      SELECT id INTO cuenta_bancaria_id_ml
      FROM cuentas_bancarias
      WHERE empresa_id = factura_record.empresa_id
        AND activa = true
      ORDER BY created_at
      LIMIT 1;
    END IF;

    IF cuenta_bancaria_id_ml IS NULL THEN
      RAISE WARNING '⚠️  No se encontró cuenta bancaria para empresa %. Saltando factura %',
        factura_record.empresa_id, factura_record.numero_factura;
      CONTINUE;
    END IF;

    -- Usar fecha de pago del metadata si existe, si no usar fecha de emisión
    IF factura_record.metadata->>'fecha_pago' IS NOT NULL THEN
      fecha_pago := (factura_record.metadata->>'fecha_pago')::DATE;
    ELSE
      fecha_pago := factura_record.fecha_emision;
    END IF;

    RAISE NOTICE '   💰 Creando registro de cobro...';

    -- 1. Crear registro en pagos_cliente
    INSERT INTO pagos_cliente (
      factura_id,
      fecha_pago,
      monto,
      tipo_pago,
      referencia,
      observaciones,
      cuenta_bancaria_id,
      creado_por
    ) VALUES (
      factura_record.id,
      fecha_pago,
      factura_record.total,
      'MARKETPLACE',
      factura_record.metadata->>'order_id',
      'Cobro automático marketplace - Corrección retroactiva',
      cuenta_bancaria_id_ml,
      SISTEMA_USER_ID
    )
    RETURNING id INTO nuevo_pago_id;

    RAISE NOTICE '   ✅ Registro de cobro creado: %', nuevo_pago_id;

    -- 2. Crear movimiento en tesorería (INGRESO)
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
      documento_origen_tipo,
      documento_origen_id,
      metadata
    ) VALUES (
      factura_record.empresa_id,
      cuenta_bancaria_id_ml,
      'INGRESO',
      fecha_pago,
      factura_record.total,
      'Cobro comisión ' || factura_record.numero_factura || ' - ' || COALESCE(factura_record.cliente_nombre, 'Cliente'),
      factura_record.metadata->>'order_id',
      COALESCE(factura_record.cliente_nombre, 'Cliente'),
      'INGRESO_COMISION',
      'pago_cliente',
      nuevo_pago_id,
      jsonb_build_object(
        'factura_id', factura_record.id,
        'tipo', 'comision_marketplace',
        'origen', 'correccion_retroactiva',
        'order_id', factura_record.metadata->>'order_id'
      )
    );

    RAISE NOTICE '   ✅ Movimiento de tesorería creado';

    -- 3. Si hay comisión de Mercado Pago, crear el egreso
    IF (factura_record.metadata->>'comision_mp_monto')::NUMERIC > 0 THEN
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
        documento_origen_tipo,
        documento_origen_id,
        metadata
      ) VALUES (
        factura_record.empresa_id,
        cuenta_bancaria_id_ml,
        'EGRESO',
        fecha_pago,
        (factura_record.metadata->>'comision_mp_monto')::NUMERIC,
        'Comisión Mercado Pago - ' || factura_record.numero_factura,
        'MP-' || (factura_record.metadata->>'order_id'),
        'Mercado Pago',
        'COMISION_PASARELA',
        'comision_mercadopago',
        factura_record.id,
        jsonb_build_object(
          'factura_id', factura_record.id,
          'tipo', 'mercadopago',
          'origen', 'correccion_retroactiva',
          'porcentaje', (factura_record.metadata->>'comision_mp_porcentaje')::NUMERIC
        )
      );
      RAISE NOTICE '   ✅ Egreso comisión MP creado: $%', (factura_record.metadata->>'comision_mp_monto')::NUMERIC;
    END IF;

    RAISE NOTICE '   ✅ Factura % corregida exitosamente', factura_record.numero_factura;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Proceso completado. Todas las facturas de comisión han sido corregidas.';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   - Facturas corregidas: %', (
    SELECT COUNT(*)
    FROM facturas_venta fv
    WHERE fv.estado = 'pagada'
      AND fv.serie LIKE 'COM-%'
      AND EXISTS (SELECT 1 FROM pagos_cliente pc WHERE pc.factura_id = fv.id)
  );

END $$;
