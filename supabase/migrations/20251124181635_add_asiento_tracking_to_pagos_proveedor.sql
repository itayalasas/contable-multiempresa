/*
  # Agregar campo de tracking de asiento contable a pagos de proveedores

  1. Cambios
    - Se agrega campo `asiento_contable_id` a la tabla `pagos_proveedor`
    - Permite vincular cada pago con su asiento contable generado
    
  2. Propósito
    - Trazabilidad completa del pago al asiento contable
    - Facilita auditoría y conciliación
*/

-- Agregar campo asiento_contable_id a pagos_proveedor
ALTER TABLE pagos_proveedor 
ADD COLUMN IF NOT EXISTS asiento_contable_id uuid REFERENCES asientos_contables(id) ON DELETE SET NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_asiento 
ON pagos_proveedor(asiento_contable_id);
