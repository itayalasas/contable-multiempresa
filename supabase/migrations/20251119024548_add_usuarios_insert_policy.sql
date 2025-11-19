/*
  # Agregar Política de Inserción para Usuarios

  ## Cambios
  
  1. Políticas Nuevas
    - Se agrega política para permitir la creación de nuevos usuarios durante el proceso de autenticación
    - Se permite que cualquier usuario autenticado pueda crear su propio registro inicial
    - Se agrega política para que super_admin pueda crear usuarios

  ## Seguridad
  - Los usuarios solo pueden crear su propio registro (usando auth.uid())
  - Super admins pueden crear cualquier usuario
*/

-- Política para permitir que los usuarios creen su propio registro durante el primer login
CREATE POLICY "Usuarios pueden crear su propio registro"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

-- Política para permitir que super admins creen usuarios
CREATE POLICY "Super admin puede crear usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()::text
      AND usuarios.rol = 'super_admin'
    )
  );
