/*
  # Permitir regenerar facturas de compra a partners

  1. Problema
    - Cuando se elimina una factura de compra, el campo `factura_compra_id` 
      en `comisiones_partners` no se limpia
    - Esto impide regenerar la factura porque la función busca comisiones 
      con `factura_compra_id IS NULL`
  
  2. Solución
    - Crear trigger que limpie `factura_compra_id` cuando se elimina una factura
    - Limpiar referencias huérfanas existentes
  
  3. Seguridad
    - El trigger solo limpia el campo, no elimina datos
    - Las comisiones permanecen con su estado correcto
*/

-- Limpiar referencias huérfanas (facturas de compra ya eliminadas)
UPDATE comisiones_partners
SET factura_compra_id = NULL
WHERE factura_compra_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM facturas_compra
    WHERE facturas_compra.id = comisiones_partners.factura_compra_id
  );

-- Función para limpiar referencias cuando se elimina una factura de compra
CREATE OR REPLACE FUNCTION limpiar_comisiones_al_eliminar_factura_compra()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Limpiar el campo factura_compra_id de las comisiones asociadas
  UPDATE comisiones_partners
  SET factura_compra_id = NULL,
      estado_pago = 'facturada' -- Volver al estado anterior
  WHERE factura_compra_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Trigger que se ejecuta ANTES de eliminar una factura de compra
DROP TRIGGER IF EXISTS trigger_limpiar_comisiones_factura_compra ON facturas_compra;

CREATE TRIGGER trigger_limpiar_comisiones_factura_compra
  BEFORE DELETE ON facturas_compra
  FOR EACH ROW
  EXECUTE FUNCTION limpiar_comisiones_al_eliminar_factura_compra();

-- También limpiar cuando se elimina una cuenta por pagar
CREATE OR REPLACE FUNCTION limpiar_comisiones_al_eliminar_cuenta_pagar()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si la cuenta por pagar tiene referencia a una factura de compra
  IF OLD.referencia IS NOT NULL THEN
    -- Limpiar las comisiones asociadas
    UPDATE comisiones_partners
    SET factura_compra_id = NULL,
        estado_pago = 'facturada'
    WHERE factura_compra_id::text = OLD.referencia;
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_limpiar_comisiones_cuenta_pagar ON facturas_por_pagar;

CREATE TRIGGER trigger_limpiar_comisiones_cuenta_pagar
  BEFORE DELETE ON facturas_por_pagar
  FOR EACH ROW
  EXECUTE FUNCTION limpiar_comisiones_al_eliminar_cuenta_pagar();