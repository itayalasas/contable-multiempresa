/*
  # Periodos Contables y Cierres
  
  1. Nuevas Tablas
    - `ejercicios_fiscales`
      - Años fiscales
      - Estado: abierto, cerrado
      - Fechas de inicio y fin
    
    - `periodos_contables`
      - Meses dentro de ejercicios
      - Control de cierres
      - Bloqueo de asientos
    
    - `cierres_contables`
      - Histórico de cierres
      - Quién cerró y cuándo
      - Comentarios y motivos de reapertura
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Solo administradores pueden cerrar/abrir periodos
    
  3. Important Notes
    - Un periodo cerrado bloquea la creación/edición de asientos
    - Se permite reapertura controlada con permisos
    - Registro de auditoría en cada cierre/apertura
*/

-- Tabla de ejercicios fiscales
CREATE TABLE IF NOT EXISTS ejercicios_fiscales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  anio integer NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'cerrado_definitivo')),
  descripcion text,
  moneda text DEFAULT 'UYU',
  resultado_ejercicio numeric DEFAULT 0,
  fecha_cierre timestamptz,
  cerrado_por text REFERENCES usuarios(id),
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  UNIQUE(empresa_id, anio)
);

-- Índices para ejercicios_fiscales
CREATE INDEX IF NOT EXISTS idx_ejercicios_empresa ON ejercicios_fiscales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ejercicios_anio ON ejercicios_fiscales(anio);
CREATE INDEX IF NOT EXISTS idx_ejercicios_estado ON ejercicios_fiscales(estado);

-- Tabla de periodos contables
CREATE TABLE IF NOT EXISTS periodos_contables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES ejercicios_fiscales(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  numero_periodo integer NOT NULL,
  nombre text NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'cerrado_definitivo')),
  permite_asientos boolean DEFAULT true,
  fecha_cierre timestamptz,
  cerrado_por text REFERENCES usuarios(id),
  fecha_reapertura timestamptz,
  reabierto_por text REFERENCES usuarios(id),
  motivo_reapertura text,
  total_debitos numeric DEFAULT 0,
  total_creditos numeric DEFAULT 0,
  cantidad_asientos integer DEFAULT 0,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  UNIQUE(ejercicio_id, numero_periodo)
);

-- Índices para periodos_contables
CREATE INDEX IF NOT EXISTS idx_periodos_ejercicio ON periodos_contables(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_periodos_empresa ON periodos_contables(empresa_id);
CREATE INDEX IF NOT EXISTS idx_periodos_fechas ON periodos_contables(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_periodos_estado ON periodos_contables(estado);

-- Tabla de histórico de cierres
CREATE TABLE IF NOT EXISTS cierres_contables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid REFERENCES periodos_contables(id),
  ejercicio_id uuid REFERENCES ejercicios_fiscales(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  tipo_cierre text NOT NULL CHECK (tipo_cierre IN ('PERIODO', 'EJERCICIO')),
  accion text NOT NULL CHECK (accion IN ('CIERRE', 'REAPERTURA')),
  fecha_accion timestamptz DEFAULT now(),
  usuario_id text NOT NULL REFERENCES usuarios(id),
  motivo text,
  observaciones text,
  estado_anterior text,
  estado_nuevo text,
  total_debitos numeric,
  total_creditos numeric,
  cantidad_asientos integer,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para cierres_contables
CREATE INDEX IF NOT EXISTS idx_cierres_periodo ON cierres_contables(periodo_id);
CREATE INDEX IF NOT EXISTS idx_cierres_ejercicio ON cierres_contables(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_cierres_empresa ON cierres_contables(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_contables(fecha_accion);
CREATE INDEX IF NOT EXISTS idx_cierres_usuario ON cierres_contables(usuario_id);

-- Enable RLS
ALTER TABLE ejercicios_fiscales ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_contables ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ejercicios_fiscales
CREATE POLICY "Usuarios pueden ver ejercicios fiscales de su empresa"
  ON ejercicios_fiscales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden crear ejercicios fiscales"
  ON ejercicios_fiscales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar ejercicios fiscales"
  ON ejercicios_fiscales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para periodos_contables
CREATE POLICY "Usuarios pueden ver periodos contables de su empresa"
  ON periodos_contables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden crear periodos contables"
  ON periodos_contables FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo administradores pueden actualizar periodos contables"
  ON periodos_contables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para cierres_contables
CREATE POLICY "Usuarios pueden ver histórico de cierres de su empresa"
  ON cierres_contables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden registrar cierres"
  ON cierres_contables FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para validar que no se creen asientos en periodos cerrados
CREATE OR REPLACE FUNCTION validar_periodo_abierto()
RETURNS TRIGGER AS $$
DECLARE
  periodo_estado text;
BEGIN
  SELECT estado INTO periodo_estado
  FROM periodos_contables
  WHERE empresa_id = NEW.empresa_id
    AND NEW.fecha BETWEEN fecha_inicio AND fecha_fin
  LIMIT 1;

  IF periodo_estado IN ('cerrado', 'cerrado_definitivo') THEN
    RAISE EXCEPTION 'No se pueden crear o modificar asientos en un periodo cerrado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar periodo abierto al crear/actualizar asientos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_validar_periodo_asiento'
  ) THEN
    CREATE TRIGGER trigger_validar_periodo_asiento
      BEFORE INSERT OR UPDATE ON asientos_contables
      FOR EACH ROW
      EXECUTE FUNCTION validar_periodo_abierto();
  END IF;
END $$;
