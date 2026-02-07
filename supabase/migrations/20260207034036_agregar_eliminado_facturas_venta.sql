/*
  # Agregar eliminación lógica a facturas_venta
  
  ## Columnas agregadas
  - eliminado (boolean, default false)
  - fecha_eliminacion (timestamptz)
  - eliminado_por (text, FK a usuarios)
  - motivo_eliminacion (text)
*/

-- Agregar columnas de eliminación lógica
ALTER TABLE facturas_venta
ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz,
ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

-- Asegurar valores por defecto
UPDATE facturas_venta
SET eliminado = false
WHERE eliminado IS NULL;

-- Índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_facturas_venta_eliminado
  ON facturas_venta(eliminado)
  WHERE eliminado = false;

-- Comentarios
COMMENT ON COLUMN facturas_venta.eliminado IS 'Indica si la factura ha sido eliminada lógicamente';
COMMENT ON COLUMN facturas_venta.fecha_eliminacion IS 'Fecha y hora de eliminación';
