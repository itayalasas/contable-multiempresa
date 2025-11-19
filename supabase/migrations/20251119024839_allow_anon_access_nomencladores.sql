/*
  # Permitir Acceso Anónimo para Nomencladores

  ## Cambios
  
  1. Actualización de Políticas de Nomencladores
    - Se actualizan todas las tablas de nomencladores para permitir acceso con API key (rol anon)
    - Esto incluye: tipos de documento, tipos de impuesto, monedas, formas de pago, etc.
  
  ## Seguridad
  - El acceso está controlado por la API key de Supabase
  - Los nomencladores son datos de referencia que no contienen información sensible
*/

-- Tipo documento identidad
DROP POLICY IF EXISTS "Todos pueden leer tipos de documento activos" ON tipo_documento_identidad;
CREATE POLICY "Permitir acceso a tipos de documento con API key"
  ON tipo_documento_identidad FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tipo documento factura
DROP POLICY IF EXISTS "Todos pueden leer tipos de documento factura activos" ON tipo_documento_factura;
CREATE POLICY "Permitir acceso a tipos de documento factura con API key"
  ON tipo_documento_factura FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tipo impuesto
DROP POLICY IF EXISTS "Todos pueden leer tipos de impuesto activos" ON tipo_impuesto;
CREATE POLICY "Permitir acceso a tipos de impuesto con API key"
  ON tipo_impuesto FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tipo moneda
DROP POLICY IF EXISTS "Todos pueden leer tipos de moneda activos" ON tipo_moneda;
CREATE POLICY "Permitir acceso a tipos de moneda con API key"
  ON tipo_moneda FOR ALL TO anon USING (true) WITH CHECK (true);

-- Forma pago
DROP POLICY IF EXISTS "Todos pueden leer formas de pago activas" ON forma_pago;
CREATE POLICY "Permitir acceso a formas de pago con API key"
  ON forma_pago FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tipo movimiento tesoreria
DROP POLICY IF EXISTS "Todos pueden leer tipos de movimiento activos" ON tipo_movimiento_tesoreria;
CREATE POLICY "Permitir acceso a tipos de movimiento con API key"
  ON tipo_movimiento_tesoreria FOR ALL TO anon USING (true) WITH CHECK (true);

-- Bancos
DROP POLICY IF EXISTS "Todos pueden leer bancos activos" ON bancos;
CREATE POLICY "Permitir acceso a bancos con API key"
  ON bancos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Unidad medida
DROP POLICY IF EXISTS "Todos pueden leer unidades de medida activas" ON unidad_medida;
CREATE POLICY "Permitir acceso a unidades de medida con API key"
  ON unidad_medida FOR ALL TO anon USING (true) WITH CHECK (true);

-- Categoria producto
DROP POLICY IF EXISTS "Todos pueden leer categorías de producto activas" ON categoria_producto;
CREATE POLICY "Permitir acceso a categorías de producto con API key"
  ON categoria_producto FOR ALL TO anon USING (true) WITH CHECK (true);
