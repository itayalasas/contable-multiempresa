/*
  # Corregir concepto de comisiones como INGRESOS

  ## Concepto CORRECTO del negocio
  - Marketplace vende servicio de $100 → Factura al cliente por $100 (factura_venta_id)  
  - Marketplace se queda con comisión de $10 → INGRESO del marketplace
  - Marketplace le paga $90 al partner → Gasto (factura_compra_id)

  ## Estado de la comisión
  - estado_comision: 'facturada' = Factura de venta generada
  - estado_pago: 'pagada' = Cliente YA PAGÓ la factura (comisión cobrada)

  ## Cambios
  1. Eliminar triggers que actualizaban estado_pago desde facturas_compra  
  2. Crear trigger para actualizar estado_pago cuando se cobra factura_venta
  3. Actualizar validación de cierre para reflejar concepto correcto
*/

-- 1. ELIMINAR triggers incorrectos que usaban facturas_compra
DROP TRIGGER IF EXISTS trg_actualizar_comisiones_on_pago_compra ON facturas_compra;
DROP FUNCTION IF EXISTS actualizar_estado_pago_comisiones_desde_factura_compra();

DROP TRIGGER IF EXISTS trg_actualizar_estado_factura_on_pago ON pagos_proveedor;
DROP FUNCTION IF EXISTS actualizar_estado_factura_compra_on_pago();

-- 2. CREAR función para actualizar estado_pago cuando se cobra del CLIENTE
CREATE OR REPLACE FUNCTION actualizar_estado_pago_comisiones_on_cobro()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si el estado cambió a 'pagada'
  IF NEW.estado = 'pagada' AND (OLD.estado IS NULL OR OLD.estado != 'pagada') THEN

    -- Actualizar todas las comisiones que tienen esta factura de venta
    -- Cuando el cliente paga, la comisión se marca como cobrada (ingreso realizado)
    UPDATE comisiones_partners
    SET
      estado_pago = 'pagada',
      fecha_pagada = NOW(),
      updated_at = NOW()
    WHERE factura_venta_id = NEW.id
      AND estado_pago = 'pendiente';

    -- Log para debugging
    RAISE NOTICE 'Comisiones actualizadas a pagadas (cobradas) para factura de venta: %', NEW.numero_factura;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER en facturas_venta para actualizar comisiones cuando se cobra del cliente
DROP TRIGGER IF EXISTS trg_actualizar_comisiones_on_cobro_cliente ON facturas_venta;

CREATE TRIGGER trg_actualizar_comisiones_on_cobro_cliente
AFTER UPDATE OF estado ON facturas_venta
FOR EACH ROW
WHEN (NEW.estado = 'pagada')
EXECUTE FUNCTION actualizar_estado_pago_comisiones_on_cobro();

-- 4. ELIMINAR y RECREAR función de validación con el concepto correcto
DROP FUNCTION IF EXISTS tiene_comisiones_pendientes_en_periodo(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION tiene_comisiones_pendientes_en_periodo(
  p_empresa_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  hay_pendientes BOOLEAN,
  mensaje TEXT,
  cantidad_pendientes INTEGER,
  cantidad_facturadas_sin_cobrar INTEGER,
  cantidad_sin_asiento INTEGER
) AS $$
DECLARE
  v_pendientes INTEGER;
  v_facturadas_sin_cobrar INTEGER;
  v_sin_asiento INTEGER;
  v_mensaje TEXT := '';
BEGIN
  -- Contar comisiones pendientes de facturar
  SELECT COUNT(*) INTO v_pendientes
  FROM comisiones_partners
  WHERE empresa_id = p_empresa_id
    AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado_comision = 'pendiente';

  -- Contar comisiones facturadas pero no cobradas del cliente
  -- (ingreso no realizado)
  SELECT COUNT(*) INTO v_facturadas_sin_cobrar
  FROM comisiones_partners
  WHERE empresa_id = p_empresa_id
    AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado_comision = 'facturada'
    AND estado_pago = 'pendiente';

  -- Contar facturas de VENTA (al cliente) sin asiento contable
  SELECT COUNT(*) INTO v_sin_asiento
  FROM comisiones_partners c
  INNER JOIN facturas_venta fv ON fv.id = c.factura_venta_id
  WHERE c.empresa_id = p_empresa_id
    AND c.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND c.estado_comision IN ('facturada', 'pagada')
    AND fv.asiento_contable_id IS NULL;

  -- Construir mensaje
  IF v_pendientes > 0 THEN
    v_mensaje := v_mensaje || v_pendientes::TEXT || ' comisiones pendientes de facturar al cliente. ';
  END IF;

  IF v_facturadas_sin_cobrar > 0 THEN
    v_mensaje := v_mensaje || v_facturadas_sin_cobrar::TEXT || ' comisiones facturadas pero no cobradas del cliente (ingreso no realizado). ';
  END IF;

  IF v_sin_asiento > 0 THEN
    v_mensaje := v_mensaje || v_sin_asiento::TEXT || ' facturas de venta sin asiento contable. ';
  END IF;

  -- Determinar si hay pendientes
  RETURN QUERY SELECT
    (v_pendientes > 0 OR v_facturadas_sin_cobrar > 0 OR v_sin_asiento > 0),
    CASE
      WHEN v_mensaje = '' THEN 'No hay comisiones pendientes'
      ELSE 'ADVERTENCIA: ' || v_mensaje
    END,
    v_pendientes,
    v_facturadas_sin_cobrar,
    v_sin_asiento;
END;
$$ LANGUAGE plpgsql;

-- 5. COMENTARIOS
COMMENT ON FUNCTION actualizar_estado_pago_comisiones_on_cobro() IS
  'Actualiza estado_pago de comisiones cuando se COBRA del cliente (ingreso realizado)';

COMMENT ON FUNCTION tiene_comisiones_pendientes_en_periodo(UUID, DATE, DATE) IS
  'Valida comisiones pendientes del periodo. Las comisiones son INGRESOS que se cobran del cliente';

COMMENT ON COLUMN comisiones_partners.estado_pago IS
  'Estado de cobro de la comisión: pendiente = no cobrada del cliente, pagada = ya cobrada (ingreso realizado)';
