/*
  # Crear schema de Facturas de Compra

  1. Nueva Tabla: proveedores
  2. Nueva Tabla: facturas_compra  
  3. Nueva Tabla: facturas_compra_items
  4. Security con RLS usando usuarios.empresas_asignadas (text[])
  5. Indexes para performance
*/

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  razon_social text NOT NULL,
  nombre_comercial text,
  tipo_documento text NOT NULL,
  numero_documento text NOT NULL,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  pais text,
  activo boolean DEFAULT true,
  observaciones text,
  condiciones_pago text,
  limite_credito numeric(15,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Facturas de Compra
CREATE TABLE IF NOT EXISTS facturas_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  numero_factura text NOT NULL,
  serie text,
  tipo_documento text DEFAULT 'factura',
  fecha_emision date NOT NULL,
  fecha_vencimiento date,
  estado text NOT NULL DEFAULT 'pendiente',
  subtotal numeric(15,2) NOT NULL,
  total_iva numeric(15,2) NOT NULL,
  total numeric(15,2) NOT NULL,
  moneda text DEFAULT 'UYU',
  tipo_cambio numeric(10,4) DEFAULT 1,
  observaciones text,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_anulacion timestamptz,
  motivo_anulacion text,
  asiento_contable_id uuid REFERENCES asientos_contables(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT facturas_compra_estado_check CHECK (estado IN ('borrador', 'pagada', 'pendiente', 'anulada', 'vencida'))
);

-- Tabla de Items de Facturas de Compra
CREATE TABLE IF NOT EXISTS facturas_compra_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES facturas_compra(id) ON DELETE CASCADE,
  numero_linea integer NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(15,4) NOT NULL,
  precio_unitario numeric(15,4) NOT NULL,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  descuento_monto numeric(15,2) DEFAULT 0,
  tasa_iva numeric(5,4) NOT NULL,
  monto_iva numeric(15,2) NOT NULL,
  subtotal numeric(15,2) NOT NULL,
  total numeric(15,2) NOT NULL,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON proveedores(empresa_id, numero_documento);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_empresa ON facturas_compra(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_proveedor ON facturas_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_estado ON facturas_compra(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_fecha ON facturas_compra(empresa_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_items_factura ON facturas_compra_items(factura_id);

-- Enable RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_compra_items ENABLE ROW LEVEL SECURITY;

-- Policies para proveedores
CREATE POLICY "Users can view proveedores from their empresas"
  ON proveedores FOR SELECT
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert proveedores in their empresas"
  ON proveedores FOR INSERT
  WITH CHECK (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update proveedores in their empresas"
  ON proveedores FOR UPDATE
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  )
  WITH CHECK (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete proveedores from their empresas"
  ON proveedores FOR DELETE
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

-- Policies para facturas_compra
CREATE POLICY "Users can view facturas_compra from their empresas"
  ON facturas_compra FOR SELECT
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert facturas_compra in their empresas"
  ON facturas_compra FOR INSERT
  WITH CHECK (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update facturas_compra in their empresas"
  ON facturas_compra FOR UPDATE
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  )
  WITH CHECK (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete facturas_compra from their empresas"
  ON facturas_compra FOR DELETE
  USING (
    empresa_id::text = ANY(
      SELECT unnest(empresas_asignadas) 
      FROM usuarios 
      WHERE id = auth.uid()::text
    )
  );

-- Policies para facturas_compra_items
CREATE POLICY "Users can view facturas_compra_items from their empresas"
  ON facturas_compra_items FOR SELECT
  USING (
    factura_id IN (
      SELECT id FROM facturas_compra 
      WHERE empresa_id::text = ANY(
        SELECT unnest(empresas_asignadas) 
        FROM usuarios 
        WHERE id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can insert facturas_compra_items in their empresas"
  ON facturas_compra_items FOR INSERT
  WITH CHECK (
    factura_id IN (
      SELECT id FROM facturas_compra 
      WHERE empresa_id::text = ANY(
        SELECT unnest(empresas_asignadas) 
        FROM usuarios 
        WHERE id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can update facturas_compra_items in their empresas"
  ON facturas_compra_items FOR UPDATE
  USING (
    factura_id IN (
      SELECT id FROM facturas_compra 
      WHERE empresa_id::text = ANY(
        SELECT unnest(empresas_asignadas) 
        FROM usuarios 
        WHERE id = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    factura_id IN (
      SELECT id FROM facturas_compra 
      WHERE empresa_id::text = ANY(
        SELECT unnest(empresas_asignadas) 
        FROM usuarios 
        WHERE id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete facturas_compra_items from their empresas"
  ON facturas_compra_items FOR DELETE
  USING (
    factura_id IN (
      SELECT id FROM facturas_compra 
      WHERE empresa_id::text = ANY(
        SELECT unnest(empresas_asignadas) 
        FROM usuarios 
        WHERE id = auth.uid()::text
      )
    )
  );
