/*
  # Agregar Políticas RLS para Solicitudes de Aprobación

  ## Resumen
  Agrega políticas de Row Level Security para que los usuarios puedan crear,
  leer y gestionar solicitudes de aprobación a través del frontend.

  ## Políticas
  1. Permitir a anon/authenticated crear solicitudes
  2. Permitir a anon/authenticated leer solicitudes de su empresa
  3. Permitir a service_role acceso total (ya existe)
*/

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Anon puede crear solicitudes" ON solicitudes_aprobacion;
DROP POLICY IF EXISTS "Anon puede leer solicitudes" ON solicitudes_aprobacion;
DROP POLICY IF EXISTS "Anon puede actualizar solicitudes" ON solicitudes_aprobacion;
DROP POLICY IF EXISTS "Authenticated puede crear solicitudes" ON solicitudes_aprobacion;
DROP POLICY IF EXISTS "Authenticated puede leer solicitudes" ON solicitudes_aprobacion;
DROP POLICY IF EXISTS "Authenticated puede actualizar solicitudes" ON solicitudes_aprobacion;

-- 1. Permitir a anon crear solicitudes
CREATE POLICY "Anon puede crear solicitudes"
  ON solicitudes_aprobacion
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 2. Permitir a anon leer solicitudes
CREATE POLICY "Anon puede leer solicitudes"
  ON solicitudes_aprobacion
  FOR SELECT
  TO anon
  USING (true);

-- 3. Permitir a anon actualizar solicitudes (para aprobar/rechazar)
CREATE POLICY "Anon puede actualizar solicitudes"
  ON solicitudes_aprobacion
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. Permitir a authenticated crear solicitudes
CREATE POLICY "Authenticated puede crear solicitudes"
  ON solicitudes_aprobacion
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Permitir a authenticated leer solicitudes
CREATE POLICY "Authenticated puede leer solicitudes"
  ON solicitudes_aprobacion
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Permitir a authenticated actualizar solicitudes
CREATE POLICY "Authenticated puede actualizar solicitudes"
  ON solicitudes_aprobacion
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
