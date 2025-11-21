/*
  # Agregar campo activa a empresas_config_cfe
  
  1. Cambios
    - Agregar columna `activa` (boolean) a la tabla empresas_config_cfe
    - Valor por defecto: true
    - Actualizar registros existentes a true
*/

-- Agregar columna activa
ALTER TABLE empresas_config_cfe 
ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true;

-- Actualizar registros existentes
UPDATE empresas_config_cfe SET activa = true WHERE activa IS NULL;
