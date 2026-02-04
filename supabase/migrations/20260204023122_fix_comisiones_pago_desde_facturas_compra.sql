/*
  # Corregir flujo de pago de comisiones

  ## Problema
  El trigger actual actualiza estado_pago cuando se paga una factura_venta_comision_id
  pero las comisiones se PAGAN al partner, no se COBRAN.

  ## Solución
  1. Eliminar trigger de facturas_venta
  2. Crear trigger para actualizar estado_pago cuando se paga factura_compra_id
  3. Actualizar automáticamente cuando se registra un pago en pagos_proveedor

  ## Flujo correcto
  - Comisiones generadas → estado_comision: 'pendiente'
  - Se genera factura_compra → estado_comision: 'facturada'
  - Se registra pago en pagos_proveedor → estado_pago: 'pagada'
*/

-- 1. ELIMINAR trigger y función anterior (que usaba facturas_venta)
DROP TRIGGER IF EXISTS trg_actualizar_pago_comisiones ON facturas_venta;
DROP FUNCTION IF EXISTS actualizar_estado_pago_comisiones_on_pago();

-- 2. CREAR función para actualizar estado_pago cuando se paga factura de compra
CREATE OR REPLACE FUNCTION actualizar_estado_pago_comisiones_desde_factura_compra()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'PAGADA'
  IF NEW.estado = 'PAGADA' AND (OLD.estado IS NULL OR OLD.estado != 'PAGADA') THEN

    -- Actualizar todas las comisiones que tienen esta factura de compra
    UPDATE comisiones_partners
    SET
      estado_pago = 'pagada',
      fecha_pagada = NOW(),
      updated_at = NOW()
    WHERE factura_compra_id = NEW.id
      AND estado_pago = 'pendiente';

    -- Log para debugging
    RAISE NOTICE 'Comisiones actualizadas a pagadas para factura de compra: %', NEW.numero;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER en facturas_compra para actualizar comisiones cuando se paga
DROP TRIGGER IF EXISTS trg_actualizar_comisiones_on_pago_compra ON facturas_compra;

CREATE TRIGGER trg_actualizar_comisiones_on_pago_compra
AFTER UPDATE OF estado ON facturas_compra
FOR EACH ROW
WHEN (NEW.estado = 'PAGADA')
EXECUTE FUNCTION actualizar_estado_pago_comisiones_desde_factura_compra();

-- 4. FUNCIÓN para actualizar estado cuando se registra un pago en pagos_proveedor
CREATE OR REPLACE FUNCTION actualizar_estado_factura_compra_on_pago()
RETURNS TRIGGER AS $$
DECLARE
  v_factura_compra RECORD;
  v_total_pagos NUMERIC;
BEGIN
  -- Obtener la factura de compra
  SELECT * INTO v_factura_compra
  FROM facturas_compra
  WHERE id = NEW.factura_compra_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calcular total de pagos realizados
  SELECT COALESCE(SUM(monto), 0) INTO v_total_pagos
  FROM pagos_proveedor
  WHERE factura_compra_id = NEW.factura_compra_id;

  -- Actualizar estado de la factura según el monto pagado
  IF v_total_pagos >= v_factura_compra.total THEN
    -- Factura pagada completamente
    UPDATE facturas_compra
    SET estado = 'PAGADA',
        saldo_pendiente = 0,
        updated_at = NOW()
    WHERE id = NEW.factura_compra_id
      AND estado != 'PAGADA';

  ELSIF v_total_pagos > 0 THEN
    -- Pago parcial
    UPDATE facturas_compra
    SET estado = 'PARCIAL',
        saldo_pendiente = total - v_total_pagos,
        updated_at = NOW()
    WHERE id = NEW.factura_compra_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER para actualizar estado de factura_compra cuando se registra un pago
DROP TRIGGER IF EXISTS trg_actualizar_estado_factura_on_pago ON pagos_proveedor;

CREATE TRIGGER trg_actualizar_estado_factura_on_pago
AFTER INSERT ON pagos_proveedor
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_factura_compra_on_pago();

-- 6. ACTUALIZAR función de validación para revisar facturas_compra en lugar de facturas_venta
CREATE OR REPLACE FUNCTION tiene_comisiones_pendientes_en_periodo(
  p_empresa_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  hay_pendientes BOOLEAN,
  mensaje TEXT,
  cantidad_pendientes INTEGER,
  cantidad_facturadas_sin_pagar INTEGER,
  cantidad_sin_asiento INTEGER
) AS $$
DECLARE
  v_pendientes INTEGER;
  v_facturadas_sin_pagar INTEGER;
  v_sin_asiento INTEGER;
  v_mensaje TEXT := '';
BEGIN
  -- Contar comisiones pendientes de facturar
  SELECT COUNT(*) INTO v_pendientes
  FROM comisiones_partners
  WHERE empresa_id = p_empresa_id
    AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado_comision = 'pendiente';

  -- Contar comisiones facturadas pero no pagadas
  SELECT COUNT(*) INTO v_facturadas_sin_pagar
  FROM comisiones_partners
  WHERE empresa_id = p_empresa_id
    AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado_comision = 'facturada'
    AND estado_pago = 'pendiente';

  -- Contar facturas de COMPRA sin asiento contable
  SELECT COUNT(*) INTO v_sin_asiento
  FROM comisiones_partners c
  INNER JOIN facturas_compra fc ON fc.id = c.factura_compra_id
  WHERE c.empresa_id = p_empresa_id
    AND c.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND c.estado_comision IN ('facturada', 'pagada')
    AND (fc.asiento_generado IS NULL OR fc.asiento_generado = false);

  -- Construir mensaje
  IF v_pendientes > 0 THEN
    v_mensaje := v_mensaje || v_pendientes::TEXT || ' comisiones pendientes de facturar. ';
  END IF;

  IF v_facturadas_sin_pagar > 0 THEN
    v_mensaje := v_mensaje || v_facturadas_sin_pagar::TEXT || ' comisiones facturadas sin pagar. ';
  END IF;

  IF v_sin_asiento > 0 THEN
    v_mensaje := v_mensaje || v_sin_asiento::TEXT || ' facturas de comisión sin asiento contable. ';
  END IF;

  -- Determinar si hay pendientes
  RETURN QUERY SELECT
    (v_pendientes > 0 OR v_facturadas_sin_pagar > 0 OR v_sin_asiento > 0),
    CASE
      WHEN v_mensaje = '' THEN 'No hay comisiones pendientes'
      ELSE 'ADVERTENCIA: ' || v_mensaje
    END,
    v_pendientes,
    v_facturadas_sin_pagar,
    v_sin_asiento;
END;
$$ LANGUAGE plpgsql;

-- 7. COMENTARIOS
COMMENT ON FUNCTION actualizar_estado_pago_comisiones_desde_factura_compra() IS
  'Actualiza el estado de pago de las comisiones cuando se paga la factura de compra al partner';

COMMENT ON FUNCTION actualizar_estado_factura_compra_on_pago() IS
  'Actualiza el estado de la factura de compra cuando se registra un pago';

COMMENT ON FUNCTION tiene_comisiones_pendientes_en_periodo(UUID, DATE, DATE) IS
  'Valida si hay comisiones pendientes en un periodo antes de cerrar';
