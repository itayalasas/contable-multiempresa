/*
  # Fix RLS Policies for Cuentas por Pagar with External Auth

  ## Descripción
  Las políticas actuales usan auth.uid() que no funciona con autenticación externa (Auth0).
  Esta migración permite acceso anon para que los usuarios con autenticación externa
  puedan acceder a las cuentas por pagar.

  ## Cambios
  1. Eliminar políticas existentes que usan auth.uid()
  2. Crear nuevas políticas con acceso anon
  3. Aplicar a todas las tablas:
     - proveedores
     - facturas_por_pagar
     - items_factura_pagar
     - pagos_proveedor

  ## Seguridad
  - La seguridad se mantiene a nivel de aplicación
  - El acceso se controla mediante empresa_id en la aplicación
  - Compatible con sistemas de autenticación externos
*/

-- =====================================================
-- TABLA: proveedores
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver proveedores de sus empresas" ON proveedores;
DROP POLICY IF EXISTS "Usuarios pueden crear proveedores en sus empresas" ON proveedores;
DROP POLICY IF EXISTS "Usuarios pueden actualizar proveedores de sus empresas" ON proveedores;

-- Crear nuevas políticas con anon
CREATE POLICY "Allow anon select proveedores"
  ON proveedores FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert proveedores"
  ON proveedores FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update proveedores"
  ON proveedores FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete proveedores"
  ON proveedores FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- TABLA: facturas_por_pagar
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver facturas por pagar de sus empresas" ON facturas_por_pagar;
DROP POLICY IF EXISTS "Usuarios pueden crear facturas en sus empresas" ON facturas_por_pagar;
DROP POLICY IF EXISTS "Usuarios pueden actualizar facturas de sus empresas" ON facturas_por_pagar;
DROP POLICY IF EXISTS "Usuarios pueden eliminar facturas de sus empresas" ON facturas_por_pagar;

-- Crear nuevas políticas con anon
CREATE POLICY "Allow anon select facturas_por_pagar"
  ON facturas_por_pagar FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert facturas_por_pagar"
  ON facturas_por_pagar FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update facturas_por_pagar"
  ON facturas_por_pagar FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete facturas_por_pagar"
  ON facturas_por_pagar FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- TABLA: items_factura_pagar
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver items de facturas de sus empresas" ON items_factura_pagar;
DROP POLICY IF EXISTS "Usuarios pueden crear items en sus empresas" ON items_factura_pagar;
DROP POLICY IF EXISTS "Usuarios pueden actualizar items de sus empresas" ON items_factura_pagar;

-- Crear nuevas políticas con anon
CREATE POLICY "Allow anon select items_factura_pagar"
  ON items_factura_pagar FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert items_factura_pagar"
  ON items_factura_pagar FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update items_factura_pagar"
  ON items_factura_pagar FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete items_factura_pagar"
  ON items_factura_pagar FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- TABLA: pagos_proveedor
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver pagos de sus empresas" ON pagos_proveedor;
DROP POLICY IF EXISTS "Usuarios pueden registrar pagos en sus empresas" ON pagos_proveedor;

-- Crear nuevas políticas con anon
CREATE POLICY "Allow anon select pagos_proveedor"
  ON pagos_proveedor FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert pagos_proveedor"
  ON pagos_proveedor FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update pagos_proveedor"
  ON pagos_proveedor FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete pagos_proveedor"
  ON pagos_proveedor FOR DELETE
  TO anon
  USING (true);