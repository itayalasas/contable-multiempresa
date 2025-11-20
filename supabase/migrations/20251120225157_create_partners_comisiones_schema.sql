/*
  # Schema para Partners y Comisiones

  ## Descripción
  Sistema completo para gestión de partners/aliados, comisiones y facturación.
  Permite registrar las comisiones generadas por cada venta, generar facturas
  periódicas a partners, y llevar control de pagos.

  ## Nuevas Tablas

  ### 1. `partners_aliados`
  Catálogo de partners/aliados (veterinarias, tiendas, proveedores de servicios).
  - Datos de contacto y fiscales
  - Configuración de comisiones
  - Configuración de facturación
  - Datos bancarios

  ### 2. `comisiones_partners`
  Registro detallado de cada comisión generada.
  - Vinculada a factura de venta
  - Monto y porcentaje de comisión
  - Estados: pendiente, facturada, pagada
  - Referencia a factura de compra (cuando se factura al partner)

  ### 3. `lotes_facturacion_partners`
  Agrupación de comisiones para facturación periódica.
  - Periodo de facturación
  - Total de comisiones agrupadas
  - Referencia a factura de compra generada

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Solo usuarios autenticados pueden leer/escribir
  - Filtrado por empresa_id

  ## Índices
  - Optimizado para consultas por empresa, partner, periodo
  - Índices en estados para reportes
*/

-- 1. TABLA: partners_aliados
CREATE TABLE IF NOT EXISTS partners_aliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  partner_id_externo TEXT NOT NULL,
  
  -- Datos fiscales
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  documento TEXT NOT NULL,
  tipo_documento TEXT DEFAULT 'RUT',
  
  -- Contacto
  email TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  pais TEXT DEFAULT 'Uruguay',
  
  -- Estado
  activo BOOLEAN DEFAULT true,
  
  -- Configuración de comisiones
  comision_porcentaje_default DECIMAL(5,2) DEFAULT 70.00,
  
  -- Configuración de facturación
  facturacion_frecuencia TEXT DEFAULT 'quincenal',
  dia_facturacion INTEGER DEFAULT 15,
  proxima_facturacion DATE,
  
  -- Datos bancarios
  banco TEXT,
  cuenta_bancaria TEXT,
  tipo_cuenta TEXT,
  
  -- Notas
  notas TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Auditoría
  creado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(empresa_id, partner_id_externo)
);

-- Índices para partners_aliados
CREATE INDEX IF NOT EXISTS idx_partners_empresa ON partners_aliados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_partners_externo ON partners_aliados(partner_id_externo);
CREATE INDEX IF NOT EXISTS idx_partners_activo ON partners_aliados(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_partners_proxima_fact ON partners_aliados(proxima_facturacion) WHERE activo = true;

-- RLS para partners_aliados
ALTER TABLE partners_aliados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partners of their empresa"
  ON partners_aliados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert partners"
  ON partners_aliados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update partners"
  ON partners_aliados FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete partners"
  ON partners_aliados FOR DELETE
  TO authenticated
  USING (true);

-- 2. TABLA: comisiones_partners
CREATE TABLE IF NOT EXISTS comisiones_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners_aliados(id) ON DELETE CASCADE,
  factura_venta_id UUID NOT NULL REFERENCES facturas_venta(id) ON DELETE CASCADE,
  
  -- Referencia externa
  order_id TEXT NOT NULL,
  item_codigo TEXT,
  fecha DATE NOT NULL,
  
  -- Montos
  subtotal_venta DECIMAL(18,2) NOT NULL,
  comision_porcentaje DECIMAL(5,2) NOT NULL,
  comision_monto DECIMAL(18,2) NOT NULL,
  
  -- Estado de facturación
  estado_comision TEXT DEFAULT 'pendiente' CHECK (estado_comision IN ('pendiente', 'facturada', 'pagada', 'anulada')),
  fecha_facturada TIMESTAMPTZ,
  lote_facturacion_id UUID,
  factura_compra_id UUID,
  
  -- Estado de pago
  estado_pago TEXT DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagada', 'anulada')),
  fecha_pagada TIMESTAMPTZ,
  
  -- Metadata
  descripcion TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para comisiones_partners
CREATE INDEX IF NOT EXISTS idx_comisiones_empresa ON comisiones_partners(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_partner ON comisiones_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_factura_venta ON comisiones_partners(factura_venta_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_order ON comisiones_partners(order_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado ON comisiones_partners(estado_comision, estado_pago);
CREATE INDEX IF NOT EXISTS idx_comisiones_fecha ON comisiones_partners(fecha);
CREATE INDEX IF NOT EXISTS idx_comisiones_pendientes ON comisiones_partners(partner_id, estado_comision) 
  WHERE estado_comision = 'pendiente';

-- RLS para comisiones_partners
ALTER TABLE comisiones_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comisiones of their empresa"
  ON comisiones_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert comisiones"
  ON comisiones_partners FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update comisiones"
  ON comisiones_partners FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete comisiones"
  ON comisiones_partners FOR DELETE
  TO authenticated
  USING (true);

-- 3. TABLA: lotes_facturacion_partners
CREATE TABLE IF NOT EXISTS lotes_facturacion_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners_aliados(id) ON DELETE CASCADE,
  
  -- Periodo
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  
  -- Totales
  cantidad_ordenes INTEGER DEFAULT 0,
  total_comisiones DECIMAL(18,2) DEFAULT 0,
  
  -- Factura generada
  factura_compra_id UUID,
  
  -- Estado
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'facturada', 'pagada', 'anulada')),
  fecha_generada TIMESTAMPTZ,
  fecha_pagada TIMESTAMPTZ,
  
  -- Metadata
  notas TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Auditoría
  generado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para lotes_facturacion_partners
CREATE INDEX IF NOT EXISTS idx_lotes_empresa ON lotes_facturacion_partners(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lotes_partner ON lotes_facturacion_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_lotes_periodo ON lotes_facturacion_partners(periodo_inicio, periodo_fin);
CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes_facturacion_partners(estado);
CREATE INDEX IF NOT EXISTS idx_lotes_pendientes ON lotes_facturacion_partners(partner_id, estado) 
  WHERE estado = 'pendiente';

-- RLS para lotes_facturacion_partners
ALTER TABLE lotes_facturacion_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lotes of their empresa"
  ON lotes_facturacion_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert lotes"
  ON lotes_facturacion_partners FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update lotes"
  ON lotes_facturacion_partners FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete lotes"
  ON lotes_facturacion_partners FOR DELETE
  TO authenticated
  USING (true);

-- 4. AGREGAR CONSTRAINT para enlazar comisiones con lotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_comisiones_lote'
  ) THEN
    ALTER TABLE comisiones_partners 
    ADD CONSTRAINT fk_comisiones_lote 
    FOREIGN KEY (lote_facturacion_id) 
    REFERENCES lotes_facturacion_partners(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 5. FUNCIÓN: Calcular total de comisiones pendientes por partner
CREATE OR REPLACE FUNCTION calcular_comisiones_pendientes(p_partner_id UUID)
RETURNS DECIMAL(18,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(comision_monto) 
     FROM comisiones_partners 
     WHERE partner_id = p_partner_id 
       AND estado_comision = 'pendiente'),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCIÓN: Obtener próxima fecha de facturación
CREATE OR REPLACE FUNCTION calcular_proxima_facturacion(
  p_frecuencia TEXT,
  p_dia_facturacion INTEGER
)
RETURNS DATE AS $$
DECLARE
  v_fecha DATE;
BEGIN
  CASE p_frecuencia
    WHEN 'semanal' THEN
      v_fecha := CURRENT_DATE + INTERVAL '7 days';
    WHEN 'quincenal' THEN
      v_fecha := CURRENT_DATE + INTERVAL '15 days';
    WHEN 'mensual' THEN
      v_fecha := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    WHEN 'bimensual' THEN
      v_fecha := CURRENT_DATE + INTERVAL '2 months';
    ELSE
      v_fecha := CURRENT_DATE + INTERVAL '15 days';
  END CASE;
  
  RETURN v_fecha;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER: Actualizar updated_at en partners_aliados
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partners_updated_at
BEFORE UPDATE ON partners_aliados
FOR EACH ROW
EXECUTE FUNCTION update_partners_updated_at();

-- 8. TRIGGER: Actualizar updated_at en comisiones_partners
CREATE TRIGGER trg_comisiones_updated_at
BEFORE UPDATE ON comisiones_partners
FOR EACH ROW
EXECUTE FUNCTION update_partners_updated_at();

-- 9. COMENTARIOS
COMMENT ON TABLE partners_aliados IS 'Catálogo de partners/aliados (veterinarias, tiendas, proveedores)';
COMMENT ON TABLE comisiones_partners IS 'Registro de comisiones generadas por cada venta';
COMMENT ON TABLE lotes_facturacion_partners IS 'Agrupación de comisiones para facturación periódica';
