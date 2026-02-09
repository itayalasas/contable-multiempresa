/*
  # Ajustar Cuentas por Cobrar para incluir Notas de Crédito

  - Suma notas de crédito por factura (totales negativos)
  - Ajusta montos y saldo pendiente en la vista v_cuentas_por_cobrar
*/

DROP VIEW IF EXISTS v_cuentas_por_cobrar;

CREATE VIEW v_cuentas_por_cobrar AS
WITH notas_credito_totales AS (
  SELECT
    factura_referencia_id,
    SUM(subtotal) AS subtotal_nc,
    SUM(total_iva) AS total_iva_nc,
    SUM(total) AS total_nc
  FROM notas_credito
  GROUP BY factura_referencia_id
),
pagos_totales AS (
  SELECT
    factura_id,
    SUM(monto) AS monto_pagado
  FROM pagos_cliente
  GROUP BY factura_id
)
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
  fv.subtotal + COALESCE(nc.subtotal_nc, 0) as monto_subtotal,
  fv.total_iva + COALESCE(nc.total_iva_nc, 0) as monto_impuestos,
  fv.total + COALESCE(nc.total_nc, 0) as monto_total,
  COALESCE(nc.total_nc, 0) as monto_notas_credito,
  COALESCE(pt.monto_pagado, 0) as monto_pagado,
  (fv.total + COALESCE(nc.total_nc, 0)) - COALESCE(pt.monto_pagado, 0) as saldo_pendiente,
  CASE
    WHEN fv.estado = 'anulada' THEN 'ANULADA'
    WHEN fv.eliminado = true THEN 'ELIMINADA'
    WHEN (fv.total + COALESCE(nc.total_nc, 0)) - COALESCE(pt.monto_pagado, 0) <= 0 THEN 'PAGADA'
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
  CASE
    WHEN fv.metadata->>'tipo' = 'factura_comisiones_partner' THEN true
    WHEN fv.serie = 'COM' THEN true
    ELSE false
  END as es_factura_comision,
  CASE
    WHEN fv.metadata->>'origen_marketplace' = 'true' THEN true
    ELSE false
  END as es_marketplace_automatico,
  CASE
    WHEN fv.fecha_vencimiento < CURRENT_DATE AND fv.estado != 'pagada'
    THEN CURRENT_DATE - fv.fecha_vencimiento
    ELSE 0
  END as dias_vencimiento
FROM facturas_venta fv
LEFT JOIN clientes c ON c.id = fv.cliente_id
LEFT JOIN notas_credito_totales nc ON nc.factura_referencia_id = fv.id
LEFT JOIN pagos_totales pt ON pt.factura_id = fv.id
WHERE fv.cliente_id IS NOT NULL
  AND fv.eliminado = false
  AND (
    (fv.serie = 'COM' AND fv.metadata->>'tipo' = 'factura_comisiones_partner')
    OR
    (
      fv.metadata->>'origen_marketplace' != 'true'
      AND (
        fv.estado = 'pendiente'
        OR (fv.total + COALESCE(nc.total_nc, 0)) > COALESCE(pt.monto_pagado, 0)
      )
    )
  );

GRANT SELECT ON v_cuentas_por_cobrar TO authenticated, anon;

COMMENT ON VIEW v_cuentas_por_cobrar IS
  'Vista de cuentas por cobrar. Ajusta saldos por notas de crédito e incluye facturas de comisión (COM-).';
