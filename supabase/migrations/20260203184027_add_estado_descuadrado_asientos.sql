/*
  # Agregar Estado "Descuadrado" a Asientos Contables

  1. Cambios
    - Modificar el CHECK constraint del campo estado en asientos_contables
    - Añadir el estado 'descuadrado' para identificar asientos con problemas de cuadre
    - Crear función para detectar y marcar automáticamente asientos descuadrados
    - Actualizar asientos existentes que estén descuadrados

  2. Notas
    - Los asientos descuadrados no podrán pasar a estado confirmado hasta que se corrijan
    - Se identificarán automáticamente asientos con diferencias entre débitos y créditos
    - Tolerancia de ±0.01 para diferencias por redondeo
*/

-- Primero eliminamos el constraint existente
DO $$
BEGIN
  -- Eliminar el constraint si existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'asientos_contables_estado_check'
  ) THEN
    ALTER TABLE asientos_contables DROP CONSTRAINT asientos_contables_estado_check;
  END IF;
END $$;

-- Agregamos el nuevo constraint con el estado 'descuadrado'
ALTER TABLE asientos_contables
ADD CONSTRAINT asientos_contables_estado_check
CHECK (estado IN ('borrador', 'confirmado', 'anulado', 'descuadrado'));

-- Función para verificar si un asiento está descuadrado
CREATE OR REPLACE FUNCTION verificar_cuadre_asiento(p_asiento_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debitos numeric(15,2);
  v_total_creditos numeric(15,2);
  v_diferencia numeric(15,2);
BEGIN
  -- Calcular totales
  SELECT
    COALESCE(SUM(debito), 0),
    COALESCE(SUM(credito), 0)
  INTO v_total_debitos, v_total_creditos
  FROM movimientos_contables
  WHERE asiento_id = p_asiento_id;

  -- Calcular diferencia
  v_diferencia := ABS(v_total_debitos - v_total_creditos);

  -- Retornar true si está cuadrado (tolerancia de 0.01)
  RETURN v_diferencia <= 0.01;
END;
$$;

-- Función para marcar automáticamente asientos descuadrados
CREATE OR REPLACE FUNCTION marcar_asientos_descuadrados()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_asiento RECORD;
  v_cuadrado boolean;
BEGIN
  -- Recorrer todos los asientos confirmados
  FOR v_asiento IN
    SELECT id, numero, estado
    FROM asientos_contables
    WHERE estado = 'confirmado'
  LOOP
    -- Verificar si está cuadrado
    v_cuadrado := verificar_cuadre_asiento(v_asiento.id);

    -- Si no está cuadrado, cambiar estado
    IF NOT v_cuadrado THEN
      UPDATE asientos_contables
      SET estado = 'descuadrado',
          fecha_modificacion = now()
      WHERE id = v_asiento.id;

      RAISE NOTICE 'Asiento % marcado como descuadrado', v_asiento.numero;
    END IF;
  END LOOP;
END;
$$;

-- Trigger para prevenir confirmar asientos descuadrados
CREATE OR REPLACE FUNCTION validar_confirmacion_asiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cuadrado boolean;
BEGIN
  -- Solo validar si se está intentando confirmar
  IF NEW.estado = 'confirmado' AND (OLD.estado IS NULL OR OLD.estado != 'confirmado') THEN
    -- Verificar si el asiento está cuadrado
    v_cuadrado := verificar_cuadre_asiento(NEW.id);

    IF NOT v_cuadrado THEN
      RAISE EXCEPTION 'No se puede confirmar un asiento descuadrado. El asiento % tiene una diferencia entre débitos y créditos.', NEW.numero;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_validar_confirmacion_asiento ON asientos_contables;

-- Crear trigger para validar confirmación
CREATE TRIGGER trigger_validar_confirmacion_asiento
  BEFORE INSERT OR UPDATE ON asientos_contables
  FOR EACH ROW
  EXECUTE FUNCTION validar_confirmacion_asiento();

-- Trigger para detectar descuadres automáticamente al modificar movimientos
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

  -- Solo verificar si el asiento está confirmado
  IF v_estado_actual = 'confirmado' THEN
    -- Verificar si quedó cuadrado después del cambio
    v_cuadrado := verificar_cuadre_asiento(v_asiento_id);

    IF NOT v_cuadrado THEN
      -- Marcar como descuadrado
      UPDATE asientos_contables
      SET estado = 'descuadrado',
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

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_detectar_descuadre_movimientos ON movimientos_contables;

-- Crear trigger para detectar descuadres en movimientos
CREATE TRIGGER trigger_detectar_descuadre_movimientos
  AFTER INSERT OR UPDATE OR DELETE ON movimientos_contables
  FOR EACH ROW
  EXECUTE FUNCTION detectar_descuadre_movimientos();

-- Ejecutar función para marcar asientos descuadrados existentes
SELECT marcar_asientos_descuadrados();

-- Crear índice para mejorar rendimiento de búsqueda por estado
CREATE INDEX IF NOT EXISTS idx_asientos_estado ON asientos_contables(estado);