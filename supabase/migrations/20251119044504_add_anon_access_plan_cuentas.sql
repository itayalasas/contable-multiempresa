/*
  # Permitir Acceso Anónimo a Plan de Cuentas para Autenticación Externa

  ## Cambios
  
  1. Políticas de Plan de Cuentas
    - Se agregan políticas para rol `anon` (usuarios con API key)
    - Esto permite que usuarios autenticados externamente (Auth0) puedan gestionar el plan de cuentas
  
  ## Seguridad
  - El control de acceso se maneja en la capa de aplicación
  - La API key de Supabase controla el acceso general
  - Las operaciones están protegidas por la lógica de negocio en el frontend
*/

-- Crear política para permitir todas las operaciones en plan_cuentas con API key
CREATE POLICY "Permitir todas las operaciones en plan_cuentas con API key"
  ON plan_cuentas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
