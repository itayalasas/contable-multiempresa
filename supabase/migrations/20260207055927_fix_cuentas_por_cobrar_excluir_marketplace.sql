/*
  # Corregir Vista de Cuentas por Cobrar - Excluir Facturas de Marketplace Pagadas

  ## Problema
  Las facturas del marketplace que llegan pagadas automáticamente (via webhook)
  están apareciendo en Cuentas por Cobrar, pero NO deberían porque:
  1. Ya están pagadas por el cliente
  2. Ya tienen registro de pago en pagos_cliente
  3. Solo las facturas de COMISIONES (COM-) deben estar en CxC

  ## Solución
  Modificar la vista para EXCLUIR:
  - Facturas con pagos registrados y saldo pendiente = 0
  - O facturas que tienen origen marketplace automático y están pagadas
*/

-- Eliminar la vista existente
DROP VIEW IF EXISTS v_cuentas_por_cobrar;

-- Recrear la vista de cuentas por cobrar
CREATE VIEW v_cuentas_por_cobrar AS
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
  -- Calcular monto pagado desde pagos_cliente
  COALESCE((
    SELECT SUM(pc.monto)
    FROM pagos_cliente pc
    WHERE pc.factura_id = fv.id
  ), 0) as monto_pagado,
  -- Calcular saldo pendiente
  fv.total - COALESCE((
    SELECT SUM(pc.monto)
    FROM pagos_cliente pc
    WHERE pc.factura_id = fv.id
  ), 0) as saldo_pendiente,
  -- Estado de CxC
  CASE
    WHEN fv.estado = 'anulada' THEN 'ANULADA'
    WHEN fv.eliminado = true THEN 'ELIMINADA'
    WHEN fv.total - COALESCE((SELECT SUM(pc.monto) FROM pagos_cliente pc WHERE pc.factura_id = fv.id), 0) <= 0 THEN 'PAGADA'
    WHEN fv.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDA'
    ELSE 'PENDIENTE'
  END as estado_cxc,
  fv.estado as estado_factura,
  fv.moneda,
  fv.observaciones,
  fv.metadata,
  fv.created_by,
  fv.created_at as fecha_creacion,
  fv.updated_at as fecha_modificacion,
  fv.eliminado,
  -- Indicador si es factura de comisión
  CASE
    WHEN fv.metadata->>'tipo' = 'factura_comisiones_partner' THEN true
    WHEN fv.serie = 'COM' THEN true
    ELSE false
  END as es_factura_comision,
  -- Indicador si es del marketplace automático
  CASE
    WHEN fv.metadata->>'origen_marketplace' = 'true' THEN true
    ELSE false
  END as es_marketplace_automatico,
  -- Días de vencimiento
  CASE
    WHEN fv.fecha_vencimiento < CURRENT_DATE AND fv.estado != 'pagada'
    THEN CURRENT_DATE - fv.fecha_vencimiento
    ELSE 0
  END as dias_vencimiento
FROM facturas_venta fv
LEFT JOIN clientes c ON c.id = fv.cliente_id
WHERE fv.cliente_id IS NOT NULL
  AND fv.eliminado = false
  AND (
    -- INCLUIR: Facturas de comisión (serie COM) SIEMPRE (aunque estén pagadas)
    (fv.serie = 'COM' AND fv.metadata->>'tipo' = 'factura_comisiones_partner')
    OR
    -- INCLUIR: Facturas pendientes o con saldo pendiente
    -- EXCLUIR: Facturas de marketplace pagadas automáticamente
    (
      fv.metadata->>'origen_marketplace' != 'true'
      AND (
        fv.estado = 'pendiente'
        OR fv.total > COALESCE((SELECT SUM(pc.monto) FROM pagos_cliente pc WHERE pc.factura_id = fv.id), 0)
      )
    )
  );

-- Recrear permisos
GRANT SELECT ON v_cuentas_por_cobrar TO authenticated, anon;

-- Comentario actualizado
COMMENT ON VIEW v_cuentas_por_cobrar IS
  'Vista de cuentas por cobrar. Excluye facturas de marketplace pagadas automáticamente. Incluye facturas de comisión (COM-) para visibilidad.';
