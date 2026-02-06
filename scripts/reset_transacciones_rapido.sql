-- ========================================
-- RESET RÁPIDO DE TRANSACCIONES
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- Desactivar triggers
SET session_replication_role = replica;

-- Limpiar transacciones (en orden por foreign keys)
TRUNCATE TABLE
  solicitudes_aprobacion,
  eventos_externos,
  pagos_cliente,
  pagos_proveedor,
  movimientos_tesoreria,
  comisiones_partners,
  facturas_venta_items,
  facturas_venta,
  facturas_compra_items,
  facturas_compra,
  notas_credito_items,
  notas_credito,
  asientos_contables_detalle,
  asientos_contables,
  periodos_snapshots_saldos
CASCADE;

-- Resetear saldos bancarios
UPDATE cuentas_bancarias
SET saldo_actual = saldo_inicial;

-- Resetear contadores de facturas
UPDATE empresas_config_cfe
SET ultimo_numero_usado = 0;

-- Reabrir períodos
UPDATE periodos_contables
SET estado = 'abierto',
    fecha_cierre = NULL,
    cerrado_por = NULL;

-- Reactivar triggers
SET session_replication_role = DEFAULT;

-- Mostrar resultado
SELECT
  'facturas_venta' as tabla,
  COUNT(*) as registros
FROM facturas_venta
UNION ALL
SELECT 'asientos_contables', COUNT(*) FROM asientos_contables
UNION ALL
SELECT 'movimientos_tesoreria', COUNT(*) FROM movimientos_tesoreria
UNION ALL
SELECT 'comisiones_partners', COUNT(*) FROM comisiones_partners;
