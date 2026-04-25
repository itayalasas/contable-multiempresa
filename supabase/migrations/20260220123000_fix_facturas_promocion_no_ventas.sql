/*
  # Corregir facturas de promoción para que no impacten ventas contables

  Objetivo:
  - Las facturas de promoción (PROM / factura_promocion_partner) deben usarse para DGI + CxC + wallet,
    pero no deben quedar contabilizadas como ventas.
  - Limpia asientos contables históricos generados por error para estas facturas.
  - Marca las facturas como "asiento gestionado" sin asiento contable asociado,
    igual que el patrón ya usado para facturas automáticas de comisión.
*/

-- 1) Eliminar movimientos contables asociados a asientos de facturas PROM
DELETE FROM movimientos_contables
WHERE asiento_id IN (
  SELECT DISTINCT fv.asiento_contable_id
  FROM facturas_venta fv
  WHERE fv.asiento_contable_id IS NOT NULL
    AND (
      fv.metadata->>'tipo' = 'factura_promocion_partner'
      OR fv.serie = 'PROM'
      OR fv.numero_factura LIKE 'PROM-%'
    )
);

-- 2) Eliminar asientos contables de esas facturas PROM
DELETE FROM asientos_contables
WHERE id IN (
  SELECT DISTINCT fv.asiento_contable_id
  FROM facturas_venta fv
  WHERE fv.asiento_contable_id IS NOT NULL
    AND (
      fv.metadata->>'tipo' = 'factura_promocion_partner'
      OR fv.serie = 'PROM'
      OR fv.numero_factura LIKE 'PROM-%'
    )
);

-- 3) Normalizar flags de asiento en facturas PROM
UPDATE facturas_venta
SET
  asiento_generado = true,
  asiento_contable_id = NULL,
  asiento_error = NULL,
  updated_at = now()
WHERE
  (
    metadata->>'tipo' = 'factura_promocion_partner'
    OR serie = 'PROM'
    OR numero_factura LIKE 'PROM-%'
  )
  AND COALESCE(eliminado, false) = false;
