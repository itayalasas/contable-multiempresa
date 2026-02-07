-- Script para generar asientos contables de comisiones de Mercado Pago
-- Problema: Los movimientos de tesorería de comisión MP no tienen asientos contables

DO $$
DECLARE
  movimiento_record RECORD;
  cuenta_banco_id UUID;
  cuenta_comision_mp_id UUID;
  asiento_id UUID;
  numero_asiento TEXT;
  siguiente_numero INTEGER;
  asientos_creados INTEGER := 0;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   GENERAR ASIENTOS COMISIÓN MERCADO PAGO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  FOR movimiento_record IN
    SELECT
      mt.id as movimiento_id,
      mt.empresa_id,
      mt.cuenta_bancaria_id,
      mt.fecha,
      mt.monto,
      mt.descripcion,
      mt.referencia,
      cb.cuenta_contable_id as cuenta_banco_id,
      e.pais_id
    FROM movimientos_tesoreria mt
    INNER JOIN cuentas_bancarias cb ON cb.id = mt.cuenta_bancaria_id
    INNER JOIN empresas e ON e.id = mt.empresa_id
    WHERE mt.categoria = 'COMISION_PASARELA'
      AND mt.tipo_movimiento = 'EGRESO'
      AND mt.asiento_contable_id IS NULL
      AND cb.cuenta_contable_id IS NOT NULL
    ORDER BY mt.fecha, mt.created_at
  LOOP

    RAISE NOTICE '📝 Movimiento: % (Monto: $%)', movimiento_record.movimiento_id, movimiento_record.monto;

    -- Buscar cuenta de comisión MP
    SELECT id INTO cuenta_comision_mp_id
    FROM plan_cuentas
    WHERE empresa_id = movimiento_record.empresa_id
      AND codigo = '512005'
    LIMIT 1;

    IF cuenta_comision_mp_id IS NULL THEN
      RAISE WARNING '   ⚠️  No se encontró cuenta 512005 para empresa, saltando...';
      CONTINUE;
    END IF;

    -- Generar número de asiento
    SELECT COALESCE(MAX(
      CASE
        WHEN numero ~ '^ASI-\d+$' THEN
          CAST(SUBSTRING(numero FROM 'ASI-(\d+)') AS INTEGER)
        ELSE 0
      END
    ), 0) INTO siguiente_numero
    FROM asientos_contables
    WHERE empresa_id = movimiento_record.empresa_id;

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
      movimiento_record.empresa_id,
      movimiento_record.pais_id,
      numero_asiento,
      movimiento_record.fecha,
      movimiento_record.descripcion,
      movimiento_record.referencia,
      'confirmado',
      '00000000-0000-0000-0000-000000000000',
      jsonb_build_object(
        'tipo', 'movimiento_tesoreria',
        'id', movimiento_record.movimiento_id,
        'categoria', 'COMISION_PASARELA',
        'origen', 'migracion_automatica'
      )
    )
    RETURNING id INTO asiento_id;

    -- Crear movimientos contables
    -- EGRESO MP: Debe → Gasto Comisión MP (512005), Haber → Banco
    INSERT INTO movimientos_contables (
      asiento_id,
      cuenta_id,
      debito,
      credito,
      descripcion
    ) VALUES
    (
      asiento_id,
      cuenta_comision_mp_id,
      movimiento_record.monto,
      0,
      movimiento_record.descripcion
    ),
    (
      asiento_id,
      movimiento_record.cuenta_banco_id,
      0,
      movimiento_record.monto,
      movimiento_record.descripcion
    );

    -- Actualizar movimiento de tesorería con el asiento
    UPDATE movimientos_tesoreria
    SET asiento_contable_id = asiento_id
    WHERE id = movimiento_record.movimiento_id;

    asientos_creados := asientos_creados + 1;
    RAISE NOTICE '   ✅ Asiento % creado', numero_asiento;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   RESUMEN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Asientos de comisión MP creados: %', asientos_creados;
  RAISE NOTICE '';

END $$;
