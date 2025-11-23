/*
  # Vista de Cuentas por Cobrar desde Facturas de Venta
  
  ## Descripción
  Crea una vista que expone las facturas de venta como cuentas por cobrar,
  permitiendo que el módulo de "Cuentas por Cobrar" gestione los pagos y
  actualice automáticamente el estado de las facturas.
  
  ## Flujo de Trabajo
  1. Vista `v_cuentas_por_cobrar` muestra facturas pendientes y pagadas
  2. Función `registrar_pago_factura` permite registrar pagos desde módulo CxC
  3. Al marcar como pagada, dispara triggers existentes (comisiones, asientos, etc.)
  
  ## Componentes
  1. Vista para listar cuentas por cobrar
  2. Función para registrar pago
  3. Función para obtener resumen de CxC
*/

-- 1. VISTA: Cuentas por Cobrar (desde facturas_venta)
CREATE OR REPLACE VIEW v_cuentas_por_cobrar AS
SELECT 
  fv.id,
  fv.empresa_id,
  fv.numero_factura as numero_documento,
  fv.serie,
  fv.tipo_documento,
  fv.fecha_emision,
  fv.fecha_vencimiento,
  fv.cliente_id,
  c.razon_social as cliente_nombre,
  c.numero_documento as cliente_documento,
  fv.subtotal as monto_subtotal,
  fv.total_iva as monto_impuestos,
  fv.total as monto_total,
  CASE 
    WHEN fv.estado = 'pagada' THEN fv.total
    ELSE 0
  END as monto_pagado,
  CASE 
    WHEN fv.estado = 'pagada' THEN 0
    ELSE fv.total
  END as saldo_pendiente,
  CASE 
    WHEN fv.estado = 'anulada' THEN 'ANULADA'
    WHEN fv.estado = 'pagada' THEN 'PAGADA'
    WHEN fv.fecha_vencimiento < CURRENT_DATE AND fv.estado != 'pagada' THEN 'VENCIDA'
    WHEN fv.estado = 'pendiente' THEN 'PENDIENTE'
    ELSE 'PENDIENTE'
  END as estado_cxc,
  fv.estado as estado_factura,
  fv.moneda,
  fv.observaciones,
  fv.metadata,
  fv.created_by,
  fv.created_at as fecha_creacion,
  fv.updated_at as fecha_modificacion,
  -- Indicador si es factura de comisión
  CASE 
    WHEN fv.metadata->>'tipo' = 'factura_comisiones_partner' THEN true
    ELSE false
  END as es_factura_comision,
  -- Días de vencimiento
  CASE 
    WHEN fv.fecha_vencimiento < CURRENT_DATE AND fv.estado != 'pagada'
    THEN CURRENT_DATE - fv.fecha_vencimiento
    ELSE 0
  END as dias_vencimiento
FROM facturas_venta fv
LEFT JOIN clientes c ON c.id = fv.cliente_id
WHERE fv.estado IN ('pendiente', 'pagada', 'anulada')
  AND fv.cliente_id IS NOT NULL;

-- 2. FUNCIÓN: Registrar pago de factura
CREATE OR REPLACE FUNCTION registrar_pago_factura(
  p_factura_id UUID,
  p_monto_pago NUMERIC,
  p_fecha_pago DATE DEFAULT CURRENT_DATE,
  p_metodo_pago TEXT DEFAULT 'EFECTIVO',
  p_referencia TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_usuario_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  mensaje TEXT,
  factura_actualizada BOOLEAN,
  comisiones_actualizadas INTEGER
) AS $$
DECLARE
  v_factura RECORD;
  v_comisiones_actualizadas INTEGER := 0;
BEGIN
  -- Obtener factura
  SELECT * INTO v_factura
  FROM facturas_venta
  WHERE id = p_factura_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Factura no encontrada', false, 0;
    RETURN;
  END IF;
  
  -- Verificar que no esté ya pagada
  IF v_factura.estado = 'pagada' THEN
    RETURN QUERY SELECT false, 'La factura ya está marcada como pagada', false, 0;
    RETURN;
  END IF;
  
  -- Verificar monto
  IF p_monto_pago < v_factura.total THEN
    RETURN QUERY SELECT 
      false, 
      'El monto del pago (' || p_monto_pago || ') es menor al total de la factura (' || v_factura.total || ')', 
      false, 
      0;
    RETURN;
  END IF;
  
  -- Actualizar factura a pagada
  UPDATE facturas_venta
  SET 
    estado = 'pagada',
    updated_at = NOW(),
    observaciones = CASE 
      WHEN p_observaciones IS NOT NULL 
      THEN COALESCE(observaciones, '') || ' | Pago registrado: ' || p_observaciones
      ELSE observaciones
    END
  WHERE id = p_factura_id;
  
  -- El trigger trg_actualizar_pago_comisiones actualizará las comisiones automáticamente
  -- Contar comisiones actualizadas
  SELECT COUNT(*) INTO v_comisiones_actualizadas
  FROM comisiones_partners
  WHERE factura_venta_comision_id = p_factura_id
    AND estado_pago = 'pagada';
  
  RETURN QUERY SELECT 
    true, 
    'Pago registrado exitosamente para factura ' || v_factura.numero_factura,
    true,
    v_comisiones_actualizadas;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN: Obtener resumen de cuentas por cobrar
CREATE OR REPLACE FUNCTION obtener_resumen_cxc(p_empresa_id UUID)
RETURNS TABLE(
  total_pendiente NUMERIC,
  total_vencido NUMERIC,
  total_cobrado_mes NUMERIC,
  cantidad_pendiente BIGINT,
  cantidad_vencida BIGINT,
  cantidad_cobrada_mes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total pendiente
    COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END), 0) as total_pendiente,
    -- Total vencido
    COALESCE(SUM(CASE 
      WHEN estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE 
      THEN total ELSE 0 
    END), 0) as total_vencido,
    -- Total cobrado este mes
    COALESCE(SUM(CASE 
      WHEN estado = 'pagada' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
      THEN total ELSE 0 
    END), 0) as total_cobrado_mes,
    -- Cantidad pendiente
    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as cantidad_pendiente,
    -- Cantidad vencida
    COUNT(CASE 
      WHEN estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE 
      THEN 1 
    END) as cantidad_vencida,
    -- Cantidad cobrada este mes
    COUNT(CASE 
      WHEN estado = 'pagada' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
      THEN 1 
    END) as cantidad_cobrada_mes
  FROM facturas_venta
  WHERE empresa_id = p_empresa_id
    AND cliente_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN: Obtener facturas próximas a vencer
CREATE OR REPLACE FUNCTION obtener_facturas_por_vencer(
  p_empresa_id UUID,
  p_dias_anticipacion INTEGER DEFAULT 7
)
RETURNS TABLE(
  factura_id UUID,
  numero_factura TEXT,
  cliente_nombre TEXT,
  monto_total NUMERIC,
  fecha_vencimiento DATE,
  dias_restantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fv.id as factura_id,
    fv.numero_factura,
    c.razon_social as cliente_nombre,
    fv.total as monto_total,
    fv.fecha_vencimiento,
    (fv.fecha_vencimiento - CURRENT_DATE) as dias_restantes
  FROM facturas_venta fv
  LEFT JOIN clientes c ON c.id = fv.cliente_id
  WHERE fv.empresa_id = p_empresa_id
    AND fv.estado = 'pendiente'
    AND fv.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_dias_anticipacion)
  ORDER BY fv.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. PERMISOS: Permitir acceso a la vista
GRANT SELECT ON v_cuentas_por_cobrar TO authenticated, anon;

-- 6. COMENTARIOS
COMMENT ON VIEW v_cuentas_por_cobrar IS
  'Vista que expone facturas de venta como cuentas por cobrar para el módulo de finanzas';

COMMENT ON FUNCTION registrar_pago_factura(UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) IS
  'Registra un pago y actualiza el estado de la factura a pagada, disparando triggers de comisiones y asientos';

COMMENT ON FUNCTION obtener_resumen_cxc(UUID) IS
  'Obtiene un resumen de cuentas por cobrar para el dashboard de una empresa';

COMMENT ON FUNCTION obtener_facturas_por_vencer(UUID, INTEGER) IS
  'Lista facturas que están próximas a vencer en los próximos N días';
