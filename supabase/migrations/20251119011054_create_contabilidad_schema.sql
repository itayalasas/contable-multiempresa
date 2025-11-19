/*
  # Esquema de Contabilidad

  ## Tablas de Contabilidad
  
  ### Plan de Cuentas
  - `plan_cuentas` - Plan contable por empresa con jerarquía

  ### Asientos Contables
  - `asientos_contables` - Cabecera de asientos contables
  - `movimientos_contables` - Líneas/movimientos de cada asiento

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo usuarios de la empresa pueden acceder a sus datos
  - Validación de permisos según rol del usuario
*/

-- =====================================================
-- TABLA: plan_cuentas
-- =====================================================
CREATE TABLE IF NOT EXISTS plan_cuentas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO')),
  nivel integer NOT NULL DEFAULT 1,
  cuenta_padre uuid REFERENCES plan_cuentas(id),
  descripcion text,
  saldo numeric(15,2) DEFAULT 0,
  activa boolean DEFAULT true,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  configuracion jsonb DEFAULT '{
    "maneja_auxiliares": false,
    "requiere_documento": false,
    "requiere_tercero": false,
    "centro_costo_obligatorio": false
  }'::jsonb,
  UNIQUE(codigo, empresa_id)
);

ALTER TABLE plan_cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver plan cuentas de sus empresas"
  ON plan_cuentas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = plan_cuentas.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Admin y contador pueden crear cuentas"
  ON plan_cuentas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = plan_cuentas.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  );

CREATE POLICY "Admin y contador pueden actualizar cuentas"
  ON plan_cuentas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = plan_cuentas.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas e
      JOIN usuarios u ON u.id = auth.uid()::text
      WHERE e.id = plan_cuentas.empresa_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
      AND u.rol IN ('super_admin', 'admin_empresa', 'contador')
    )
  );

-- =====================================================
-- TABLA: asientos_contables
-- =====================================================
CREATE TABLE IF NOT EXISTS asientos_contables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero text NOT NULL,
  fecha date NOT NULL,
  descripcion text NOT NULL,
  referencia text,
  estado text NOT NULL CHECK (estado IN ('borrador', 'confirmado', 'anulado')) DEFAULT 'borrador',
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz,
  centro_costo text,
  proyecto text,
  documento_soporte jsonb,
  UNIQUE(numero, empresa_id)
);

ALTER TABLE asientos_contables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver asientos de sus empresas"
  ON asientos_contables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = asientos_contables.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear asientos en sus empresas"
  ON asientos_contables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = asientos_contables.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

CREATE POLICY "Usuarios pueden actualizar asientos en sus empresas"
  ON asientos_contables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = asientos_contables.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = asientos_contables.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: movimientos_contables
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_contables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asiento_id uuid REFERENCES asientos_contables(id) ON DELETE CASCADE NOT NULL,
  cuenta_id uuid REFERENCES plan_cuentas(id) NOT NULL,
  cuenta text NOT NULL,
  debito numeric(15,2) DEFAULT 0,
  credito numeric(15,2) DEFAULT 0,
  descripcion text,
  tercero_id text,
  tercero text,
  documento_referencia text,
  centro_costo text,
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE movimientos_contables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver movimientos de asientos de sus empresas"
  ON movimientos_contables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM asientos_contables a
      JOIN empresas e ON e.id = a.empresa_id
      WHERE a.id = movimientos_contables.asiento_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear movimientos en sus empresas"
  ON movimientos_contables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM asientos_contables a
      JOIN empresas e ON e.id = a.empresa_id
      WHERE a.id = movimientos_contables.asiento_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar movimientos en sus empresas"
  ON movimientos_contables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM asientos_contables a
      JOIN empresas e ON e.id = a.empresa_id
      WHERE a.id = movimientos_contables.asiento_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM asientos_contables a
      JOIN empresas e ON e.id = a.empresa_id
      WHERE a.id = movimientos_contables.asiento_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_empresa ON plan_cuentas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_codigo ON plan_cuentas(codigo);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_tipo ON plan_cuentas(tipo);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_activa ON plan_cuentas(activa);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_padre ON plan_cuentas(cuenta_padre);

CREATE INDEX IF NOT EXISTS idx_asientos_empresa ON asientos_contables(empresa_id);
CREATE INDEX IF NOT EXISTS idx_asientos_fecha ON asientos_contables(fecha);
CREATE INDEX IF NOT EXISTS idx_asientos_estado ON asientos_contables(estado);
CREATE INDEX IF NOT EXISTS idx_asientos_numero ON asientos_contables(numero);
CREATE INDEX IF NOT EXISTS idx_asientos_creado_por ON asientos_contables(creado_por);

CREATE INDEX IF NOT EXISTS idx_movimientos_asiento ON movimientos_contables(asiento_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON movimientos_contables(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tercero ON movimientos_contables(tercero_id);
