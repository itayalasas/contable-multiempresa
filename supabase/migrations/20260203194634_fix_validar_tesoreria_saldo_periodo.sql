/*
  # Corregir validación de tesorería por periodo

  ## Descripción
  Corrige la función validar_tesoreria_periodo para calcular correctamente
  los saldos de las cuentas bancarias considerando movimientos anteriores al periodo.

  ## Problema
  La función original comparaba:
  - saldo_inicial + movimientos_periodo vs saldo_actual
  - Esto causaba descuadres porque no consideraba movimientos anteriores al periodo

  ## Solución
  Calcular el saldo al inicio del periodo sumando todos los movimientos
  anteriores al inicio del periodo, y luego sumar los movimientos del periodo.

  ## Cambios
  1. Calcula saldo_inicio_periodo = saldo_inicial + movimientos anteriores al periodo
  2. Calcula saldo_fin_periodo = saldo_inicio_periodo + ingresos_periodo - egresos_periodo
  3. Compara saldo_fin_periodo con saldo_actual

  ## Notas
  - Considera solo movimientos hasta fecha_fin del periodo
  - Tolerancia de 0.01 para diferencias de redondeo
*/

-- Reemplazar función de validación de tesorería
CREATE OR REPLACE FUNCTION validar_tesoreria_periodo(
  p_empresa_id uuid,
  p_fecha_inicio date,
  p_fecha_fin date
)
RETURNS TABLE (
  valido boolean,
  movimientos_sin_asiento integer,
  cuentas_descuadradas integer,
  total_movimientos integer,
  detalles jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movimientos_sin_asiento integer;
  v_cuentas_descuadradas integer;
  v_total_movimientos integer;
  v_detalles jsonb;
  v_cuenta record;
  v_saldo_inicio_periodo numeric;
  v_saldo_fin_periodo numeric;
  v_diferencia numeric;
  v_cuentas_problema jsonb[];
BEGIN
  -- Contar movimientos sin asiento en el periodo
  SELECT COUNT(*) INTO v_movimientos_sin_asiento
  FROM movimientos_tesoreria
  WHERE empresa_id = p_empresa_id
    AND fecha >= p_fecha_inicio
    AND fecha <= p_fecha_fin
    AND asiento_contable_id IS NULL;

  -- Contar total de movimientos en el periodo
  SELECT COUNT(*) INTO v_total_movimientos
  FROM movimientos_tesoreria
  WHERE empresa_id = p_empresa_id
    AND fecha >= p_fecha_inicio
    AND fecha <= p_fecha_fin;

  -- Verificar saldos de cuentas bancarias
  v_cuentas_descuadradas := 0;
  v_cuentas_problema := ARRAY[]::jsonb[];

  FOR v_cuenta IN
    SELECT
      cb.id,
      cb.nombre,
      cb.numero_cuenta,
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
        WHEN mt_periodo.tipo_movimiento = 'INGRESO' AND mt_periodo.fecha >= p_fecha_inicio THEN mt_periodo.monto 
        ELSE 0 
      END), 0) as ingresos_periodo,
      COALESCE(SUM(CASE 
        WHEN mt_periodo.tipo_movimiento = 'EGRESO' AND mt_periodo.fecha >= p_fecha_inicio THEN mt_periodo.monto 
        ELSE 0 
      END), 0) as egresos_periodo
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
    GROUP BY cb.id, cb.nombre, cb.numero_cuenta, cb.saldo_inicial, cb.saldo_actual
  LOOP
    -- Calcular saldo al inicio del periodo
    v_saldo_inicio_periodo := v_cuenta.saldo_inicial + v_cuenta.movimientos_anteriores;
    
    -- Calcular saldo al fin del periodo
    v_saldo_fin_periodo := v_saldo_inicio_periodo + v_cuenta.ingresos_periodo - v_cuenta.egresos_periodo;
    
    -- Calcular diferencia con saldo actual
    v_diferencia := ABS(v_cuenta.saldo_actual - v_saldo_fin_periodo);

    IF v_diferencia > 0.01 THEN
      v_cuentas_descuadradas := v_cuentas_descuadradas + 1;
      v_cuentas_problema := array_append(
        v_cuentas_problema,
        jsonb_build_object(
          'cuenta_id', v_cuenta.id,
          'nombre', v_cuenta.nombre,
          'numero_cuenta', v_cuenta.numero_cuenta,
          'saldo_fisico', v_cuenta.saldo_actual,
          'saldo_contable', v_saldo_fin_periodo,
          'diferencia', v_diferencia,
          'desglose', jsonb_build_object(
            'saldo_inicial', v_cuenta.saldo_inicial,
            'movimientos_anteriores', v_cuenta.movimientos_anteriores,
            'saldo_inicio_periodo', v_saldo_inicio_periodo,
            'ingresos_periodo', v_cuenta.ingresos_periodo,
            'egresos_periodo', v_cuenta.egresos_periodo
          )
        )
      );
    END IF;
  END LOOP;

  -- Construir detalles
  v_detalles := jsonb_build_object(
    'movimientos_sin_asiento', v_movimientos_sin_asiento,
    'cuentas_descuadradas', v_cuentas_descuadradas,
    'total_movimientos', v_total_movimientos,
    'cuentas_problema', to_jsonb(v_cuentas_problema)
  );

  -- Retornar resultado
  RETURN QUERY SELECT
    (v_movimientos_sin_asiento = 0 AND v_cuentas_descuadradas = 0) as valido,
    v_movimientos_sin_asiento,
    v_cuentas_descuadradas,
    v_total_movimientos,
    v_detalles;
END;
$$;

COMMENT ON FUNCTION validar_tesoreria_periodo IS 'Valida que toda la tesorería del periodo esté correcta, considerando movimientos anteriores';