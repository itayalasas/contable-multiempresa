/*
  # Sistema de Aprobaciones para Facturas

  ## Descripción

  Este sistema permite solicitar aprobación para modificar o eliminar facturas,
  manteniendo un registro de auditoría completo de todos los cambios realizados.

  ## Nuevas Tablas

  ### 1. `solicitudes_aprobacion`

  Almacena las solicitudes de modificación o eliminación de facturas que requieren aprobación.

  **Columnas:**
  - `id` (uuid, PK): Identificador único de la solicitud
  - `empresa_id` (uuid, FK): Empresa asociada
  - `tipo_solicitud` (text): Tipo de operación (modificar_factura, eliminar_factura)
  - `estado` (text): Estado actual (pendiente, aprobada, rechazada)
  - `solicitante_id` (text, FK): Usuario que solicita el cambio
  - `aprobador_id` (text, FK, nullable): Usuario que aprueba/rechaza
  - `factura_id` (uuid, FK): Factura a modificar/eliminar
  - `datos_originales` (jsonb): Datos originales de la factura
  - `datos_modificados` (jsonb, nullable): Datos nuevos si es modificación
  - `motivo` (text): Razón del cambio solicitado
  - `comentarios_aprobador` (text, nullable): Comentarios del aprobador
  - `fecha_solicitud` (timestamptz): Fecha de la solicitud
  - `fecha_respuesta` (timestamptz, nullable): Fecha de aprobación/rechazo
  - `creado_en` (timestamptz): Timestamp de creación
  - `actualizado_en` (timestamptz): Timestamp de última actualización

  ### 2. `auditoria_cambios`

  Registro de auditoría de todos los cambios realizados en el sistema.

  **Columnas:**
  - `id` (uuid, PK): Identificador único del registro
  - `empresa_id` (uuid, FK): Empresa asociada
  - `tabla_afectada` (text): Nombre de la tabla modificada
  - `registro_id` (uuid): ID del registro afectado
  - `tipo_operacion` (text): Tipo de operación (crear, modificar, eliminar)
  - `datos_anteriores` (jsonb, nullable): Estado anterior del registro
  - `datos_nuevos` (jsonb, nullable): Estado nuevo del registro
  - `usuario_id` (text, FK): Usuario que realizó el cambio
  - `solicitud_aprobacion_id` (uuid, FK, nullable): Solicitud de aprobación asociada
  - `fecha` (timestamptz): Fecha del cambio
  - `metadata` (jsonb): Información adicional
  - `creado_en` (timestamptz): Timestamp de creación

  ## Seguridad

  - RLS habilitado en todas las tablas
  - Service role tiene acceso completo para operaciones del sistema
  - Todas las operaciones quedan registradas en auditoría

  ## Notas Importantes

  1. Las solicitudes pendientes deben ser aprobadas antes de ejecutar el cambio
  2. Al aprobar una modificación, se actualizan en cascada:
     - Asientos contables
     - Movimientos de tesorería
     - Pagos de cliente
     - Cuentas por cobrar
  3. Al aprobar una eliminación, se eliminan en cascada todos los registros asociados
  4. Todos los cambios quedan registrados en auditoria_cambios
*/

-- =====================================================
-- TABLA: solicitudes_aprobacion
-- =====================================================

CREATE TABLE IF NOT EXISTS solicitudes_aprobacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_solicitud text NOT NULL CHECK (tipo_solicitud IN ('modificar_factura', 'eliminar_factura')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  solicitante_id text NOT NULL REFERENCES usuarios(id),
  aprobador_id text REFERENCES usuarios(id),
  factura_id uuid NOT NULL REFERENCES facturas_venta(id) ON DELETE CASCADE,
  datos_originales jsonb NOT NULL,
  datos_modificados jsonb,
  motivo text NOT NULL,
  comentarios_aprobador text,
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  fecha_respuesta timestamptz,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON solicitudes_aprobacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_aprobacion(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante ON solicitudes_aprobacion(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_aprobador ON solicitudes_aprobacion(aprobador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura ON solicitudes_aprobacion(factura_id);

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_solicitudes_aprobacion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solicitudes_timestamp
  BEFORE UPDATE ON solicitudes_aprobacion
  FOR EACH ROW
  EXECUTE FUNCTION update_solicitudes_aprobacion_timestamp();

-- =====================================================
-- TABLA: auditoria_cambios
-- =====================================================

CREATE TABLE IF NOT EXISTS auditoria_cambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tabla_afectada text NOT NULL,
  registro_id uuid NOT NULL,
  tipo_operacion text NOT NULL CHECK (tipo_operacion IN ('crear', 'modificar', 'eliminar')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario_id text NOT NULL REFERENCES usuarios(id),
  solicitud_aprobacion_id uuid REFERENCES solicitudes_aprobacion(id),
  fecha timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  creado_en timestamptz DEFAULT now()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON auditoria_cambios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria_cambios(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria_cambios(registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_cambios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_solicitud ON auditoria_cambios(solicitud_aprobacion_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_cambios(fecha);

-- =====================================================
-- SEGURIDAD: Row Level Security
-- =====================================================

-- Habilitar RLS
ALTER TABLE solicitudes_aprobacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_cambios ENABLE ROW LEVEL SECURITY;

-- Políticas para solicitudes_aprobacion (acceso vía service_role desde edge functions)
CREATE POLICY "Service role acceso total solicitudes"
  ON solicitudes_aprobacion FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para auditoria_cambios (acceso vía service_role desde edge functions)
CREATE POLICY "Service role acceso total auditoría"
  ON auditoria_cambios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para verificar si el usuario puede aprobar
CREATE OR REPLACE FUNCTION puede_aprobar_solicitud(p_usuario_id text, p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT rol INTO v_rol
  FROM usuarios
  WHERE id = p_usuario_id AND p_empresa_id = ANY(empresas_asignadas);

  RETURN v_rol IN ('supervisor', 'admin');
END;
$$;

-- Comentarios en las tablas
COMMENT ON TABLE solicitudes_aprobacion IS 'Solicitudes de aprobación para modificar o eliminar facturas';
COMMENT ON TABLE auditoria_cambios IS 'Registro de auditoría de todos los cambios en el sistema';
COMMENT ON FUNCTION puede_aprobar_solicitud IS 'Verifica si un usuario tiene permisos para aprobar solicitudes';
