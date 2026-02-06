-- ========================================
-- SCRIPT PARA LIMPIAR TODAS LAS TRANSACCIONES
-- ========================================
--
-- Este script elimina TODAS las transacciones del sistema pero mantiene:
-- ✅ Empresas y su configuración
-- ✅ Usuarios y permisos
-- ✅ Plan de cuentas
-- ✅ Clientes y proveedores
-- ✅ Partners
-- ✅ Nomencladores y configuraciones
-- ✅ Períodos contables
--
-- ❌ Elimina:
-- - Facturas de venta y compra
-- - Asientos contables
-- - Movimientos de tesorería
-- - Comisiones
-- - Pagos
-- - Cuentas por cobrar/pagar
-- - Solicitudes de aprobación
-- - Eventos externos
--
-- ⚠️ ADVERTENCIA: Esta operación NO es reversible
-- ⚠️ Ejecutar solo en desarrollo o antes de iniciar operaciones reales
--
-- ========================================

BEGIN;

-- Desactivar triggers temporalmente para evitar conflictos
SET session_replication_role = replica;

-- ========================================
-- 1. SOLICITUDES DE APROBACIÓN
-- ========================================
TRUNCATE TABLE solicitudes_aprobacion CASCADE;
ALTER SEQUENCE IF EXISTS solicitudes_aprobacion_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Solicitudes de aprobación eliminadas';

-- ========================================
-- 2. EVENTOS EXTERNOS (webhooks)
-- ========================================
TRUNCATE TABLE eventos_externos CASCADE;
ALTER SEQUENCE IF EXISTS eventos_externos_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Eventos externos eliminados';

-- ========================================
-- 3. PAGOS CLIENTE
-- ========================================
TRUNCATE TABLE pagos_cliente CASCADE;
ALTER SEQUENCE IF EXISTS pagos_cliente_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Pagos de clientes eliminados';

-- ========================================
-- 4. PAGOS PROVEEDOR
-- ========================================
TRUNCATE TABLE pagos_proveedor CASCADE;
ALTER SEQUENCE IF EXISTS pagos_proveedor_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Pagos a proveedores eliminados';

-- ========================================
-- 5. MOVIMIENTOS DE TESORERÍA
-- ========================================
TRUNCATE TABLE movimientos_tesoreria CASCADE;
ALTER SEQUENCE IF EXISTS movimientos_tesoreria_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Movimientos de tesorería eliminados';

-- ========================================
-- 6. COMISIONES PARTNERS
-- ========================================
TRUNCATE TABLE comisiones_partners CASCADE;
ALTER SEQUENCE IF EXISTS comisiones_partners_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Comisiones de partners eliminadas';

-- ========================================
-- 7. FACTURAS DE VENTA
-- ========================================
-- Primero los items de factura
TRUNCATE TABLE facturas_venta_items CASCADE;
ALTER SEQUENCE IF EXISTS facturas_venta_items_id_seq RESTART WITH 1;

-- Luego las facturas
TRUNCATE TABLE facturas_venta CASCADE;
ALTER SEQUENCE IF EXISTS facturas_venta_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Facturas de venta eliminadas';

-- ========================================
-- 8. FACTURAS DE COMPRA
-- ========================================
-- Primero los items de factura
TRUNCATE TABLE facturas_compra_items CASCADE;
ALTER SEQUENCE IF EXISTS facturas_compra_items_id_seq RESTART WITH 1;

-- Luego las facturas
TRUNCATE TABLE facturas_compra CASCADE;
ALTER SEQUENCE IF EXISTS facturas_compra_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Facturas de compra eliminadas';

-- ========================================
-- 9. NOTAS DE CRÉDITO
-- ========================================
TRUNCATE TABLE notas_credito_items CASCADE;
ALTER SEQUENCE IF EXISTS notas_credito_items_id_seq RESTART WITH 1;

TRUNCATE TABLE notas_credito CASCADE;
ALTER SEQUENCE IF EXISTS notas_credito_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Notas de crédito eliminadas';

-- ========================================
-- 10. ASIENTOS CONTABLES
-- ========================================
-- Primero el detalle
TRUNCATE TABLE asientos_contables_detalle CASCADE;
ALTER SEQUENCE IF EXISTS asientos_contables_detalle_id_seq RESTART WITH 1;

-- Luego los asientos
TRUNCATE TABLE asientos_contables CASCADE;
ALTER SEQUENCE IF EXISTS asientos_contables_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Asientos contables eliminados';

-- ========================================
-- 11. CUENTAS POR COBRAR / PAGAR
-- ========================================
-- Nota: Estas son vistas, no tablas físicas
-- Se regenerarán automáticamente
RAISE NOTICE '✅ Cuentas por cobrar/pagar se regenerarán automáticamente';

-- ========================================
-- 12. RESETEAR SALDOS DE CUENTAS BANCARIAS
-- ========================================
UPDATE cuentas_bancarias
SET
  saldo_actual = saldo_inicial,
  actualizado_en = NOW()
WHERE empresa_id IS NOT NULL;
RAISE NOTICE '✅ Saldos bancarios reseteados al saldo inicial';

-- ========================================
-- 13. LIMPIAR SNAPSHOTS DE PERÍODOS
-- ========================================
TRUNCATE TABLE periodos_snapshots_saldos CASCADE;
ALTER SEQUENCE IF EXISTS periodos_snapshots_saldos_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Snapshots de períodos eliminados';

-- ========================================
-- 14. REINICIAR CONTADORES DE DOCUMENTOS
-- ========================================
-- Resetear el último número de factura por serie
UPDATE empresas_config_cfe
SET
  ultimo_numero_usado = 0,
  actualizado_en = NOW()
WHERE id IS NOT NULL;
RAISE NOTICE '✅ Contadores de documentos reiniciados';

-- ========================================
-- 15. LIMPIAR METADATOS DE TRANSACCIONES
-- ========================================
-- Limpiar metadata relacionada con transacciones en clientes
UPDATE clientes
SET metadata = COALESCE(
  jsonb_strip_nulls(
    CASE
      WHEN metadata IS NOT NULL THEN
        metadata - 'ultima_factura' - 'total_facturas' - 'saldo_pendiente'
      ELSE '{}'::jsonb
    END
  ),
  '{}'::jsonb
)
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'ultima_factura' OR
    metadata ? 'total_facturas' OR
    metadata ? 'saldo_pendiente'
  );

-- Limpiar metadata relacionada con transacciones en proveedores
UPDATE proveedores
SET metadata = COALESCE(
  jsonb_strip_nulls(
    CASE
      WHEN metadata IS NOT NULL THEN
        metadata - 'ultima_factura' - 'total_facturas' - 'saldo_pendiente'
      ELSE '{}'::jsonb
    END
  ),
  '{}'::jsonb
)
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'ultima_factura' OR
    metadata ? 'total_facturas' OR
    metadata ? 'saldo_pendiente'
  );

RAISE NOTICE '✅ Metadata de clientes/proveedores limpiada';

-- ========================================
-- 16. REABRIR TODOS LOS PERÍODOS CERRADOS
-- ========================================
UPDATE periodos_contables
SET
  estado = 'abierto',
  fecha_cierre = NULL,
  cerrado_por = NULL,
  actualizado_en = NOW()
WHERE estado = 'cerrado';
RAISE NOTICE '✅ Períodos contables reabiertos';

-- Reactivar triggers
SET session_replication_role = DEFAULT;

-- ========================================
-- RESUMEN FINAL
-- ========================================
DO $$
DECLARE
  v_empresas INT;
  v_usuarios INT;
  v_clientes INT;
  v_proveedores INT;
  v_partners INT;
  v_cuentas INT;
BEGIN
  SELECT COUNT(*) INTO v_empresas FROM empresas;
  SELECT COUNT(*) INTO v_usuarios FROM usuarios;
  SELECT COUNT(*) INTO v_clientes FROM clientes;
  SELECT COUNT(*) INTO v_proveedores FROM proveedores;
  SELECT COUNT(*) INTO v_partners FROM partners;
  SELECT COUNT(*) INTO v_cuentas FROM plan_cuentas;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LIMPIEZA COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 CONFIGURACIÓN MANTENIDA:';
  RAISE NOTICE '   - Empresas: %', v_empresas;
  RAISE NOTICE '   - Usuarios: %', v_usuarios;
  RAISE NOTICE '   - Clientes: %', v_clientes;
  RAISE NOTICE '   - Proveedores: %', v_proveedores;
  RAISE NOTICE '   - Partners: %', v_partners;
  RAISE NOTICE '   - Cuentas contables: %', v_cuentas;
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATOS ELIMINADOS:';
  RAISE NOTICE '   - Todas las facturas';
  RAISE NOTICE '   - Todos los asientos contables';
  RAISE NOTICE '   - Todos los movimientos de tesorería';
  RAISE NOTICE '   - Todas las comisiones';
  RAISE NOTICE '   - Todos los pagos';
  RAISE NOTICE '   - Todas las solicitudes de aprobación';
  RAISE NOTICE '   - Todos los eventos externos';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Sistema listo para iniciar transacciones nuevas';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ========================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ========================================
-- Descomentar para ver el estado final de las tablas
/*
SELECT
  'facturas_venta' as tabla,
  COUNT(*) as registros
FROM facturas_venta
UNION ALL
SELECT 'facturas_compra', COUNT(*) FROM facturas_compra
UNION ALL
SELECT 'asientos_contables', COUNT(*) FROM asientos_contables
UNION ALL
SELECT 'movimientos_tesoreria', COUNT(*) FROM movimientos_tesoreria
UNION ALL
SELECT 'comisiones_partners', COUNT(*) FROM comisiones_partners
UNION ALL
SELECT 'pagos_cliente', COUNT(*) FROM pagos_cliente
UNION ALL
SELECT 'pagos_proveedor', COUNT(*) FROM pagos_proveedor
UNION ALL
SELECT 'solicitudes_aprobacion', COUNT(*) FROM solicitudes_aprobacion
UNION ALL
SELECT 'eventos_externos', COUNT(*) FROM eventos_externos
ORDER BY registros DESC;
*/
