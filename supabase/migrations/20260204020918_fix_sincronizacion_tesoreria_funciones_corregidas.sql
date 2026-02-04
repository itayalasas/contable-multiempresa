/*
  # Funciones de Sincronización de Tesorería (Corregido)

  Este script crea las funciones necesarias para sincronizar movimientos de tesorería
  con asientos contables existentes.

  1. Funciones Creadas
    - sincronizar_tesoreria_desde_asientos: Crea movimientos desde asientos contables
    - recalcular_todos_saldos_cuentas_bancarias: Recalcula saldos de cuentas
    - ejecutar_sincronizacion_completa: Proceso completo de sincronización
    - diagnostico_cuentas_bancarias_empresa: Diagnóstico de cuentas

  2. Seguridad
    - Todas las funciones tienen SECURITY DEFINER
    - Grants para authenticated y service_role

  3. Corrección Principal
    - Cambiado de asientos_detalles a movimientos_contables (nombre correcto de la tabla)
    - Ajustadas las referencias de columnas debito/credito
*/

-- ============================================================================
-- FUNCIÓN: Diagnóstico de cuentas bancarias por empresa
-- ============================================================================

CREATE OR REPLACE FUNCTION diagnostico_cuentas_bancarias_empresa(
  p_empresa_id UUID
)
RETURNS TABLE(
  cuenta_id UUID,
  cuenta_nombre TEXT,
  numero_cuenta TEXT,
  saldo_actual NUMERIC,
  saldo_inicial NUMERIC,
  total_movimientos BIGINT,
  saldo_calculado NUMERIC,
  diferencia NUMERIC,
  estado TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id,
    cb.nombre,
    cb.numero_cuenta,
    cb.saldo_actual,
    cb.saldo_inicial,
    COUNT(mt.id) as total_movimientos,
    cb.saldo_inicial + COALESCE(SUM(
      CASE
        WHEN mt.tipo_movimiento = 'INGRESO' THEN mt.monto
        WHEN mt.tipo_movimiento = 'EGRESO' THEN -mt.monto
        ELSE 0
      END
    ), 0) as saldo_calculado,
    ABS(
      cb.saldo_actual -
      (cb.saldo_inicial + COALESCE(SUM(
        CASE
          WHEN mt.tipo_movimiento = 'INGRESO' THEN mt.monto
          WHEN mt.tipo_movimiento = 'EGRESO' THEN -mt.monto
          ELSE 0
        END
      ), 0))
    ) as diferencia,
    CASE
      WHEN COUNT(mt.id) = 0 AND ABS(cb.saldo_actual) > 0.01 THEN 'SIN_MOVIMIENTOS_CON_SALDO'
      WHEN ABS(cb.saldo_actual - (cb.saldo_inicial + COALESCE(SUM(
        CASE
          WHEN mt.tipo_movimiento = 'INGRESO' THEN mt.monto
          WHEN mt.tipo_movimiento = 'EGRESO' THEN -mt.monto
          ELSE 0
        END
      ), 0))) > 0.01 THEN 'DESCUADRADO'
      ELSE 'OK'
    END as estado
  FROM cuentas_bancarias cb
  LEFT JOIN movimientos_tesoreria mt ON mt.cuenta_bancaria_id = cb.id
  WHERE cb.empresa_id = p_empresa_id
    AND cb.activa = true
  GROUP BY cb.id, cb.nombre, cb.numero_cuenta, cb.saldo_actual, cb.saldo_inicial
  ORDER BY cb.nombre;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Sincronizar movimientos de tesorería desde asientos contables
-- ============================================================================

CREATE OR REPLACE FUNCTION sincronizar_tesoreria_desde_asientos(
  p_empresa_id UUID,
  p_modo VARCHAR DEFAULT 'PREVIEW'
)
RETURNS TABLE(
  tipo_operacion TEXT,
  asiento_numero TEXT,
  asiento_fecha DATE,
  cuenta_bancaria_nombre TEXT,
  tipo_movimiento TEXT,
  monto NUMERIC,
  descripcion TEXT,
  ejecutado BOOLEAN,
  mensaje TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asiento RECORD;
  v_cuenta_bancaria RECORD;
  v_movimiento_id UUID;
  v_debe_total NUMERIC;
  v_haber_total NUMERIC;
  v_tipo_mov TEXT;
  v_monto_mov NUMERIC;
  v_contador INTEGER := 0;
BEGIN
  FOR v_asiento IN
    SELECT
      ac.id as asiento_id,
      ac.numero as asiento_numero,
      ac.fecha as asiento_fecha,
      ac.descripcion as asiento_descripcion,
      ac.empresa_id,
      mc.cuenta_id,
      pc.codigo as cuenta_codigo,
      pc.nombre as cuenta_nombre,
      SUM(COALESCE(mc.debito, 0)) as debe_total,
      SUM(COALESCE(mc.credito, 0)) as haber_total
    FROM asientos_contables ac
    INNER JOIN movimientos_contables mc ON mc.asiento_id = ac.id
    INNER JOIN plan_cuentas pc ON pc.id = mc.cuenta_id
    WHERE ac.estado = 'confirmado'
      AND ac.empresa_id = p_empresa_id
      AND EXISTS (
        SELECT 1 FROM cuentas_bancarias cb
        WHERE cb.cuenta_contable_id = mc.cuenta_id
      )
    GROUP BY ac.id, ac.numero, ac.fecha, ac.descripcion, ac.empresa_id, mc.cuenta_id, pc.codigo, pc.nombre
    ORDER BY ac.fecha, ac.numero
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      INNER JOIN cuentas_bancarias cb ON cb.id = mt.cuenta_bancaria_id
      WHERE mt.asiento_contable_id = v_asiento.asiento_id
        AND cb.cuenta_contable_id = v_asiento.cuenta_id
    ) THEN
      SELECT * INTO v_cuenta_bancaria
      FROM cuentas_bancarias
      WHERE cuenta_contable_id = v_asiento.cuenta_id
        AND empresa_id = v_asiento.empresa_id
        AND activa = true
      LIMIT 1;

      IF v_cuenta_bancaria.id IS NOT NULL THEN
        v_debe_total := v_asiento.debe_total;
        v_haber_total := v_asiento.haber_total;

        IF v_debe_total > v_haber_total THEN
          v_tipo_mov := 'INGRESO';
          v_monto_mov := v_debe_total - v_haber_total;
        ELSIF v_haber_total > v_debe_total THEN
          v_tipo_mov := 'EGRESO';
          v_monto_mov := v_haber_total - v_debe_total;
        ELSE
          v_tipo_mov := NULL;
          v_monto_mov := 0;
        END IF;

        IF v_tipo_mov IS NOT NULL AND v_monto_mov > 0 THEN
          tipo_operacion := 'CREAR_MOVIMIENTO';
          asiento_numero := v_asiento.asiento_numero;
          asiento_fecha := v_asiento.asiento_fecha;
          cuenta_bancaria_nombre := v_cuenta_bancaria.nombre;
          tipo_movimiento := v_tipo_mov;
          monto := v_monto_mov;
          descripcion := COALESCE(v_asiento.asiento_descripcion, 'Sincronización desde asiento contable');
          ejecutado := (p_modo = 'EJECUTAR');
          mensaje := CASE
            WHEN p_modo = 'EJECUTAR' THEN 'Movimiento creado'
            ELSE 'Pendiente de crear'
          END;

          RETURN NEXT;

          IF p_modo = 'EJECUTAR' THEN
            v_movimiento_id := gen_random_uuid();

            INSERT INTO movimientos_tesoreria (
              id,
              cuenta_bancaria_id,
              tipo_movimiento,
              fecha,
              monto,
              descripcion,
              referencia,
              estado,
              empresa_id,
              creado_por,
              asiento_contable_id
            ) VALUES (
              v_movimiento_id,
              v_cuenta_bancaria.id,
              v_tipo_mov,
              v_asiento.asiento_fecha,
              v_monto_mov,
              COALESCE(v_asiento.asiento_descripcion, 'Sincronización desde asiento contable'),
              'Asiento #' || v_asiento.asiento_numero,
              'CONFIRMADO',
              v_asiento.empresa_id,
              '00000000-0000-0000-0000-000000000000'::UUID,
              v_asiento.asiento_id
            );

            v_contador := v_contador + 1;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Recalcular todos los saldos de cuentas bancarias
-- ============================================================================

CREATE OR REPLACE FUNCTION recalcular_todos_saldos_cuentas_bancarias(
  p_empresa_id UUID
)
RETURNS TABLE(
  cuenta_id UUID,
  cuenta_nombre TEXT,
  saldo_anterior NUMERIC,
  saldo_nuevo NUMERIC,
  diferencia NUMERIC,
  movimientos_totales BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuenta RECORD;
  v_saldo_anterior NUMERIC;
  v_saldo_calculado NUMERIC;
  v_total_movimientos BIGINT;
BEGIN
  FOR v_cuenta IN
    SELECT
      cb.id,
      cb.nombre,
      cb.saldo_actual,
      cb.saldo_inicial
    FROM cuentas_bancarias cb
    WHERE cb.empresa_id = p_empresa_id
      AND cb.activa = true
    ORDER BY cb.nombre
  LOOP
    v_saldo_anterior := v_cuenta.saldo_actual;

    SELECT COUNT(*) INTO v_total_movimientos
    FROM movimientos_tesoreria
    WHERE cuenta_bancaria_id = v_cuenta.id;

    SELECT
      v_cuenta.saldo_inicial + COALESCE(SUM(
        CASE
          WHEN tipo_movimiento = 'INGRESO' THEN monto
          WHEN tipo_movimiento = 'EGRESO' THEN -monto
          ELSE 0
        END
      ), 0)
    INTO v_saldo_calculado
    FROM movimientos_tesoreria
    WHERE cuenta_bancaria_id = v_cuenta.id;

    UPDATE cuentas_bancarias
    SET
      saldo_actual = v_saldo_calculado,
      updated_at = NOW()
    WHERE id = v_cuenta.id;

    cuenta_id := v_cuenta.id;
    cuenta_nombre := v_cuenta.nombre;
    saldo_anterior := v_saldo_anterior;
    saldo_nuevo := v_saldo_calculado;
    diferencia := ABS(v_saldo_calculado - v_saldo_anterior);
    movimientos_totales := v_total_movimientos;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Proceso completo de sincronización
-- ============================================================================

CREATE OR REPLACE FUNCTION ejecutar_sincronizacion_completa(
  p_empresa_id UUID
)
RETURNS TABLE(
  paso TEXT,
  mensaje TEXT,
  cantidad INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movimientos_creados INTEGER := 0;
  v_cuentas_actualizadas INTEGER := 0;
BEGIN
  paso := 'PASO 1';
  mensaje := 'Creando movimientos de tesorería desde asientos contables...';
  cantidad := 0;
  RETURN NEXT;

  SELECT COUNT(*) INTO v_movimientos_creados
  FROM sincronizar_tesoreria_desde_asientos(p_empresa_id, 'EJECUTAR');

  paso := 'PASO 1 COMPLETADO';
  mensaje := 'Movimientos de tesorería creados';
  cantidad := v_movimientos_creados;
  RETURN NEXT;

  paso := 'PASO 2';
  mensaje := 'Recalculando saldos de cuentas bancarias...';
  cantidad := 0;
  RETURN NEXT;

  SELECT COUNT(*) INTO v_cuentas_actualizadas
  FROM recalcular_todos_saldos_cuentas_bancarias(p_empresa_id);

  paso := 'PASO 2 COMPLETADO';
  mensaje := 'Saldos de cuentas actualizados';
  cantidad := v_cuentas_actualizadas;
  RETURN NEXT;

  paso := 'COMPLETADO';
  mensaje := 'Sincronización completa exitosa';
  cantidad := v_movimientos_creados + v_cuentas_actualizadas;
  RETURN NEXT;
END;
$$;

-- ============================================================================
-- COMENTARIOS Y GRANTS
-- ============================================================================

COMMENT ON FUNCTION diagnostico_cuentas_bancarias_empresa(UUID) IS
  'Diagnóstico detallado de todas las cuentas bancarias de una empresa';

COMMENT ON FUNCTION sincronizar_tesoreria_desde_asientos(UUID, VARCHAR) IS
  'Sincroniza movimientos de tesorería desde asientos contables existentes';

COMMENT ON FUNCTION recalcular_todos_saldos_cuentas_bancarias(UUID) IS
  'Recalcula los saldos de todas las cuentas bancarias basándose en movimientos reales';

COMMENT ON FUNCTION ejecutar_sincronizacion_completa(UUID) IS
  'Ejecuta proceso completo: crea movimientos faltantes y recalcula saldos';

GRANT EXECUTE ON FUNCTION diagnostico_cuentas_bancarias_empresa(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sincronizar_tesoreria_desde_asientos(UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION recalcular_todos_saldos_cuentas_bancarias(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ejecutar_sincronizacion_completa(UUID) TO authenticated, service_role;