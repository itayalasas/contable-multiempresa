/*
  # Actualizar RLS de Nomencladores para Autenticación Externa

  ## Cambios
  - Actualizar políticas de todas las tablas de nomencladores
  - Permitir acceso con anon key para aplicación con Auth0
  
  ## Tablas Actualizadas
  - paises
  - tipo_documento_identidad
  - tipo_documento_factura
  - tipo_impuesto
  - tipo_moneda
  - forma_pago
  - tipo_movimiento_tesoreria
  - bancos
  - unidad_medida
  - categoria_producto
*/

-- =====================================================
-- PAISES
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer países activos" ON paises;

CREATE POLICY "Permitir SELECT con anon key"
  ON paises FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON paises FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON paises FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIPO_DOCUMENTO_IDENTIDAD
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer tipos de documento activos" ON tipo_documento_identidad;

CREATE POLICY "Permitir SELECT con anon key"
  ON tipo_documento_identidad FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON tipo_documento_identidad FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON tipo_documento_identidad FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIPO_DOCUMENTO_FACTURA
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer tipos de documento factura activos" ON tipo_documento_factura;

CREATE POLICY "Permitir SELECT con anon key"
  ON tipo_documento_factura FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON tipo_documento_factura FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON tipo_documento_factura FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIPO_IMPUESTO
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer tipos de impuesto activos" ON tipo_impuesto;

CREATE POLICY "Permitir SELECT con anon key"
  ON tipo_impuesto FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON tipo_impuesto FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON tipo_impuesto FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIPO_MONEDA
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer tipos de moneda activos" ON tipo_moneda;

CREATE POLICY "Permitir SELECT con anon key"
  ON tipo_moneda FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON tipo_moneda FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON tipo_moneda FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FORMA_PAGO
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer formas de pago activas" ON forma_pago;

CREATE POLICY "Permitir SELECT con anon key"
  ON forma_pago FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON forma_pago FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON forma_pago FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TIPO_MOVIMIENTO_TESORERIA
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer tipos de movimiento activos" ON tipo_movimiento_tesoreria;

CREATE POLICY "Permitir SELECT con anon key"
  ON tipo_movimiento_tesoreria FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON tipo_movimiento_tesoreria FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON tipo_movimiento_tesoreria FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- BANCOS
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer bancos activos" ON bancos;

CREATE POLICY "Permitir SELECT con anon key"
  ON bancos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON bancos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON bancos FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- UNIDAD_MEDIDA
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer unidades de medida activas" ON unidad_medida;

CREATE POLICY "Permitir SELECT con anon key"
  ON unidad_medida FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON unidad_medida FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON unidad_medida FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- CATEGORIA_PRODUCTO
-- =====================================================
DROP POLICY IF EXISTS "Todos pueden leer categorías de producto activas" ON categoria_producto;

CREATE POLICY "Permitir SELECT con anon key"
  ON categoria_producto FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Permitir INSERT con anon key"
  ON categoria_producto FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE con anon key"
  ON categoria_producto FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
