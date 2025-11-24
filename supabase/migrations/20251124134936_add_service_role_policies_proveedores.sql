/*
  # Agregar políticas de service_role para proveedores

  ## Descripción
  Las Edge Functions necesitan permisos para crear y actualizar proveedores
  automáticamente cuando se generan facturas de compra a partners.

  ## Cambios
  - Agregar política SELECT para service_role en proveedores
  - Agregar política INSERT para service_role en proveedores
  - Agregar política UPDATE para service_role en proveedores

  ## Seguridad
  - Solo service_role puede usar estas políticas
  - Las políticas de usuarios autenticados siguen funcionando normalmente
*/

-- Política SELECT para service_role en proveedores
CREATE POLICY "Service role puede ver proveedores"
  ON proveedores FOR SELECT
  TO service_role
  USING (true);

-- Política INSERT para service_role en proveedores
CREATE POLICY "Service role puede crear proveedores"
  ON proveedores FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política UPDATE para service_role en proveedores
CREATE POLICY "Service role puede actualizar proveedores"
  ON proveedores FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);