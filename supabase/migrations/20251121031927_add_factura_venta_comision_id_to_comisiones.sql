/*
  # Agregar campo factura_venta_comision_id a comisiones_partners

  1. Cambios
    - Agregar columna factura_venta_comision_id a comisiones_partners
    - Esta columna vincula la comisión con la factura de venta generada
    - Permite rastrear qué facturas se generaron para las comisiones
*/

-- Agregar columna si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comisiones_partners' AND column_name = 'factura_venta_comision_id'
  ) THEN
    ALTER TABLE comisiones_partners 
    ADD COLUMN factura_venta_comision_id uuid REFERENCES facturas_venta(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_comisiones_partners_factura_venta_comision 
    ON comisiones_partners(factura_venta_comision_id);
  END IF;
END $$;
