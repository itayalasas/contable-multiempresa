/*
  # Módulo de Ventas - Facturas y Notas de Crédito

  ## Nuevas Tablas
  
  ### 1. `facturas_venta`
  Registro de facturas de venta emitidas
  - `id` (uuid, PK)
  - `empresa_id` (uuid, FK empresas)
  - `cliente_id` (uuid, FK clientes)
  - `numero_factura` (text) - Número de factura
  - `serie` (text) - Serie de la factura
  - `tipo_documento` (text) - e-ticket, e-factura, factura_exportacion
  - `fecha_emision` (date)
  - `fecha_vencimiento` (date)
  - `estado` (text) - borrador, pagada, anulada, vencida
  - `subtotal` (numeric)
  - `total_iva` (numeric)
  - `total` (numeric)
  - `moneda` (text) - UYU, USD, EUR
  - `tipo_cambio` (numeric)
  - `observaciones` (text)
  - `dgi_enviada` (boolean) - Si se envió a DGI
  - `dgi_cae` (text) - Código de autorización DGI
  - `dgi_fecha_envio` (timestamp)
  - `nota_credito_id` (uuid) - Si fue anulada
  - `fecha_anulacion` (timestamp)
  - `asiento_contable_id` (uuid) - Referencia al asiento
  - `metadata` (jsonb) - Datos externos (CRM, order_id, etc)
  - Timestamps
  
  ### 2. `facturas_venta_items`
  Líneas de detalle de facturas
  - `id` (uuid, PK)
  - `factura_id` (uuid, FK facturas_venta)
  - `descripcion` (text)
  - `cantidad` (numeric)
  - `precio_unitario` (numeric)
  - `descuento_porcentaje` (numeric)
  - `descuento_monto` (numeric)
  - `tasa_iva` (numeric)
  - `monto_iva` (numeric)
  - `subtotal` (numeric)
  - `total` (numeric)
  - `cuenta_contable_id` (uuid, FK plan_cuentas)
  
  ### 3. `notas_credito`
  Notas de crédito para anular facturas
  - Similar estructura a facturas_venta
  - `factura_referencia_id` (uuid, FK facturas_venta)
  - `motivo` (text)
  - `tipo_anulacion` (text) - total, parcial
  
  ### 4. `notas_credito_items`
  Líneas de detalle de notas de crédito
  
  ### 5. `eventos_externos`
  Log de eventos recibidos de sistemas externos
  - `id` (uuid, PK)
  - `empresa_id` (uuid, FK empresas)
  - `tipo_evento` (text) - order.paid, order.cancelled
  - `origen` (text) - crm, app_ventas, webhook
  - `payload` (jsonb)
  - `procesado` (boolean)
  - `factura_id` (uuid)
  - `nota_credito_id` (uuid)
  - `error` (text)
  - Timestamps
  
  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas por empresa para usuarios autenticados
  - Políticas especiales para webhooks (anon con API key)
*/

-- Tabla: facturas_venta
CREATE TABLE IF NOT EXISTS facturas_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  
  numero_factura TEXT NOT NULL,
  serie TEXT DEFAULT 'A',
  tipo_documento TEXT NOT NULL DEFAULT 'e-ticket',
  
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  
  estado TEXT NOT NULL DEFAULT 'borrador',
  
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  moneda TEXT NOT NULL DEFAULT 'UYU',
  tipo_cambio NUMERIC(10,4) DEFAULT 1,
  
  observaciones TEXT,
  
  dgi_enviada BOOLEAN DEFAULT FALSE,
  dgi_cae TEXT,
  dgi_fecha_envio TIMESTAMP WITH TIME ZONE,
  dgi_response JSONB,
  
  nota_credito_id UUID,
  fecha_anulacion TIMESTAMP WITH TIME ZONE,
  motivo_anulacion TEXT,
  
  asiento_contable_id UUID,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  CONSTRAINT facturas_venta_numero_empresa_uk UNIQUE(empresa_id, numero_factura, serie),
  CONSTRAINT facturas_venta_estado_check CHECK (estado IN ('borrador', 'pagada', 'pendiente', 'anulada', 'vencida')),
  CONSTRAINT facturas_venta_tipo_doc_check CHECK (tipo_documento IN ('e-ticket', 'e-factura', 'factura_exportacion', 'nota_debito'))
);

-- Tabla: facturas_venta_items
CREATE TABLE IF NOT EXISTS facturas_venta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_venta(id) ON DELETE CASCADE,
  
  numero_linea INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  
  cantidad NUMERIC(15,4) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(15,2) NOT NULL,
  
  descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
  descuento_monto NUMERIC(15,2) DEFAULT 0,
  
  tasa_iva NUMERIC(5,4) NOT NULL DEFAULT 0.22,
  monto_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  subtotal NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  
  cuenta_contable_id UUID REFERENCES plan_cuentas(id),
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT facturas_venta_items_uk UNIQUE(factura_id, numero_linea)
);

-- Tabla: notas_credito
CREATE TABLE IF NOT EXISTS notas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  factura_referencia_id UUID NOT NULL REFERENCES facturas_venta(id) ON DELETE RESTRICT,
  
  numero_nota TEXT NOT NULL,
  serie TEXT DEFAULT 'A',
  tipo_documento TEXT NOT NULL DEFAULT 'e-nota-credito',
  
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  
  motivo TEXT NOT NULL,
  tipo_anulacion TEXT NOT NULL DEFAULT 'total',
  
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  moneda TEXT NOT NULL DEFAULT 'UYU',
  tipo_cambio NUMERIC(10,4) DEFAULT 1,
  
  observaciones TEXT,
  
  dgi_enviada BOOLEAN DEFAULT FALSE,
  dgi_cae TEXT,
  dgi_fecha_envio TIMESTAMP WITH TIME ZONE,
  dgi_response JSONB,
  
  asiento_contable_id UUID,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  CONSTRAINT notas_credito_numero_empresa_uk UNIQUE(empresa_id, numero_nota, serie),
  CONSTRAINT notas_credito_tipo_anulacion_check CHECK (tipo_anulacion IN ('total', 'parcial'))
);

-- Tabla: notas_credito_items
CREATE TABLE IF NOT EXISTS notas_credito_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_credito_id UUID NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
  factura_item_id UUID REFERENCES facturas_venta_items(id),
  
  numero_linea INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  
  cantidad NUMERIC(15,4) NOT NULL,
  precio_unitario NUMERIC(15,2) NOT NULL,
  
  tasa_iva NUMERIC(5,4) NOT NULL DEFAULT 0.22,
  monto_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  subtotal NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  
  cuenta_contable_id UUID REFERENCES plan_cuentas(id),
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT notas_credito_items_uk UNIQUE(nota_credito_id, numero_linea)
);

-- Tabla: eventos_externos
CREATE TABLE IF NOT EXISTS eventos_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  tipo_evento TEXT NOT NULL,
  origen TEXT NOT NULL,
  
  payload JSONB NOT NULL,
  
  procesado BOOLEAN DEFAULT FALSE,
  procesado_at TIMESTAMP WITH TIME ZONE,
  
  factura_id UUID REFERENCES facturas_venta(id),
  nota_credito_id UUID REFERENCES notas_credito(id),
  
  error TEXT,
  reintentos INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT eventos_externos_tipo_check CHECK (tipo_evento IN ('order.paid', 'order.cancelled', 'order.updated', 'refund.completed'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_facturas_venta_empresa ON facturas_venta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_cliente ON facturas_venta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_fecha ON facturas_venta(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_estado ON facturas_venta(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_metadata ON facturas_venta USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_notas_credito_empresa ON notas_credito(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_factura ON notas_credito(factura_referencia_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha ON notas_credito(fecha_emision);

CREATE INDEX IF NOT EXISTS idx_eventos_externos_empresa ON eventos_externos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_eventos_externos_tipo ON eventos_externos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_externos_procesado ON eventos_externos(procesado);
CREATE INDEX IF NOT EXISTS idx_eventos_externos_created ON eventos_externos(created_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facturas_venta_updated_at
  BEFORE UPDATE ON facturas_venta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notas_credito_updated_at
  BEFORE UPDATE ON notas_credito
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE facturas_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_credito_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_externos ENABLE ROW LEVEL SECURITY;

-- Políticas para facturas_venta
CREATE POLICY "Users can view facturas from their empresas"
  ON facturas_venta FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = facturas_venta.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can insert facturas to their empresas"
  ON facturas_venta FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = facturas_venta.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can update facturas from their empresas"
  ON facturas_venta FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = facturas_venta.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = facturas_venta.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can delete facturas from their empresas"
  ON facturas_venta FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = facturas_venta.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- Políticas para facturas_venta_items
CREATE POLICY "Users can view items from their empresas facturas"
  ON facturas_venta_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      JOIN empresas e ON e.id = fv.empresa_id
      WHERE fv.id = facturas_venta_items.factura_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Users can insert items to their empresas facturas"
  ON facturas_venta_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      JOIN empresas e ON e.id = fv.empresa_id
      WHERE fv.id = facturas_venta_items.factura_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Users can update items from their empresas facturas"
  ON facturas_venta_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      JOIN empresas e ON e.id = fv.empresa_id
      WHERE fv.id = facturas_venta_items.factura_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Users can delete items from their empresas facturas"
  ON facturas_venta_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      JOIN empresas e ON e.id = fv.empresa_id
      WHERE fv.id = facturas_venta_items.factura_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- Políticas para notas_credito
CREATE POLICY "Users can view notas credito from their empresas"
  ON notas_credito FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = notas_credito.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can insert notas credito to their empresas"
  ON notas_credito FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = notas_credito.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can update notas credito from their empresas"
  ON notas_credito FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = notas_credito.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

-- Políticas para notas_credito_items
CREATE POLICY "Users can view items from their empresas notas credito"
  ON notas_credito_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notas_credito nc
      JOIN empresas e ON e.id = nc.empresa_id
      WHERE nc.id = notas_credito_items.nota_credito_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

CREATE POLICY "Users can insert items to their empresas notas credito"
  ON notas_credito_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notas_credito nc
      JOIN empresas e ON e.id = nc.empresa_id
      WHERE nc.id = notas_credito_items.nota_credito_id 
      AND auth.uid()::text = ANY(e.usuarios_asignados)
    )
  );

-- Políticas para eventos_externos (webhooks pueden escribir como anon)
CREATE POLICY "Allow webhook to insert eventos"
  ON eventos_externos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can view eventos from their empresas"
  ON eventos_externos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = eventos_externos.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );

CREATE POLICY "Users can update eventos from their empresas"
  ON eventos_externos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas 
      WHERE empresas.id = eventos_externos.empresa_id 
      AND auth.uid()::text = ANY(empresas.usuarios_asignados)
    )
  );
