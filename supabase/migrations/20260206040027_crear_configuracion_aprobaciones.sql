/*
  # Crear Configuración de Aprobaciones

  1. Nueva Tabla
    - `configuracion_aprobaciones`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `modulo` (text) - Nombre del módulo (ej: "ventas", "tesoreria", "contabilidad")
      - `entidad` (text) - Nombre de la entidad (ej: "facturas_venta", "movimientos_tesoreria")
      - `accion` (text) - Acción que puede requerir aprobación (ej: "crear", "editar", "eliminar")
      - `requiere_aprobacion` (boolean) - Si la acción requiere aprobación
      - `descripcion` (text) - Descripción de la funcionalidad
      - `icono` (text) - Icono para la UI (nombre de lucide-react)
      - `activo` (boolean) - Si la configuración está activa
      - `creado_por` (text) - ID del usuario que creó
      - `modificado_por` (text) - ID del usuario que modificó
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users with admin access

  3. Datos Iniciales
    - Configuración para facturas de venta
    - Configuración para movimientos de tesorería
*/

-- Crear tabla de configuración de aprobaciones
CREATE TABLE IF NOT EXISTS configuracion_aprobaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  entidad text NOT NULL,
  accion text NOT NULL CHECK (accion IN ('crear', 'editar', 'eliminar')),
  requiere_aprobacion boolean NOT NULL DEFAULT false,
  descripcion text,
  icono text DEFAULT 'FileText',
  activo boolean NOT NULL DEFAULT true,
  creado_por text,
  modificado_por text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, modulo, entidad, accion)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_configuracion_aprobaciones_empresa
  ON configuracion_aprobaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_aprobaciones_modulo
  ON configuracion_aprobaciones(modulo);
CREATE INDEX IF NOT EXISTS idx_configuracion_aprobaciones_entidad
  ON configuracion_aprobaciones(entidad);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_configuracion_aprobaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_configuracion_aprobaciones_updated_at ON configuracion_aprobaciones;
CREATE TRIGGER trigger_update_configuracion_aprobaciones_updated_at
  BEFORE UPDATE ON configuracion_aprobaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracion_aprobaciones_updated_at();

-- Enable RLS
ALTER TABLE configuracion_aprobaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios pueden ver configuración de su empresa"
  ON configuracion_aprobaciones
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()::text
  ));

CREATE POLICY "Service role puede ver toda la configuración"
  ON configuracion_aprobaciones
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Usuarios pueden ver configuración de su empresa (anon)"
  ON configuracion_aprobaciones
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Administradores pueden insertar configuración"
  ON configuracion_aprobaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()::text
  ));

CREATE POLICY "Service role puede insertar configuración"
  ON configuracion_aprobaciones
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Anon puede insertar configuración"
  ON configuracion_aprobaciones
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Administradores pueden actualizar configuración"
  ON configuracion_aprobaciones
  FOR UPDATE
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()::text
  ))
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()::text
  ));

CREATE POLICY "Service role puede actualizar configuración"
  ON configuracion_aprobaciones
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon puede actualizar configuración"
  ON configuracion_aprobaciones
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Insertar configuraciones predeterminadas
INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'ventas',
  'facturas_venta',
  'editar',
  true,
  'Modificación de facturas de venta ya emitidas',
  'Receipt',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'ventas',
  'facturas_venta',
  'eliminar',
  true,
  'Eliminación de facturas de venta ya emitidas',
  'Receipt',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'tesoreria',
  'movimientos_tesoreria',
  'editar',
  true,
  'Modificación de movimientos de tesorería registrados',
  'DollarSign',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'tesoreria',
  'movimientos_tesoreria',
  'eliminar',
  true,
  'Eliminación de movimientos de tesorería registrados',
  'DollarSign',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

-- Agregar algunas configuraciones adicionales comunes (desactivadas por defecto)
INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'contabilidad',
  'asientos_contables',
  'editar',
  false,
  'Modificación de asientos contables',
  'BookOpen',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'contabilidad',
  'asientos_contables',
  'eliminar',
  false,
  'Eliminación de asientos contables',
  'BookOpen',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'finanzas',
  'pagos_proveedor',
  'eliminar',
  false,
  'Eliminación de pagos a proveedores',
  'CreditCard',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'finanzas',
  'cobros_cliente',
  'eliminar',
  false,
  'Eliminación de cobros de clientes',
  'Wallet',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;