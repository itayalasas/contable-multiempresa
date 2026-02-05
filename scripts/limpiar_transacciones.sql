/*
  # Limpieza Completa de Transacciones

  Este script elimina todas las transacciones del sistema manteniendo:
  - Nomencladores (clientes, proveedores, partners, plan de cuentas, etc.)
  - Configuración de empresas
  - Usuarios
  - Periodos contables (estructura)

  Se eliminan:
  - Todas las facturas de venta y compra
  - Todos los asientos contables
  - Todas las comisiones
  - Todos los movimientos de tesorería
  - Todos los pagos (clientes y proveedores)
  - Todas las solicitudes de aprobación
  - Todos los eventos externos (órdenes del marketplace)
  - Se resetean saldos en cuentas bancarias
  - Se reabren periodos contables cerrados
*/

BEGIN;

-- 1. Limpiar eventos externos (órdenes del marketplace) PRIMERO
DELETE FROM eventos_externos;
RAISE NOTICE '✓ Eventos externos eliminados';

-- 2. Eliminar solicitudes de aprobación
DELETE FROM solicitudes_aprobacion;
RAISE NOTICE '✓ Solicitudes de aprobación eliminadas';

-- 3. Eliminar items de facturas de venta
DELETE FROM facturas_venta_items;
RAISE NOTICE '✓ Items de facturas de venta eliminados';

-- 4. Eliminar facturas de venta
DELETE FROM facturas_venta;
RAISE NOTICE '✓ Facturas de venta eliminadas';

-- 5. Eliminar items de facturas de compra
DELETE FROM facturas_compra_items;
RAISE NOTICE '✓ Items de facturas de compra eliminados';

-- 6. Eliminar facturas de compra
DELETE FROM facturas_compra;
RAISE NOTICE '✓ Facturas de compra eliminadas';

-- 7. Eliminar pagos a clientes
DELETE FROM pagos_cliente;
RAISE NOTICE '✓ Pagos a clientes eliminados';

-- 8. Eliminar pagos a proveedores
DELETE FROM pagos_proveedor;
RAISE NOTICE '✓ Pagos a proveedores eliminados';

-- 9. Eliminar comisiones de partners
DELETE FROM comisiones_partners;
RAISE NOTICE '✓ Comisiones de partners eliminadas';

-- 10. Eliminar movimientos de tesorería
DELETE FROM movimientos_tesoreria;
RAISE NOTICE '✓ Movimientos de tesorería eliminados';

-- 11. Eliminar movimientos contables
DELETE FROM movimientos_contables;
RAISE NOTICE '✓ Movimientos contables eliminados';

-- 12. Eliminar asientos contables
DELETE FROM asientos_contables;
RAISE NOTICE '✓ Asientos contables eliminados';

-- 13. Resetear saldos en cuentas bancarias
UPDATE cuentas_bancarias
SET saldo_actual = saldo_inicial
WHERE saldo_actual != saldo_inicial;
RAISE NOTICE '✓ Saldos de cuentas bancarias reseteados';

-- 14. Reabrir periodos contables cerrados
UPDATE periodos_contables
SET estado = 'abierto'
WHERE estado = 'cerrado';
RAISE NOTICE '✓ Periodos contables reabiertos';

COMMIT;

-- Mostrar resumen
DO $$
DECLARE
  count_facturas_venta INTEGER;
  count_facturas_compra INTEGER;
  count_asientos INTEGER;
  count_movimientos_tesoreria INTEGER;
  count_comisiones INTEGER;
  count_cuentas_bancarias INTEGER;
  saldo_total NUMERIC;
BEGIN
  SELECT COUNT(*) INTO count_facturas_venta FROM facturas_venta;
  SELECT COUNT(*) INTO count_facturas_compra FROM facturas_compra;
  SELECT COUNT(*) INTO count_asientos FROM asientos_contables;
  SELECT COUNT(*) INTO count_movimientos_tesoreria FROM movimientos_tesoreria;
  SELECT COUNT(*) INTO count_comisiones FROM comisiones_partners;
  SELECT COUNT(*) INTO count_cuentas_bancarias FROM cuentas_bancarias;
  SELECT COALESCE(SUM(saldo_actual), 0) INTO saldo_total FROM cuentas_bancarias;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '         RESUMEN DE LIMPIEZA COMPLETADO         ';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Facturas de Venta: % (esperado: 0)', count_facturas_venta;
  RAISE NOTICE 'Facturas de Compra: % (esperado: 0)', count_facturas_compra;
  RAISE NOTICE 'Asientos Contables: % (esperado: 0)', count_asientos;
  RAISE NOTICE 'Movimientos Tesorería: % (esperado: 0)', count_movimientos_tesoreria;
  RAISE NOTICE 'Comisiones: % (esperado: 0)', count_comisiones;
  RAISE NOTICE 'Cuentas Bancarias: %', count_cuentas_bancarias;
  RAISE NOTICE 'Saldo Total Tesorería: $%', saldo_total;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  IF count_facturas_venta = 0 AND count_facturas_compra = 0 AND
     count_asientos = 0 AND count_movimientos_tesoreria = 0 AND
     count_comisiones = 0 THEN
    RAISE NOTICE '✅ SISTEMA LIMPIO - Listo para nuevas transacciones';
  ELSE
    RAISE NOTICE '⚠️ ADVERTENCIA - Aún quedan registros';
  END IF;

  RAISE NOTICE '';
END $$;
