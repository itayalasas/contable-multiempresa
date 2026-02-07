/*
  # Triggers para rollback al eliminar facturas por pagar

  1. Problema
    - Al eliminar una factura por pagar, las comisiones quedaban en estado "facturada"
    - Los asientos contables y movimientos de tesorería no se eliminaban
    - No se podía volver a generar la factura

  2. Solución
    - Trigger que al eliminar factura por pagar:
      * Cambia estado de comisiones de "facturada" a "pendiente"
      * Limpia el campo factura_compra_id de las comisiones
      * Elimina asiento contable asociado
      * Elimina pagos de proveedor asociados (y sus asientos/movimientos)

    - Trigger que al eliminar pago proveedor:
      * Elimina asiento contable asociado
      * Elimina movimientos de tesorería asociados

  3. Notas importantes
    - Usa eliminación lógica (campo eliminado = true)
    - Mantiene integridad referencial
    - Permite regenerar facturas después de eliminar
*/

-- =====================================================
-- FUNCIÓN: Rollback al eliminar factura por pagar
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_por_pagar()
RETURNS TRIGGER AS $$
DECLARE
  v_comision RECORD;
  v_pago RECORD;
BEGIN
  -- Solo procesar si se está haciendo eliminación lógica
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Iniciando rollback por eliminación de factura por pagar ID: %', NEW.id;

    -- 1. ROLLBACK DE COMISIONES
    -- Cambiar estado de comisiones relacionadas de vuelta a "pendiente"
    FOR v_comision IN
      SELECT id, estado_comision, estado_pago
      FROM comisiones_partners
      WHERE factura_compra_id = NEW.id
        AND eliminado = false
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

    -- 2. ROLLBACK DE PAGOS DE PROVEEDOR
    -- Eliminar (lógicamente) todos los pagos relacionados con esta factura
    FOR v_pago IN
      SELECT id, asiento_id, cuenta_bancaria_id, monto
      FROM pagos_proveedor
      WHERE factura_compra_id = NEW.id
        AND eliminado = false
    LOOP
      RAISE NOTICE '  💳 Eliminando pago proveedor ID: %, asiento: %, cuenta: %',
        v_pago.id, v_pago.asiento_id, v_pago.cuenta_bancaria_id;

      -- Eliminar movimientos de tesorería asociados al pago
      IF v_pago.cuenta_bancaria_id IS NOT NULL THEN
        UPDATE movimientos_tesoreria
        SET
          eliminado = true,
          fecha_eliminacion = now()
        WHERE pago_proveedor_id = v_pago.id
          AND eliminado = false;

        RAISE NOTICE '    🏦 Movimientos de tesorería eliminados para pago %', v_pago.id;
      END IF;

      -- Eliminar asiento contable del pago
      IF v_pago.asiento_id IS NOT NULL THEN
        UPDATE asientos_contables
        SET
          eliminado = true,
          fecha_eliminacion = now()
        WHERE id = v_pago.asiento_id
          AND eliminado = false;

        RAISE NOTICE '    📒 Asiento contable % eliminado', v_pago.asiento_id;
      END IF;

      -- Eliminar el pago mismo
      UPDATE pagos_proveedor
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = v_pago.id;
    END LOOP;

    -- 3. ELIMINAR ASIENTO CONTABLE DE LA FACTURA
    IF NEW.asiento_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = NEW.asiento_id
        AND eliminado = false;

      RAISE NOTICE '  📒 Asiento contable de factura % eliminado', NEW.asiento_id;
    END IF;

    -- 4. Establecer fecha de eliminación
    NEW.fecha_eliminacion := now();

    RAISE NOTICE '✅ Rollback completado para factura por pagar ID: %', NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en facturas_por_pagar
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_por_pagar ON facturas_por_pagar;
CREATE TRIGGER trigger_rollback_eliminar_factura_por_pagar
  BEFORE UPDATE OF eliminado ON facturas_por_pagar
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_por_pagar();

COMMENT ON FUNCTION rollback_eliminar_factura_por_pagar() IS
'Trigger que hace rollback completo al eliminar factura por pagar: comisiones, asientos y pagos';


-- =====================================================
-- FUNCIÓN: Rollback al eliminar pago de proveedor
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_pago_proveedor()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si se está haciendo eliminación lógica
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Rollback por eliminación de pago proveedor ID: %', NEW.id;

    -- 1. ELIMINAR MOVIMIENTOS DE TESORERÍA
    IF NEW.cuenta_bancaria_id IS NOT NULL THEN
      UPDATE movimientos_tesoreria
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE pago_proveedor_id = NEW.id
        AND eliminado = false;

      RAISE NOTICE '  🏦 Movimientos de tesorería eliminados';
    END IF;

    -- 2. ELIMINAR ASIENTO CONTABLE
    IF NEW.asiento_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = NEW.asiento_id
        AND eliminado = false;

      RAISE NOTICE '  📒 Asiento contable % eliminado', NEW.asiento_id;
    END IF;

    -- 3. Establecer fecha de eliminación
    NEW.fecha_eliminacion := now();

    RAISE NOTICE '✅ Rollback completado para pago proveedor ID: %', NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en pagos_proveedor
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_pago_proveedor ON pagos_proveedor;
CREATE TRIGGER trigger_rollback_eliminar_pago_proveedor
  BEFORE UPDATE OF eliminado ON pagos_proveedor
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_pago_proveedor();

COMMENT ON FUNCTION rollback_eliminar_pago_proveedor() IS
'Trigger que hace rollback completo al eliminar pago proveedor: asientos y movimientos';


-- =====================================================
-- FUNCIÓN: Rollback al eliminar cobro de cliente
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_cobro_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si se está haciendo eliminación lógica
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Rollback por eliminación de cobro cliente ID: %', NEW.id;

    -- 1. ELIMINAR MOVIMIENTOS DE TESORERÍA
    IF NEW.cuenta_bancaria_id IS NOT NULL THEN
      UPDATE movimientos_tesoreria
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE pago_cliente_id = NEW.id
        AND eliminado = false;

      RAISE NOTICE '  🏦 Movimientos de tesorería eliminados';
    END IF;

    -- 2. ELIMINAR ASIENTO CONTABLE
    IF NEW.asiento_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET
        eliminado = true,
        fecha_eliminacion = now()
      WHERE id = NEW.asiento_id
        AND eliminado = false;

      RAISE NOTICE '  📒 Asiento contable % eliminado', NEW.asiento_id;
    END IF;

    -- 3. Establecer fecha de eliminación
    NEW.fecha_eliminacion := now();

    RAISE NOTICE '✅ Rollback completado para cobro cliente ID: %', NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en pagos_cliente
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_cobro_cliente ON pagos_cliente;
CREATE TRIGGER trigger_rollback_eliminar_cobro_cliente
  BEFORE UPDATE OF eliminado ON pagos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_cobro_cliente();

COMMENT ON FUNCTION rollback_eliminar_cobro_cliente() IS
'Trigger que hace rollback completo al eliminar cobro de cliente: asientos y movimientos';
