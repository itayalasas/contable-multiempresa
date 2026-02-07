/*
  # Recrear vista de cuentas por cobrar
  
  ## Cambios
  - DROP y CREATE para evitar problemas de columnas
  - Usar nombres correctos de columnas
  - Excluir facturas eliminadas
*/

-- Drop y recrear
DROP VIEW IF EXISTS v_cuentas_por_cobrar CASCADE;

CREATE VIEW v_cuentas_por_cobrar AS
SELECT 
  fv.id,
  fv.numero_factura as numero,
  fv.tipo_documento,
  fv.cliente_id,
  c.razon_social as cliente_nombre,
  c.numero_documento as cliente_documento,
  fv.fecha_emision,
  fv.fecha_vencimiento,
  fv.subtotal as monto_subtotal,
  fv.total_iva as monto_impuestos,
  fv.total as monto_total,
  
  -- Calcular pagado desde pagos_cliente
  COALESCE((
    SELECT SUM(pc.monto)
    FROM pagos_cliente pc
    WHERE pc.factura_id = fv.id
      AND pc.eliminado = false
  ), 0) as monto_pagado,
  
  -- Calcular saldo pendiente
  fv.total - COALESCE((
    SELECT SUM(pc.monto)
    FROM pagos_cliente pc
    WHERE pc.factura_id = fv.id
      AND pc.eliminado = false
  ), 0) as saldo_pendiente,
  
  fv.estado,
  fv.moneda,
  fv.empresa_id,
  fv.asiento_contable_id,
  fv.periodo_contable_id as periodo_id,
  
  -- Días de vencimiento
  CASE 
    WHEN fv.estado = 'pagada' THEN 0
    WHEN fv.fecha_vencimiento < CURRENT_DATE THEN 
      (CURRENT_DATE - fv.fecha_vencimiento)::integer
    ELSE 0
  END as dias_vencido,
  
  -- Clasificación de cobranza
  CASE 
    WHEN fv.estado = 'pagada' THEN 'cobrada'
    WHEN fv.fecha_vencimiento >= CURRENT_DATE THEN 'vigente'
    WHEN fv.fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
    WHEN fv.fecha_vencimiento >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
    WHEN fv.fecha_vencimiento >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
    ELSE 'vencida_mas_90'
  END as clasificacion_cobranza,
  
  fv.created_at as fecha_creacion,
  fv.updated_at as fecha_modificacion
FROM facturas_venta fv
INNER JOIN clientes c ON c.id = fv.cliente_id
WHERE fv.eliminado = false
  AND c.activo = true;

COMMENT ON VIEW v_cuentas_por_cobrar IS 
'Vista de cuentas por cobrar con cálculo de saldos (excluye eliminadas)';
