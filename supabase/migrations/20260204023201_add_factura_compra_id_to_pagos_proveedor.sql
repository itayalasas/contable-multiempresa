/*
  # Agregar soporte para pagos de facturas_compra

  ## Cambios
  1. Agregar columna factura_compra_id a pagos_proveedor
  2. Hacer factura_id opcional (puede ser NULL si se usa factura_compra_id)
  3. Agregar constraint para asegurar que al menos uno esté presente

  ## Propósito
  Permitir que pagos_proveedor pueda referenciar tanto:
  - facturas_por_pagar (factura_id) - para proveedores normales
  - facturas_compra (factura_compra_id) - para comisiones de partners
*/

-- 1. Agregar columna factura_compra_id
ALTER TABLE pagos_proveedor
ADD COLUMN IF NOT EXISTS factura_compra_id UUID REFERENCES facturas_compra(id) ON DELETE CASCADE;

-- 2. Hacer factura_id nullable (puede ser NULL si se usa factura_compra_id)
ALTER TABLE pagos_proveedor
ALTER COLUMN factura_id DROP NOT NULL;

-- 3. Agregar constraint para asegurar que al menos uno esté presente
ALTER TABLE pagos_proveedor
DROP CONSTRAINT IF EXISTS chk_factura_id_required;

ALTER TABLE pagos_proveedor
ADD CONSTRAINT chk_factura_id_required
CHECK (
  (factura_id IS NOT NULL AND factura_compra_id IS NULL) OR
  (factura_id IS NULL AND factura_compra_id IS NOT NULL)
);

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_factura_compra
ON pagos_proveedor(factura_compra_id);

COMMENT ON COLUMN pagos_proveedor.factura_compra_id IS
  'Referencia a facturas_compra (para comisiones de partners). Mutuamente excluyente con factura_id';
