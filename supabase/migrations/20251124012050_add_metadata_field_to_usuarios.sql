/*
  # Agregar campo metadata a usuarios para sincronización externa

  1. Cambios en la tabla usuarios
    - Agregar columna `metadata` (jsonb) para datos adicionales del sistema de autenticación
    - Agregar índice en email para búsquedas rápidas
    - Agregar constraint para validar rol

  2. Seguridad
    - Mantener RLS existente
    - No se modifican políticas de seguridad
*/

-- Agregar columna metadata si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Crear índice en email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Crear índice en metadata para búsquedas en metadata
CREATE INDEX IF NOT EXISTS idx_usuarios_metadata ON usuarios USING gin(metadata);

-- Actualizar constraint de rol si existe
DO $$
BEGIN
  ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
  ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
    CHECK (rol IN ('super_admin', 'admin_empresa', 'contador', 'usuario', 'Administrador', 'Contador', 'Usuario'));
END $$;
