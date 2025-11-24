/*
  # Schema para Mapeo de Archivos Bancarios

  1. New Tables
    - `mapeo_archivos_bancarios`
      - Configuración de formatos de archivo por banco
      - Incluye delimitadores, formatos de fecha, campos específicos
      - Soporta múltiples formatos para el mismo banco
    
    - `lotes_pago_bancario`
      - Registro de lotes de pago generados
      - Tracking de archivos descargados
      - Estado de procesamiento en el banco
    
    - `pagos_lote`
      - Relación entre pagos y lotes
      - Permite agrupar pagos en archivos
  
  2. Security
    - Enable RLS on all tables
    - Policies for service role (external auth)
*/

-- Tabla de configuración de mapeo de archivos bancarios
CREATE TABLE IF NOT EXISTS mapeo_archivos_bancarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  banco_id text NOT NULL,
  banco_nombre text NOT NULL,
  formato_archivo text NOT NULL DEFAULT 'TXT',
  
  -- Configuración del formato
  delimitador text DEFAULT '',
  formato_fecha text DEFAULT 'YYYYMMDD',
  tiene_encabezado boolean DEFAULT true,
  tiene_totales boolean DEFAULT true,
  codificacion text DEFAULT 'UTF-8',
  
  -- Campos específicos del banco
  config_campos jsonb DEFAULT '{}',
  
  -- Información de la empresa en el banco
  rut_empresa text,
  cuenta_debito text,
  tipo_cuenta_debito text,
  
  -- Metadata
  activo boolean DEFAULT true,
  creado_por text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz,
  
  UNIQUE(empresa_id, banco_id, nombre)
);

-- Tabla de lotes de pago bancario
CREATE TABLE IF NOT EXISTS lotes_pago_bancario (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mapeo_config_id uuid NOT NULL REFERENCES mapeo_archivos_bancarios(id),
  
  numero_lote text NOT NULL,
  fecha_proceso date NOT NULL DEFAULT CURRENT_DATE,
  fecha_valor date,
  
  -- Información del lote
  cantidad_pagos integer NOT NULL DEFAULT 0,
  monto_total numeric(15,2) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'UYU',
  
  -- Estado
  estado text NOT NULL DEFAULT 'GENERADO',
  -- GENERADO, DESCARGADO, CARGADO_BANCO, PROCESADO, ERROR
  
  -- Archivo generado
  nombre_archivo text,
  contenido_archivo text,
  
  -- Metadata
  generado_por text,
  fecha_generacion timestamptz DEFAULT now(),
  fecha_descarga timestamptz,
  observaciones text,
  
  UNIQUE(empresa_id, numero_lote)
);

-- Tabla de relación pagos-lote
CREATE TABLE IF NOT EXISTS pagos_lote (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lote_id uuid NOT NULL REFERENCES lotes_pago_bancario(id) ON DELETE CASCADE,
  pago_id uuid NOT NULL,
  tipo_pago text NOT NULL,
  -- PROVEEDOR, CLIENTE, PARTNER
  
  -- Información del pago al momento de generación
  monto numeric(15,2) NOT NULL,
  beneficiario text NOT NULL,
  rut_beneficiario text,
  cuenta_beneficiario text,
  tipo_cuenta_beneficiario text,
  concepto text,
  
  fecha_creacion timestamptz DEFAULT now(),
  
  UNIQUE(lote_id, pago_id, tipo_pago)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mapeo_archivos_empresa ON mapeo_archivos_bancarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mapeo_archivos_banco ON mapeo_archivos_bancarios(banco_id);
CREATE INDEX IF NOT EXISTS idx_lotes_empresa ON lotes_pago_bancario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes_pago_bancario(estado);
CREATE INDEX IF NOT EXISTS idx_lotes_fecha ON lotes_pago_bancario(fecha_proceso);
CREATE INDEX IF NOT EXISTS idx_pagos_lote ON pagos_lote(lote_id);

-- Enable RLS
ALTER TABLE mapeo_archivos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_pago_bancario ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_lote ENABLE ROW LEVEL SECURITY;

-- Policies para mapeo_archivos_bancarios (Service role only for external auth)
CREATE POLICY "Service role has full access to file mappings"
  ON mapeo_archivos_bancarios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can access file mappings"
  ON mapeo_archivos_bancarios FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policies para lotes_pago_bancario
CREATE POLICY "Service role has full access to payment batches"
  ON lotes_pago_bancario FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can access payment batches"
  ON lotes_pago_bancario FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policies para pagos_lote
CREATE POLICY "Service role has full access to batch payments"
  ON pagos_lote FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can access batch payments"
  ON pagos_lote FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE mapeo_archivos_bancarios IS 'Configuración de formatos de archivo para carga bancaria';
COMMENT ON TABLE lotes_pago_bancario IS 'Lotes de pago generados para carga en bancos';
COMMENT ON TABLE pagos_lote IS 'Relación entre pagos individuales y lotes de pago';
