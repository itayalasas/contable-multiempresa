/*
  # Crear Configuración CFE para Facturación Electrónica

  1. Nuevas Tablas
    - `empresas_config_cfe` - Configuración de facturación electrónica
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key a empresas)
      - `rut_emisor` (text, RUT del emisor)
      - `codigo_sucursal` (text, código de sucursal para CFE)
      - `url_webservice` (text, URL del webservice de facturación)
      - `ambiente` (text, testing o produccion)
      - Campos de configuración adicionales
  
  2. Seguridad
    - RLS habilitado en todas las tablas
    - Acceso anónimo para autenticación externa
*/

-- =====================================================
-- CONFIGURACIÓN CFE (Facturación Electrónica)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_config_cfe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rut_emisor text NOT NULL,
  codigo_casa_principal text DEFAULT '001',
  codigo_sucursal text,
  ambiente text DEFAULT 'testing',
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

CREATE POLICY "Allow anon select empresas_config_cfe"
  ON empresas_config_cfe
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert empresas_config_cfe"
  ON empresas_config_cfe
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update empresas_config_cfe"
  ON empresas_config_cfe
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete empresas_config_cfe"
  ON empresas_config_cfe
  FOR DELETE
  TO anon
  USING (true);

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_empresas_config_cfe_empresa ON empresas_config_cfe(empresa_id);
