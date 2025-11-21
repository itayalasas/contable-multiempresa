/*
  # Crear trigger para rollback de comisiones al eliminar factura

  1. Función trigger
    - Revierte estado de comisiones a 'pendiente' cuando se elimina factura
    - Limpia campos de facturación y fecha_facturada
    - Elimina el asiento contable asociado

  2. Trigger
    - Se ejecuta ANTES de eliminar factura_venta
    - Garantiza integridad de datos
*/

-- Función para rollback de comisiones
CREATE OR REPLACE FUNCTION rollback_comisiones_on_delete_factura()
RETURNS TRIGGER AS $$
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
      DELETE FROM asientos_contables_detalles WHERE asiento_id = OLD.asiento_contable_id;
      DELETE FROM asientos_contables WHERE id = OLD.asiento_contable_id;
    END IF;
    
    RAISE NOTICE 'Rollback completado para factura % - Comisiones revertidas a pendiente', OLD.numero_factura;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_rollback_comisiones_on_delete ON facturas_venta;
CREATE TRIGGER trigger_rollback_comisiones_on_delete
  BEFORE DELETE ON facturas_venta
  FOR EACH ROW
  EXECUTE FUNCTION rollback_comisiones_on_delete_factura();
