-- Script de verificación: Comisiones de Mercado Pago en Tesorería
-- Usa este script para verificar que todas las comisiones MP estén registradas correctamente

-- ============================================
-- PARTE 1: RESUMEN GENERAL
-- ============================================

DO $$
DECLARE
  total_facturas_con_mp INTEGER;
  total_con_movimiento_ingreso INTEGER;
  total_con_movimiento_egreso INTEGER;
  total_faltante_ingreso INTEGER;
  total_faltante_egreso INTEGER;
BEGIN

  -- Contar facturas con comisión MP
  SELECT COUNT(DISTINCT fv.id)
  INTO total_facturas_con_mp
  FROM facturas_venta fv
  INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
  WHERE (fv.comision_mp_monto > 0 OR (fv.metadata->>'comision_mp_monto')::NUMERIC > 0)
    AND pc.cuenta_bancaria_id IS NOT NULL;

  -- Contar cuántas tienen movimiento de ingreso
  SELECT COUNT(DISTINCT fv.id)
  INTO total_con_movimiento_ingreso
  FROM facturas_venta fv
  INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
  WHERE (fv.comision_mp_monto > 0 OR (fv.metadata->>'comision_mp_monto')::NUMERIC > 0)
    AND pc.cuenta_bancaria_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'pago_cliente'
        AND mt.documento_origen_id = pc.id
        AND mt.tipo_movimiento = 'INGRESO'
    );

  -- Contar cuántas tienen movimiento de egreso por comisión MP
  SELECT COUNT(DISTINCT fv.id)
  INTO total_con_movimiento_egreso
  FROM facturas_venta fv
  INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
  WHERE (fv.comision_mp_monto > 0 OR (fv.metadata->>'comision_mp_monto')::NUMERIC > 0)
    AND pc.cuenta_bancaria_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'comision_mercadopago'
        AND mt.documento_origen_id = fv.id
        AND mt.metadata->>'pago_cliente_id' = pc.id::text
        AND mt.tipo_movimiento = 'EGRESO'
    );

  total_faltante_ingreso := total_facturas_con_mp - total_con_movimiento_ingreso;
  total_faltante_egreso := total_facturas_con_mp - total_con_movimiento_egreso;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  REPORTE: COMISIONES MERCADO PAGO EN TESORERÍA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen General:';
  RAISE NOTICE '   • Total facturas con comisión MP: %', total_facturas_con_mp;
  RAISE NOTICE '   • Con movimiento de INGRESO: %', total_con_movimiento_ingreso;
  RAISE NOTICE '   • Con movimiento de EGRESO (comisión): %', total_con_movimiento_egreso;
  RAISE NOTICE '';

  IF total_faltante_ingreso > 0 OR total_faltante_egreso > 0 THEN
    RAISE NOTICE '⚠️  ATENCIÓN: Hay movimientos faltantes';
    RAISE NOTICE '   • Faltan movimientos de INGRESO: %', total_faltante_ingreso;
    RAISE NOTICE '   • Faltan movimientos de EGRESO: %', total_faltante_egreso;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Ejecuta: scripts/sincronizar_tesoreria_completo.sql';
  ELSE
    RAISE NOTICE '✅ Todos los movimientos están registrados correctamente';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

END $$;

-- ============================================
-- PARTE 2: DETALLE DE FACTURAS CON MP
-- ============================================

SELECT
  fv.numero_factura as factura,
  fv.fecha_emision,
  TO_CHAR(fv.total, 'FM$999,999.00') as total,
  TO_CHAR(COALESCE(fv.comision_mp_porcentaje, (fv.metadata->>'comision_mp_porcentaje')::NUMERIC), 'FM990.00') || '%' as comision_mp_pct,
  TO_CHAR(COALESCE(fv.comision_mp_monto, (fv.metadata->>'comision_mp_monto')::NUMERIC), 'FM$999,999.00') as comision_mp,
  TO_CHAR(COALESCE(fv.ingreso_neto, fv.total - COALESCE(fv.comision_mp_monto, 0)), 'FM$999,999.00') as ingreso_neto,
  pc.tipo_pago,
  pc.fecha_pago,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'pago_cliente'
        AND mt.documento_origen_id = pc.id
        AND mt.tipo_movimiento = 'INGRESO'
    ) THEN '✅' ELSE '❌'
  END as mov_ingreso,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'comision_mercadopago'
        AND mt.documento_origen_id = fv.id
        AND mt.metadata->>'pago_cliente_id' = pc.id::text
        AND mt.tipo_movimiento = 'EGRESO'
    ) THEN '✅' ELSE '❌'
  END as mov_egreso_mp
FROM facturas_venta fv
INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
WHERE (fv.comision_mp_monto > 0 OR (fv.metadata->>'comision_mp_monto')::NUMERIC > 0)
  AND pc.cuenta_bancaria_id IS NOT NULL
ORDER BY fv.fecha_emision DESC;

-- ============================================
-- PARTE 3: MOVIMIENTOS DE TESORERÍA CON MP
-- ============================================

SELECT
  mt.fecha,
  CASE
    WHEN mt.tipo_movimiento = 'INGRESO' THEN '💚 INGRESO'
    ELSE '💔 EGRESO'
  END as tipo,
  TO_CHAR(mt.monto, 'FM$999,999.00') as monto,
  mt.descripcion,
  mt.categoria,
  mt.referencia
FROM movimientos_tesoreria mt
WHERE mt.categoria IN ('COBRO_CLIENTE', 'COMISION_PASARELA')
  OR mt.metadata->>'tiene_comision_mp' = 'true'
  OR mt.documento_origen_tipo IN ('comision_mercadopago', 'pago_cliente')
ORDER BY mt.fecha DESC, mt.tipo_movimiento;

-- ============================================
-- PARTE 4: FACTURAS SIN MOVIMIENTOS
-- ============================================

SELECT
  fv.numero_factura,
  fv.fecha_emision,
  fv.total,
  COALESCE(fv.comision_mp_monto, (fv.metadata->>'comision_mp_monto')::NUMERIC) as comision_mp,
  pc.tipo_pago,
  pc.fecha_pago,
  'Falta registrar movimientos en tesorería' as problema
FROM facturas_venta fv
INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
WHERE (fv.comision_mp_monto > 0 OR (fv.metadata->>'comision_mp_monto')::NUMERIC > 0)
  AND pc.cuenta_bancaria_id IS NOT NULL
  AND (
    -- Falta movimiento de ingreso
    NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'pago_cliente'
        AND mt.documento_origen_id = pc.id
        AND mt.tipo_movimiento = 'INGRESO'
    )
    OR
    -- Falta movimiento de egreso por comisión MP
    NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'comision_mercadopago'
        AND mt.documento_origen_id = fv.id
        AND mt.metadata->>'pago_cliente_id' = pc.id::text
        AND mt.tipo_movimiento = 'EGRESO'
    )
  )
ORDER BY fv.fecha_emision;
