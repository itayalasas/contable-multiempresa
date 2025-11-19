/*
  # Esquema de Cuentas por Cobrar

  ## Tablas de Cuentas por Cobrar
  
  ### Clientes
  - `clientes` - Clientes de cada empresa

  ### Facturas por Cobrar
  - `facturas_por_cobrar` - Facturas emitidas a clientes
  - `items_factura_cobrar` - Detalles de items de cada factura
  - `pagos_factura` - Pagos recibidos de clientes

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo usuarios de la empresa pueden acceder a sus datos
  - Validación automática de permisos
*/

-- =====================================================
-- TABLA: clientes
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
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
  limite_credito numeric(15,2),
  dias_credito integer,
  observaciones text,
  UNIQUE(numero_documento, empresa_id)
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver clientes de sus empresas"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear clientes en sus empresas"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar clientes de sus empresas"
  ON clientes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: facturas_por_cobrar
-- =====================================================
CREATE TABLE IF NOT EXISTS facturas_por_cobrar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero text NOT NULL,
  tipo_documento text NOT NULL,
  cliente_id uuid REFERENCES clientes(id) NOT NULL,
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

ALTER TABLE facturas_por_cobrar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver facturas por cobrar de sus empresas"
  ON facturas_por_cobrar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_cobrar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear facturas en sus empresas"
  ON facturas_por_cobrar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_cobrar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

CREATE POLICY "Usuarios pueden actualizar facturas de sus empresas"
  ON facturas_por_cobrar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_cobrar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas_por_cobrar.empresa_id
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: items_factura_cobrar
-- =====================================================
CREATE TABLE IF NOT EXISTS items_factura_cobrar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_id uuid REFERENCES facturas_por_cobrar(id) ON DELETE CASCADE NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(10,2) NOT NULL,
  precio_unitario numeric(15,2) NOT NULL,
  descuento numeric(15,2) DEFAULT 0,
  impuesto numeric(15,2) DEFAULT 0,
  total numeric(15,2) NOT NULL,
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE items_factura_cobrar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver items de facturas de sus empresas"
  ON items_factura_cobrar FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_cobrar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden crear items en sus empresas"
  ON items_factura_cobrar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_cobrar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden actualizar items de sus empresas"
  ON items_factura_cobrar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_cobrar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = items_factura_cobrar.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- =====================================================
-- TABLA: pagos_factura
-- =====================================================
CREATE TABLE IF NOT EXISTS pagos_factura (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_id uuid REFERENCES facturas_por_cobrar(id) ON DELETE CASCADE NOT NULL,
  fecha_pago date NOT NULL,
  monto numeric(15,2) NOT NULL,
  tipo_pago text NOT NULL,
  referencia text,
  observaciones text,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE pagos_factura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver pagos de sus empresas"
  ON pagos_factura FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = pagos_factura.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Usuarios pueden registrar pagos en sus empresas"
  ON pagos_factura FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_por_cobrar f
      JOIN empresas e ON e.id = f.empresa_id
      WHERE f.id = pagos_factura.factura_id
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
    AND creado_por = auth.uid()::text
  );

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(numero_documento);

CREATE INDEX IF NOT EXISTS idx_facturas_cobrar_empresa ON facturas_por_cobrar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cobrar_cliente ON facturas_por_cobrar(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cobrar_estado ON facturas_por_cobrar(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_cobrar_fecha_emision ON facturas_por_cobrar(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_cobrar_fecha_venc ON facturas_por_cobrar(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_items_cobrar_factura ON items_factura_cobrar(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_factura ON pagos_factura(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos_factura(fecha_pago);
