/*
  # Fix Recalcular Saldo - Excluir Movimientos Eliminados

  1. Problema
    - La función recalcular_saldo_cuenta_bancaria NO excluye movimientos eliminados
    - Esto causa saldos negativos incorrectos por movimientos que ya no deberían contar

  2. Solución
    - Actualizar función para filtrar eliminado IS NULL OR eliminado = false
    - Recalcular todos los saldos correctamente

  3. Resultado
    - Saldos correctos sin incluir movimientos eliminados
*/

-- Actualizar función para excluir movimientos eliminados
CREATE OR REPLACE FUNCTION recalcular_saldo_cuenta_bancaria(p_cuenta_bancaria_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_inicial NUMERIC;
  v_total_movimientos NUMERIC;
  v_saldo_final NUMERIC;
BEGIN
  -- Obtener saldo inicial
  SELECT saldo_inicial INTO v_saldo_inicial
  FROM cuentas_bancarias
  WHERE id = p_cuenta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada: %', p_cuenta_bancaria_id;
  END IF;

  -- Calcular suma de todos los movimientos NO ELIMINADOS
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo_movimiento = 'INGRESO' THEN monto
      WHEN tipo_movimiento = 'EGRESO' THEN -monto
      ELSE 0
    END
  ), 0) INTO v_total_movimientos
  FROM movimientos_tesoreria
  WHERE cuenta_bancaria_id = p_cuenta_bancaria_id
    AND (eliminado IS NULL OR eliminado = false); -- FILTRO CRÍTICO

  -- Calcular saldo final
  v_saldo_final := v_saldo_inicial + v_total_movimientos;

  -- Actualizar saldo_actual
  UPDATE cuentas_bancarias
  SET 
    saldo_actual = v_saldo_final,
    updated_at = NOW()
  WHERE id = p_cuenta_bancaria_id;

  RAISE NOTICE 'Saldo actualizado para cuenta %: Inicial=%, Movimientos=%, Final=%', 
    p_cuenta_bancaria_id, v_saldo_inicial, v_total_movimientos, v_saldo_final;
END;
$$;

COMMENT ON FUNCTION recalcular_saldo_cuenta_bancaria(UUID) IS
  'Recalcula el saldo_actual de una cuenta bancaria basándose en saldo_inicial + suma de movimientos NO ELIMINADOS';

-- Recalcular todos los saldos
SELECT * FROM recalcular_saldos_cuentas_bancarias(NULL);
