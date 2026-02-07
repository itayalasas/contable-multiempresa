/*
  # Sistema completo de eliminación en cascada
  
  ## Problema
  Al eliminar facturas, pagos o comisiones quedan registros huérfanos:
  - Asientos contables sin eliminar
  - Movimientos de tesorería sin eliminar
  - Facturas generadas sin eliminar
  - Comisiones facturadas sin revertir
  
  ## Solución
  Crear triggers completos de eliminación para:
  1. facturas_venta (cuentas por cobrar)
  2. facturas_por_pagar (mejorar existente)
  3. facturas_compra (facturas de partners)
  
  ## Cascada de eliminación
  
  ### Al eliminar factura_venta:
  - Eliminar todos pagos_cliente asociados
  - Eliminar asientos de factura y pagos
  - Eliminar movimientos de tesorería
  - Revertir comisiones facturadas a pendiente
  
  ### Al eliminar factura_por_pagar:
  - Eliminar todos pagos_proveedor asociados
  - Eliminar asientos de factura y pagos
  - Eliminar movimientos de tesorería
  - Eliminar factura_compra generada (si existe)
  - Revertir comisiones a pendiente
  
  ### Al eliminar factura_compra:
  - Eliminar factura_por_pagar asociada
  - Revertir comisiones a pendiente
*/

-- =====================================================
-- 1. TRIGGER: Eliminar factura de venta (Cuentas por Cobrar)
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_pago RECORD;
  v_comision RECORD;
BEGIN
  -- Solo procesar si se está haciendo eliminación lógica
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Eliminando factura de venta ID: % (Número: %)', NEW.id, NEW.numero;

    -- 1. ELIMINAR PAGOS DE CLIENTE
    FOR v_pago IN
      SELECT id, asiento_contable_id, cuenta_bancaria_id, monto
      FROM pagos_cliente
      WHERE factura_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  💰 Eliminando pago cliente ID: %', v_pago.id;

      -- Eliminar movimientos de tesorería del pago
      IF v_pago.cuenta_bancaria_id IS NOT NULL THEN
        UPDATE movimientos_tesoreria
        SET eliminado = true, fecha_eliminacion = now()
        WHERE pago_cliente_id = v_pago.id
          AND (eliminado IS NULL OR eliminado = false);
      END IF;

      -- Eliminar asiento contable del pago
      IF v_pago.asiento_contable_id IS NOT NULL THEN
        UPDATE asientos_contables
        SET eliminado = true, fecha_eliminacion = now()
        WHERE id = v_pago.asiento_contable_id
          AND (eliminado IS NULL OR eliminado = false);
      END IF;

      -- Eliminar el pago
      UPDATE pagos_cliente
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = v_pago.id;
    END LOOP;

    -- 2. REVERTIR COMISIONES FACTURADAS
    FOR v_comision IN
      SELECT id, estado_comision, partner_id
      FROM comisiones_partners
      WHERE factura_venta_comision_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  📦 Revertir comisión ID: % de estado "%" a "facturada"', 
        v_comision.id, v_comision.estado_comision;

      UPDATE comisiones_partners
      SET
        estado_comision = 'facturada',
        factura_venta_comision_id = NULL,
        updated_at = now()
      WHERE id = v_comision.id;
    END LOOP;

    -- 3. ELIMINAR ASIENTO CONTABLE DE LA FACTURA
    IF NEW.asiento_contable_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = NEW.asiento_contable_id
        AND (eliminado IS NULL OR eliminado = false);

      RAISE NOTICE '  📒 Asiento contable % eliminado', NEW.asiento_contable_id;
    END IF;

    NEW.fecha_eliminacion := now();
    RAISE NOTICE '✅ Factura de venta % eliminada completamente', NEW.numero;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_venta ON facturas_venta;
CREATE TRIGGER trigger_rollback_eliminar_factura_venta
  BEFORE UPDATE OF eliminado ON facturas_venta
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_venta();

-- =====================================================
-- 2. MEJORAR TRIGGER: Eliminar factura por pagar
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_por_pagar()
RETURNS TRIGGER AS $$
DECLARE
  v_comision RECORD;
  v_pago RECORD;
  v_factura_compra_id uuid;
BEGIN
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Eliminando factura por pagar ID: % (Número: %)', NEW.id, NEW.numero;

    -- Obtener ID de factura_compra desde referencia
    v_factura_compra_id := NEW.referencia::uuid;
    
    IF v_factura_compra_id IS NOT NULL THEN
      -- 1. REVERTIR COMISIONES A PENDIENTE
      FOR v_comision IN
        SELECT id, estado_comision
        FROM comisiones_partners
        WHERE factura_compra_id = v_factura_compra_id
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

      -- 2. ELIMINAR FACTURA_COMPRA GENERADA
      UPDATE facturas_compra
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = v_factura_compra_id
        AND (eliminado IS NULL OR eliminado = false);

      RAISE NOTICE '  📄 Factura compra % eliminada', v_factura_compra_id;
    END IF;

    -- 3. ELIMINAR PAGOS DE PROVEEDOR
    FOR v_pago IN
      SELECT id, asiento_contable_id, cuenta_bancaria_id
      FROM pagos_proveedor
      WHERE factura_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  💳 Eliminando pago proveedor ID: %', v_pago.id;

      -- Eliminar movimientos de tesorería
      IF v_pago.cuenta_bancaria_id IS NOT NULL THEN
        UPDATE movimientos_tesoreria
        SET eliminado = true, fecha_eliminacion = now()
        WHERE pago_proveedor_id = v_pago.id
          AND (eliminado IS NULL OR eliminado = false);
      END IF;

      -- Eliminar asiento del pago
      IF v_pago.asiento_contable_id IS NOT NULL THEN
        UPDATE asientos_contables
        SET eliminado = true, fecha_eliminacion = now()
        WHERE id = v_pago.asiento_contable_id
          AND (eliminado IS NULL OR eliminado = false);
      END IF;

      -- Eliminar el pago
      UPDATE pagos_proveedor
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = v_pago.id;
    END LOOP;

    -- 4. ELIMINAR ASIENTO CONTABLE DE LA FACTURA
    IF NEW.asiento_id IS NOT NULL THEN
      UPDATE asientos_contables
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = NEW.asiento_id
        AND (eliminado IS NULL OR eliminado = false);

      RAISE NOTICE '  📒 Asiento contable % eliminado', NEW.asiento_id;
    END IF;

    NEW.fecha_eliminacion := now();
    RAISE NOTICE '✅ Factura por pagar % eliminada completamente', NEW.numero;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_por_pagar ON facturas_por_pagar;
CREATE TRIGGER trigger_rollback_eliminar_factura_por_pagar
  BEFORE UPDATE OF eliminado ON facturas_por_pagar
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_por_pagar();

-- =====================================================
-- 3. TRIGGER: Eliminar factura de compra (Partners)
-- =====================================================
CREATE OR REPLACE FUNCTION rollback_eliminar_factura_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_comision RECORD;
  v_factura_por_pagar RECORD;
BEGIN
  IF NEW.eliminado = true AND OLD.eliminado = false THEN

    RAISE NOTICE '🗑️ Eliminando factura de compra ID: %', NEW.id;

    -- 1. REVERTIR COMISIONES
    FOR v_comision IN
      SELECT id
      FROM comisiones_partners
      WHERE factura_compra_id = NEW.id
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      UPDATE comisiones_partners
      SET
        estado_comision = 'pendiente',
        factura_compra_id = NULL,
        updated_at = now()
      WHERE id = v_comision.id;
    END LOOP;

    -- 2. ELIMINAR FACTURA_POR_PAGAR ASOCIADA
    FOR v_factura_por_pagar IN
      SELECT id, numero
      FROM facturas_por_pagar
      WHERE referencia = NEW.id::text
        AND (eliminado IS NULL OR eliminado = false)
    LOOP
      RAISE NOTICE '  📄 Eliminando factura por pagar % asociada', v_factura_por_pagar.numero;
      
      UPDATE facturas_por_pagar
      SET eliminado = true, fecha_eliminacion = now()
      WHERE id = v_factura_por_pagar.id;
    END LOOP;

    NEW.fecha_eliminacion := now();
    RAISE NOTICE '✅ Factura de compra eliminada completamente';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_rollback_eliminar_factura_compra ON facturas_compra;
CREATE TRIGGER trigger_rollback_eliminar_factura_compra
  BEFORE UPDATE OF eliminado ON facturas_compra
  FOR EACH ROW
  EXECUTE FUNCTION rollback_eliminar_factura_compra();

-- =====================================================
-- 4. FUNCIÓN RPC: Eliminar factura de venta
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_factura_venta(
  p_factura_id uuid,
  p_empresa_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado json;
  v_factura_numero text;
BEGIN
  SELECT numero INTO v_factura_numero
  FROM facturas_venta
  WHERE id = p_factura_id AND empresa_id = p_empresa_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  -- Eliminar (dispara trigger que hace cascada)
  UPDATE facturas_venta
  SET eliminado = true, fecha_eliminacion = now()
  WHERE id = p_factura_id AND empresa_id = p_empresa_id;

  v_resultado := json_build_object(
    'success', true,
    'message', 'Factura eliminada correctamente',
    'factura_numero', v_factura_numero
  );
  
  RETURN v_resultado;
END;
$$;

-- =====================================================
-- 5. FUNCIÓN RPC: Eliminar factura de compra
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_factura_compra(
  p_factura_id uuid,
  p_empresa_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado json;
  v_factura_numero text;
BEGIN
  SELECT numero INTO v_factura_numero
  FROM facturas_compra
  WHERE id = p_factura_id AND empresa_id = p_empresa_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  UPDATE facturas_compra
  SET eliminado = true, fecha_eliminacion = now()
  WHERE id = p_factura_id AND empresa_id = p_empresa_id;

  v_resultado := json_build_object(
    'success', true,
    'message', 'Factura de compra eliminada',
    'factura_numero', v_factura_numero
  );
  
  RETURN v_resultado;
END;
$$;

-- =====================================================
-- Permisos
-- =====================================================
GRANT EXECUTE ON FUNCTION eliminar_factura_venta(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION eliminar_factura_compra(uuid, uuid) TO authenticated, anon;

-- Comentarios
COMMENT ON FUNCTION rollback_eliminar_factura_venta() IS
'Eliminación completa de factura de venta con todos sus pagos, asientos y movimientos';

COMMENT ON FUNCTION rollback_eliminar_factura_por_pagar() IS
'Eliminación completa de factura por pagar incluyendo factura_compra generada';

COMMENT ON FUNCTION rollback_eliminar_factura_compra() IS
'Eliminación de factura de compra con reversión de comisiones';
