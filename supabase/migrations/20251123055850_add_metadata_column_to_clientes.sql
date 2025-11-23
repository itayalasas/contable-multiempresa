/*
  # Agregar columna metadata a la tabla clientes
  
  ## Descripción
  Agrega una columna jsonb para almacenar metadatos adicionales de clientes,
  especialmente IDs externos de integraciones con sistemas de terceros
  (como customer_id de Dogcatify, etc.)
  
  ## Cambios
  1. Agregar columna `metadata` de tipo JSONB a la tabla `clientes`
  2. Agregar índice GIN para búsquedas eficientes en metadata
  3. Valor por defecto: objeto JSON vacío '{}'
  
  ## Uso
  - Permite almacenar customer_id_externo y otros datos de integraciones
  - Facilita búsqueda de clientes por IDs externos
  - Mantiene flexibilidad para futuros campos
*/

-- Agregar columna metadata a clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN clientes.metadata IS 
      'Metadatos adicionales del cliente, incluye IDs externos de integraciones';
  END IF;
END $$;

-- Crear índice GIN para búsquedas eficientes en metadata
CREATE INDEX IF NOT EXISTS idx_clientes_metadata 
ON clientes USING GIN (metadata);

-- Crear índice específico para customer_id_externo (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_clientes_metadata_customer_id 
ON clientes ((metadata->>'customer_id_externo'));

-- Comentario para documentación
COMMENT ON INDEX idx_clientes_metadata IS
  'Índice GIN para búsquedas eficientes en todos los campos de metadata';

COMMENT ON INDEX idx_clientes_metadata_customer_id IS
  'Índice para búsqueda rápida de clientes por customer_id_externo de integraciones';
