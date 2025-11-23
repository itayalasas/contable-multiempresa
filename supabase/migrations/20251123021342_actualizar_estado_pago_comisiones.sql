/*
  # Actualizar Estado de Pago de Comisiones cuando se Pague Factura

  ## Descripción
  Cuando una factura de venta (que es una factura de comisión a un partner) se marca como pagada,
  todas las comisiones asociadas deben actualizar su estado de pago a 'pagada'.

  ## Cambios
  1. Función para actualizar estado_pago de comisiones
  2. Trigger en facturas_venta que se ejecuta cuando el estado cambia a 'pagada'
  3. Función de validación para cierre de periodo que verifica comisiones pendientes

  ## Validación para Cierre de Periodo
  No se puede cerrar un periodo si existen:
  - Comisiones pendientes de generar factura (estado_comision = 'pendiente')
  - Comisiones facturadas pero no pagadas (estado_comision = 'facturada' AND estado_pago = 'pendiente')
  - Facturas de comisión sin asiento contable
*/

-- 1. FUNCIÓN: Actualizar estado de pago de comisiones cuando se paga la factura
CREATE OR REPLACE FUNCTION actualizar_estado_pago_comisiones_on_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'pagada'
  IF NEW.estado = 'pagada' AND (OLD.estado IS NULL OR OLD.estado != 'pagada') THEN

    -- Actualizar todas las comisiones que tienen esta factura como factura_venta_comision_id
    UPDATE comisiones_partners
    SET
      estado_pago = 'pagada',
      fecha_pagada = NOW(),
      updated_at = NOW()
    WHERE factura_venta_comision_id = NEW.id
      AND estado_pago = 'pendiente';

    -- Log para debugging
    RAISE NOTICE 'Comisiones actualizadas a pagadas para factura: %', NEW.numero_factura;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER: Ejecutar después de update en facturas_venta
DROP TRIGGER IF EXISTS trg_actualizar_pago_comisiones ON facturas_venta;

CREATE TRIGGER trg_actualizar_pago_comisiones
AFTER UPDATE OF estado ON facturas_venta
FOR EACH ROW
WHEN (NEW.estado = 'pagada')
EXECUTE FUNCTION actualizar_estado_pago_comisiones_on_pago();

-- 3. FUNCIÓN: Validar si hay comisiones pendientes en un periodo
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

  -- Contar facturas de comisión sin asiento contable
  SELECT COUNT(*) INTO v_sin_asiento
  FROM comisiones_partners c
  INNER JOIN facturas_venta fv ON fv.id = c.factura_venta_comision_id
  WHERE c.empresa_id = p_empresa_id
    AND c.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND c.estado_comision IN ('facturada', 'pagada')
    AND fv.asiento_contable_id IS NULL;

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

-- 4. COMENTARIOS
COMMENT ON FUNCTION actualizar_estado_pago_comisiones_on_pago() IS
  'Actualiza el estado de pago de las comisiones cuando se paga la factura de comisión';

COMMENT ON FUNCTION tiene_comisiones_pendientes_en_periodo(UUID, DATE, DATE) IS
  'Valida si hay comisiones pendientes en un periodo antes de cerrar';
