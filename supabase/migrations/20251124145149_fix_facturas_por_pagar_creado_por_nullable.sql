/*
  # Hacer creado_por nullable en facturas_por_pagar
  
  1. Cambios
    - Eliminar la restricción de clave foránea creado_por -> usuarios
    - Hacer el campo creado_por nullable
    - Agregar el campo de nuevo pero nullable para procesos automáticos
  
  2. Razón
    - Los procesos automáticos (edge functions) necesitan crear registros
    - No siempre hay un usuario autenticado al crear desde un proceso del sistema
    - Se permite null para indicar que fue creado por el sistema
*/

-- Eliminar la restricción de clave foránea existente
ALTER TABLE facturas_por_pagar 
DROP CONSTRAINT IF EXISTS facturas_por_pagar_creado_por_fkey;

-- Hacer el campo nullable
ALTER TABLE facturas_por_pagar 
ALTER COLUMN creado_por DROP NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN facturas_por_pagar.creado_por IS 'ID del usuario que creó el registro. NULL indica que fue creado por el sistema.';
