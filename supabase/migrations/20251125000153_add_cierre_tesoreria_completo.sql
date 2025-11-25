/*
  # Cierre de Tesorería en Periodos Contables

  1. Nueva Tabla
    - `snapshots_saldos_bancarios`
      - Guarda foto de saldos bancarios al momento del cierre
      - Permite auditoría y verificación posterior
      - Incluye totales de ingresos y egresos del periodo

  2. Modificaciones
    - Agrega campo `tesoreria_cerrada` a `periodos_contables`
    - Agrega validaciones de tesorería al cierre

  3. Funciones
    - `validar_tesoreria_periodo`: Valida que toda la tesorería esté correcta
    - `generar_snapshot_saldos`: Genera snapshot de saldos al cierre

  4. Security
    - Enable RLS en nueva tabla
    - Políticas para anon y service_role (sistema sin auth)
*/

-- Tabla para snapshots de saldos bancarios
CREATE TABLE IF NOT EXISTS snapshots_saldos_bancarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid NOT NULL REFERENCES periodos_contables(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cuenta_bancaria_id uuid NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,

  -- Datos de la cuenta al momento del snapshot
  nombre_cuenta text NOT NULL,
  numero_cuenta text NOT NULL,
  banco text NOT NULL,
  tipo_cuenta text NOT NULL,
  moneda text NOT NULL DEFAULT 'UYU',

  -- Saldos
  saldo_inicial numeric(15,2) NOT NULL DEFAULT 0,
  saldo_final numeric(15,2) NOT NULL DEFAULT 0,

  -- Movimientos del periodo
  total_ingresos numeric(15,2) NOT NULL DEFAULT 0,
  total_egresos numeric(15,2) NOT NULL DEFAULT 0,
  cantidad_ingresos integer NOT NULL DEFAULT 0,
  cantidad_egresos integer NOT NULL DEFAULT 0,

  -- Validación
  saldo_calculado numeric(15,2) NOT NULL DEFAULT 0,
  diferencia numeric(15,2) NOT NULL DEFAULT 0,
  validado boolean NOT NULL DEFAULT true,

  -- Metadata
  fecha_snapshot timestamptz NOT NULL DEFAULT now(),
  observaciones text,

  created_at timestamptz DEFAULT now(),

  CONSTRAINT check_saldos CHECK (
    saldo_calculado = saldo_inicial + total_ingresos - total_egresos
  )
);

-- Agregar campos a periodos_contables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'periodos_contables'
    AND column_name = 'tesoreria_cerrada'
  ) THEN
    ALTER TABLE periodos_contables
    ADD COLUMN tesoreria_cerrada boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'periodos_contables'
    AND column_name = 'fecha_cierre_tesoreria'
  ) THEN
    ALTER TABLE periodos_contables
    ADD COLUMN fecha_cierre_tesoreria timestamptz;
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_snapshots_periodo ON snapshots_saldos_bancarios(periodo_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_empresa ON snapshots_saldos_bancarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_cuenta ON snapshots_saldos_bancarios(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_fecha ON snapshots_saldos_bancarios(fecha_snapshot);

-- RLS
ALTER TABLE snapshots_saldos_bancarios ENABLE ROW LEVEL SECURITY;

-- Políticas para anon (sistema sin auth de Supabase)
CREATE POLICY "Allow anon to read snapshots"
  ON snapshots_saldos_bancarios FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert snapshots"
  ON snapshots_saldos_bancarios FOR INSERT
  TO anon
  WITH CHECK (true);

-- Políticas para service_role (Edge Functions)
CREATE POLICY "Service role has full access to snapshots"
  ON snapshots_saldos_bancarios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Función para validar tesorería de un periodo
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
  v_saldo_calculado numeric;
  v_diferencia numeric;
  v_cuentas_problema jsonb[];
BEGIN
  -- Contar movimientos sin asiento
  SELECT COUNT(*) INTO v_movimientos_sin_asiento
  FROM movimientos_tesoreria
  WHERE empresa_id = p_empresa_id
    AND fecha >= p_fecha_inicio
    AND fecha <= p_fecha_fin
    AND asiento_contable_id IS NULL;

  -- Contar total de movimientos
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
      COALESCE(SUM(CASE WHEN mt.tipo_movimiento = 'INGRESO' THEN mt.monto ELSE 0 END), 0) as total_ingresos,
      COALESCE(SUM(CASE WHEN mt.tipo_movimiento = 'EGRESO' THEN mt.monto ELSE 0 END), 0) as total_egresos
    FROM cuentas_bancarias cb
    LEFT JOIN movimientos_tesoreria mt ON mt.cuenta_bancaria_id = cb.id
      AND mt.fecha >= p_fecha_inicio
      AND mt.fecha <= p_fecha_fin
    WHERE cb.empresa_id = p_empresa_id
      AND cb.activa = true
    GROUP BY cb.id, cb.nombre, cb.numero_cuenta, cb.saldo_inicial, cb.saldo_actual
  LOOP
    -- Calcular saldo esperado
    v_saldo_calculado := v_cuenta.saldo_inicial + v_cuenta.total_ingresos - v_cuenta.total_egresos;
    v_diferencia := ABS(v_cuenta.saldo_actual - v_saldo_calculado);

    IF v_diferencia > 0.01 THEN
      v_cuentas_descuadradas := v_cuentas_descuadradas + 1;
      v_cuentas_problema := array_append(
        v_cuentas_problema,
        jsonb_build_object(
          'cuenta_id', v_cuenta.id,
          'nombre', v_cuenta.nombre,
          'numero_cuenta', v_cuenta.numero_cuenta,
          'saldo_actual', v_cuenta.saldo_actual,
          'saldo_calculado', v_saldo_calculado,
          'diferencia', v_diferencia
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

-- Función para generar snapshots de saldos
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
      COALESCE(SUM(CASE WHEN mt.tipo_movimiento = 'INGRESO' THEN mt.monto ELSE 0 END), 0) as total_ingresos,
      COALESCE(SUM(CASE WHEN mt.tipo_movimiento = 'EGRESO' THEN mt.monto ELSE 0 END), 0) as total_egresos,
      COALESCE(COUNT(CASE WHEN mt.tipo_movimiento = 'INGRESO' THEN 1 END), 0) as cantidad_ingresos,
      COALESCE(COUNT(CASE WHEN mt.tipo_movimiento = 'EGRESO' THEN 1 END), 0) as cantidad_egresos
    FROM cuentas_bancarias cb
    LEFT JOIN movimientos_tesoreria mt ON mt.cuenta_bancaria_id = cb.id
      AND mt.fecha >= p_fecha_inicio
      AND mt.fecha <= p_fecha_fin
    WHERE cb.empresa_id = p_empresa_id
      AND cb.activa = true
    GROUP BY cb.id, cb.nombre, cb.numero_cuenta, cb.banco, cb.tipo_cuenta,
             cb.moneda, cb.saldo_inicial, cb.saldo_actual
  LOOP
    -- Calcular saldo esperado
    v_saldo_calculado := v_cuenta.saldo_inicial + v_cuenta.total_ingresos - v_cuenta.total_egresos;
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
      fecha_snapshot
    ) VALUES (
      p_periodo_id,
      p_empresa_id,
      v_cuenta.cuenta_id,
      v_cuenta.nombre,
      v_cuenta.numero_cuenta,
      v_cuenta.banco,
      v_cuenta.tipo_cuenta,
      v_cuenta.moneda,
      v_cuenta.saldo_inicial,
      v_cuenta.saldo_actual,
      v_cuenta.total_ingresos,
      v_cuenta.total_egresos,
      v_cuenta.cantidad_ingresos,
      v_cuenta.cantidad_egresos,
      v_saldo_calculado,
      v_diferencia,
      ABS(v_diferencia) <= 0.01,
      now()
    );

    v_snapshots_creados := v_snapshots_creados + 1;
  END LOOP;

  RETURN v_snapshots_creados;
END;
$$;

-- Comentarios
COMMENT ON TABLE snapshots_saldos_bancarios IS 'Snapshots de saldos bancarios al cierre de periodos';
COMMENT ON FUNCTION validar_tesoreria_periodo IS 'Valida que toda la tesorería del periodo esté correcta';
COMMENT ON FUNCTION generar_snapshots_saldos_periodo IS 'Genera snapshots de todas las cuentas bancarias para un periodo';
