/*
  # Corregir trigger de rollback - Relaciones correctas
  
  ## Problema
  El trigger buscaba comisiones usando `factura_compra_id = NEW.id` pero:
  - NEW.id es el ID de facturas_por_pagar
  - factura_compra_id apunta a facturas_compra, no a facturas_por_pagar
  - La relación correcta está en NEW.referencia que contiene el ID de facturas_compra
  
  ## Solución
  Corregir el trigger para usar la relación correcta:
  - Buscar comisiones donde factura_compra_id = NEW.referencia
  - Buscar pagos donde factura_id = NEW.id (esto ya estaba correcto)
  
  ## Tablas afectadas
  - facturas_por_pagar (trigger)
*/

-- =====================================================
-- FUNCIÓN CORREGIDA: Rollback al eliminar factura por pagar
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_por_pagar()
RETURNS TRIGGER AS $$
DECLARE
  v_comision RECORD;
  v_pago RECORD;
  v_factura_compra_id uuid;
BEGIN
  -- Solo procesar si se está haciendo eliminación lógica
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Iniciando rollback por eliminación de factura por pagar ID: %', NEW.id;

    -- El campo "referencia" contiene el ID de facturas_compra
    v_factura_compra_id := NEW.referencia::uuid;
    
    IF v_factura_compra_id IS NULL THEN
      RAISE WARNING '⚠️ No se encontró referencia a factura_compra para factura por pagar %', NEW.id;
    ELSE
      -- 1. ROLLBACK DE COMISIONES
      -- Cambiar estado de comisiones relacionadas de vuelta a "pendiente"
      FOR v_comision IN
        SELECT id, estado_comision, estado_pago
        FROM comisiones_partners
        WHERE factura_compra_id = v_factura_compra_id
          AND (eliminado IS NULL OR eliminado = false)
      LOOP
        RAISE NOTICE '  📦 Rollback comisión ID: % (estado: % -> pendiente)',
          v_comision.id, v_comision.estado_comision;

        UPDATE comisiones_partners
        SET
          estado_comision = 'pendiente',
          factura_compra_id = NULL,
          actualizado_en = now()
        WHERE id = v_comision.id;
      END LOOP;
    END IF;

    -- 2. ROLLBACK DE PAGOS DE PROVEEDOR
    -- Eliminar (lógicamente) todos los pagos relacionados con esta factura_por_pagar
    FOR v_pago IN
      SELECT id, asiento_contable_id, cuenta_bancaria_id, monto
      FROM pagos_proveedor
      WHERE factura_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  💳 Eliminando pago proveedor ID: %, asiento: %, cuenta: %',
        v_pago.id, v_pago.asiento_contable_id, v_pago.cuenta_bancaria_id;

      -- Eliminar movimientos de tesorería asociados al pago
      IF v_pago.cuenta_bancaria_id IS NOT NULL THEN
        UPDATE movimientos_tesoreria
        SET
          eliminado = true,
          fecha_eliminacion = now()
        WHERE pago_proveedor_id = v_pago.id
          AND (eliminado IS NULL OR eliminado = false);

        RAISE NOTICE '    🏦 Movimientos de tesorería eliminados para pago %', v_pago.id;
      END IF;

      -- Eliminar asiento contable del pago
      IF v_pago.asiento_contable_id IS NOT NULL THEN
        UPDATE asientos_contables
        SET
          eliminado = true,
          fecha_eliminacion = now()
        WHERE id = v_pago.asiento_contable_id
          AND (eliminado IS NULL OR eliminado = false);

        RAISE NOTICE '    📒 Asiento contable % eliminado', v_pago.asiento_contable_id;
      END IF;

      -- Eliminar el pago mismo
      UPDATE pagos_proveedor
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = v_pago.id;
    END LOOP;

    -- 3. ELIMINAR ASIENTO CONTABLE DE LA FACTURA (si tiene)
    IF NEW.asiento_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = NEW.asiento_id
        AND (eliminado IS NULL OR eliminado = false);

      RAISE NOTICE '  📒 Asiento contable de factura % eliminado', NEW.asiento_id;
    END IF;

    -- 4. Establecer fecha de eliminación
    NEW.fecha_eliminacion := now();

    RAISE NOTICE '✅ Rollback completado para factura por pagar ID: %', NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_por_pagar ON facturas_por_pagar;
CREATE TRIGGER trigger_rollback_eliminar_factura_por_pagar
  BEFORE UPDATE OF eliminado ON facturas_por_pagar
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_por_pagar();

COMMENT ON FUNCTION rollback_eliminar_factura_por_pagar() IS
'Trigger que hace rollback completo al eliminar factura por pagar: comisiones, asientos y pagos. CORREGIDO para usar referencia correcta.';
