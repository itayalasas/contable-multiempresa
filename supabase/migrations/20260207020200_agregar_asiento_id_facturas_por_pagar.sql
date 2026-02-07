/*
  # Agregar tracking de asientos a facturas_por_pagar

  1. Problema
    - Las facturas por pagar no tienen referencia al asiento contable generado
    - Al eliminar una factura, no se puede eliminar su asiento contable

  2. Solución
    - Agregar campo asiento_id a facturas_por_pagar
    - Permitir tracking completo de asientos generados

  3. Nota
    - Este campo debe ser actualizado por las edge functions al generar asientos
*/

-- Agregar campo asiento_id a facturas_por_pagar
ALTER TABLE facturas_por_pagar 
ADD COLUMN IF NOT EXISTS asiento_id uuid REFERENCES asientos_contables(id);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_facturas_por_pagar_asiento_id 
ON facturas_por_pagar(asiento_id) 
WHERE asiento_id IS NOT NULL;

COMMENT ON COLUMN facturas_por_pagar.asiento_id IS 
'Referencia al asiento contable generado para esta factura';
