/*
  # Crear Configuración Extendida para Empresas

  ## Nuevas Tablas
  
  1. **empresas_config_fiscal** - Configuración fiscal y tributaria
  2. **empresas_config_cfe** - Configuración de facturación electrónica
  3. **empresas_series_documentos** - Series de documentos autorizadas
  4. **empresas_config_bps** - Configuración de nómina y BPS
  5. **empresas_sucursales** - Sucursales de la empresa
  6. **empresas_actividades** - Actividades económicas de la empresa (relación N:N)
  
  ## Modificaciones
  - Agregar campos adicionales a tabla empresas
  
  ## Seguridad
  - RLS habilitado
  - Acceso con API key
*/

-- =====================================================
-- AGREGAR CAMPOS ADICIONALES A EMPRESAS
-- =====================================================
DO $$ 
BEGIN
  -- Agregar campos si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nombre_fantasia') THEN
    ALTER TABLE empresas ADD COLUMN nombre_fantasia text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'tipo_contribuyente_id') THEN
    ALTER TABLE empresas ADD COLUMN tipo_contribuyente_id uuid REFERENCES tipos_contribuyente(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'fecha_inicio_actividades') THEN
    ALTER TABLE empresas ADD COLUMN fecha_inicio_actividades date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'estado_tributario') THEN
    ALTER TABLE empresas ADD COLUMN estado_tributario text DEFAULT 'activa';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'domicilio_fiscal') THEN
    ALTER TABLE empresas ADD COLUMN domicilio_fiscal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'domicilio_comercial') THEN
    ALTER TABLE empresas ADD COLUMN domicilio_comercial text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'departamento_id') THEN
    ALTER TABLE empresas ADD COLUMN departamento_id uuid REFERENCES departamentos_uy(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'localidad_id') THEN
    ALTER TABLE empresas ADD COLUMN localidad_id uuid REFERENCES localidades_uy(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'representante_legal') THEN
    ALTER TABLE empresas ADD COLUMN representante_legal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'ci_representante') THEN
    ALTER TABLE empresas ADD COLUMN ci_representante text;
  END IF;
END $$;

-- =====================================================
-- CONFIGURACIÓN FISCAL
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_config_fiscal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  responsabilidad_iva_id uuid REFERENCES responsabilidad_iva(id),
  numero_bps text,
  numero_mtss text,
  regimen_tributario text,
  alicuota_iva_defecto numeric(5,2) DEFAULT 22.00,
  aplica_retencion_iva boolean DEFAULT false,
  aplica_retencion_irpf boolean DEFAULT false,
  aplica_retencion_irae boolean DEFAULT false,
  certificado_dgi_path text,
  certificado_dgi_password text,
  certificado_dgi_vencimiento date,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz,
  UNIQUE(empresa_id)
);

ALTER TABLE empresas_config_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_config_fiscal con API key"
  ON empresas_config_fiscal FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- CONFIGURACIÓN CFE (Facturación Electrónica)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_config_cfe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rut_emisor text NOT NULL,
  codigo_casa_principal text DEFAULT '001',
  codigo_sucursal text,
  ambiente text DEFAULT 'testing', -- testing / produccion
  certificado_path text,
  certificado_password text,
  certificado_vencimiento date,
  proveedor_certificado text,
  url_webservice text,
  timeout_webservice integer DEFAULT 30,
  habilitar_envio_automatico boolean DEFAULT true,
  email_notificacion text,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz,
  UNIQUE(empresa_id)
);

ALTER TABLE empresas_config_cfe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_config_cfe con API key"
  ON empresas_config_cfe FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- SERIES DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_series_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_documento_id uuid NOT NULL REFERENCES tipos_documento_electronico(id),
  serie text NOT NULL,
  numero_inicial integer NOT NULL DEFAULT 1,
  numero_final integer,
  numero_actual integer NOT NULL DEFAULT 1,
  fecha_autorizacion date,
  monto_maximo numeric(15,2),
  rut_impresor text,
  activa boolean DEFAULT true,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz,
  UNIQUE(empresa_id, tipo_documento_id, serie)
);

ALTER TABLE empresas_series_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_series_documentos con API key"
  ON empresas_series_documentos FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- CONFIGURACIÓN BPS (Nómina)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_config_bps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_empresa_bps text NOT NULL,
  clase_bps text,
  subclase_bps text,
  especialidad text,
  fecha_alta_bps date,
  seguro_accidentes_porcentaje numeric(5,2),
  responsable_tecnico text,
  ci_responsable_tecnico text,
  encargado_nomina text,
  email_nomina text,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz,
  UNIQUE(empresa_id)
);

ALTER TABLE empresas_config_bps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_config_bps con API key"
  ON empresas_config_bps FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- SUCURSALES
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL,
  direccion text,
  departamento_id uuid REFERENCES departamentos_uy(id),
  localidad_id uuid REFERENCES localidades_uy(id),
  telefono text,
  email text,
  es_principal boolean DEFAULT false,
  activa boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz,
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE empresas_sucursales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_sucursales con API key"
  ON empresas_sucursales FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- ACTIVIDADES ECONÓMICAS (N:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  actividad_id uuid NOT NULL REFERENCES actividades_dgi(id),
  es_principal boolean DEFAULT false,
  fecha_inicio date,
  fecha_fin date,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(empresa_id, actividad_id)
);

ALTER TABLE empresas_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso empresas_actividades con API key"
  ON empresas_actividades FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_empresas_config_fiscal_empresa ON empresas_config_fiscal(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_config_cfe_empresa ON empresas_config_cfe(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_series_documentos_empresa ON empresas_series_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_config_bps_empresa ON empresas_config_bps(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_sucursales_empresa ON empresas_sucursales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_actividades_empresa ON empresas_actividades(empresa_id);
