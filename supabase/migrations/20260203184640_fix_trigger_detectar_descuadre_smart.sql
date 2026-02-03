/*
  # Mejorar Detección Automática de Descuadres en Movimientos

  1. Cambios
    - Mejorar el trigger de detección de descuadres para ser más inteligente
    - Si un asiento descuadrado se corrige, automáticamente cambiarlo a confirmado
    - Si un asiento confirmado se descuadra, marcarlo como descuadrado
    - No afectar asientos en borrador (solo confirmados/descuadrados)

  2. Notas
    - Facilita la corrección de asientos descuadrados
    - Mantiene la integridad contable automáticamente
*/

CREATE OR REPLACE FUNCTION detectar_descuadre_movimientos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cuadrado boolean;
  v_estado_actual text;
  v_asiento_id uuid;
BEGIN
  -- Obtener el asiento_id según la operación
  IF TG_OP = 'DELETE' THEN
    v_asiento_id := OLD.asiento_id;
  ELSE
    v_asiento_id := NEW.asiento_id;
  END IF;

  -- Obtener estado actual del asiento
  SELECT estado INTO v_estado_actual
  FROM asientos_contables
  WHERE id = v_asiento_id;

  -- Solo verificar si el asiento está confirmado o descuadrado
  -- NO afectar asientos en borrador
  IF v_estado_actual IN ('confirmado', 'descuadrado') THEN
    -- Verificar si está cuadrado después del cambio
    v_cuadrado := verificar_cuadre_asiento(v_asiento_id);

    IF NOT v_cuadrado AND v_estado_actual = 'confirmado' THEN
      -- Si estaba confirmado y ahora está descuadrado, marcarlo
      UPDATE asientos_contables
      SET estado = 'descuadrado',
          fecha_modificacion = now()
      WHERE id = v_asiento_id;
      
    ELSIF v_cuadrado AND v_estado_actual = 'descuadrado' THEN
      -- Si estaba descuadrado y ahora está cuadrado, confirmarlo automáticamente
      UPDATE asientos_contables
      SET estado = 'confirmado',
          fecha_modificacion = now()
      WHERE id = v_asiento_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION detectar_descuadre_movimientos() IS 'Detecta automáticamente descuadres al modificar movimientos. Si un asiento confirmado se descuadra, lo marca como descuadrado. Si un asiento descuadrado se corrige, lo marca como confirmado automáticamente.';