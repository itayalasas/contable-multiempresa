/*
  # Fix: Actualizar estado_pago de comisiones automáticamente

  1. Descripción
    - Crear trigger que actualice el estado_pago de comisiones_partners cuando se cobre la factura de comisión
    - Esto evita que el cierre contable muestre errores de comisiones "sin cobrar" cuando ya fueron cobradas

  2. Funcionamiento
    - Cuando se registra un pago en pagos_cliente
    - Si ese pago es para una factura que es una factura_venta_comision_id en comisiones_partners
    - Actualiza el estado_pago de la comisión a 'pagada'

  3. Seguridad
    - Solo actualiza comisiones relacionadas con la factura que se está cobrando
*/

-- Función para actualizar estado_pago de comisión cuando se cobra la factura
CREATE OR REPLACE FUNCTION actualizar_estado_pago_comision_al_cobrar()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se inserta o actualiza un pago_cliente
  -- Verificar si es pago de una factura de comisión y actualizar la comisión
  UPDATE comisiones_partners
  SET 
    estado_pago = 'pagada',
    updated_at = now()
  WHERE factura_venta_comision_id = NEW.factura_id
    AND estado_pago != 'pagada'
    AND eliminado = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en pagos_cliente
DROP TRIGGER IF EXISTS trigger_actualizar_estado_pago_comision ON pagos_cliente;

CREATE TRIGGER trigger_actualizar_estado_pago_comision
  AFTER INSERT OR UPDATE ON pagos_cliente
  FOR EACH ROW
  WHEN (NEW.eliminado = false)
  EXECUTE FUNCTION actualizar_estado_pago_comision_al_cobrar();

-- Función para revertir estado_pago cuando se elimina el pago
CREATE OR REPLACE FUNCTION revertir_estado_pago_comision_al_eliminar()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se marca como eliminado un pago
  -- Verificar si quedan otros pagos para esa factura
  -- Si no quedan pagos, revertir el estado a 'pendiente'
  IF NEW.eliminado = true AND OLD.eliminado = false THEN
    UPDATE comisiones_partners
    SET 
      estado_pago = CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM pagos_cliente pc
          WHERE pc.factura_id = NEW.factura_id 
            AND pc.eliminado = false
            AND pc.id != NEW.id
        ) THEN 'pendiente'
        ELSE 'pagada'
      END,
      updated_at = now()
    WHERE factura_venta_comision_id = NEW.factura_id
      AND eliminado = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para revertir estado cuando se elimina pago
DROP TRIGGER IF EXISTS trigger_revertir_estado_pago_comision ON pagos_cliente;

CREATE TRIGGER trigger_revertir_estado_pago_comision
  AFTER UPDATE ON pagos_cliente
  FOR EACH ROW
  WHEN (NEW.eliminado = true AND OLD.eliminado = false)
  EXECUTE FUNCTION revertir_estado_pago_comision_al_eliminar();
