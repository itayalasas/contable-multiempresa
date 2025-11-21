/*
  # Agregar columna codigo a facturas_venta_items

  1. Cambios
    - Agregar columna `codigo` a la tabla `facturas_venta_items`
    - Tipo: text
    - Nullable: permite NULL para facturas existentes
    - Almacena el SKU o código del producto/servicio

  2. Notas
    - Esta columna permite identificar el producto/servicio vendido
    - Es útil para reportes y análisis de ventas por producto
*/

-- Agregar columna codigo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_venta_items' AND column_name = 'codigo'
  ) THEN
    ALTER TABLE facturas_venta_items 
    ADD COLUMN codigo text;
  END IF;
END $$;
