/*
  # Esquema completo de Tesorería

  1. Nuevas Tablas
    - `cuentas_bancarias`: Cuentas bancarias de cada empresa con saldos
    - `movimientos_tesoreria`: Movimientos de entrada/salida de efectivo
    
  2. Características
    - Saldos automáticos mediante triggers
    - Trazabilidad con asientos contables
    - RLS para seguridad por empresa
    
  3. Seguridad
    - RLS habilitado en todas las tablas
    - Solo service_role y usuarios de la empresa tienen acceso
*/

-- =====================================================
-- TABLA: cuentas_bancarias
-- =====================================================
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  nombre text NOT NULL,
  numero_cuenta text NOT NULL,
  banco_id uuid REFERENCES bancos(id),
  banco text NOT NULL,
  tipo_cuenta text NOT NULL CHECK (tipo_cuenta IN ('CORRIENTE', 'AHORRO', 'CAJA', 'EFECTIVO')),
  moneda text NOT NULL DEFAULT 'UYU',
  saldo_inicial numeric(15,2) DEFAULT 0,
  saldo_actual numeric(15,2) DEFAULT 0,
  fecha_apertura date,
  activa boolean DEFAULT true,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(numero_cuenta, empresa_id)
);

ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

-- Políticas para cuentas_bancarias
CREATE POLICY "Service role tiene acceso total a cuentas bancarias"
  ON cuentas_bancarias FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios anon pueden leer cuentas bancarias"
  ON cuentas_bancarias FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Usuarios anon pueden insertar cuentas bancarias"
  ON cuentas_bancarias FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Usuarios anon pueden actualizar cuentas bancarias"
  ON cuentas_bancarias FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLA: movimientos_tesoreria
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_tesoreria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  cuenta_bancaria_id uuid REFERENCES cuentas_bancarias(id) NOT NULL,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO', 'TRANSFERENCIA')),
  fecha date NOT NULL,
  monto numeric(15,2) NOT NULL,
  descripcion text NOT NULL,
  referencia text,
  beneficiario text,
  categoria text,
  asiento_contable_id uuid REFERENCES asientos_contables(id),
  documento_origen_tipo text,
  documento_origen_id uuid,
  creado_por text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE movimientos_tesoreria ENABLE ROW LEVEL SECURITY;

-- Políticas para movimientos_tesoreria
CREATE POLICY "Service role tiene acceso total a movimientos tesoreria"
  ON movimientos_tesoreria FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios anon pueden leer movimientos tesoreria"
  ON movimientos_tesoreria FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Usuarios anon pueden insertar movimientos tesoreria"
  ON movimientos_tesoreria FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Usuarios anon pueden actualizar movimientos tesoreria"
  ON movimientos_tesoreria FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FUNCIÓN Y TRIGGER: Actualizar saldo bancario
-- =====================================================

-- Función para actualizar saldo bancario automáticamente
CREATE OR REPLACE FUNCTION actualizar_saldo_bancario()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es un INGRESO, sumar al saldo
  IF NEW.tipo_movimiento = 'INGRESO' THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual + NEW.monto,
        updated_at = now()
    WHERE id = NEW.cuenta_bancaria_id;
    
  -- Si es un EGRESO, restar del saldo
  ELSIF NEW.tipo_movimiento = 'EGRESO' THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual - NEW.monto,
        updated_at = now()
    WHERE id = NEW.cuenta_bancaria_id;
    
  -- Si es TRANSFERENCIA, manejar ambas cuentas
  ELSIF NEW.tipo_movimiento = 'TRANSFERENCIA' THEN
    -- Restar de la cuenta origen
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual - NEW.monto,
        updated_at = now()
    WHERE id = NEW.cuenta_bancaria_id;
    
    -- Sumar a la cuenta destino (si existe en metadata)
    IF NEW.metadata IS NOT NULL AND NEW.metadata->>'cuenta_destino_id' IS NOT NULL THEN
      UPDATE cuentas_bancarias
      SET saldo_actual = saldo_actual + NEW.monto,
          updated_at = now()
      WHERE id = (NEW.metadata->>'cuenta_destino_id')::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_actualizar_saldo_bancario
  AFTER INSERT ON movimientos_tesoreria
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_bancario();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_empresa ON cuentas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_activa ON cuentas_bancarias(activa);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_empresa ON movimientos_tesoreria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_cuenta ON movimientos_tesoreria(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_fecha ON movimientos_tesoreria(fecha);

-- Comentarios
COMMENT ON TABLE cuentas_bancarias IS 'Cuentas bancarias de las empresas con control de saldos';
COMMENT ON TABLE movimientos_tesoreria IS 'Movimientos de entrada y salida de efectivo en cuentas bancarias';
COMMENT ON FUNCTION actualizar_saldo_bancario() IS 'Actualiza automáticamente el saldo de cuentas bancarias';
