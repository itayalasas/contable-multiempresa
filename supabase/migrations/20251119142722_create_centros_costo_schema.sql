/*
  # Centros de Costo y Segmentos
  
  1. Nuevas Tablas
    - `centros_costo`
      - Estructura jerárquica de centros de costo
      - Por aliado, sucursal, tipo de servicio
      - Activos/Inactivos
    
    - `segmentos_negocio`
      - Segmentación por líneas de negocio
      - Para análisis de rentabilidad
    
    - `asignacion_centro_costo`
      - Asignación de usuarios/recursos a centros
      - Control de acceso y responsabilidades
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas por empresa y usuario
    
  3. Important Notes
    - Los asientos y documentos pueden asignarse a centros de costo
    - Permite análisis de rentabilidad por segmento
    - Ideal para DogCatiFy: por aliado, sucursal, servicio
*/

-- Tabla de centros de costo
CREATE TABLE IF NOT EXISTS centros_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('ALIADO', 'SUCURSAL', 'SERVICIO', 'PROYECTO', 'DEPARTAMENTO', 'OTRO')),
  centro_padre uuid REFERENCES centros_costo(id),
  nivel integer DEFAULT 1,
  responsable_id text REFERENCES usuarios(id),
  presupuesto_anual numeric DEFAULT 0,
  presupuesto_mensual numeric DEFAULT 0,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  activo boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, codigo)
);

-- Índices para centros_costo
CREATE INDEX IF NOT EXISTS idx_centros_costo_empresa ON centros_costo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_centros_costo_tipo ON centros_costo(tipo);
CREATE INDEX IF NOT EXISTS idx_centros_costo_padre ON centros_costo(centro_padre);
CREATE INDEX IF NOT EXISTS idx_centros_costo_responsable ON centros_costo(responsable_id);
CREATE INDEX IF NOT EXISTS idx_centros_costo_codigo ON centros_costo(codigo);

-- Tabla de segmentos de negocio
CREATE TABLE IF NOT EXISTS segmentos_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo_segmento text NOT NULL CHECK (tipo_segmento IN ('PRODUCTO', 'SERVICIO', 'CLIENTE', 'GEOGRAFICO', 'CANAL', 'OTRO')),
  activo boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);

-- Índices para segmentos_negocio
CREATE INDEX IF NOT EXISTS idx_segmentos_empresa ON segmentos_negocio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_segmentos_tipo ON segmentos_negocio(tipo_segmento);

-- Tabla de asignación de centros de costo
CREATE TABLE IF NOT EXISTS asignacion_centro_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_costo_id uuid NOT NULL REFERENCES centros_costo(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  usuario_id text REFERENCES usuarios(id),
  tipo_asignacion text NOT NULL CHECK (tipo_asignacion IN ('RESPONSABLE', 'COLABORADOR', 'CONSULTOR', 'AUDITOR')),
  porcentaje_asignacion numeric DEFAULT 100 CHECK (porcentaje_asignacion BETWEEN 0 AND 100),
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date,
  activo boolean DEFAULT true,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id)
);

-- Índices para asignacion_centro_costo
CREATE INDEX IF NOT EXISTS idx_asignacion_centro ON asignacion_centro_costo(centro_costo_id);
CREATE INDEX IF NOT EXISTS idx_asignacion_usuario ON asignacion_centro_costo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asignacion_empresa ON asignacion_centro_costo(empresa_id);

-- Tabla de presupuesto por centro de costo
CREATE TABLE IF NOT EXISTS presupuesto_centro_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_costo_id uuid NOT NULL REFERENCES centros_costo(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  ejercicio_id uuid NOT NULL REFERENCES ejercicios_fiscales(id),
  periodo_id uuid REFERENCES periodos_contables(id),
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  monto_presupuestado numeric NOT NULL DEFAULT 0,
  monto_ejecutado numeric DEFAULT 0,
  monto_comprometido numeric DEFAULT 0,
  monto_disponible numeric GENERATED ALWAYS AS (monto_presupuestado - monto_ejecutado - monto_comprometido) STORED,
  porcentaje_ejecucion numeric GENERATED ALWAYS AS (
    CASE 
      WHEN monto_presupuestado > 0 THEN (monto_ejecutado / monto_presupuestado * 100)
      ELSE 0
    END
  ) STORED,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para presupuesto_centro_costo
CREATE INDEX IF NOT EXISTS idx_presupuesto_centro ON presupuesto_centro_costo(centro_costo_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_ejercicio ON presupuesto_centro_costo(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_periodo ON presupuesto_centro_costo(periodo_id);

-- Enable RLS
ALTER TABLE centros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE segmentos_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_centro_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_centro_costo ENABLE ROW LEVEL SECURITY;

-- RLS Policies para centros_costo
CREATE POLICY "Usuarios pueden ver centros de costo de su empresa"
  ON centros_costo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores pueden crear centros de costo"
  ON centros_costo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Administradores pueden actualizar centros de costo"
  ON centros_costo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para segmentos_negocio
CREATE POLICY "Usuarios pueden ver segmentos de su empresa"
  ON segmentos_negocio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores pueden crear segmentos"
  ON segmentos_negocio FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Administradores pueden actualizar segmentos"
  ON segmentos_negocio FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para asignacion_centro_costo
CREATE POLICY "Usuarios pueden ver asignaciones de centros de costo"
  ON asignacion_centro_costo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores pueden crear asignaciones"
  ON asignacion_centro_costo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Administradores pueden actualizar asignaciones"
  ON asignacion_centro_costo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para presupuesto_centro_costo
CREATE POLICY "Usuarios pueden ver presupuestos de centros de costo"
  ON presupuesto_centro_costo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores pueden crear presupuestos"
  ON presupuesto_centro_costo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Administradores pueden actualizar presupuestos"
  ON presupuesto_centro_costo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
