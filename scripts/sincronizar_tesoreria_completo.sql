-- Script completo para sincronizar tesorería con todas las transacciones
-- Corrige: comisiones MP, ingresos de comisiones, y cobros de facturas marketplace

DO $$
DECLARE
  total_ingresos_comision INTEGER := 0;
  total_egresos_mp INTEGER := 0;
  total_cobros_cliente INTEGER := 0;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '     SINCRONIZACIÓN COMPLETA DE TESORERÍA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ============================================
  -- PARTE 1: INGRESOS POR COMISIONES RETENIDAS
  -- ============================================
  RAISE NOTICE '📝 PARTE 1: Registrando ingresos por comisiones retenidas...';
  RAISE NOTICE '';

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
    metadata
  )
  SELECT
    fpp.empresa_id,
    pp.cuenta_bancaria_id,
    'INGRESO',
    pp.fecha_pago,
    (
      SELECT SUM(COALESCE(cp.comision_app, 0) + COALESCE(cp.comision_mercadopago_aliado, 0))
      FROM comisiones_partners cp
      WHERE cp.factura_compra_id = fpp.id
        AND cp.estado = 'facturada'
    ),
    'Ingreso comisiones retenidas - Factura ' || fpp.numero,
    'COM-RETENIDA-' || fpp.numero,
    'Comisiones Marketplace',
    'INGRESO_COMISION',
    pp.asiento_contable_id,
    'comision_marketplace',
    fpp.id,
    jsonb_build_object(
      'factura_compra_id', fpp.id,
      'pago_proveedor_id', pp.id,
      'tipo', 'comision_retenida',
      'origen', 'sincronizacion_automatica'
    )
  FROM pagos_proveedor pp
  INNER JOIN facturas_por_pagar fpp ON fpp.id = pp.factura_id
  WHERE pp.eliminado = false
    AND pp.cuenta_bancaria_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM comisiones_partners cp
      WHERE cp.factura_compra_id = fpp.id
        AND cp.estado = 'facturada'
        AND (COALESCE(cp.comision_app, 0) + COALESCE(cp.comision_mercadopago_aliado, 0)) > 0
    )
    AND NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'comision_marketplace'
        AND mt.documento_origen_id = fpp.id
        AND mt.metadata->>'pago_proveedor_id' = pp.id::text
        AND mt.tipo_movimiento = 'INGRESO'
        AND mt.categoria = 'INGRESO_COMISION'
    );

  GET DIAGNOSTICS total_ingresos_comision = ROW_COUNT;
  RAISE NOTICE '   ✅ Movimientos de ingreso por comisiones: %', total_ingresos_comision;
  RAISE NOTICE '';

  -- ============================================
  -- PARTE 2: EGRESOS POR COMISIÓN MERCADO PAGO
  -- ============================================
  RAISE NOTICE '📝 PARTE 2: Registrando egresos por comisión Mercado Pago...';
  RAISE NOTICE '';

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
    metadata
  )
  SELECT
    fv.empresa_id,
    pc.cuenta_bancaria_id,
    'EGRESO',
    pc.fecha_pago,
    (fv.metadata->>'comision_mp_monto')::NUMERIC,
    'Comisión Mercado Pago ' || (fv.metadata->>'comision_mp_porcentaje') || '% - Factura ' || fv.numero_factura,
    'MP-' || fv.numero_factura,
    'Mercado Pago',
    'COMISION_PASARELA',
    pc.asiento_contable_id,
    'comision_mercadopago',
    fv.id,
    jsonb_build_object(
      'factura_id', fv.id,
      'pago_cliente_id', pc.id,
      'porcentaje', (fv.metadata->>'comision_mp_porcentaje')::NUMERIC,
      'tipo', 'mercadopago',
      'origen', 'sincronizacion_automatica'
    )
  FROM pagos_cliente pc
  INNER JOIN facturas_venta fv ON fv.id = pc.factura_id
  WHERE pc.cuenta_bancaria_id IS NOT NULL
    AND fv.metadata->>'comision_mp_monto' IS NOT NULL
    AND (fv.metadata->>'comision_mp_monto')::NUMERIC > 0
    AND NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'comision_mercadopago'
        AND mt.documento_origen_id = fv.id
        AND mt.metadata->>'pago_cliente_id' = pc.id::text
        AND mt.tipo_movimiento = 'EGRESO'
        AND mt.categoria = 'COMISION_PASARELA'
    );

  GET DIAGNOSTICS total_egresos_mp = ROW_COUNT;
  RAISE NOTICE '   ✅ Movimientos de egreso por comisión MP: %', total_egresos_mp;
  RAISE NOTICE '';

  -- ============================================
  -- PARTE 3: INGRESOS POR COBROS DE CLIENTES
  -- ============================================
  RAISE NOTICE '📝 PARTE 3: Registrando ingresos por cobros de clientes...';
  RAISE NOTICE '';

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
    metadata
  )
  SELECT
    fv.empresa_id,
    pc.cuenta_bancaria_id,
    'INGRESO',
    pc.fecha_pago,
    pc.monto,
    'Cobro factura ' || fv.numero_factura || ' - ' || COALESCE(c.razon_social, 'Cliente'),
    COALESCE(pc.referencia, fv.numero_factura),
    COALESCE(c.razon_social, 'Cliente'),
    'COBRO_CLIENTE',
    pc.asiento_contable_id,
    'pago_cliente',
    pc.id,
    jsonb_build_object(
      'tipo_pago', pc.tipo_pago,
      'factura_id', fv.id,
      'origen', 'sincronizacion_automatica'
    )
  FROM pagos_cliente pc
  INNER JOIN facturas_venta fv ON fv.id = pc.factura_id
  LEFT JOIN clientes c ON c.id = fv.cliente_id
  WHERE pc.cuenta_bancaria_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      WHERE mt.documento_origen_tipo = 'pago_cliente'
        AND mt.documento_origen_id = pc.id
        AND mt.tipo_movimiento = 'INGRESO'
        AND mt.categoria = 'COBRO_CLIENTE'
    );

  GET DIAGNOSTICS total_cobros_cliente = ROW_COUNT;
  RAISE NOTICE '   ✅ Movimientos de ingreso por cobros: %', total_cobros_cliente;
  RAISE NOTICE '';

  -- ============================================
  -- RESUMEN FINAL
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '     RESUMEN DE SINCRONIZACIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Movimientos creados:';
  RAISE NOTICE '   • Ingresos por comisiones retenidas: %', total_ingresos_comision;
  RAISE NOTICE '   • Egresos por comisión Mercado Pago: %', total_egresos_mp;
  RAISE NOTICE '   • Ingresos por cobros de clientes: %', total_cobros_cliente;
  RAISE NOTICE '   • TOTAL: %', (total_ingresos_comision + total_egresos_mp + total_cobros_cliente);
  RAISE NOTICE '';
  RAISE NOTICE '💡 Los saldos bancarios se actualizan automáticamente.';
  RAISE NOTICE '💡 Ve a Finanzas → Tesorería para verificar los saldos.';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sincronización completada exitosamente.';
  RAISE NOTICE '';

END $$;
