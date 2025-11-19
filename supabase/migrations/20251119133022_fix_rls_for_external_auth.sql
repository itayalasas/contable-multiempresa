/*
  # Actualizar RLS para Autenticación Externa

  ## Problema
  - Las políticas RLS usan auth.uid() que solo funciona con Supabase Auth
  - La aplicación usa Auth0 (autenticación externa)
  - Los usuarios se identifican por el campo 'id' en la tabla usuarios
  
  ## Solución
  - Eliminar todas las políticas que dependen de auth.uid()
  - Crear políticas permisivas que validen a nivel de aplicación
  - El control de acceso se maneja en la capa de aplicación usando la API key
  
  ## Seguridad
  - Se usa la API key de Supabase (anon key) para autenticar solicitudes
  - La aplicación valida el usuario externo antes de hacer operaciones
  - RLS permite operaciones pero la aplicación es responsable de la validación
*/

-- =====================================================
-- PLAN_CUENTAS
-- =====================================================
DROP POLICY IF EXISTS "Usuarios pueden ver plan cuentas de sus empresas" ON plan_cuentas;
DROP POLICY IF EXISTS "Admin y contador pueden crear cuentas" ON plan_cuentas;
DROP POLICY IF EXISTS "Admin y contador pueden actualizar cuentas" ON plan_cuentas;

CREATE POLICY "Permitir SELECT con anon key"
  ON plan_cuentas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON plan_cuentas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON plan_cuentas FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE con anon key"
  ON plan_cuentas FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- ASIENTOS_CONTABLES
-- =====================================================
DROP POLICY IF EXISTS "Usuarios pueden ver asientos de sus empresas" ON asientos_contables;
DROP POLICY IF EXISTS "Usuarios pueden crear asientos en sus empresas" ON asientos_contables;
DROP POLICY IF EXISTS "Usuarios pueden actualizar asientos en sus empresas" ON asientos_contables;

CREATE POLICY "Permitir SELECT con anon key"
  ON asientos_contables FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON asientos_contables FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON asientos_contables FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE con anon key"
  ON asientos_contables FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- MOVIMIENTOS_CONTABLES
-- =====================================================
DROP POLICY IF EXISTS "Usuarios pueden ver movimientos de asientos de sus empresas" ON movimientos_contables;
DROP POLICY IF EXISTS "Usuarios pueden crear movimientos en sus empresas" ON movimientos_contables;
DROP POLICY IF EXISTS "Usuarios pueden actualizar movimientos en sus empresas" ON movimientos_contables;

CREATE POLICY "Permitir SELECT con anon key"
  ON movimientos_contables FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON movimientos_contables FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON movimientos_contables FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE con anon key"
  ON movimientos_contables FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- EMPRESAS
-- =====================================================
DROP POLICY IF EXISTS "Usuarios pueden ver empresas asignadas" ON empresas;
DROP POLICY IF EXISTS "Admin empresa puede actualizar su empresa" ON empresas;
DROP POLICY IF EXISTS "Super admin puede insertar empresas" ON empresas;

CREATE POLICY "Permitir SELECT con anon key"
  ON empresas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON empresas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON empresas FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE con anon key"
  ON empresas FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================
-- USUARIOS
-- =====================================================
-- Las políticas de usuarios ya fueron actualizadas anteriormente
-- pero las revisamos para asegurar consistencia

DROP POLICY IF EXISTS "Usuarios pueden leer su propia información" ON usuarios;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propia información" ON usuarios;
DROP POLICY IF EXISTS "Sistema puede crear usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar usuarios" ON usuarios;

CREATE POLICY "Permitir SELECT con anon key"
  ON usuarios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON usuarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON usuarios FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE con anon key"
  ON usuarios FOR DELETE
  TO anon, authenticated
  USING (true);
