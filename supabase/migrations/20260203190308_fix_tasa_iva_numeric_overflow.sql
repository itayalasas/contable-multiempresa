/*
  # Fix tasa_iva numeric field overflow

  ## Descripción
  Aumenta la precisión del campo tasa_iva en facturas_compra_items
  para evitar errores de overflow cuando se almacenan porcentajes.

  ## Cambios
  1. Cambia `tasa_iva` de NUMERIC(5,4) a NUMERIC(6,2) en facturas_compra_items
     - NUMERIC(6,2) permite valores hasta 9999.99%
     - Suficiente para almacenar tasas de IVA como 22.00, 10.50, etc.

  ## Notas
  - Los datos existentes se mantienen sin cambios
  - Esta corrección permite almacenar tasas de IVA en formato porcentaje (ej: 22 para 22%)
*/

-- Modificar columna tasa_iva para soportar valores de porcentaje más grandes
ALTER TABLE facturas_compra_items
  ALTER COLUMN tasa_iva TYPE NUMERIC(6,2);

-- Actualizar comentario
COMMENT ON COLUMN facturas_compra_items.tasa_iva IS 'Tasa de IVA en porcentaje (ej: 22.00 para 22%)';