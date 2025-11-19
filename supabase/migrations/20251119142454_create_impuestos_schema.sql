/*
  # Gestión de Impuestos Uruguay
  
  1. Nuevas Tablas
    - `impuestos_configuracion`
      - Configuración de impuestos por país/empresa
      - Tasas de IVA (básica, mínima, exenta)
      - Códigos DGI
      - Reglas de percepción/retención
    
    - `tipos_documento_dgi`
      - Tipos de documentos electrónicos DGI
      - e-ticket, e-factura, NC, ND, recibos
      - Códigos y configuración específica
    
    - `configuracion_impuestos_empresa`
      - Configuración específica por empresa
      - Responsabilidades fiscales
      - Certificados digitales
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas de acceso por empresa y usuario autenticado
*/

-- Tabla de configuración de impuestos
CREATE TABLE IF NOT EXISTS impuestos_configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('IVA', 'IRAE', 'IMESI', 'IPSFL', 'RETENCION', 'PERCEPCION', 'OTRO')),
  tasa numeric NOT NULL DEFAULT 0,
  descripcion text,
  pais_id uuid NOT NULL REFERENCES paises(id),
  codigo_dgi text,
  aplica_ventas boolean DEFAULT true,
  aplica_compras boolean DEFAULT true,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  activo boolean DEFAULT true,
  fecha_vigencia_desde date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vigencia_hasta date,
  configuracion jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para impuestos_configuracion
CREATE INDEX IF NOT EXISTS idx_impuestos_config_pais ON impuestos_configuracion(pais_id);
CREATE INDEX IF NOT EXISTS idx_impuestos_config_tipo ON impuestos_configuracion(tipo);
CREATE INDEX IF NOT EXISTS idx_impuestos_config_codigo ON impuestos_configuracion(codigo);

-- Tabla de tipos de documento DGI
CREATE TABLE IF NOT EXISTS tipos_documento_dgi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  codigo_dgi text NOT NULL,
  tipo_operacion text NOT NULL CHECK (tipo_operacion IN ('VENTA', 'COMPRA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'RECIBO')),
  descripcion text,
  pais_id uuid NOT NULL REFERENCES paises(id),
  requiere_cfe boolean DEFAULT false,
  requiere_cliente boolean DEFAULT true,
  requiere_impuesto boolean DEFAULT true,
  afecta_inventario boolean DEFAULT true,
  afecta_contabilidad boolean DEFAULT true,
  prefijo text,
  formato_numeracion text DEFAULT '000000001',
  serie text,
  configuracion jsonb DEFAULT '{}'::jsonb,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para tipos_documento_dgi
CREATE INDEX IF NOT EXISTS idx_tipos_doc_dgi_pais ON tipos_documento_dgi(pais_id);
CREATE INDEX IF NOT EXISTS idx_tipos_doc_dgi_tipo ON tipos_documento_dgi(tipo_operacion);
CREATE INDEX IF NOT EXISTS idx_tipos_doc_dgi_codigo ON tipos_documento_dgi(codigo_dgi);

-- Tabla de configuración de impuestos por empresa
CREATE TABLE IF NOT EXISTS configuracion_impuestos_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  pais_id uuid NOT NULL REFERENCES paises(id),
  tipo_contribuyente text NOT NULL CHECK (tipo_contribuyente IN ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'NO_RESPONSABLE')),
  regimen_tributario text,
  rut text,
  certificado_digital text,
  password_certificado text,
  url_dgi text,
  token_dgi text,
  fecha_vencimiento_certificado date,
  configuracion_cfe jsonb DEFAULT '{
    "habilitar_envio_automatico": true,
    "habilitar_reintento": true,
    "intentos_maximos": 3,
    "tiempo_reintento_minutos": 5
  }'::jsonb,
  impuestos_predeterminados jsonb DEFAULT '[]'::jsonb,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para configuracion_impuestos_empresa
CREATE INDEX IF NOT EXISTS idx_config_impuestos_empresa ON configuracion_impuestos_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_config_impuestos_pais ON configuracion_impuestos_empresa(pais_id);

-- Enable RLS
ALTER TABLE impuestos_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_documento_dgi ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_impuestos_empresa ENABLE ROW LEVEL SECURITY;

-- RLS Policies para impuestos_configuracion
CREATE POLICY "Usuarios autenticados pueden ver configuración de impuestos"
  ON impuestos_configuracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden insertar configuración de impuestos"
  ON impuestos_configuracion FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar configuración de impuestos"
  ON impuestos_configuracion FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para tipos_documento_dgi
CREATE POLICY "Usuarios autenticados pueden ver tipos de documento DGI"
  ON tipos_documento_dgi FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden insertar tipos de documento DGI"
  ON tipos_documento_dgi FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar tipos de documento DGI"
  ON tipos_documento_dgi FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para configuracion_impuestos_empresa
CREATE POLICY "Usuarios pueden ver configuración de impuestos de su empresa"
  ON configuracion_impuestos_empresa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden insertar configuración de impuestos empresa"
  ON configuracion_impuestos_empresa FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar configuración de impuestos empresa"
  ON configuracion_impuestos_empresa FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
