/*
  # Agregar columna descuento a facturas_venta

  1. Cambios
    - Agregar columna `descuento` a la tabla `facturas_venta`
    - Tipo: numeric(12,2)
    - Por defecto: 0.00
    - Permite manejar descuentos en las facturas

  2. Notas
    - La columna no es nullable y tiene valor por defecto 0
    - Esto permite compatibilidad con facturas existentes
*/

-- Agregar columna descuento si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_venta' AND column_name = 'descuento'
  ) THEN
    ALTER TABLE facturas_venta 
    ADD COLUMN descuento numeric(12,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;
