/*
  # Agregar roles supervisor y admin a la tabla usuarios

  ## Descripción
  Actualiza el constraint de la tabla usuarios para permitir los roles:
  - admin (Administrador)
  - supervisor (Supervisor - puede autorizar operaciones)

  ## Cambios
  - Elimina el constraint antiguo
  - Crea nuevo constraint con todos los roles permitidos
  - Estandariza los roles del sistema
*/

-- Eliminar el constraint antiguo
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Crear nuevo constraint con todos los roles permitidos
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN (
    'super_admin',
    'admin_empresa',
    'admin',
    'supervisor',
    'contador',
    'usuario',
    'Administrador',
    'Supervisor',
    'Contador',
    'Usuario'
  ));

-- Comentario para documentar los roles
COMMENT ON CONSTRAINT usuarios_rol_check ON usuarios IS 'Roles permitidos: admin (Administrador), supervisor (puede autorizar), contador, usuario';
