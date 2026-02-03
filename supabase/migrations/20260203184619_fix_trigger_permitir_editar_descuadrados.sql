/*
  # Corregir Trigger para Permitir Editar Asientos Descuadrados

  1. Cambios
    - Modificar el trigger de validación para permitir editar asientos descuadrados
    - Solo validar el cuadre cuando se intenta CONFIRMAR un asiento
    - Permitir cambiar un asiento de 'descuadrado' a 'borrador' para corregirlo
    - Si al guardar un asiento descuadrado queda cuadrado, automáticamente pasarlo a confirmado

  2. Notas
    - Los usuarios pueden editar asientos descuadrados para corregirlos
    - El sistema valida el cuadre solo al momento de confirmar
*/

-- Reemplazar el trigger de validación
CREATE OR REPLACE FUNCTION validar_confirmacion_asiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cuadrado boolean;
BEGIN
  -- Solo validar si se está intentando confirmar
  -- Permitir editar asientos descuadrados (no bloquear updates)
  IF NEW.estado = 'confirmado' AND (
    OLD IS NULL OR 
    OLD.estado != 'confirmado'
  ) THEN
    -- Verificar si el asiento está cuadrado
    v_cuadrado := verificar_cuadre_asiento(NEW.id);

    IF NOT v_cuadrado THEN
      -- En lugar de lanzar un error, cambiar automáticamente el estado a 'descuadrado'
      NEW.estado := 'descuadrado';
      NEW.fecha_modificacion := now();
      
      -- No lanzar error, solo ajustar el estado
      -- RAISE EXCEPTION 'No se puede confirmar un asiento descuadrado. El asiento % tiene una diferencia entre débitos y créditos.', NEW.numero;
    END IF;
  END IF;

  -- Si el asiento está descuadrado pero ahora está cuadrado, cambiarlo a confirmado automáticamente
  IF OLD IS NOT NULL AND OLD.estado = 'descuadrado' AND NEW.estado = 'descuadrado' THEN
    v_cuadrado := verificar_cuadre_asiento(NEW.id);
    
    IF v_cuadrado THEN
      NEW.estado := 'confirmado';
      NEW.fecha_modificacion := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger ya existe, no necesitamos recrearlo
-- Solo hemos actualizado la función que ejecuta

COMMENT ON FUNCTION validar_confirmacion_asiento() IS 'Valida que un asiento esté cuadrado antes de confirmarlo. Si no está cuadrado, lo marca automáticamente como descuadrado en lugar de lanzar error. Permite editar asientos descuadrados para corregirlos.';