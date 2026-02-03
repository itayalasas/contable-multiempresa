/*
  # Corregir generación de snapshots de saldos

  ## Descripción
  Actualiza la función generar_snapshots_saldos_periodo para usar
  la misma lógica corregida de cálculo de saldos por periodo.

  ## Cambios
  1. Calcula saldo_inicio_periodo considerando movimientos anteriores
  2. Usa este saldo como base para calcular el saldo final del periodo
  3. Almacena información detallada en el snapshot

  ## Notas
  - Consistente con validar_tesoreria_periodo
  - Mantiene trazabilidad completa de saldos
*/

-- Reemplazar función de generación de snapshots
CREATE OR REPLACE FUNCTION generar_snapshots_saldos_periodo(
  p_periodo_id uuid,
  p_empresa_id uuid,
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuenta record;
  v_snapshots_creados integer := 0;
  v_saldo_inicio_periodo numeric;
  v_saldo_calculado numeric;
  v_diferencia numeric;
BEGIN
  -- Generar snapshot para cada cuenta bancaria activa
  FOR v_cuenta IN
    SELECT
      cb.id as cuenta_id,
      cb.nombre,
      cb.numero_cuenta,
      cb.banco,
      cb.tipo_cuenta,
      cb.moneda,
      cb.saldo_inicial,
      cb.saldo_actual,
      -- Movimientos ANTERIORES al periodo
      COALESCE(SUM(CASE 
        WHEN mt_antes.tipo_movimiento = 'INGRESO' THEN mt_antes.monto 
        WHEN mt_antes.tipo_movimiento = 'EGRESO' THEN -mt_antes.monto
        ELSE 0 
      END), 0) as movimientos_anteriores,
      -- Movimientos DEL periodo
      COALESCE(SUM(CASE 
        WHEN mt_periodo.tipo_movimiento = 'INGRESO' THEN mt_periodo.monto 
        ELSE 0 
      END), 0) as total_ingresos,
      COALESCE(SUM(CASE 
        WHEN mt_periodo.tipo_movimiento = 'EGRESO' THEN mt_periodo.monto 
        ELSE 0 
      END), 0) as total_egresos,
      COALESCE(COUNT(CASE 
        WHEN mt_periodo.tipo_movimiento = 'INGRESO' THEN 1 
      END), 0) as cantidad_ingresos,
      COALESCE(COUNT(CASE 
        WHEN mt_periodo.tipo_movimiento = 'EGRESO' THEN 1 
      END), 0) as cantidad_egresos
    FROM cuentas_bancarias cb
    -- Movimientos anteriores al periodo
    LEFT JOIN movimientos_tesoreria mt_antes 
      ON mt_antes.cuenta_bancaria_id = cb.id
      AND mt_antes.fecha < p_fecha_inicio
    -- Movimientos del periodo
    LEFT JOIN movimientos_tesoreria mt_periodo 
      ON mt_periodo.cuenta_bancaria_id = cb.id
      AND mt_periodo.fecha >= p_fecha_inicio
      AND mt_periodo.fecha <= p_fecha_fin
    WHERE cb.empresa_id = p_empresa_id
      AND cb.activa = true
    GROUP BY cb.id, cb.nombre, cb.numero_cuenta, cb.banco, cb.tipo_cuenta,
             cb.moneda, cb.saldo_inicial, cb.saldo_actual
  LOOP
    -- Calcular saldo al inicio del periodo
    v_saldo_inicio_periodo := v_cuenta.saldo_inicial + v_cuenta.movimientos_anteriores;
    
    -- Calcular saldo esperado al fin del periodo
    v_saldo_calculado := v_saldo_inicio_periodo + v_cuenta.total_ingresos - v_cuenta.total_egresos;
    
    -- Diferencia con saldo actual
    v_diferencia := v_cuenta.saldo_actual - v_saldo_calculado;

    -- Insertar snapshot
    INSERT INTO snapshots_saldos_bancarios (
      periodo_id,
      empresa_id,
      cuenta_bancaria_id,
      nombre_cuenta,
      numero_cuenta,
      banco,
      tipo_cuenta,
      moneda,
      saldo_inicial,
      saldo_final,
      total_ingresos,
      total_egresos,
      cantidad_ingresos,
      cantidad_egresos,
      saldo_calculado,
      diferencia,
      validado,
      fecha_snapshot,
      observaciones
    ) VALUES (
      p_periodo_id,
      p_empresa_id,
      v_cuenta.cuenta_id,
      v_cuenta.nombre,
      v_cuenta.numero_cuenta,
      v_cuenta.banco,
      v_cuenta.tipo_cuenta,
      v_cuenta.moneda,
      v_saldo_inicio_periodo,  -- Saldo al inicio del periodo (no saldo_inicial de la cuenta)
      v_cuenta.saldo_actual,   -- Saldo actual/final
      v_cuenta.total_ingresos,
      v_cuenta.total_egresos,
      v_cuenta.cantidad_ingresos,
      v_cuenta.cantidad_egresos,
      v_saldo_calculado,
      v_diferencia,
      ABS(v_diferencia) <= 0.01,
      now(),
      CASE 
        WHEN ABS(v_diferencia) > 0.01 THEN 
          'Cuenta descuadrada. Diferencia: $' || v_diferencia::text
        ELSE 
          'Cuenta cuadrada correctamente'
      END
    );

    v_snapshots_creados := v_snapshots_creados + 1;
  END LOOP;

  RETURN v_snapshots_creados;
END;
$$;

COMMENT ON FUNCTION generar_snapshots_saldos_periodo IS 'Genera snapshots de todas las cuentas bancarias para un periodo con saldos correctos';