/*
  # Agregar acceso anon a impuestos_configuracion
  
  1. Cambios
    - Agregar política SELECT para usuarios anon (autenticación externa Auth0)
    - Los usuarios externos pueden ver la configuración de impuestos
*/

-- Política para que usuarios anon puedan leer impuestos_configuracion
CREATE POLICY "Usuarios externos pueden ver configuración de impuestos"
  ON impuestos_configuracion
  FOR SELECT
  TO anon
  USING (true);
