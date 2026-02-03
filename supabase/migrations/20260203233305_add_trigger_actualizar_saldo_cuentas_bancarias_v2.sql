/*
  # Trigger para actualizar saldo de cuentas bancarias automáticamente
  
  ## Descripción
  Crea un trigger que actualiza automáticamente el campo `saldo_actual` de las
  cuentas bancarias cada vez que se inserta, actualiza o elimina un movimiento
  de tesorería.
  
  ## Componentes
  1. Función trigger que actualiza el saldo
  2. Trigger AFTER INSERT en movimientos_tesoreria
  3. Trigger AFTER UPDATE en movimientos_tesoreria
  4. Trigger AFTER DELETE en movimientos_tesoreria
  5. Función helper para recalcular todos los saldos
  
  ## Lógica
  - INGRESO: suma al saldo_actual
  - EGRESO: resta del saldo_actual
  - Actualiza basándose en el saldo_inicial + suma de todos los movimientos
  
  ## Notas Importantes
  1. El trigger recalcula el saldo completo en lugar de incrementarlo
  2. Esto evita errores de acumulación y garantiza consistencia
  3. Se provee función `recalcular_saldos_cuentas_bancarias` para correcciones masivas
*/

-- 1. FUNCIÓN: Recalcular saldo de una cuenta bancaria específica
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

  -- Calcular suma de todos los movimientos
  SELECT COALESCE(SUM(
    CASE 
      WHEN tipo_movimiento = 'INGRESO' THEN monto
      WHEN tipo_movimiento = 'EGRESO' THEN -monto
      ELSE 0
    END
  ), 0) INTO v_total_movimientos
  FROM movimientos_tesoreria
  WHERE cuenta_bancaria_id = p_cuenta_bancaria_id;

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

-- 2. FUNCIÓN: Trigger para actualizar saldo después de INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION trg_actualizar_saldo_cuenta_bancaria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- En INSERT o UPDATE, actualizar cuenta del nuevo movimiento
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM recalcular_saldo_cuenta_bancaria(NEW.cuenta_bancaria_id);
    
    -- Si UPDATE y cambió de cuenta, actualizar también la cuenta anterior
    IF (TG_OP = 'UPDATE' AND OLD.cuenta_bancaria_id != NEW.cuenta_bancaria_id) THEN
      PERFORM recalcular_saldo_cuenta_bancaria(OLD.cuenta_bancaria_id);
    END IF;
    
    RETURN NEW;
  END IF;

  -- En DELETE, actualizar cuenta del movimiento eliminado
  IF (TG_OP = 'DELETE') THEN
    PERFORM recalcular_saldo_cuenta_bancaria(OLD.cuenta_bancaria_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. CREAR TRIGGERS
DROP TRIGGER IF EXISTS trg_after_insert_movimiento_tesoreria ON movimientos_tesoreria;
CREATE TRIGGER trg_after_insert_movimiento_tesoreria
  AFTER INSERT ON movimientos_tesoreria
  FOR EACH ROW
  EXECUTE FUNCTION trg_actualizar_saldo_cuenta_bancaria();

DROP TRIGGER IF EXISTS trg_after_update_movimiento_tesoreria ON movimientos_tesoreria;
CREATE TRIGGER trg_after_update_movimiento_tesoreria
  AFTER UPDATE ON movimientos_tesoreria
  FOR EACH ROW
  EXECUTE FUNCTION trg_actualizar_saldo_cuenta_bancaria();

DROP TRIGGER IF EXISTS trg_after_delete_movimiento_tesoreria ON movimientos_tesoreria;
CREATE TRIGGER trg_after_delete_movimiento_tesoreria
  AFTER DELETE ON movimientos_tesoreria
  FOR EACH ROW
  EXECUTE FUNCTION trg_actualizar_saldo_cuenta_bancaria();

-- 4. FUNCIÓN: Recalcular saldos de todas las cuentas bancarias de una empresa
CREATE OR REPLACE FUNCTION recalcular_saldos_cuentas_bancarias(p_empresa_id UUID DEFAULT NULL)
RETURNS TABLE(
  cuenta_id UUID,
  cuenta_nombre TEXT,
  saldo_anterior NUMERIC,
  saldo_nuevo NUMERIC,
  diferencia NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuenta RECORD;
  v_saldo_anterior NUMERIC;
  v_saldo_nuevo NUMERIC;
BEGIN
  FOR v_cuenta IN
    SELECT id, nombre, saldo_actual
    FROM cuentas_bancarias
    WHERE (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
      AND activa = true
  LOOP
    v_saldo_anterior := v_cuenta.saldo_actual;
    
    -- Recalcular saldo
    PERFORM recalcular_saldo_cuenta_bancaria(v_cuenta.id);
    
    -- Obtener nuevo saldo
    SELECT saldo_actual INTO v_saldo_nuevo
    FROM cuentas_bancarias
    WHERE id = v_cuenta.id;
    
    -- Retornar resultado
    RETURN QUERY SELECT
      v_cuenta.id,
      v_cuenta.nombre,
      v_saldo_anterior,
      v_saldo_nuevo,
      ABS(v_saldo_nuevo - v_saldo_anterior);
  END LOOP;
END;
$$;

-- 5. COMENTARIOS
COMMENT ON FUNCTION recalcular_saldo_cuenta_bancaria(UUID) IS
  'Recalcula el saldo_actual de una cuenta bancaria basándose en saldo_inicial + suma de movimientos';

COMMENT ON FUNCTION trg_actualizar_saldo_cuenta_bancaria() IS
  'Función trigger que actualiza automáticamente el saldo_actual cuando hay cambios en movimientos_tesoreria';

COMMENT ON FUNCTION recalcular_saldos_cuentas_bancarias(UUID) IS
  'Recalcula los saldos de todas las cuentas bancarias de una empresa (o todas si no se especifica). Retorna tabla con diferencias encontradas.';

-- 6. EJECUTAR RECALCULO INICIAL para corregir descuadres existentes
-- Esto recalculará todos los saldos actuales basándose en los movimientos existentes
DO $$
DECLARE
  v_resultado RECORD;
  v_total_corregidas INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recálculo de saldos de cuentas bancarias...';
  
  FOR v_resultado IN
    SELECT * FROM recalcular_saldos_cuentas_bancarias(NULL)
  LOOP
    IF v_resultado.diferencia > 0.01 THEN
      v_total_corregidas := v_total_corregidas + 1;
      RAISE NOTICE 'Cuenta corregida: % - Saldo anterior: %, Saldo nuevo: %, Diferencia: %',
        v_resultado.cuenta_nombre,
        v_resultado.saldo_anterior,
        v_resultado.saldo_nuevo,
        v_resultado.diferencia;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Recálculo completado. % cuenta(s) corregida(s).', v_total_corregidas;
END $$;
