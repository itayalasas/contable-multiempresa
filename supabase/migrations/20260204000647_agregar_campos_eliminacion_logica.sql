/*
  # Agregar campos de eliminación lógica

  Agrega campos de soft delete a las tablas de movimientos y asientos
*/

-- Agregar campos a movimientos_tesoreria
ALTER TABLE movimientos_tesoreria ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false;
ALTER TABLE movimientos_tesoreria ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;
ALTER TABLE movimientos_tesoreria ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id);
ALTER TABLE movimientos_tesoreria ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

-- Índice para filtrar movimientos no eliminados
CREATE INDEX IF NOT EXISTS idx_movimientos_no_eliminados ON movimientos_tesoreria(empresa_id, eliminado) WHERE eliminado = false;

-- Agregar campos a asientos_contables
ALTER TABLE asientos_contables ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false;
ALTER TABLE asientos_contables ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;
ALTER TABLE asientos_contables ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id);
ALTER TABLE asientos_contables ADD COLUMN IF NOT EXISTS motivo_eliminacion text;