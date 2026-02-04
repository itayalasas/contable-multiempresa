/*
  # Fix Saldos Bancarios - Eliminar Trigger Duplicado

  1. Problema
    - Existen DOS triggers actualizando saldo_actual de cuentas bancarias
    - trigger_actualizar_saldo_bancario (antiguo): suma/resta directamente
    - trg_actualizar_saldo_cuenta_bancaria (nuevo): recalcula todo
    - Esto causa doble actualización y saldos incorrectos

  2. Solución
    - Eliminar el trigger antiguo
    - Mantener solo el nuevo que recalcula correctamente
    - Recalcular todos los saldos para corregir errores existentes

  3. Resultado
    - Un solo trigger que recalcula saldos correctamente
    - Saldos basados únicamente en movimientos_tesoreria
    - No más saldos negativos incorrectos
*/

-- 1. Eliminar trigger antiguo y su función
DROP TRIGGER IF EXISTS trigger_actualizar_saldo_bancario ON movimientos_tesoreria;
DROP FUNCTION IF EXISTS actualizar_saldo_bancario();

-- 2. Recalcular todos los saldos de cuentas bancarias
DO $$
DECLARE
  v_resultado RECORD;
  v_total_corregidas INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Recalculando saldos de cuentas bancarias...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  FOR v_resultado IN
    SELECT * FROM recalcular_saldos_cuentas_bancarias(NULL)
  LOOP
    IF ABS(v_resultado.diferencia) > 0.01 THEN
      v_total_corregidas := v_total_corregidas + 1;
      RAISE NOTICE '✅ Cuenta: %', v_resultado.cuenta_nombre;
      RAISE NOTICE '   Saldo anterior: $%', v_resultado.saldo_anterior;
      RAISE NOTICE '   Saldo nuevo: $%', v_resultado.saldo_nuevo;
      RAISE NOTICE '   Diferencia: $%', v_resultado.diferencia;
      RAISE NOTICE '';
    END IF;
  END LOOP;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Recálculo completado. % cuenta(s) corregida(s).', v_total_corregidas;
END $$;

-- 3. Comentarios
COMMENT ON TRIGGER trg_after_insert_movimiento_tesoreria ON movimientos_tesoreria IS
  'Único trigger para actualizar saldo_actual de cuentas bancarias. Recalcula el saldo completo basándose en saldo_inicial + suma de movimientos';
