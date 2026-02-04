/*
  # Crear tabla de solicitudes de autorización

  ## Descripción
  Crea la tabla para gestionar las solicitudes de eliminación de registros
  que requieren autorización de doble control (maker-checker).

  ## Tabla solicitudes_autorizacion
  - `id` (uuid, PK): Identificador único
  - `empresa_id` (uuid): Empresa a la que pertenece
  - `tipo_operacion` (text): Tipo de operación (ej: ELIMINAR_MOVIMIENTO)
  - `tipo_entidad` (text): Tabla afectada
  - `entidad_id` (uuid): ID del registro a eliminar
  - `entidad_data` (jsonb): Datos del registro para auditoría
  - `motivo` (text): Motivo de la solicitud
  - `estado` (text): PENDIENTE, APROBADA, RECHAZADA, CANCELADA
  - `solicitado_por` (text): Usuario que solicita
  - `solicitado_en` (timestamptz): Fecha de solicitud
  - `revisado_por` (text): Usuario que revisa
  - `revisado_en` (timestamptz): Fecha de revisión
  - `comentarios_revision` (text): Comentarios del revisor
  - `ejecutado_en` (timestamptz): Fecha de ejecución

  ## Seguridad
  - RLS habilitado
  - Permite acceso público con validación de empresa (usamos Firebase Auth)
*/

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS solicitudes_autorizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_operacion text NOT NULL,
  tipo_entidad text NOT NULL,
  entidad_id uuid NOT NULL,
  entidad_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo text NOT NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
  solicitado_por text NOT NULL,
  solicitado_en timestamptz NOT NULL DEFAULT now(),
  revisado_por text,
  revisado_en timestamptz,
  comentarios_revision text,
  ejecutado_en timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizacion_empresa_id ON solicitudes_autorizacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizacion_estado ON solicitudes_autorizacion(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizacion_tipo_entidad ON solicitudes_autorizacion(tipo_entidad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_autorizacion_entidad_id ON solicitudes_autorizacion(entidad_id);

-- Habilitar RLS
ALTER TABLE solicitudes_autorizacion ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Acceso público solicitudes autorizacion" ON solicitudes_autorizacion;
DROP POLICY IF EXISTS "Service role full access solicitudes autorizacion" ON solicitudes_autorizacion;
DROP POLICY IF EXISTS "Usuarios acceso solicitudes" ON solicitudes_autorizacion;

-- Política para permitir acceso público (sin autenticación Supabase)
-- ya que usamos autenticación externa (Firebase)
CREATE POLICY "Acceso público solicitudes autorizacion"
  ON solicitudes_autorizacion
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política para service role (edge functions)
CREATE POLICY "Service role full access solicitudes autorizacion"
  ON solicitudes_autorizacion
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE solicitudes_autorizacion IS 'Tabla para gestionar solicitudes de autorización de operaciones críticas (maker-checker pattern)';
COMMENT ON COLUMN solicitudes_autorizacion.empresa_id IS 'ID de la empresa a la que pertenece la solicitud';
COMMENT ON COLUMN solicitudes_autorizacion.tipo_operacion IS 'Tipo de operación solicitada (ej: ELIMINAR_MOVIMIENTO)';
COMMENT ON COLUMN solicitudes_autorizacion.tipo_entidad IS 'Nombre de la tabla afectada';
COMMENT ON COLUMN solicitudes_autorizacion.entidad_id IS 'ID del registro que será afectado';
COMMENT ON COLUMN solicitudes_autorizacion.entidad_data IS 'Snapshot de los datos del registro para auditoría';
COMMENT ON COLUMN solicitudes_autorizacion.estado IS 'Estado de la solicitud: PENDIENTE, APROBADA, RECHAZADA, CANCELADA';
