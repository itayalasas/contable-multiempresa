/*
  # Agregar políticas de service_role para Edge Functions

  ## Descripción
  Las Edge Functions usan el rol service_role y necesitan permisos para:
  - Leer comisiones_partners
  - Leer partners_aliados
  - Crear y actualizar facturas_compra
  - Crear facturas_compra_items
  - Actualizar comisiones_partners

  ## Cambios
  Se agregan políticas de service_role para todas las tablas necesarias
  en el flujo de generación de facturas de compra a partners.

  ## Seguridad
  - Solo service_role (Edge Functions) puede usar estas políticas
  - Las políticas de usuarios autenticados no se ven afectadas
  - Esto permite que las Edge Functions automaticen procesos sin depender del usuario
*/

-- =====================================================
-- POLÍTICAS PARA: comisiones_partners
-- =====================================================
CREATE POLICY "Service role puede ver comisiones"
  ON comisiones_partners FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role puede actualizar comisiones"
  ON comisiones_partners FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- POLÍTICAS PARA: partners_aliados
-- =====================================================
CREATE POLICY "Service role puede ver partners"
  ON partners_aliados FOR SELECT
  TO service_role
  USING (true);

-- =====================================================
-- POLÍTICAS PARA: facturas_compra
-- =====================================================
CREATE POLICY "Service role puede ver facturas de compra"
  ON facturas_compra FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role puede crear facturas de compra"
  ON facturas_compra FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role puede actualizar facturas de compra"
  ON facturas_compra FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- POLÍTICAS PARA: facturas_compra_items
-- =====================================================
CREATE POLICY "Service role puede ver items de facturas de compra"
  ON facturas_compra_items FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role puede crear items de facturas de compra"
  ON facturas_compra_items FOR INSERT
  TO service_role
  WITH CHECK (true);