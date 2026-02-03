/*
  # Vista de Cuentas por Pagar desde Facturas por Pagar
  
  ## Descripción
  Crea una vista que expone las facturas por pagar como cuentas por pagar,
  permitiendo que el módulo de "Cuentas por Pagar" gestione los pagos y
  muestre información centralizada de las obligaciones con proveedores.
  
  ## Componentes
  1. Vista para listar cuentas por pagar con datos de proveedores
  2. Función para obtener resumen de CxP
  3. Función para obtener facturas próximas a vencer
  
  ## Notas Importantes
  - Esta vista es compatible con la estructura esperada en el código del frontend
  - Los estados se mapean a formato estándar (PENDIENTE, PAGADA, VENCIDA, ANULADA)
  - Se calcula días de vencimiento para alertas
*/

-- 1. VISTA: Cuentas por Pagar (desde facturas_por_pagar)
CREATE OR REPLACE VIEW v_cuentas_por_pagar AS
SELECT 
  fp.id,
  fp.empresa_id,
  fp.numero as numero_documento,
  fp.tipo_documento,
  fp.fecha_emision,
  fp.fecha_vencimiento,
  fp.proveedor_id,
  p.razon_social as proveedor_nombre,
  p.numero_documento as proveedor_documento,
  fp.monto_subtotal,
  fp.monto_impuestos,
  fp.monto_total,
  fp.monto_pagado,
  fp.saldo_pendiente,
  fp.estado as estado_cxp,
  fp.moneda,
  fp.observaciones,
  fp.referencia,
  fp.creado_por,
  fp.fecha_creacion,
  fp.fecha_modificacion,
  -- Días de vencimiento
  CASE 
    WHEN fp.fecha_vencimiento < CURRENT_DATE AND fp.estado NOT IN ('PAGADA', 'ANULADA')
    THEN CURRENT_DATE - fp.fecha_vencimiento
    ELSE 0
  END as dias_vencimiento,
  -- Indicador si está vencida
  CASE 
    WHEN fp.fecha_vencimiento < CURRENT_DATE AND fp.estado NOT IN ('PAGADA', 'ANULADA')
    THEN true
    ELSE false
  END as esta_vencida
FROM facturas_por_pagar fp
LEFT JOIN proveedores p ON p.id = fp.proveedor_id
WHERE fp.estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA');

-- 2. FUNCIÓN: Obtener resumen de cuentas por pagar
CREATE OR REPLACE FUNCTION obtener_resumen_cxp(p_empresa_id UUID)
RETURNS TABLE(
  total_pendiente NUMERIC,
  total_vencido NUMERIC,
  total_pagado_mes NUMERIC,
  cantidad_pendiente BIGINT,
  cantidad_vencida BIGINT,
  cantidad_pagada_mes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total pendiente
    COALESCE(SUM(CASE WHEN estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDA') THEN saldo_pendiente ELSE 0 END), 0) as total_pendiente,
    -- Total vencido
    COALESCE(SUM(CASE 
      WHEN estado IN ('PENDIENTE', 'PARCIAL') AND fecha_vencimiento < CURRENT_DATE 
      THEN saldo_pendiente ELSE 0 
    END), 0) as total_vencido,
    -- Total pagado este mes
    COALESCE(SUM(CASE 
      WHEN estado = 'PAGADA' AND DATE_TRUNC('month', fecha_modificacion) = DATE_TRUNC('month', CURRENT_DATE)
      THEN monto_total ELSE 0 
    END), 0) as total_pagado_mes,
    -- Cantidad pendiente
    COUNT(CASE WHEN estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDA') THEN 1 END) as cantidad_pendiente,
    -- Cantidad vencida
    COUNT(CASE 
      WHEN estado IN ('PENDIENTE', 'PARCIAL') AND fecha_vencimiento < CURRENT_DATE 
      THEN 1 
    END) as cantidad_vencida,
    -- Cantidad pagada este mes
    COUNT(CASE 
      WHEN estado = 'PAGADA' AND DATE_TRUNC('month', fecha_modificacion) = DATE_TRUNC('month', CURRENT_DATE)
      THEN 1 
    END) as cantidad_pagada_mes
  FROM facturas_por_pagar
  WHERE empresa_id = p_empresa_id;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN: Obtener facturas próximas a vencer
CREATE OR REPLACE FUNCTION obtener_facturas_pagar_por_vencer(
  p_empresa_id UUID,
  p_dias_anticipacion INTEGER DEFAULT 7
)
RETURNS TABLE(
  factura_id UUID,
  numero_factura TEXT,
  proveedor_nombre TEXT,
  monto_pendiente NUMERIC,
  fecha_vencimiento DATE,
  dias_restantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id as factura_id,
    fp.numero as numero_factura,
    p.razon_social as proveedor_nombre,
    fp.saldo_pendiente as monto_pendiente,
    fp.fecha_vencimiento,
    (fp.fecha_vencimiento - CURRENT_DATE) as dias_restantes
  FROM facturas_por_pagar fp
  LEFT JOIN proveedores p ON p.id = fp.proveedor_id
  WHERE fp.empresa_id = p_empresa_id
    AND fp.estado IN ('PENDIENTE', 'PARCIAL')
    AND fp.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_dias_anticipacion)
  ORDER BY fp.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql;

-- 4. PERMISOS: Permitir acceso a la vista
GRANT SELECT ON v_cuentas_por_pagar TO authenticated, anon, service_role;

-- 5. COMENTARIOS
COMMENT ON VIEW v_cuentas_por_pagar IS
  'Vista que expone facturas por pagar como cuentas por pagar para el módulo de finanzas';

COMMENT ON FUNCTION obtener_resumen_cxp(UUID) IS
  'Obtiene un resumen de cuentas por pagar para el dashboard de una empresa';

COMMENT ON FUNCTION obtener_facturas_pagar_por_vencer(UUID, INTEGER) IS
  'Lista facturas por pagar que están próximas a vencer en los próximos N días';
