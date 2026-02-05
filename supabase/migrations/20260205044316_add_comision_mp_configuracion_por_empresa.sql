/*
  # Agregar configuración de comisión Mercado Pago por empresa

  1. Nueva Tabla
    - `empresas_comision_mp` - Configuración de comisión MP por empresa
  
  2. Campos
    - `empresa_id` - ID de la empresa
    - `activo` - Si está activa la comisión automática
    - `porcentaje` - Porcentaje de comisión (ej: 5.00 para 5%)
    - `descripcion` - Descripción opcional
  
  3. Propósito
    - Configurar porcentaje de comisión de Mercado Pago por empresa
    - Activar/desactivar cálculo automático en webhooks
    - Cada empresa puede tener su propia tasa de comisión MP
*/

CREATE TABLE IF NOT EXISTS empresas_comision_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo boolean DEFAULT false,
  porcentaje numeric(5,2) DEFAULT 5.00,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id)
);

-- RLS Policies
ALTER TABLE empresas_comision_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver comisión MP"
  ON empresas_comision_mp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role tiene acceso total"
  ON empresas_comision_mp FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permitir acceso anónimo para webhooks
CREATE POLICY "Anon puede leer para webhooks"
  ON empresas_comision_mp FOR SELECT
  TO anon
  USING (true);

-- Comentarios
COMMENT ON TABLE empresas_comision_mp IS 'Configuración de comisión de Mercado Pago por empresa';
COMMENT ON COLUMN empresas_comision_mp.activo IS 'Si true, el webhook calculará automáticamente la comisión MP';
COMMENT ON COLUMN empresas_comision_mp.porcentaje IS 'Porcentaje de comisión que cobra MP (ej: 5.00 para 5%)';
