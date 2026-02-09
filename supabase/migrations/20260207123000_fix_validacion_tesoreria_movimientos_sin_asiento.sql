/*
  # Ajuste validación de tesorería - movimientos sin asiento

  - Excluye movimientos marcados como no requeridos de asiento
  - Excluye transferencias
  - Excluye cobros marketplace y comisiones MP automáticas
*/

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
  -- Contar movimientos sin asiento en el periodo (excluye los que no requieren asiento)
  SELECT COUNT(*) INTO v_movimientos_sin_asiento
  FROM movimientos_tesoreria
  WHERE empresa_id = p_empresa_id
    AND fecha >= p_fecha_inicio
    AND fecha <= p_fecha_fin
    AND asiento_contable_id IS NULL
    AND tipo_movimiento <> 'TRANSFERENCIA'
    AND COALESCE(metadata->>'no_requiere_asiento', 'false') <> 'true'
    AND NOT (
      categoria = 'COBRO_CLIENTE'
      AND documento_origen_tipo = 'factura_venta'
      AND (
        COALESCE(metadata->>'origen', '') = 'marketplace'
        OR COALESCE(metadata->>'origen_marketplace', '') = 'true'
      )
    )
    AND NOT (
      categoria = 'COMISION_PASARELA'
      AND documento_origen_tipo = 'comision_mercadopago'
    );

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

COMMENT ON FUNCTION validar_tesoreria_periodo IS 'Valida tesorería por periodo ignorando movimientos que no requieren asiento';
