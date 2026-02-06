-- ========================================
-- LIMPIAR TRANSACCIONES DE UNA EMPRESA
-- ========================================
-- Útil cuando tienes múltiples empresas y solo quieres limpiar una
--
-- INSTRUCCIONES:
-- 1. Cambia el valor de 'nombre_empresa_aqui' por el nombre real
-- 2. O cambia la condición para usar empresa_id directamente
-- 3. Ejecuta el script
--
-- ========================================

DO $$
DECLARE
  v_empresa_id UUID;
  v_empresa_nombre TEXT;
  v_facturas_eliminadas INT;
  v_asientos_eliminados INT;
  v_movimientos_eliminados INT;
BEGIN
  -- ========================================
  -- PASO 1: Identificar la empresa
  -- ========================================
  -- OPCIÓN A: Por nombre
  SELECT id, razon_social
  INTO v_empresa_id, v_empresa_nombre
  FROM empresas
  WHERE razon_social ILIKE '%nombre_empresa_aqui%'
  LIMIT 1;

  -- OPCIÓN B: Por ID directo (descomenta y usa esto si prefieres)
  -- v_empresa_id := '00000000-0000-0000-0000-000000000000'::uuid;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa no encontrada. Verifica el nombre o ID.';
  END IF;

  RAISE NOTICE '🏢 Limpiando transacciones de: % (ID: %)', v_empresa_nombre, v_empresa_id;
  RAISE NOTICE '';

  -- ========================================
  -- PASO 2: Desactivar triggers
  -- ========================================
  SET session_replication_role = replica;

  -- ========================================
  -- PASO 3: Eliminar transacciones
  -- ========================================

  -- Solicitudes de aprobación
  DELETE FROM solicitudes_aprobacion
  WHERE empresa_id = v_empresa_id;

  -- Eventos externos
  DELETE FROM eventos_externos
  WHERE empresa_id = v_empresa_id;

  -- Pagos cliente
  DELETE FROM pagos_cliente
  WHERE empresa_id = v_empresa_id;

  -- Pagos proveedor
  DELETE FROM pagos_proveedor
  WHERE empresa_id = v_empresa_id;

  -- Movimientos de tesorería
  DELETE FROM movimientos_tesoreria
  WHERE empresa_id = v_empresa_id;
  GET DIAGNOSTICS v_movimientos_eliminados = ROW_COUNT;

  -- Comisiones partners
  DELETE FROM comisiones_partners
  WHERE empresa_id = v_empresa_id;

  -- Facturas venta (items se eliminan en cascada)
  DELETE FROM facturas_venta
  WHERE empresa_id = v_empresa_id;
  GET DIAGNOSTICS v_facturas_eliminadas = ROW_COUNT;

  -- Facturas compra (items se eliminan en cascada)
  DELETE FROM facturas_compra
  WHERE empresa_id = v_empresa_id;

  -- Notas de crédito (items se eliminan en cascada)
  DELETE FROM notas_credito
  WHERE empresa_id = v_empresa_id;

  -- Asientos contables (detalle se elimina en cascada)
  DELETE FROM asientos_contables
  WHERE empresa_id = v_empresa_id;
  GET DIAGNOSTICS v_asientos_eliminados = ROW_COUNT;

  -- Snapshots de períodos
  DELETE FROM periodos_snapshots_saldos
  WHERE periodo_id IN (
    SELECT id FROM periodos_contables WHERE empresa_id = v_empresa_id
  );

  -- ========================================
  -- PASO 4: Resetear configuración
  -- ========================================

  -- Resetear saldos bancarios
  UPDATE cuentas_bancarias
  SET saldo_actual = saldo_inicial
  WHERE empresa_id = v_empresa_id;

  -- Resetear contadores de facturas
  UPDATE empresas_config_cfe
  SET ultimo_numero_usado = 0
  WHERE empresa_id = v_empresa_id;

  -- Reabrir períodos
  UPDATE periodos_contables
  SET estado = 'abierto',
      fecha_cierre = NULL,
      cerrado_por = NULL
  WHERE empresa_id = v_empresa_id
    AND estado = 'cerrado';

  -- Limpiar metadata de clientes
  UPDATE clientes
  SET metadata = COALESCE(
    jsonb_strip_nulls(
      metadata - 'ultima_factura' - 'total_facturas' - 'saldo_pendiente'
    ),
    '{}'::jsonb
  )
  WHERE empresa_id = v_empresa_id;

  -- Limpiar metadata de proveedores
  UPDATE proveedores
  SET metadata = COALESCE(
    jsonb_strip_nulls(
      metadata - 'ultima_factura' - 'total_facturas' - 'saldo_pendiente'
    ),
    '{}'::jsonb
  )
  WHERE empresa_id = v_empresa_id;

  -- ========================================
  -- PASO 5: Reactivar triggers
  -- ========================================
  SET session_replication_role = DEFAULT;

  -- ========================================
  -- PASO 6: Resumen
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LIMPIEZA COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🏢 Empresa: %', v_empresa_nombre;
  RAISE NOTICE '🗑️  Facturas eliminadas: %', v_facturas_eliminadas;
  RAISE NOTICE '🗑️  Asientos eliminados: %', v_asientos_eliminados;
  RAISE NOTICE '🗑️  Movimientos tesorería: %', v_movimientos_eliminados;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema listo para nuevas transacciones';
  RAISE NOTICE '';

END $$;

-- ========================================
-- VERIFICACIÓN: Ver empresas disponibles
-- ========================================
-- Ejecuta esto primero para ver qué empresas tienes
/*
SELECT
  id,
  razon_social,
  rut,
  (SELECT COUNT(*) FROM facturas_venta WHERE empresa_id = empresas.id) as facturas,
  (SELECT COUNT(*) FROM asientos_contables WHERE empresa_id = empresas.id) as asientos
FROM empresas
ORDER BY razon_social;
*/
