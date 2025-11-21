/*
  # Fix trigger rollback comisiones - Correct table name

  1. Changes
    - Update function `rollback_comisiones_on_delete_factura` to use correct table name
    - Change `asientos_contables_detalles` to `movimientos_contables`

  2. Notes
    - This fixes the error when deleting commission invoices
*/

CREATE OR REPLACE FUNCTION rollback_comisiones_on_delete_factura()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo procesar si la factura tiene tipo 'factura_comisiones_partner'
  IF (OLD.metadata->>'tipo' = 'factura_comisiones_partner') THEN
    
    -- Revertir estado de comisiones asociadas
    UPDATE comisiones_partners
    SET 
      estado_comision = 'pendiente',
      fecha_facturada = NULL,
      factura_venta_comision_id = NULL
    WHERE factura_venta_comision_id = OLD.id;
    
    -- Eliminar asiento contable asociado si existe
    IF OLD.asiento_contable_id IS NOT NULL THEN
      DELETE FROM movimientos_contables WHERE asiento_id = OLD.asiento_contable_id;
      DELETE FROM asientos_contables WHERE id = OLD.asiento_contable_id;
    END IF;
    
    RAISE NOTICE 'Rollback completado para factura % - Comisiones revertidas a pendiente', OLD.numero_factura;
  END IF;
  
  RETURN OLD;
END;
$$;
