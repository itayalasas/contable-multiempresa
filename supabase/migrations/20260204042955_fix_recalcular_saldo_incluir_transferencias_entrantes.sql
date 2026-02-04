/*
  # Fix Recalcular Saldo - Incluir Transferencias Entrantes

  1. Problema
    - La función recalcular_saldo solo considera movimientos donde cuenta_bancaria_id = cuenta
    - No considera transferencias ENTRANTES donde la cuenta es destino (metadata.cuenta_destino_id)
    
  2. Solución
    - Sumar también las transferencias donde metadata.cuenta_destino_id = cuenta
    
  3. Resultado
    - Los saldos se calculan correctamente considerando:
      * INGRESOS y EGRESOS propios
      * TRANSFERENCIAS salientes (resta)
      * TRANSFERENCIAS entrantes (suma)
*/

CREATE OR REPLACE FUNCTION recalcular_saldo_cuenta_bancaria(p_cuenta_bancaria_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_inicial NUMERIC;
  v_total_movimientos NUMERIC;
  v_total_transferencias_entrantes NUMERIC;
  v_saldo_final NUMERIC;
BEGIN
  -- Obtener saldo inicial
  SELECT saldo_inicial INTO v_saldo_inicial
  FROM cuentas_bancarias
  WHERE id = p_cuenta_bancaria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada: %', p_cuenta_bancaria_id;
  END IF;

  -- Calcular suma de todos los movimientos NO ELIMINADOS de esta cuenta
  -- INGRESO: suma
  -- EGRESO: resta
  -- TRANSFERENCIA: resta (salida de la cuenta origen)
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo_movimiento = 'INGRESO' THEN monto
      WHEN tipo_movimiento = 'EGRESO' THEN -monto
      WHEN tipo_movimiento = 'TRANSFERENCIA' THEN -monto
      ELSE 0
    END
  ), 0) INTO v_total_movimientos
  FROM movimientos_tesoreria
  WHERE cuenta_bancaria_id = p_cuenta_bancaria_id
    AND (eliminado IS NULL OR eliminado = false);

  -- Calcular transferencias ENTRANTES (donde esta cuenta es el destino)
  SELECT COALESCE(SUM(monto), 0) INTO v_total_transferencias_entrantes
  FROM movimientos_tesoreria
  WHERE tipo_movimiento = 'TRANSFERENCIA'
    AND metadata IS NOT NULL
    AND (metadata->>'cuenta_destino_id')::uuid = p_cuenta_bancaria_id
    AND (eliminado IS NULL OR eliminado = false);

  -- Calcular saldo final
  v_saldo_final := v_saldo_inicial + v_total_movimientos + v_total_transferencias_entrantes;

  -- Actualizar saldo_actual
  UPDATE cuentas_bancarias
  SET 
    saldo_actual = v_saldo_final,
    updated_at = NOW()
  WHERE id = p_cuenta_bancaria_id;

  RAISE NOTICE 'Saldo actualizado para cuenta %: Inicial=%, Movimientos=%, Transferencias_Entrantes=%, Final=%', 
    p_cuenta_bancaria_id, v_saldo_inicial, v_total_movimientos, v_total_transferencias_entrantes, v_saldo_final;
END;
$$;

COMMENT ON FUNCTION recalcular_saldo_cuenta_bancaria(UUID) IS
  'Recalcula el saldo_actual de una cuenta bancaria basándose en saldo_inicial + movimientos NO ELIMINADOS (INGRESOS, EGRESOS, TRANSFERENCIAS salientes y entrantes)';

-- Recalcular todos los saldos para aplicar el nuevo cálculo
SELECT * FROM recalcular_saldos_cuentas_bancarias(NULL);
