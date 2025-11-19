/*
  # Esquema de Cuentas por Pagar

  ## Tablas de Cuentas por Pagar
  
  ### Proveedores
  - `proveedores` - Proveedores de cada empresa

  ### Facturas por Pagar
  - `facturas_por_pagar` - Facturas recibidas de proveedores
  - `items_factura_pagar` - Detalles de items de cada factura
  - `pagos_proveedor` - Pagos realizados a proveedores

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo usuarios de la empresa pueden acceder a sus datos
*/

-- =====================================================
-- TABLA: proveedores
-- =====================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  razon_social text,
  tipo_documento text NOT NULL,
  numero_documento text NOT NULL,
  email text,
  telefono text,
  direccion text,
  contacto text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  condiciones_pago text,
  dias_credito integer,
  observaciones text,
  cuenta_bancaria text,
  banco text,
  UNIQUE(numero_documento, empresa_id)
);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver proveedores de sus empresas"
  ON proveedores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = proveedores.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear proveedores en sus empresas"
  ON proveedores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = proveedores.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar proveedores de sus empresas"
  ON proveedores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = proveedores.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = proveedores.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: facturas_por_pagar
-- =====================================================
CREATE TABLE IF NOT EXISTS facturas_por_pagar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero text NOT NULL,
  tipo_documento text NOT NULL,
  proveedor_id uuid REFERENCES proveedores(id) NOT NULL,
  fecha_emision date NOT NULL,
  fecha_vencimiento date NOT NULL,
  descripcion text,
  monto_subtotal numeric(15,2) NOT NULL DEFAULT 0,
  monto_impuestos numeric(15,2) NOT NULL DEFAULT 0,
  monto_total numeric(15,2) NOT NULL,
  monto_pagado numeric(15,2) NOT NULL DEFAULT 0,
  saldo_pendiente numeric(15,2) NOT NULL,
  estado text NOT NULL CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA')) DEFAULT 'PENDIENTE',
  moneda text NOT NULL DEFAULT 'PEN',
  observaciones text,
  referencia text,
  condiciones_pago text,
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz,
  UNIQUE(numero, empresa_id)
);

ALTER TABLE facturas_por_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver facturas por pagar de sus empresas"
  ON facturas_por_pagar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_pagar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear facturas en sus empresas"
  ON facturas_por_pagar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_pagar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

CREATE POLICY "Usuarios pueden actualizar facturas de sus empresas"
  ON facturas_por_pagar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_pagar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_pagar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: items_factura_pagar
-- =====================================================
CREATE TABLE IF NOT EXISTS items_factura_pagar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_id uuid REFERENCES facturas_por_pagar(id) ON DELETE CASCADE NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL,
  precio_unitario numeric(15,2) NOT NULL,
  descuento numeric(15,2) DEFAULT 0,
  impuesto numeric(15,2) DEFAULT 0,
  total numeric(15,2) NOT NULL,
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE items_factura_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver items de facturas de sus empresas"
  ON items_factura_pagar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_pagar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear items en sus empresas"
  ON items_factura_pagar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_pagar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar items de sus empresas"
  ON items_factura_pagar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_pagar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_pagar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: pagos_proveedor
-- =====================================================
CREATE TABLE IF NOT EXISTS pagos_proveedor (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_id uuid REFERENCES facturas_por_pagar(id) ON DELETE CASCADE NOT NULL,
  fecha_pago date NOT NULL,
  monto numeric(15,2) NOT NULL,
  tipo_pago text NOT NULL,
  referencia text,
  observaciones text,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  banco text,
  numero_cuenta text,
  numero_operacion text
);

ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver pagos de sus empresas"
  ON pagos_proveedor FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = pagos_proveedor.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden registrar pagos en sus empresas"
  ON pagos_proveedor FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_pagar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = pagos_proveedor.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON proveedores(numero_documento);

CREATE INDEX IF NOT EXISTS idx_facturas_pagar_empresa ON facturas_por_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_proveedor ON facturas_por_pagar(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_estado ON facturas_por_pagar(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_fecha_emision ON facturas_por_pagar(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_fecha_venc ON facturas_por_pagar(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_items_pagar_factura ON items_factura_pagar(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_factura ON pagos_proveedor(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_fecha ON pagos_proveedor(fecha_pago);
