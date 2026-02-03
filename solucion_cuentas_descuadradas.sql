/*
  # SOLUCIÓN PARA CUENTAS BANCARIAS DESCUADRADAS

  ## PROBLEMA IDENTIFICADO
  Estás intentando cerrar Diciembre 2024, pero hay movimientos de tesorería
  del 24 de noviembre de 2025 (11 meses después) que causan el descuadre:

  - Cuenta Banco República: -$7,080.82
  - Cuenta Banco Santander: -$834.20
  - Cuenta Banco General: -$4,267.00

  ## OPCIONES DE SOLUCIÓN

  Elige UNA de las siguientes opciones según tu caso:
*/

-- =====================================================
-- OPCIÓN 1: Mover movimientos a diciembre 2024
-- =====================================================
-- Usa esta opción SI: Los movimientos fueron ingresados con fecha incorrecta
--                     y realmente deberían ser de diciembre 2024
--
-- IMPORTANTE: Esto también actualizará las fechas de los asientos contables asociados

-- PASO 1: Ver qué se va a cambiar (REVISAR ANTES DE EJECUTAR)
SELECT
  'MOVIMIENTO' as tipo,
  mt.id,
  cb.nombre as cuenta,
  mt.fecha as fecha_actual,
  '2024-12-15'::date as fecha_nueva,
  mt.monto,
  mt.descripcion
FROM movimientos_tesoreria mt
JOIN cuentas_bancarias cb ON cb.id = mt.cuenta_bancaria_id
WHERE mt.fecha = '2025-11-24'
  AND cb.nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')

UNION ALL

SELECT
  'ASIENTO' as tipo,
  a.id,
  a.descripcion as cuenta,
  a.fecha as fecha_actual,
  '2024-12-15'::date as fecha_nueva,
  NULL as monto,
  a.numero as descripcion
FROM asientos_contables a
WHERE a.id IN (
  SELECT asiento_contable_id
  FROM movimientos_tesoreria
  WHERE fecha = '2025-11-24'
    AND cuenta_bancaria_id IN (
      SELECT id FROM cuentas_bancarias
      WHERE nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
    )
);

-- PASO 2: SI ESTÁS SEGURO, descomenta y ejecuta:
/*
-- Actualizar fechas de movimientos
UPDATE movimientos_tesoreria
SET fecha = '2024-12-15'
WHERE fecha = '2025-11-24'
  AND cuenta_bancaria_id IN (
    SELECT id FROM cuentas_bancarias
    WHERE nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
  );

-- Actualizar fechas de asientos asociados
UPDATE asientos_contables
SET fecha = '2024-12-15'
WHERE id IN (
  SELECT asiento_contable_id
  FROM movimientos_tesoreria
  WHERE fecha = '2024-12-15'
    AND cuenta_bancaria_id IN (
      SELECT id FROM cuentas_bancarias
      WHERE nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
    )
);

-- Recalcular saldos
SELECT * FROM recalcular_saldos_cuentas_bancarias('a2fb84eb-c91c-4f3e-88c3-4a9c3420009e');
*/

-- =====================================================
-- OPCIÓN 2: Crear movimientos de ingreso para balance
-- =====================================================
-- Usa esta opción SI: Los movimientos de nov/2025 son correctos, pero necesitas
--                     cerrar dic/2024 sin estos egresos
--
-- Esto crea ingresos "de ajuste" en dic/2024 para que el saldo al cierre sea $0

-- PASO 1: Ver los ingresos que se crearían (REVISAR ANTES DE EJECUTAR)
SELECT
  cb.id as cuenta_bancaria_id,
  cb.nombre,
  cb.saldo_actual * -1 as ingreso_necesario,
  '2024-12-01'::date as fecha_ingreso,
  'Ajuste de apertura - Saldo inicial' as descripcion
FROM cuentas_bancarias cb
WHERE cb.nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
  AND cb.saldo_actual < 0;

-- PASO 2: SI ESTÁS SEGURO, descomenta y ejecuta:
/*
-- Crear movimientos de ingreso
INSERT INTO movimientos_tesoreria (
  id,
  empresa_id,
  cuenta_bancaria_id,
  fecha,
  tipo_movimiento,
  monto,
  descripcion,
  referencia,
  created_by
)
SELECT
  gen_random_uuid(),
  cb.empresa_id,
  cb.id,
  '2024-12-01'::date,
  'INGRESO',
  ABS(cb.saldo_actual),
  'Ajuste de apertura - Saldo inicial de cuenta',
  'ADJ-DIC-2024',
  'auth0|676f6d6ef33c56b0d6303e43'
FROM cuentas_bancarias cb
WHERE cb.nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
  AND cb.saldo_actual < 0;

-- Recalcular saldos
SELECT * FROM recalcular_saldos_cuentas_bancarias('a2fb84eb-c91c-4f3e-88c3-4a9c3420009e');
*/

-- =====================================================
-- OPCIÓN 3: Eliminar los movimientos de nov/2025
-- =====================================================
-- Usa esta opción SI: Los movimientos fueron creados por error y no deberían existir

-- PASO 1: Ver qué se va a eliminar (REVISAR ANTES DE EJECUTAR)
SELECT
  mt.id,
  cb.nombre as cuenta,
  mt.fecha,
  mt.tipo_movimiento,
  mt.monto,
  mt.descripcion,
  a.numero as asiento
FROM movimientos_tesoreria mt
JOIN cuentas_bancarias cb ON cb.id = mt.cuenta_bancaria_id
LEFT JOIN asientos_contables a ON a.id = mt.asiento_contable_id
WHERE mt.fecha = '2025-11-24'
  AND cb.nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General');

-- PASO 2: SI ESTÁS SEGURO, descomenta y ejecuta:
/*
-- IMPORTANTE: Esto también eliminará los asientos contables asociados si no tienen otros movimientos

-- Eliminar movimientos
DELETE FROM movimientos_tesoreria
WHERE fecha = '2025-11-24'
  AND cuenta_bancaria_id IN (
    SELECT id FROM cuentas_bancarias
    WHERE nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General')
  );

-- Eliminar asientos huérfanos (que ya no tienen movimientos asociados)
DELETE FROM detalle_asiento
WHERE asiento_id IN (
  SELECT a.id FROM asientos_contables a
  LEFT JOIN movimientos_tesoreria mt ON mt.asiento_contable_id = a.id
  WHERE mt.id IS NULL
    AND a.fecha = '2025-11-24'
);

DELETE FROM asientos_contables
WHERE id IN (
  SELECT a.id FROM asientos_contables a
  LEFT JOIN detalle_asiento da ON da.asiento_id = a.id
  WHERE da.id IS NULL
    AND a.fecha = '2025-11-24'
);

-- Recalcular saldos
SELECT * FROM recalcular_saldos_cuentas_bancarias('a2fb84eb-c91c-4f3e-88c3-4a9c3420009e');
*/

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Ejecuta esto después de aplicar cualquier opción para verificar que funcionó:

-- 1. Ver saldos actuales
SELECT
  nombre,
  saldo_inicial,
  saldo_actual,
  (SELECT COUNT(*) FROM movimientos_tesoreria mt WHERE mt.cuenta_bancaria_id = cb.id) as movimientos
FROM cuentas_bancarias cb
WHERE nombre IN ('Cuenta Banco República', 'Cuenta Banco Santander', 'Cuenta Banco General');

-- 2. Validar tesorería para dic/2024
SELECT
  valido,
  cuentas_descuadradas,
  movimientos_sin_asiento
FROM validar_tesoreria_periodo(
  'a2fb84eb-c91c-4f3e-88c3-4a9c3420009e'::UUID,
  '2024-12-01'::DATE,
  '2024-12-31'::DATE
);
