/*
  # Actualizar vista v_cuentas_por_pagar - Agregar campo eliminado
  
  ## Problema
  La vista v_cuentas_por_pagar no incluía el campo eliminado, causando error:
  "column eliminado does not exist" cuando el frontend filtra por ese campo.
  
  ## Solución
  Recrear la vista incluyendo:
  - El campo eliminado de la tabla facturas_por_pagar
  - Filtrar automáticamente los registros eliminados en la vista
  
  ## Cambios
  - DROP y CREATE de la vista v_cuentas_por_pagar
  - Agregar columnas fp.eliminado y fp.fecha_eliminacion al SELECT
  - Agregar WHERE fp.eliminado = false o IS NULL al final
*/

-- =====================================================
-- Recrear vista de cuentas por pagar con campo eliminado
-- =====================================================
DROP VIEW IF EXISTS v_cuentas_por_pagar CASCADE;

CREATE VIEW v_cuentas_por_pagar AS
SELECT 
  fp.id,
  fp.empresa_id,
  fp.numero AS numero_documento,
  fp.tipo_documento,
  fp.fecha_emision,
  fp.fecha_vencimiento,
  fp.proveedor_id,
  p.razon_social AS proveedor_nombre,
  p.numero_documento AS proveedor_documento,
  fp.monto_subtotal,
  fp.monto_impuestos,
  fp.monto_total,
  fp.monto_pagado,
  fp.saldo_pendiente,
  fp.estado AS estado_cxp,
  fp.moneda,
  fp.observaciones,
  fp.referencia,
  fp.creado_por,
  fp.fecha_creacion,
  fp.fecha_modificacion,
  fp.eliminado,
  fp.fecha_eliminacion,
  
  -- Calcular días de vencimiento
  CASE
    WHEN fp.fecha_vencimiento < CURRENT_DATE 
      AND fp.estado NOT IN ('PAGADA', 'ANULADA')
    THEN CURRENT_DATE - fp.fecha_vencimiento
    ELSE 0
  END AS dias_vencimiento,
  
  -- Indicar si está vencida
  CASE
    WHEN fp.fecha_vencimiento < CURRENT_DATE 
      AND fp.estado NOT IN ('PAGADA', 'ANULADA')
    THEN true
    ELSE false
  END AS esta_vencida
  
FROM facturas_por_pagar fp
LEFT JOIN proveedores p ON p.id = fp.proveedor_id
WHERE fp.estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA')
  AND (fp.eliminado IS NULL OR fp.eliminado = false);

-- Comentario descriptivo
COMMENT ON VIEW v_cuentas_por_pagar IS 
'Vista consolidada de cuentas por pagar con información del proveedor. Filtra automáticamente registros eliminados.';
