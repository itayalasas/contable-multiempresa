/*
  # Actualizar estado de movimientos cuando tienen asiento contable

  1. Descripción
    - Agregar 'CONTABILIZADO' como estado válido para movimientos de tesorería
    - Crear trigger que actualice automáticamente el estado_conciliacion
    - Cuando se asigna un asiento_contable_id, cambiar estado a 'CONTABILIZADO'
    - Cuando se quita el asiento, volver a 'PENDIENTE'

  2. Estados
    - PENDIENTE: Movimiento sin asiento contable
    - CONTABILIZADO: Movimiento con asiento contable asignado
    - CONCILIADO: Movimiento conciliado con extracto bancario
    - RECHAZADO: Movimiento rechazado en conciliación

  3. Beneficios
    - Visualización inmediata de qué movimientos ya están contabilizados
    - Facilita identificar movimientos que faltan contabilizar
    - Mejora el proceso de cierre contable
*/

-- Modificar el constraint para incluir CONTABILIZADO
ALTER TABLE movimientos_tesoreria 
DROP CONSTRAINT IF EXISTS movimientos_tesoreria_estado_conciliacion_check;

ALTER TABLE movimientos_tesoreria
ADD CONSTRAINT movimientos_tesoreria_estado_conciliacion_check 
CHECK (estado_conciliacion = ANY (ARRAY['PENDIENTE'::text, 'CONTABILIZADO'::text, 'CONCILIADO'::text, 'RECHAZADO'::text]));

-- Función para actualizar estado cuando se asigna o quita asiento
CREATE OR REPLACE FUNCTION actualizar_estado_movimiento_con_asiento()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está insertando o actualizando
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Si tiene asiento contable y el estado no es CONCILIADO, marcarlo como CONTABILIZADO
    IF NEW.asiento_contable_id IS NOT NULL AND (NEW.estado_conciliacion IS NULL OR NEW.estado_conciliacion = 'PENDIENTE') THEN
      NEW.estado_conciliacion := 'CONTABILIZADO';
    END IF;
    
    -- Si se quitó el asiento y el estado era CONTABILIZADO, volver a PENDIENTE
    IF NEW.asiento_contable_id IS NULL AND OLD.asiento_contable_id IS NOT NULL AND NEW.estado_conciliacion = 'CONTABILIZADO' THEN
      NEW.estado_conciliacion := 'PENDIENTE';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_actualizar_estado_movimiento_asiento ON movimientos_tesoreria;

CREATE TRIGGER trigger_actualizar_estado_movimiento_asiento
  BEFORE INSERT OR UPDATE ON movimientos_tesoreria
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_movimiento_con_asiento();

-- Actualizar movimientos existentes que ya tienen asiento pero están en PENDIENTE
UPDATE movimientos_tesoreria
SET estado_conciliacion = 'CONTABILIZADO'
WHERE asiento_contable_id IS NOT NULL
  AND (estado_conciliacion IS NULL OR estado_conciliacion = 'PENDIENTE')
  AND eliminado = false;
