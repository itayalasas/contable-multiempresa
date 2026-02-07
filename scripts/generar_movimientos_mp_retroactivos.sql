/*
  Script para Generar Movimientos de Tesorería y Asientos Retroactivos

  Problema: Facturas del marketplace se crearon pero NO se generaron:
  - pagos_cliente
  - movimientos_tesoreria (INGRESO + EGRESO comisión MP)
  - asientos contables

  Este script corrige esa situación.
*/

DO $$
DECLARE
  factura_record RECORD;
  pago_cliente_id UUID;
  cuenta_bancaria_ml_id UUID;
  empresa_pais_id UUID;
  movimiento_ingreso_id UUID;
  movimiento_egreso_id UUID;
  cuenta_banco_id UUID;
  cuenta_comision_mp_id UUID;
  asiento_egreso_id UUID;
  numero_asiento TEXT;
  siguiente_numero INTEGER;
  SISTEMA_USER_ID UUID := '00000000-0000-0000-0000-000000000000';
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   GENERAR MOVIMIENTOS Y ASIENTOS MP RETROACTIVOS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  FOR factura_record IN
    SELECT
      fv.id as factura_id,
      fv.empresa_id,
      fv.numero_factura,
      fv.fecha_emision,
      fv.total,
      fv.comision_mp_monto,
      fv.comision_mp_porcentaje,
      fv.cliente_id,
      c.razon_social as cliente_nombre,
      fv.metadata->>'order_id' as order_id,
      fv.metadata->>'order_number' as order_number,
      (fv.metadata->>'cuenta_bancaria_ml_id')::uuid as cuenta_ml_id
    FROM facturas_venta fv
    LEFT JOIN clientes c ON c.id = fv.cliente_id
    WHERE fv.comision_mp_monto IS NOT NULL
      AND fv.comision_mp_monto > 0
      AND fv.estado = 'pagada'
      AND fv.metadata->>'origen_marketplace' = 'true'
      AND NOT EXISTS (
        SELECT 1 FROM pagos_cliente pc WHERE pc.factura_id = fv.id
      )
    ORDER BY fv.fecha_emision, fv.numero_factura
  LOOP

    RAISE NOTICE '';
    RAISE NOTICE '📄 Factura: % (Total: $%, Comisión MP: $%)',
      factura_record.numero_factura,
      factura_record.total,
      factura_record.comision_mp_monto;

    -- Obtener país de la empresa
    SELECT pais_id INTO empresa_pais_id
    FROM empresas
    WHERE id = factura_record.empresa_id;

    -- Usar cuenta bancaria del metadata o buscar la primera ML activa
    cuenta_bancaria_ml_id := factura_record.cuenta_ml_id;

    IF cuenta_bancaria_ml_id IS NULL THEN
      SELECT id INTO cuenta_bancaria_ml_id
      FROM cuentas_bancarias
      WHERE empresa_id = factura_record.empresa_id
        AND nombre ILIKE '%mercadolibre%'
        AND activa = true
      LIMIT 1;
    END IF;

    IF cuenta_bancaria_ml_id IS NULL THEN
      RAISE WARNING '   ⚠️  No se encontró cuenta bancaria ML, saltando...';
      CONTINUE;
    END IF;

    -- Obtener cuenta contable del banco
    SELECT cuenta_contable_id INTO cuenta_banco_id
    FROM cuentas_bancarias
    WHERE id = cuenta_bancaria_ml_id;

    IF cuenta_banco_id IS NULL THEN
      RAISE WARNING '   ⚠️  Cuenta bancaria sin cuenta contable, saltando...';
      CONTINUE;
    END IF;

    -- Obtener cuenta de comisión MP
    SELECT id INTO cuenta_comision_mp_id
    FROM plan_cuentas
    WHERE empresa_id = factura_record.empresa_id
      AND codigo = '512005';

    IF cuenta_comision_mp_id IS NULL THEN
      RAISE WARNING '   ⚠️  No se encontró cuenta 512005, saltando...';
      CONTINUE;
    END IF;

    -- 1. CREAR PAGO_CLIENTE
    INSERT INTO pagos_cliente (
      factura_id,
      fecha_pago,
      monto,
      tipo_pago,
      referencia,
      observaciones,
      creado_por
    ) VALUES (
      factura_record.factura_id,
      factura_record.fecha_emision,
      factura_record.total,
      'MARKETPLACE',
      factura_record.order_id,
      'Cobro automático marketplace - Orden ' || COALESCE(factura_record.order_number, factura_record.order_id),
      SISTEMA_USER_ID
    )
    RETURNING id INTO pago_cliente_id;

    RAISE NOTICE '   ✅ Pago cliente creado: %', pago_cliente_id;

    -- 2. CREAR MOVIMIENTO INGRESO (cobro del cliente)
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
      metadata,
      creado_por
    ) VALUES (
      factura_record.empresa_id,
      cuenta_bancaria_ml_id,
      'INGRESO',
      factura_record.fecha_emision,
      factura_record.total,
      'Cobro orden ' || COALESCE(factura_record.order_number, factura_record.order_id) || ' - ' || factura_record.cliente_nombre,
      factura_record.order_id,
      factura_record.cliente_nombre,
      'COBRO_CLIENTE',
      'factura_venta',
      factura_record.factura_id,
      jsonb_build_object(
        'order_id', factura_record.order_id,
        'customer_id', factura_record.cliente_id,
        'origen', 'marketplace',
        'automatico', true,
        'retroactivo', true,
        'tiene_comision_mp', true,
        'comision_mp', factura_record.comision_mp_monto
      ),
      SISTEMA_USER_ID
    )
    RETURNING id INTO movimiento_ingreso_id;

    RAISE NOTICE '   ✅ Movimiento INGRESO creado: $%', factura_record.total;

    -- 3. CREAR MOVIMIENTO EGRESO (comisión MP)
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
      metadata,
      creado_por
    ) VALUES (
      factura_record.empresa_id,
      cuenta_bancaria_ml_id,
      'EGRESO',
      factura_record.fecha_emision,
      factura_record.comision_mp_monto,
      'Comisión Mercado Pago ' || factura_record.comision_mp_porcentaje || '% - Orden ' || COALESCE(factura_record.order_number, factura_record.order_id),
      'MP-' || factura_record.order_id,
      'Mercado Pago',
      'COMISION_PASARELA',
      'comision_mercadopago',
      factura_record.factura_id,
      jsonb_build_object(
        'order_id', factura_record.order_id,
        'factura_id', factura_record.factura_id,
        'porcentaje', factura_record.comision_mp_porcentaje,
        'tipo', 'mercadopago',
        'automatico', true,
        'retroactivo', true
      ),
      SISTEMA_USER_ID
    )
    RETURNING id INTO movimiento_egreso_id;

    RAISE NOTICE '   ✅ Movimiento EGRESO comisión MP creado: $%', factura_record.comision_mp_monto;

    -- 4. CREAR ASIENTO CONTABLE PARA COMISIÓN MP
    -- Generar número de asiento
    SELECT COALESCE(MAX(
      CASE
        WHEN numero ~ '^ASI-\d+$' THEN
          CAST(SUBSTRING(numero FROM 'ASI-(\d+)') AS INTEGER)
        ELSE 0
      END
    ), 0) INTO siguiente_numero
    FROM asientos_contables
    WHERE empresa_id = factura_record.empresa_id;

    siguiente_numero := siguiente_numero + 1;
    numero_asiento := 'ASI-' || LPAD(siguiente_numero::TEXT, 5, '0');

    -- Crear asiento contable
    INSERT INTO asientos_contables (
      empresa_id,
      pais_id,
      numero,
      fecha,
      descripcion,
      referencia,
      estado,
      creado_por,
      documento_soporte
    ) VALUES (
      factura_record.empresa_id,
      empresa_pais_id,
      numero_asiento,
      factura_record.fecha_emision,
      'Comisión Mercado Pago ' || factura_record.comision_mp_porcentaje || '% - Orden ' || COALESCE(factura_record.order_number, factura_record.order_id),
      'MP-' || factura_record.order_id,
      'confirmado',
      SISTEMA_USER_ID,
      jsonb_build_object(
        'tipo', 'movimiento_tesoreria',
        'id', movimiento_egreso_id,
        'categoria', 'COMISION_PASARELA',
        'origen', 'retroactivo_manual'
      )
    )
    RETURNING id INTO asiento_egreso_id;

    -- Crear movimientos contables
    -- EGRESO: Debe → Gasto Comisión MP, Haber → Banco
    INSERT INTO movimientos_contables (
      asiento_id,
      cuenta_id,
      debito,
      credito,
      descripcion
    ) VALUES
    (
      asiento_egreso_id,
      cuenta_comision_mp_id,
      factura_record.comision_mp_monto,
      0,
      'Comisión Mercado Pago'
    ),
    (
      asiento_egreso_id,
      cuenta_banco_id,
      0,
      factura_record.comision_mp_monto,
      'Comisión Mercado Pago'
    );

    -- Vincular asiento al movimiento
    UPDATE movimientos_tesoreria
    SET asiento_contable_id = asiento_egreso_id
    WHERE id = movimiento_egreso_id;

    RAISE NOTICE '   ✅ Asiento contable % creado', numero_asiento;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   PROCESO COMPLETADO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

END $$;
