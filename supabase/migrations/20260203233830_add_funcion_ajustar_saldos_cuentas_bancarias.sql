/*
  # Función para ajustar saldos iniciales de cuentas bancarias
  
  ## Descripción
  Crea una función que permite ajustar el saldo inicial de una cuenta bancaria
  para cuadrar con su saldo actual y movimientos existentes.
  
  ## Casos de uso
  1. Cuando se importan movimientos pero el saldo inicial no está configurado correctamente
  2. Cuando hay descuadres históricos que necesitan ajustarse
  3. Para corregir errores de configuración inicial
  
  ## Funciones
  1. `ajustar_saldo_inicial_cuenta` - Ajusta el saldo inicial para cuadrar con el saldo actual deseado
  2. `cuadrar_cuenta_bancaria_con_movimientos` - Ajusta el saldo inicial basándose en movimientos existentes
  3. `obtener_diagnostico_cuenta_bancaria` - Muestra diagnóstico detallado de una cuenta
  
  ## Notas Importantes
  - Estas funciones NO crean asientos contables de ajuste
  - Solo ajustan el campo saldo_inicial de la cuenta bancaria
  - El trigger existente recalculará automáticamente el saldo_actual
*/

-- 1. FUNCIÓN: Obtener diagnóstico completo de una cuenta bancaria
CREATE OR REPLACE FUNCTION obtener_diagnostico_cuenta_bancaria(p_cuenta_bancaria_id UUID)
RETURNS TABLE(
  cuenta_id UUID,
  cuenta_nombre TEXT,
  numero_cuenta TEXT,
  saldo_inicial NUMERIC,
  saldo_actual NUMERIC,
  total_movimientos BIGINT,
  total_ingresos NUMERIC,
  total_egresos NUMERIC,
  saldo_calculado NUMERIC,
  diferencia NUMERIC,
  necesita_ajuste BOOLEAN,
  ajuste_sugerido NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuenta RECORD;
  v_total_ingresos NUMERIC;
  v_total_egresos NUMERIC;
  v_total_movimientos BIGINT;
  v_saldo_calculado NUMERIC;
  v_diferencia NUMERIC;
  v_ajuste_sugerido NUMERIC;
BEGIN
  -- Obtener datos de la cuenta
  SELECT 
    cb.id,
    cb.nombre,
    cb.numero_cuenta,
    cb.saldo_inicial,
    cb.saldo_actual
  INTO v_cuenta
  FROM cuentas_bancarias cb
  WHERE cb.id = p_cuenta_bancaria_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada: %', p_cuenta_bancaria_id;
  END IF;
  
  -- Calcular totales de movimientos
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN tipo_movimiento = 'INGRESO' THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo_movimiento = 'EGRESO' THEN monto ELSE 0 END), 0)
  INTO v_total_movimientos, v_total_ingresos, v_total_egresos
  FROM movimientos_tesoreria
  WHERE cuenta_bancaria_id = p_cuenta_bancaria_id;
  
  -- Calcular saldo teórico basado en saldo_inicial + movimientos
  v_saldo_calculado := v_cuenta.saldo_inicial + v_total_ingresos - v_total_egresos;
  
  -- Calcular diferencia entre saldo calculado y saldo actual
  v_diferencia := v_cuenta.saldo_actual - v_saldo_calculado;
  
  -- Si hay diferencia, calcular ajuste sugerido al saldo inicial
  -- Para que: saldo_inicial_nuevo + ingresos - egresos = saldo_actual
  -- Entonces: saldo_inicial_nuevo = saldo_actual - ingresos + egresos
  v_ajuste_sugerido := v_cuenta.saldo_actual - v_total_ingresos + v_total_egresos;
  
  RETURN QUERY SELECT
    v_cuenta.id,
    v_cuenta.nombre,
    v_cuenta.numero_cuenta,
    v_cuenta.saldo_inicial,
    v_cuenta.saldo_actual,
    v_total_movimientos,
    v_total_ingresos,
    v_total_egresos,
    v_saldo_calculado,
    v_diferencia,
    (ABS(v_diferencia) > 0.01) as necesita_ajuste,
    v_ajuste_sugerido;
END;
$$;

-- 2. FUNCIÓN: Ajustar saldo inicial de una cuenta bancaria
CREATE OR REPLACE FUNCTION ajustar_saldo_inicial_cuenta(
  p_cuenta_bancaria_id UUID,
  p_nuevo_saldo_inicial NUMERIC,
  p_motivo TEXT DEFAULT 'Ajuste de saldo inicial'
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  saldo_inicial_anterior NUMERIC,
  saldo_inicial_nuevo NUMERIC,
  saldo_actual_anterior NUMERIC,
  saldo_actual_nuevo NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_inicial_ant NUMERIC;
  v_saldo_actual_ant NUMERIC;
  v_saldo_actual_nuevo NUMERIC;
BEGIN
  -- Obtener valores actuales
  SELECT saldo_inicial, saldo_actual 
  INTO v_saldo_inicial_ant, v_saldo_actual_ant
  FROM cuentas_bancarias
  WHERE id = p_cuenta_bancaria_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'Cuenta bancaria no encontrada',
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC;
    RETURN;
  END IF;
  
  -- Actualizar saldo inicial
  UPDATE cuentas_bancarias
  SET 
    saldo_inicial = p_nuevo_saldo_inicial,
    updated_at = NOW()
  WHERE id = p_cuenta_bancaria_id;
  
  -- Recalcular saldo actual (el trigger lo hará automáticamente, pero lo hacemos explícito)
  PERFORM recalcular_saldo_cuenta_bancaria(p_cuenta_bancaria_id);
  
  -- Obtener nuevo saldo actual
  SELECT saldo_actual INTO v_saldo_actual_nuevo
  FROM cuentas_bancarias
  WHERE id = p_cuenta_bancaria_id;
  
  -- Log del ajuste
  RAISE NOTICE 'Ajuste realizado: % - Saldo inicial: % -> %, Saldo actual: % -> %',
    p_motivo,
    v_saldo_inicial_ant,
    p_nuevo_saldo_inicial,
    v_saldo_actual_ant,
    v_saldo_actual_nuevo;
  
  RETURN QUERY SELECT
    true,
    'Saldo inicial ajustado exitosamente',
    v_saldo_inicial_ant,
    p_nuevo_saldo_inicial,
    v_saldo_actual_ant,
    v_saldo_actual_nuevo;
END;
$$;

-- 3. FUNCIÓN: Cuadrar cuenta bancaria automáticamente
CREATE OR REPLACE FUNCTION cuadrar_cuenta_bancaria_automaticamente(
  p_cuenta_bancaria_id UUID,
  p_saldo_deseado NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  ajuste_realizado NUMERIC,
  saldo_inicial_nuevo NUMERIC,
  saldo_actual_nuevo NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuenta RECORD;
  v_diagnostico RECORD;
  v_saldo_deseado NUMERIC;
  v_resultado RECORD;
BEGIN
  -- Si no se especifica saldo deseado, usar el saldo_actual actual
  IF p_saldo_deseado IS NULL THEN
    SELECT saldo_actual INTO v_saldo_deseado
    FROM cuentas_bancarias
    WHERE id = p_cuenta_bancaria_id;
  ELSE
    v_saldo_deseado := p_saldo_deseado;
  END IF;
  
  -- Obtener diagnóstico
  SELECT * INTO v_diagnostico
  FROM obtener_diagnostico_cuenta_bancaria(p_cuenta_bancaria_id);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'No se pudo obtener diagnóstico de la cuenta',
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC;
    RETURN;
  END IF;
  
  -- Si no necesita ajuste
  IF NOT v_diagnostico.necesita_ajuste AND p_saldo_deseado IS NULL THEN
    RETURN QUERY SELECT
      true,
      'La cuenta ya está cuadrada, no requiere ajuste',
      0::NUMERIC,
      v_diagnostico.saldo_inicial,
      v_diagnostico.saldo_actual;
    RETURN;
  END IF;
  
  -- Calcular nuevo saldo inicial para llegar al saldo deseado
  -- saldo_inicial_nuevo = saldo_deseado - (ingresos - egresos)
  DECLARE
    v_nuevo_saldo_inicial NUMERIC;
  BEGIN
    v_nuevo_saldo_inicial := v_saldo_deseado - (v_diagnostico.total_ingresos - v_diagnostico.total_egresos);
    
    -- Realizar ajuste
    SELECT * INTO v_resultado
    FROM ajustar_saldo_inicial_cuenta(
      p_cuenta_bancaria_id,
      v_nuevo_saldo_inicial,
      'Ajuste automático para cuadrar cuenta'
    );
    
    RETURN QUERY SELECT
      v_resultado.success,
      'Cuenta cuadrada exitosamente. Saldo inicial ajustado de $' || 
        v_resultado.saldo_inicial_anterior || ' a $' || v_resultado.saldo_inicial_nuevo,
      (v_resultado.saldo_inicial_nuevo - v_resultado.saldo_inicial_anterior) as ajuste_realizado,
      v_resultado.saldo_inicial_nuevo,
      v_resultado.saldo_actual_nuevo;
  END;
END;
$$;

-- 4. COMENTARIOS
COMMENT ON FUNCTION obtener_diagnostico_cuenta_bancaria(UUID) IS
  'Obtiene un diagnóstico completo de una cuenta bancaria incluyendo movimientos y saldos calculados';

COMMENT ON FUNCTION ajustar_saldo_inicial_cuenta(UUID, NUMERIC, TEXT) IS
  'Ajusta el saldo inicial de una cuenta bancaria a un valor específico';

COMMENT ON FUNCTION cuadrar_cuenta_bancaria_automaticamente(UUID, NUMERIC) IS
  'Cuadra automáticamente una cuenta bancaria ajustando su saldo inicial para que coincida con el saldo deseado';

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION obtener_diagnostico_cuenta_bancaria(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ajustar_saldo_inicial_cuenta(UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cuadrar_cuenta_bancaria_automaticamente(UUID, NUMERIC) TO authenticated, service_role;
