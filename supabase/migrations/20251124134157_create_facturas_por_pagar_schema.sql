/*
  # Crear tablas de Cuentas por Pagar faltantes

  ## Descripción
  Esta migración crea las tablas necesarias para el sistema de Cuentas por Pagar que faltaban en la base de datos.

  ## Nuevas Tablas
  
  ### facturas_por_pagar
  - Almacena las facturas recibidas de proveedores
  - Campos principales:
    - `id` (uuid, PK)
    - `numero` - Número de factura
    - `tipo_documento` - Tipo de documento (FACTURA, NOTA_CREDITO, etc)
    - `proveedor_id` - FK a proveedores
    - `fecha_emision` - Fecha de emisión
    - `fecha_vencimiento` - Fecha de vencimiento
    - `monto_total` - Monto total de la factura
    - `monto_pagado` - Monto ya pagado
    - `saldo_pendiente` - Saldo pendiente de pago
    - `estado` - Estado (PENDIENTE, PARCIAL, PAGADA, VENCIDA, ANULADA)
    - `empresa_id` - FK a empresas
  
  ### items_factura_pagar
  - Almacena los items/líneas de cada factura por pagar
  - Campos principales:
    - `id` (uuid, PK)
    - `factura_id` - FK a facturas_por_pagar
    - `descripcion` - Descripción del item
    - `cantidad` - Cantidad
    - `precio_unitario` - Precio unitario
    - `total` - Total del item

  ### pagos_proveedor
  - Almacena los pagos realizados a proveedores
  - Campos principales:
    - `id` (uuid, PK)
    - `factura_id` - FK a facturas_por_pagar
    - `fecha_pago` - Fecha del pago
    - `monto` - Monto del pago
    - `tipo_pago` - Tipo de pago (EFECTIVO, TRANSFERENCIA, etc)

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas creadas para:
    - SELECT: Usuarios pueden ver registros de sus empresas
    - INSERT: Usuarios pueden crear registros en sus empresas
    - UPDATE: Usuarios pueden actualizar registros de sus empresas

  ## Índices
  - Índices creados en campos clave para optimizar consultas:
    - empresa_id
    - proveedor_id
    - estado
    - fecha_emision
    - fecha_vencimiento

  ## Notas Importantes
  1. La tabla `proveedores` ya existe, no se crea nuevamente
  2. Se usa ON DELETE CASCADE en items y pagos para mantener integridad
  3. Los estados de factura están validados con CHECK constraint
*/

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
  moneda text NOT NULL DEFAULT 'UYU',
  observaciones text,
  referencia text,
  condiciones_pago text,
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  creado_por text REFERENCES usuarios(id) NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz,
  UNIQUE(numero, empresa_id)
);

-- Habilitar RLS
ALTER TABLE facturas_por_pagar ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuarios pueden ver facturas de sus empresas
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

-- Política INSERT: Usuarios pueden crear facturas en sus empresas
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

-- Política UPDATE: Usuarios pueden actualizar facturas de sus empresas
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

-- Política DELETE: Usuarios pueden eliminar facturas de sus empresas
CREATE POLICY "Usuarios pueden eliminar facturas de sus empresas"
  ON facturas_por_pagar FOR DELETE
  TO authenticated
  USING (
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

-- Habilitar RLS
ALTER TABLE items_factura_pagar ENABLE ROW LEVEL SECURITY;

-- Política SELECT
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

-- Política INSERT
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

-- Política UPDATE
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

-- Habilitar RLS
ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;

-- Política SELECT
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

-- Política INSERT
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

-- Política para Edge Functions (usando SERVICE_ROLE)
CREATE POLICY "Service role puede crear facturas por pagar"
  ON facturas_por_pagar FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role puede actualizar facturas por pagar"
  ON facturas_por_pagar FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role puede ver facturas por pagar"
  ON facturas_por_pagar FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role puede crear items"
  ON items_factura_pagar FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_empresa ON facturas_por_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_proveedor ON facturas_por_pagar(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_estado ON facturas_por_pagar(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_fecha_emision ON facturas_por_pagar(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_fecha_venc ON facturas_por_pagar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_items_pagar_factura ON items_factura_pagar(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_factura ON pagos_proveedor(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_fecha ON pagos_proveedor(fecha_pago);