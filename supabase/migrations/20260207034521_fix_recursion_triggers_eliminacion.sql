/*
  # Corregir recursión infinita en triggers de eliminación
  
  ## Problema
  Los triggers se llaman entre sí causando recursión infinita:
  - factura_por_pagar elimina factura_compra
  - factura_compra intenta eliminar factura_por_pagar
  - Bucle infinito
  
  ## Solución
  El trigger de factura_compra NO debe intentar eliminar factura_por_pagar
  porque siempre se elimina desde factura_por_pagar hacia abajo, no al revés.
  
  ## Flujo correcto
  factura_por_pagar (DELETE) →
    → elimina factura_compra
    → revierte comisiones
    → elimina pagos
    → elimina asientos
    → elimina movimientos
*/

-- =====================================================
-- TRIGGER CORREGIDO: Eliminar factura_compra
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_comision RECORD;
BEGIN
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Eliminando factura de compra ID: %', NEW.id;

    -- SOLO REVERTIR COMISIONES
    -- NO eliminar factura_por_pagar porque eso causa recursión
    FOR v_comision IN
      SELECT id
      FROM comisiones_partners
      WHERE factura_compra_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  📦 Revertir comisión ID: % a pendiente', v_comision.id;
      
      UPDATE comisiones_partners
      SET
        estado_comision = 'pendiente',
        factura_compra_id = NULL,
        updated_at = now()
      WHERE id = v_comision.id;
    END LOOP;

    NEW.fecha_eliminacion := now();
    RAISE NOTICE '✅ Factura de compra eliminada (comisiones revertidas)';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_compra ON facturas_compra;
CREATE TRIGGER trigger_rollback_eliminar_factura_compra
  BEFORE UPDATE OF eliminado ON facturas_compra
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_compra();

COMMENT ON FUNCTION rollback_eliminar_factura_compra() IS
'Revierte comisiones al eliminar factura_compra. NO elimina factura_por_pagar para evitar recursión.';
