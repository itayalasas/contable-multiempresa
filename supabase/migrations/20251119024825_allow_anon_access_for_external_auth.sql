/*
  # Permitir Acceso Anónimo para Autenticación Externa

  ## Cambios
  
  1. Actualización de Políticas de Usuarios
    - Se cambian las políticas de `authenticated` a `anon` para permitir acceso con API key
    - Esto permite que el frontend con autenticación externa pueda crear y gestionar usuarios
  
  2. Políticas para Otras Tablas
    - Se actualizan las políticas de empresas para permitir acceso con API key
  
  ## Seguridad
  - El control de acceso se maneja en la capa de aplicación
  - La API key de Supabase controla el acceso general
  - Las operaciones están limitadas por las reglas de negocio en el frontend
*/

-- Eliminar políticas antiguas de usuarios
DROP POLICY IF EXISTS "Sistema puede crear usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar usuarios" ON usuarios;

-- Nuevas políticas para usuarios con rol anon (API key)
CREATE POLICY "Permitir todas las operaciones con API key"
  ON usuarios
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Actualizar políticas de empresas para permitir acceso con API key
DROP POLICY IF EXISTS "Usuarios pueden ver empresas asignadas" ON empresas;
DROP POLICY IF EXISTS "Admin empresa puede actualizar su empresa" ON empresas;
DROP POLICY IF EXISTS "Super admin puede insertar empresas" ON empresas;

CREATE POLICY "Permitir todas las operaciones en empresas con API key"
  ON empresas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Actualizar políticas de países para permitir acceso con API key
DROP POLICY IF EXISTS "Todos pueden leer países activos" ON paises;

CREATE POLICY "Permitir lectura de países con API key"
  ON paises
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Permitir todas las operaciones en países con API key"
  ON paises
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
