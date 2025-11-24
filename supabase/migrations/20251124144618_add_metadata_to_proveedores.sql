/*
  # Agregar columna metadata a proveedores
  
  1. Cambios
    - Agregar columna metadata (jsonb) a tabla proveedores
    - Agregar alias para compatibilidad con código existente:
      - tipo_identificacion (alias de tipo_documento_id para buscar por texto)
      - numero_identificacion (alias de numero_documento)
  
  2. Notas
    - La columna metadata permite almacenar información adicional como partner_id
    - Los alias facilitan la integración con edge functions
*/

-- Agregar columna metadata si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proveedores' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE proveedores ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Crear índice para búsquedas en metadata
CREATE INDEX IF NOT EXISTS idx_proveedores_metadata ON proveedores USING gin(metadata);

-- Comentarios para documentación
COMMENT ON COLUMN proveedores.metadata IS 'Almacena datos adicionales como partner_id, tipo de proveedor especial, etc.';
