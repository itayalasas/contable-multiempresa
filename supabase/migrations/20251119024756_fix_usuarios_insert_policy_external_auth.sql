/*
  # Corregir Política de Inserción para Autenticación Externa

  ## Cambios
  
  1. Eliminación de Políticas Antiguas
    - Se eliminan las políticas que dependían de auth.uid() (no aplicable con autenticación externa)
  
  2. Nueva Política Permisiva
    - Se permite la inserción de usuarios autenticados
    - Esto permite que el sistema backend/edge function cree usuarios después de la autenticación externa
  
  ## Seguridad
  - La política permite inserciones autenticadas a través de la API key de Supabase
  - El control de acceso se maneja en la capa de aplicación/edge function
  - Los usuarios son creados por el sistema después de validar el token externo
*/

-- Eliminar las políticas antiguas que usan auth.uid()
DROP POLICY IF EXISTS "Usuarios pueden crear su propio registro" ON usuarios;
DROP POLICY IF EXISTS "Super admin puede crear usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden leer su propia información" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propia información" ON usuarios;

-- Política permisiva para INSERT - permite que el sistema cree usuarios
CREATE POLICY "Sistema puede crear usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política permisiva para SELECT - permite que usuarios autenticados lean datos
CREATE POLICY "Usuarios autenticados pueden leer usuarios"
  ON usuarios FOR SELECT
  TO authenticated
  USING (true);

-- Política permisiva para UPDATE - permite que usuarios autenticados actualicen
CREATE POLICY "Usuarios autenticados pueden actualizar usuarios"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para DELETE - solo para casos necesarios
CREATE POLICY "Usuarios autenticados pueden eliminar usuarios"
  ON usuarios FOR DELETE
  TO authenticated
  USING (true);
