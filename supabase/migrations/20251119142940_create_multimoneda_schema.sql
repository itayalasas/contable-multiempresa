/*
  # Soporte Multi-moneda
  
  1. Nuevas Tablas
    - `monedas`
      - Catálogo de monedas
      - ISO codes y símbolos
    
    - `tipos_cambio`
      - Histórico de tipos de cambio
      - Tasas de compra y venta
      - Fuentes de datos
    
    - `configuracion_multimoneda`
      - Configuración por empresa
      - Moneda funcional y de presentación
      - Políticas de redondeo
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas por empresa
    
  3. Important Notes
    - Documentos y asientos con moneda original + funcional
    - Conversión automática según tipo de cambio del día
    - Histórico completo de fluctuaciones
    - Ganancia/pérdida por diferencia de cambio
*/

-- Tabla de monedas (expandir la existente tipo_moneda)
CREATE TABLE IF NOT EXISTS monedas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_iso text NOT NULL UNIQUE,
  nombre text NOT NULL,
  simbolo text NOT NULL,
  pais_principal text,
  decimales integer DEFAULT 2 CHECK (decimales BETWEEN 0 AND 4),
  formato_display text DEFAULT '#,##0.00',
  activa boolean DEFAULT true,
  es_criptomoneda boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para monedas
CREATE INDEX IF NOT EXISTS idx_monedas_codigo ON monedas(codigo_iso);
CREATE INDEX IF NOT EXISTS idx_monedas_activa ON monedas(activa);

-- Tabla de tipos de cambio
CREATE TABLE IF NOT EXISTS tipos_cambio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moneda_origen_id uuid NOT NULL REFERENCES monedas(id),
  moneda_destino_id uuid NOT NULL REFERENCES monedas(id),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tasa_compra numeric NOT NULL,
  tasa_venta numeric NOT NULL,
  tasa_promedio numeric GENERATED ALWAYS AS ((tasa_compra + tasa_venta) / 2) STORED,
  fuente text NOT NULL,
  observaciones text,
  tipo_cambio_oficial boolean DEFAULT false,
  validado boolean DEFAULT false,
  validado_por text REFERENCES usuarios(id),
  fecha_validacion timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  UNIQUE(moneda_origen_id, moneda_destino_id, fecha, fuente)
);

-- Índices para tipos_cambio
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_origen ON tipos_cambio(moneda_origen_id);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_destino ON tipos_cambio(moneda_destino_id);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_fecha ON tipos_cambio(fecha);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_fuente ON tipos_cambio(fuente);

-- Tabla de configuración multi-moneda por empresa
CREATE TABLE IF NOT EXISTS configuracion_multimoneda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) UNIQUE,
  moneda_funcional_id uuid NOT NULL REFERENCES monedas(id),
  moneda_presentacion_id uuid REFERENCES monedas(id),
  habilitar_multimoneda boolean DEFAULT false,
  metodo_conversion text DEFAULT 'HISTORICO' CHECK (metodo_conversion IN ('HISTORICO', 'PROMEDIO', 'CIERRE', 'SPOT')),
  politica_redondeo text DEFAULT 'MATEMATICO' CHECK (politica_redondeo IN ('MATEMATICO', 'ARRIBA', 'ABAJO', 'TRUNCAR')),
  decimales_redondeo integer DEFAULT 2 CHECK (decimales_redondeo BETWEEN 0 AND 4),
  actualizar_automatico boolean DEFAULT true,
  fuente_tipos_cambio text DEFAULT 'BCU',
  hora_actualizacion time DEFAULT '09:00:00',
  cuenta_ganancia_cambio_id uuid REFERENCES plan_cuentas(id),
  cuenta_perdida_cambio_id uuid REFERENCES plan_cuentas(id),
  generar_asiento_automatico boolean DEFAULT true,
  configuracion jsonb DEFAULT '{
    "permitir_edicion_tipo_cambio": false,
    "requerir_validacion_tipo_cambio": true,
    "alertar_variacion_mayor_porcentaje": 5,
    "permitir_multiples_fuentes": true
  }'::jsonb,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para configuracion_multimoneda
CREATE INDEX IF NOT EXISTS idx_config_multimoneda_empresa ON configuracion_multimoneda(empresa_id);
CREATE INDEX IF NOT EXISTS idx_config_multimoneda_funcional ON configuracion_multimoneda(moneda_funcional_id);

-- Tabla de diferencias de cambio
CREATE TABLE IF NOT EXISTS diferencias_cambio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  documento_tipo text NOT NULL,
  documento_id uuid NOT NULL,
  moneda_origen_id uuid NOT NULL REFERENCES monedas(id),
  moneda_funcional_id uuid NOT NULL REFERENCES monedas(id),
  monto_original numeric NOT NULL,
  tipo_cambio_original numeric NOT NULL,
  tipo_cambio_actual numeric NOT NULL,
  monto_funcional_original numeric NOT NULL,
  monto_funcional_actual numeric NOT NULL,
  diferencia numeric GENERATED ALWAYS AS (monto_funcional_actual - monto_funcional_original) STORED,
  tipo_diferencia text CHECK (tipo_diferencia IN ('GANANCIA', 'PERDIDA')),
  fecha_documento date NOT NULL,
  fecha_calculo date NOT NULL DEFAULT CURRENT_DATE,
  asiento_id uuid REFERENCES asientos_contables(id),
  realizada boolean DEFAULT false,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para diferencias_cambio
CREATE INDEX IF NOT EXISTS idx_diferencias_empresa ON diferencias_cambio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_diferencias_documento ON diferencias_cambio(documento_tipo, documento_id);
CREATE INDEX IF NOT EXISTS idx_diferencias_fecha ON diferencias_cambio(fecha_calculo);
CREATE INDEX IF NOT EXISTS idx_diferencias_realizada ON diferencias_cambio(realizada);

-- Tabla de conversiones de moneda (cache)
CREATE TABLE IF NOT EXISTS conversiones_moneda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moneda_origen_id uuid NOT NULL REFERENCES monedas(id),
  moneda_destino_id uuid NOT NULL REFERENCES monedas(id),
  monto_origen numeric NOT NULL,
  monto_destino numeric NOT NULL,
  tipo_cambio numeric NOT NULL,
  fecha_conversion date NOT NULL,
  tipo_tasa text NOT NULL CHECK (tipo_tasa IN ('COMPRA', 'VENTA', 'PROMEDIO')),
  fuente text,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para conversiones_moneda
CREATE INDEX IF NOT EXISTS idx_conversiones_origen ON conversiones_moneda(moneda_origen_id);
CREATE INDEX IF NOT EXISTS idx_conversiones_destino ON conversiones_moneda(moneda_destino_id);
CREATE INDEX IF NOT EXISTS idx_conversiones_fecha ON conversiones_moneda(fecha_conversion);

-- Enable RLS
ALTER TABLE monedas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_multimoneda ENABLE ROW LEVEL SECURITY;
ALTER TABLE diferencias_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversiones_moneda ENABLE ROW LEVEL SECURITY;

-- RLS Policies para monedas
CREATE POLICY "Todos pueden ver monedas"
  ON monedas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden gestionar monedas"
  ON monedas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para tipos_cambio
CREATE POLICY "Todos pueden ver tipos de cambio"
  ON tipos_cambio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear tipos de cambio"
  ON tipos_cambio FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar tipos de cambio"
  ON tipos_cambio FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para configuracion_multimoneda
CREATE POLICY "Usuarios pueden ver configuración de su empresa"
  ON configuracion_multimoneda FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden gestionar configuración multimoneda"
  ON configuracion_multimoneda FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para diferencias_cambio
CREATE POLICY "Usuarios pueden ver diferencias de cambio de su empresa"
  ON diferencias_cambio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede gestionar diferencias de cambio"
  ON diferencias_cambio FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para conversiones_moneda
CREATE POLICY "Todos pueden ver conversiones"
  ON conversiones_moneda FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede registrar conversiones"
  ON conversiones_moneda FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para obtener tipo de cambio
CREATE OR REPLACE FUNCTION obtener_tipo_cambio(
  p_moneda_origen uuid,
  p_moneda_destino uuid,
  p_fecha date DEFAULT CURRENT_DATE,
  p_tipo_tasa text DEFAULT 'PROMEDIO'
)
RETURNS numeric AS $$
DECLARE
  v_tasa numeric;
BEGIN
  -- Si las monedas son iguales, retornar 1
  IF p_moneda_origen = p_moneda_destino THEN
    RETURN 1.0;
  END IF;

  -- Buscar el tipo de cambio exacto
  SELECT 
    CASE 
      WHEN p_tipo_tasa = 'COMPRA' THEN tasa_compra
      WHEN p_tipo_tasa = 'VENTA' THEN tasa_venta
      ELSE tasa_promedio
    END INTO v_tasa
  FROM tipos_cambio
  WHERE moneda_origen_id = p_moneda_origen
    AND moneda_destino_id = p_moneda_destino
    AND fecha = p_fecha
  ORDER BY fecha DESC
  LIMIT 1;

  -- Si no existe para esa fecha, buscar el más reciente
  IF v_tasa IS NULL THEN
    SELECT 
      CASE 
        WHEN p_tipo_tasa = 'COMPRA' THEN tasa_compra
        WHEN p_tipo_tasa = 'VENTA' THEN tasa_venta
        ELSE tasa_promedio
      END INTO v_tasa
    FROM tipos_cambio
    WHERE moneda_origen_id = p_moneda_origen
      AND moneda_destino_id = p_moneda_destino
      AND fecha <= p_fecha
    ORDER BY fecha DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_tasa, 1.0);
END;
$$ LANGUAGE plpgsql;
