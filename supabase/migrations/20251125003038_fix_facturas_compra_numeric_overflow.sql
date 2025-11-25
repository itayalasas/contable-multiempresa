/*
  # Fix numeric field overflow en facturas_compra

  ## Descripción
  Aumenta la precisión de los campos de porcentaje en facturas_compra
  para evitar errores de overflow cuando los valores son muy grandes.

  ## Cambios
  1. Cambia `comision_sistema_porcentaje` de NUMERIC(5,2) a NUMERIC(8,4)
  2. Cambia `retencion_porcentaje` de NUMERIC(5,2) a NUMERIC(8,4)

  ## Notas
  - NUMERIC(8,4) permite valores hasta 9999.9999%
  - Esto es suficiente para cualquier cálculo de porcentaje realista
  - Los datos existentes se mantienen sin cambios
*/

-- Modificar columnas para soportar valores más grandes
ALTER TABLE facturas_compra 
  ALTER COLUMN comision_sistema_porcentaje TYPE NUMERIC(8,4);

ALTER TABLE facturas_compra 
  ALTER COLUMN retencion_porcentaje TYPE NUMERIC(8,4);

-- Actualizar comentarios
COMMENT ON COLUMN facturas_compra.comision_sistema_porcentaje IS 'Porcentaje de comisión que se queda el sistema (máx 9999.9999%)';
COMMENT ON COLUMN facturas_compra.retencion_porcentaje IS 'Porcentaje de retención aplicada (máx 9999.9999%)';
