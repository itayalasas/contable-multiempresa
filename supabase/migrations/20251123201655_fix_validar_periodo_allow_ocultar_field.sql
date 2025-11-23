/*
  # Modificar validación de periodo para permitir cambios en campo ocultar_en_listados
  
  1. Problema
    - La función validar_periodo_abierto() bloquea CUALQUIER actualización en periodos cerrados
    - Esto impide que el sistema oculte/muestre registros automáticamente
  
  2. Solución
    - Modificar la función para permitir actualizar SOLO el campo ocultar_en_listados
    - Bloquear cambios en otros campos cuando el periodo está cerrado
*/

CREATE OR REPLACE FUNCTION validar_periodo_abierto()
RETURNS TRIGGER AS $$
DECLARE
  periodo_estado text;
BEGIN
  -- En UPDATE, permitir cambios solo en ocultar_en_listados si el periodo está cerrado
  IF TG_OP = 'UPDATE' THEN
    -- Verificar si SOLO está cambiando ocultar_en_listados
    IF OLD.ocultar_en_listados IS DISTINCT FROM NEW.ocultar_en_listados AND
       OLD.numero IS NOT DISTINCT FROM NEW.numero AND
       OLD.fecha IS NOT DISTINCT FROM NEW.fecha AND
       OLD.descripcion IS NOT DISTINCT FROM NEW.descripcion AND
       OLD.referencia IS NOT DISTINCT FROM NEW.referencia AND
       OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
      -- Solo está cambiando ocultar_en_listados, permitir
      RETURN NEW;
    END IF;
  END IF;

  -- Para INSERT o UPDATE de otros campos, validar periodo
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

COMMENT ON FUNCTION validar_periodo_abierto IS 'Valida que los asientos solo se creen/modifiquen en periodos abiertos. Permite cambios en ocultar_en_listados para gestión de periodos';
