/*
  # Esquema de Tesorería

  ## Tablas de Tesorería
  
  ### Cuentas Bancarias
  - `cuentas_bancarias` - Cuentas bancarias de cada empresa

  ### Movimientos de Tesorería
  - `movimientos_tesoreria` - Movimientos de entrada/salida de efectivo

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo usuarios de la empresa pueden acceder a sus datos
*/

-- =====================================================
-- TABLA: cuentas_bancarias
-- =====================================================
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  numero_cuenta text NOT NULL,
  banco_id uuid REFERENCES bancos(id),
  banco text NOT NULL,
  tipo_cuenta text NOT NULL,
  moneda text NOT NULL DEFAULT 'PEN',
  saldo_actual numeric(15,2) DEFAULT 0,
  saldo_inicial numeric(15,2) DEFAULT 0,
  fecha_apertura date,
  activa boolean DEFAULT true,
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now(),
  UNIQUE(numero_cuenta, empresa_id)
);

ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver cuentas bancarias de sus empresas"
  ON cuentas_bancarias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = cuentas_bancarias.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Admin y contador pueden crear cuentas bancarias"
  ON cuentas_bancarias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = cuentas_bancarias.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  );

CREATE POLICY "Admin y contador pueden actualizar cuentas bancarias"
  ON cuentas_bancarias FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = cuentas_bancarias.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = cuentas_bancarias.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  );

-- =====================================================
-- TABLA: movimientos_tesoreria
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_tesoreria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuenta_bancaria_id uuid REFERENCES cuentas_bancarias(id) NOT NULL,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO', 'TRANSFERENCIA')),
  fecha date NOT NULL,
  monto numeric(15,2) NOT NULL,
  descripcion text NOT NULL,
  referencia text,
  beneficiario text,
  categoria text,
  cuenta_destino_id uuid REFERENCES cuentas_bancarias(id),
  documento_soporte text,
  estado text NOT NULL CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'CONCILIADO', 'ANULADO')) DEFAULT 'CONFIRMADO',
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz,
  asiento_contable_id uuid REFERENCES asientos_contables(id)
);

ALTER TABLE movimientos_tesoreria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver movimientos de tesorería de sus empresas"
  ON movimientos_tesoreria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = movimientos_tesoreria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear movimientos en sus empresas"
  ON movimientos_tesoreria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = movimientos_tesoreria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

CREATE POLICY "Usuarios pueden actualizar movimientos de sus empresas"
  ON movimientos_tesoreria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = movimientos_tesoreria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = movimientos_tesoreria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: conciliacion_bancaria
-- =====================================================
CREATE TABLE IF NOT EXISTS conciliacion_bancaria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuenta_bancaria_id uuid REFERENCES cuentas_bancarias(id) NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  saldo_inicial_banco numeric(15,2) NOT NULL,
  saldo_final_banco numeric(15,2) NOT NULL,
  saldo_inicial_contable numeric(15,2) NOT NULL,
  saldo_final_contable numeric(15,2) NOT NULL,
  diferencia numeric(15,2) NOT NULL,
  estado text NOT NULL CHECK (estado IN ('EN_PROCESO', 'CONCILIADO', 'CON_DIFERENCIAS')) DEFAULT 'EN_PROCESO',
  observaciones text,
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_conciliacion timestamptz
);

ALTER TABLE conciliacion_bancaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver conciliaciones de sus empresas"
  ON conciliacion_bancaria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = conciliacion_bancaria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear conciliaciones en sus empresas"
  ON conciliacion_bancaria FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = conciliacion_bancaria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

CREATE POLICY "Usuarios pueden actualizar conciliaciones de sus empresas"
  ON conciliacion_bancaria FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = conciliacion_bancaria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = conciliacion_bancaria.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: movimientos_conciliacion
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_conciliacion (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conciliacion_id uuid REFERENCES conciliacion_bancaria(id) ON DELETE CASCADE NOT NULL,
  movimiento_id uuid REFERENCES movimientos_tesoreria(id),
  fecha date NOT NULL,
  descripcion text NOT NULL,
  monto numeric(15,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('BANCO', 'CONTABLE', 'AJUSTE')),
  conciliado boolean DEFAULT false,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE movimientos_conciliacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver movimientos de conciliación de sus empresas"
  ON movimientos_conciliacion FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conciliacion_bancaria c
      JOIN empresas e ON e.id = c.empresa_id
      WHERE c.id = movimientos_conciliacion.conciliacion_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear movimientos de conciliación"
  ON movimientos_conciliacion FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conciliacion_bancaria c
      JOIN empresas e ON e.id = c.empresa_id
      WHERE c.id = movimientos_conciliacion.conciliacion_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar movimientos de conciliación"
  ON movimientos_conciliacion FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conciliacion_bancaria c
      JOIN empresas e ON e.id = c.empresa_id
      WHERE c.id = movimientos_conciliacion.conciliacion_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conciliacion_bancaria c
      JOIN empresas e ON e.id = c.empresa_id
      WHERE c.id = movimientos_conciliacion.conciliacion_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_empresa ON cuentas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_banco ON cuentas_bancarias(banco_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_activa ON cuentas_bancarias(activa);

CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_empresa ON movimientos_tesoreria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_cuenta ON movimientos_tesoreria(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_fecha ON movimientos_tesoreria(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_tipo ON movimientos_tesoreria(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_tesoreria_estado ON movimientos_tesoreria(estado);

CREATE INDEX IF NOT EXISTS idx_conciliacion_empresa ON conciliacion_bancaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conciliacion_cuenta ON conciliacion_bancaria(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_conciliacion_estado ON conciliacion_bancaria(estado);

CREATE INDEX IF NOT EXISTS idx_mov_conciliacion_conciliacion ON movimientos_conciliacion(conciliacion_id);
CREATE INDEX IF NOT EXISTS idx_mov_conciliacion_movimiento ON movimientos_conciliacion(movimiento_id);
