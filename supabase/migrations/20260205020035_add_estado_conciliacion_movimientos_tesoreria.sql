/*
  # Agregar campo estado_conciliacion a movimientos_tesoreria
  
  1. Cambios
    - Agregar columna `estado_conciliacion` a la tabla `movimientos_tesoreria`
    - Estado por defecto: 'PENDIENTE'
    - Valores permitidos: 'PENDIENTE', 'CONCILIADO', 'RECHAZADO'
  
  2. Notas
    - Todos los movimientos existentes quedarán con estado PENDIENTE
    - Este campo permite rastrear el estado de conciliación de cada movimiento
*/

-- Agregar columna estado_conciliacion
ALTER TABLE movimientos_tesoreria 
ADD COLUMN IF NOT EXISTS estado_conciliacion TEXT DEFAULT 'PENDIENTE';

-- Agregar constraint para valores permitidos
ALTER TABLE movimientos_tesoreria 
DROP CONSTRAINT IF EXISTS movimientos_tesoreria_estado_conciliacion_check;

ALTER TABLE movimientos_tesoreria 
ADD CONSTRAINT movimientos_tesoreria_estado_conciliacion_check 
CHECK (estado_conciliacion IN ('PENDIENTE', 'CONCILIADO', 'RECHAZADO'));

-- Actualizar movimientos existentes a PENDIENTE
UPDATE movimientos_tesoreria 
SET estado_conciliacion = 'PENDIENTE' 
WHERE estado_conciliacion IS NULL;

-- Agregar comentario
COMMENT ON COLUMN movimientos_tesoreria.estado_conciliacion IS 
  'Estado de conciliación del movimiento: PENDIENTE, CONCILIADO, RECHAZADO';
