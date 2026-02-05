/*
  # Extender Sistema de Aprobaciones a Todas las Transacciones

  ## Resumen
  Modifica el sistema de aprobaciones para soportar no solo facturas, sino todas las
  transacciones del sistema: asientos contables, movimientos de tesorería, pagos, etc.

  ## Cambios
  1. Agregar nuevos tipos de solicitud
  2. Hacer el campo factura_id nullable y agregar registro_id genérico
  3. Agregar tabla_afectada para identificar el tipo de registro
*/

-- 1. Agregar nuevos campos a la tabla
ALTER TABLE solicitudes_aprobacion
  ADD COLUMN IF NOT EXISTS tabla_afectada TEXT,
  ADD COLUMN IF NOT EXISTS registro_id UUID;

-- 2. Hacer factura_id nullable
ALTER TABLE solicitudes_aprobacion
  ALTER COLUMN factura_id DROP NOT NULL;

-- 3. Migrar datos existentes (marcar facturas)
UPDATE solicitudes_aprobacion
SET 
  tabla_afectada = 'facturas_venta',
  registro_id = factura_id
WHERE tabla_afectada IS NULL AND factura_id IS NOT NULL;

-- 4. Modificar el tipo_solicitud para agregar más valores
-- Primero eliminar el constraint si existe
ALTER TABLE solicitudes_aprobacion DROP CONSTRAINT IF EXISTS solicitudes_aprobacion_tipo_solicitud_check;

-- Cambiar la columna a TEXT temporalmente
ALTER TABLE solicitudes_aprobacion ALTER COLUMN tipo_solicitud TYPE TEXT;

-- Eliminar el tipo enum viejo
DROP TYPE IF EXISTS tipo_solicitud_aprobacion CASCADE;

-- Crear el nuevo tipo enum con todos los valores
CREATE TYPE tipo_solicitud_aprobacion AS ENUM (
  'modificar_factura',
  'eliminar_factura',
  'modificar_asiento',
  'eliminar_asiento',
  'modificar_movimiento_tesoreria',
  'eliminar_movimiento_tesoreria',
  'modificar_pago_cliente',
  'eliminar_pago_cliente',
  'modificar_pago_proveedor',
  'eliminar_pago_proveedor'
);

-- Volver a aplicar el tipo enum
ALTER TABLE solicitudes_aprobacion 
  ALTER COLUMN tipo_solicitud TYPE tipo_solicitud_aprobacion 
  USING tipo_solicitud::tipo_solicitud_aprobacion;

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_tabla_registro 
  ON solicitudes_aprobacion(tabla_afectada, registro_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo_estado 
  ON solicitudes_aprobacion(tipo_solicitud, estado);

-- 6. Comentarios para documentación
COMMENT ON COLUMN solicitudes_aprobacion.tabla_afectada IS 
  'Tabla del registro que se quiere modificar o eliminar';

COMMENT ON COLUMN solicitudes_aprobacion.registro_id IS 
  'ID del registro que se quiere modificar o eliminar';
