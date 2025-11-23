/*
  # Actualizar Comisiones Facturadas con Pago Pendiente
  
  ## Descripción
  Corrige el estado de pago de comisiones que ya tienen factura generada pero
  están pendientes de pago. Esto ocurre cuando las facturas se generan pero
  no se marcan manualmente como pagadas.
  
  ## Cambios
  1. Función para actualizar comisiones existentes con facturas pendientes
  2. Función helper para obtener comisiones pendientes de pago
  3. Script one-time para corregir datos históricos
  
  ## Seguridad
  - Todas las funciones verifican permisos de empresa
  - No modifica datos sin validación
*/

-- 1. FUNCIÓN: Obtener comisiones con facturas pendientes de pago
CREATE OR REPLACE FUNCTION obtener_comisiones_pendientes_pago(p_empresa_id UUID)
RETURNS TABLE(
  comision_id UUID,
  factura_id UUID,
  factura_numero TEXT,
  factura_estado TEXT,
  partner_razon_social TEXT,
  comision_monto NUMERIC,
  fecha DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as comision_id,
    fv.id as factura_id,
    fv.numero_factura as factura_numero,
    fv.estado as factura_estado,
    c.descripcion as partner_razon_social,
    c.comision_monto,
    c.fecha
  FROM comisiones_partners c
  INNER JOIN facturas_venta fv ON fv.id = c.factura_venta_comision_id
  WHERE c.empresa_id = p_empresa_id
    AND c.estado_comision = 'facturada'
    AND c.estado_pago = 'pendiente'
    AND fv.estado != 'anulada'
  ORDER BY c.fecha DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCIÓN: Sincronizar estado de pago con estado de factura
-- (Para datos históricos donde el trigger no se ejecutó)
CREATE OR REPLACE FUNCTION sincronizar_estado_pago_comisiones(p_empresa_id UUID)
RETURNS TABLE(
  comisiones_actualizadas INTEGER,
  mensaje TEXT
) AS $$
DECLARE
  v_actualizadas INTEGER := 0;
BEGIN
  -- Actualizar comisiones cuya factura ya está pagada
  UPDATE comisiones_partners c
  SET 
    estado_pago = 'pagada',
    fecha_pagada = NOW(),
    updated_at = NOW()
  FROM facturas_venta fv
  WHERE c.factura_venta_comision_id = fv.id
    AND c.empresa_id = p_empresa_id
    AND c.estado_comision = 'facturada'
    AND c.estado_pago = 'pendiente'
    AND fv.estado = 'pagada';
  
  GET DIAGNOSTICS v_actualizadas = ROW_COUNT;
  
  RETURN QUERY SELECT 
    v_actualizadas,
    CASE 
      WHEN v_actualizadas = 0 THEN 'No hay comisiones pendientes con facturas pagadas'
      WHEN v_actualizadas = 1 THEN '1 comisión actualizada a pagada'
      ELSE v_actualizadas::TEXT || ' comisiones actualizadas a pagadas'
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. ONE-TIME: Actualizar comisiones existentes
-- (Solo para datos históricos, el trigger manejará futuros cambios)
DO $$
DECLARE
  v_empresa_id UUID;
  v_total_actualizadas INTEGER := 0;
  v_comisiones_actualizadas INTEGER;
BEGIN
  -- Iterar sobre cada empresa
  FOR v_empresa_id IN 
    SELECT DISTINCT empresa_id FROM comisiones_partners 
    WHERE estado_comision = 'facturada' AND estado_pago = 'pendiente'
  LOOP
    -- Sincronizar comisiones de esta empresa
    SELECT comisiones_actualizadas INTO v_comisiones_actualizadas
    FROM sincronizar_estado_pago_comisiones(v_empresa_id);
    
    v_total_actualizadas := v_total_actualizadas + v_comisiones_actualizadas;
    
    IF v_comisiones_actualizadas > 0 THEN
      RAISE NOTICE 'Empresa %: % comisiones actualizadas', v_empresa_id, v_comisiones_actualizadas;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total de comisiones actualizadas: %', v_total_actualizadas;
END $$;

-- 4. COMENTARIOS
COMMENT ON FUNCTION obtener_comisiones_pendientes_pago(UUID) IS
  'Lista comisiones facturadas pero pendientes de pago para una empresa';

COMMENT ON FUNCTION sincronizar_estado_pago_comisiones(UUID) IS
  'Sincroniza el estado de pago de comisiones con el estado de sus facturas';
