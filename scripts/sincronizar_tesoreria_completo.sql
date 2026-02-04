/*
  Script de Sincronización Completa de Tesorería

  Este script sincroniza los movimientos de tesorería con los asientos contables:
  1. Identifica asientos que afectan cuentas bancarias
  2. Crea movimientos de tesorería para asientos sin movimiento
  3. Recalcula todos los saldos de cuentas bancarias

  IMPORTANTE: Ejecutar este script UNA SOLA VEZ para corregir datos históricos
*/

-- ============================================================================
-- FUNCIÓN: Sincronizar movimientos de tesorería desde asientos contables
-- ============================================================================

CREATE OR REPLACE FUNCTION sincronizar_tesoreria_desde_asientos(
  p_empresa_id UUID DEFAULT NULL,
  p_modo VARCHAR DEFAULT 'PREVIEW' -- 'PREVIEW' o 'EJECUTAR'
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
  -- Iterar sobre todos los asientos que afectan cuentas bancarias
  FOR v_asiento IN
    SELECT
      ac.id as asiento_id,
      ac.numero as asiento_numero,
      ac.fecha as asiento_fecha,
      ac.descripcion as asiento_descripcion,
      ac.empresa_id,
      ad.cuenta_id,
      pc.codigo as cuenta_codigo,
      pc.nombre as cuenta_nombre,
      SUM(CASE WHEN ad.tipo = 'DEBE' THEN ad.monto ELSE 0 END) as debe_total,
      SUM(CASE WHEN ad.tipo = 'HABER' THEN ad.monto ELSE 0 END) as haber_total
    FROM asientos_contables ac
    INNER JOIN asientos_detalles ad ON ad.asiento_id = ac.id
    INNER JOIN plan_cuentas pc ON pc.id = ad.cuenta_id
    WHERE ac.estado = 'contabilizado'
      AND (p_empresa_id IS NULL OR ac.empresa_id = p_empresa_id)
      AND EXISTS (
        -- Solo cuentas que están asociadas a cuentas bancarias
        SELECT 1 FROM cuentas_bancarias cb
        WHERE cb.cuenta_contable_id = ad.cuenta_id
      )
    GROUP BY ac.id, ac.numero, ac.fecha, ac.descripcion, ac.empresa_id, ad.cuenta_id, pc.codigo, pc.nombre
    ORDER BY ac.fecha, ac.numero
  LOOP
    -- Verificar si ya existe un movimiento de tesorería para este asiento y cuenta
    IF NOT EXISTS (
      SELECT 1 FROM movimientos_tesoreria mt
      INNER JOIN cuentas_bancarias cb ON cb.id = mt.cuenta_bancaria_id
      WHERE mt.asiento_contable_id = v_asiento.asiento_id
        AND cb.cuenta_contable_id = v_asiento.cuenta_id
    ) THEN
      -- Buscar la cuenta bancaria asociada
      SELECT * INTO v_cuenta_bancaria
      FROM cuentas_bancarias
      WHERE cuenta_contable_id = v_asiento.cuenta_id
        AND empresa_id = v_asiento.empresa_id
        AND activa = true
      LIMIT 1;

      IF v_cuenta_bancaria.id IS NOT NULL THEN
        -- Determinar tipo de movimiento y monto
        v_debe_total := v_asiento.debe_total;
        v_haber_total := v_asiento.haber_total;

        IF v_debe_total > v_haber_total THEN
          v_tipo_mov := 'INGRESO';
          v_monto_mov := v_debe_total - v_haber_total;
        ELSIF v_haber_total > v_debe_total THEN
          v_tipo_mov := 'EGRESO';
          v_monto_mov := v_haber_total - v_debe_total;
        ELSE
          -- Igual, no crear movimiento
          v_tipo_mov := NULL;
          v_monto_mov := 0;
        END IF;

        IF v_tipo_mov IS NOT NULL AND v_monto_mov > 0 THEN
          -- Retornar información
          RETURN QUERY SELECT
            'CREAR_MOVIMIENTO'::TEXT,
            v_asiento.asiento_numero::TEXT,
            v_asiento.asiento_fecha,
            v_cuenta_bancaria.nombre::TEXT,
            v_tipo_mov::TEXT,
            v_monto_mov,
            COALESCE(v_asiento.asiento_descripcion, 'Sincronización desde asiento contable')::TEXT,
            (p_modo = 'EJECUTAR')::BOOLEAN,
            CASE
              WHEN p_modo = 'EJECUTAR' THEN 'Movimiento creado'
              ELSE 'Pendiente de crear'
            END::TEXT;

          -- Si está en modo EJECUTAR, crear el movimiento
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
              '00000000-0000-0000-0000-000000000000'::UUID, -- Usuario sistema
              v_asiento.asiento_id
            );

            v_contador := v_contador + 1;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Mensaje final
  IF p_modo = 'EJECUTAR' THEN
    RAISE NOTICE 'Sincronización completada. % movimiento(s) creado(s).', v_contador;
  ELSE
    RAISE NOTICE 'Vista previa completada. Ejecutar con modo EJECUTAR para aplicar cambios.';
  END IF;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Recalcular todos los saldos de cuentas bancarias
-- ============================================================================

CREATE OR REPLACE FUNCTION recalcular_todos_saldos_cuentas_bancarias(
  p_empresa_id UUID DEFAULT NULL
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
    WHERE (p_empresa_id IS NULL OR cb.empresa_id = p_empresa_id)
      AND cb.activa = true
    ORDER BY cb.nombre
  LOOP
    v_saldo_anterior := v_cuenta.saldo_actual;

    -- Contar movimientos
    SELECT COUNT(*) INTO v_total_movimientos
    FROM movimientos_tesoreria
    WHERE cuenta_bancaria_id = v_cuenta.id;

    -- Calcular saldo basado en movimientos
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

    -- Actualizar saldo_actual
    UPDATE cuentas_bancarias
    SET
      saldo_actual = v_saldo_calculado,
      updated_at = NOW()
    WHERE id = v_cuenta.id;

    -- Retornar resultado
    RETURN QUERY SELECT
      v_cuenta.id,
      v_cuenta.nombre,
      v_saldo_anterior,
      v_saldo_calculado,
      ABS(v_saldo_calculado - v_saldo_anterior),
      v_total_movimientos;
  END LOOP;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Proceso completo de sincronización
-- ============================================================================

CREATE OR REPLACE FUNCTION ejecutar_sincronizacion_completa(
  p_empresa_id UUID DEFAULT NULL
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
  -- Paso 1: Crear movimientos de tesorería desde asientos
  RETURN QUERY SELECT
    'PASO 1'::TEXT,
    'Creando movimientos de tesorería desde asientos contables...'::TEXT,
    0::INTEGER;

  SELECT COUNT(*) INTO v_movimientos_creados
  FROM sincronizar_tesoreria_desde_asientos(p_empresa_id, 'EJECUTAR');

  RETURN QUERY SELECT
    'PASO 1 COMPLETADO'::TEXT,
    'Movimientos de tesorería creados'::TEXT,
    v_movimientos_creados::INTEGER;

  -- Paso 2: Recalcular todos los saldos
  RETURN QUERY SELECT
    'PASO 2'::TEXT,
    'Recalculando saldos de cuentas bancarias...'::TEXT,
    0::INTEGER;

  SELECT COUNT(*) INTO v_cuentas_actualizadas
  FROM recalcular_todos_saldos_cuentas_bancarias(p_empresa_id);

  RETURN QUERY SELECT
    'PASO 2 COMPLETADO'::TEXT,
    'Saldos de cuentas actualizados'::TEXT,
    v_cuentas_actualizadas::INTEGER;

  -- Paso 3: Mensaje final
  RETURN QUERY SELECT
    'COMPLETADO'::TEXT,
    'Sincronización completa exitosa'::TEXT,
    (v_movimientos_creados + v_cuentas_actualizadas)::INTEGER;
END;
$$;

-- ============================================================================
-- COMENTARIOS Y GRANTS
-- ============================================================================

COMMENT ON FUNCTION sincronizar_tesoreria_desde_asientos(UUID, VARCHAR) IS
  'Sincroniza movimientos de tesorería desde asientos contables existentes';

COMMENT ON FUNCTION recalcular_todos_saldos_cuentas_bancarias(UUID) IS
  'Recalcula los saldos de todas las cuentas bancarias basándose en movimientos reales';

COMMENT ON FUNCTION ejecutar_sincronizacion_completa(UUID) IS
  'Ejecuta proceso completo: crea movimientos faltantes y recalcula saldos';

GRANT EXECUTE ON FUNCTION sincronizar_tesoreria_desde_asientos(UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION recalcular_todos_saldos_cuentas_bancarias(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ejecutar_sincronizacion_completa(UUID) TO authenticated, service_role;

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================

/*
-- PASO 1: Ver vista previa de cambios (sin ejecutar)
SELECT * FROM sincronizar_tesoreria_desde_asientos(NULL, 'PREVIEW');

-- PASO 2: Ver diagnóstico de cuentas
SELECT * FROM diagnostico_cuentas_bancarias_empresa('TU_EMPRESA_ID');

-- PASO 3: Ejecutar sincronización completa
SELECT * FROM ejecutar_sincronizacion_completa('TU_EMPRESA_ID');

-- O para TODAS las empresas (cuidado):
SELECT * FROM ejecutar_sincronizacion_completa(NULL);

-- PASO 4: Verificar resultados
SELECT * FROM recalcular_todos_saldos_cuentas_bancarias('TU_EMPRESA_ID');
*/
