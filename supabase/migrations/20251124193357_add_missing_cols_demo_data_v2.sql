/*
  # Agregar columnas faltantes y datos demo
  
  1. Agregar columnas
    - descripcion y swift a bancos
    - descripcion a tipo_moneda
    - tipo, afecta_caja, afecta_banco a tipo_movimiento_tesoreria
  
  2. Políticas RLS
    - INSERT y UPDATE para todas las tablas de nomencladores
  
  3. Datos demo de Uruguay
*/

-- Agregar columnas faltantes
ALTER TABLE bancos 
ADD COLUMN IF NOT EXISTS descripcion text,
ADD COLUMN IF NOT EXISTS swift text;

ALTER TABLE tipo_moneda 
ADD COLUMN IF NOT EXISTS descripcion text;

ALTER TABLE tipo_movimiento_tesoreria
ADD COLUMN IF NOT EXISTS tipo text,
ADD COLUMN IF NOT EXISTS afecta_caja boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS afecta_banco boolean DEFAULT true;

-- Crear políticas RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "Usuarios pueden insertar bancos" ON bancos;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar bancos" ON bancos;
  DROP POLICY IF EXISTS "Usuarios pueden insertar tipos documento identidad" ON tipo_documento_identidad;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar tipos documento identidad" ON tipo_documento_identidad;
  DROP POLICY IF EXISTS "Usuarios pueden insertar tipos documento factura" ON tipo_documento_factura;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar tipos documento factura" ON tipo_documento_factura;
  DROP POLICY IF EXISTS "Usuarios pueden insertar formas pago" ON forma_pago;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar formas pago" ON forma_pago;
  DROP POLICY IF EXISTS "Usuarios pueden insertar tipos moneda" ON tipo_moneda;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar tipos moneda" ON tipo_moneda;
  DROP POLICY IF EXISTS "Usuarios pueden insertar tipos movimiento" ON tipo_movimiento_tesoreria;
  DROP POLICY IF EXISTS "Usuarios pueden actualizar tipos movimiento" ON tipo_movimiento_tesoreria;
END $$;

CREATE POLICY "Usuarios pueden insertar bancos" ON bancos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar bancos" ON bancos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios pueden insertar tipos documento identidad" ON tipo_documento_identidad FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar tipos documento identidad" ON tipo_documento_identidad FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios pueden insertar tipos documento factura" ON tipo_documento_factura FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar tipos documento factura" ON tipo_documento_factura FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios pueden insertar formas pago" ON forma_pago FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar formas pago" ON forma_pago FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios pueden insertar tipos moneda" ON tipo_moneda FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar tipos moneda" ON tipo_moneda FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios pueden insertar tipos movimiento" ON tipo_movimiento_tesoreria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios pueden actualizar tipos movimiento" ON tipo_movimiento_tesoreria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Datos demo: Bancos de Uruguay
INSERT INTO bancos (nombre, codigo, pais_id, descripcion, swift, activo)
SELECT 'Banco República', 'BROU', '550e8400-e29b-41d4-a716-446655440006', 'Banco estatal de Uruguay', 'BROUUYMMXXX', true
WHERE NOT EXISTS (SELECT 1 FROM bancos WHERE codigo = 'BROU' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO bancos (nombre, codigo, pais_id, descripcion, swift, activo)
SELECT 'Banco Itaú', 'ITAU', '550e8400-e29b-41d4-a716-446655440006', 'Banco privado internacional', 'ITAUUYMM', true
WHERE NOT EXISTS (SELECT 1 FROM bancos WHERE codigo = 'ITAU' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO bancos (nombre, codigo, pais_id, descripcion, swift, activo)
SELECT 'Banco Santander', 'SANT', '550e8400-e29b-41d4-a716-446655440006', 'Banco privado internacional', 'BSCHUYMMXXX', true
WHERE NOT EXISTS (SELECT 1 FROM bancos WHERE codigo = 'SANT' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO bancos (nombre, codigo, pais_id, descripcion, swift, activo)
SELECT 'Banco BBVA', 'BBVA', '550e8400-e29b-41d4-a716-446655440006', 'Banco privado internacional', 'BBVAUYMMXXX', true
WHERE NOT EXISTS (SELECT 1 FROM bancos WHERE codigo = 'BBVA' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO bancos (nombre, codigo, pais_id, descripcion, swift, activo)
SELECT 'Scotiabank', 'SCOT', '550e8400-e29b-41d4-a716-446655440006', 'Banco privado internacional', 'NOSSUYMM', true
WHERE NOT EXISTS (SELECT 1 FROM bancos WHERE codigo = 'SCOT' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

-- Datos demo: Formas de pago
INSERT INTO forma_pago (nombre, codigo, pais_id, descripcion, requiere_banco, activo)
SELECT 'Efectivo', 'EFE', '550e8400-e29b-41d4-a716-446655440006', 'Pago en efectivo', false, true
WHERE NOT EXISTS (SELECT 1 FROM forma_pago WHERE codigo = 'EFE' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO forma_pago (nombre, codigo, pais_id, descripcion, requiere_banco, activo)
SELECT 'Transferencia Bancaria', 'TRA', '550e8400-e29b-41d4-a716-446655440006', 'Transferencia entre cuentas', true, true
WHERE NOT EXISTS (SELECT 1 FROM forma_pago WHERE codigo = 'TRA' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO forma_pago (nombre, codigo, pais_id, descripcion, requiere_banco, activo)
SELECT 'Cheque', 'CHE', '550e8400-e29b-41d4-a716-446655440006', 'Pago con cheque', true, true
WHERE NOT EXISTS (SELECT 1 FROM forma_pago WHERE codigo = 'CHE' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO forma_pago (nombre, codigo, pais_id, descripcion, requiere_banco, activo)
SELECT 'Tarjeta de Crédito', 'TDC', '550e8400-e29b-41d4-a716-446655440006', 'Pago con tarjeta de crédito', false, true
WHERE NOT EXISTS (SELECT 1 FROM forma_pago WHERE codigo = 'TDC' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO forma_pago (nombre, codigo, pais_id, descripcion, requiere_banco, activo)
SELECT 'Tarjeta de Débito', 'TDD', '550e8400-e29b-41d4-a716-446655440006', 'Pago con tarjeta de débito', false, true
WHERE NOT EXISTS (SELECT 1 FROM forma_pago WHERE codigo = 'TDD' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

-- Datos demo: Tipos de moneda
INSERT INTO tipo_moneda (nombre, codigo, simbolo, pais_id, descripcion, es_principal, activo)
SELECT 'Peso Uruguayo', 'UYU', '$', '550e8400-e29b-41d4-a716-446655440006', 'Moneda nacional de Uruguay', true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_moneda WHERE codigo = 'UYU' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_moneda (nombre, codigo, simbolo, pais_id, descripcion, es_principal, activo)
SELECT 'Dólar Estadounidense', 'USD', 'US$', '550e8400-e29b-41d4-a716-446655440006', 'Dólar americano', false, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_moneda WHERE codigo = 'USD' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_moneda (nombre, codigo, simbolo, pais_id, descripcion, es_principal, activo)
SELECT 'Euro', 'EUR', '€', '550e8400-e29b-41d4-a716-446655440006', 'Euro europeo', false, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_moneda WHERE codigo = 'EUR' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

-- Datos demo: Tipos de documento de identidad
INSERT INTO tipo_documento_identidad (nombre, codigo, pais_id, descripcion, activo)
SELECT 'Cédula de Identidad', 'CI', '550e8400-e29b-41d4-a716-446655440006', 'Documento nacional de identidad', true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_identidad WHERE codigo = 'CI' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_documento_identidad (nombre, codigo, pais_id, descripcion, activo)
SELECT 'RUT', 'RUT', '550e8400-e29b-41d4-a716-446655440006', 'Rol Único Tributario', true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_identidad WHERE codigo = 'RUT' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_documento_identidad (nombre, codigo, pais_id, descripcion, activo)
SELECT 'Pasaporte', 'PAS', '550e8400-e29b-41d4-a716-446655440006', 'Pasaporte', true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_identidad WHERE codigo = 'PAS' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

-- Datos demo: Tipos de documento de factura
INSERT INTO tipo_documento_factura (nombre, codigo, pais_id, descripcion, requiere_impuesto, requiere_cliente, afecta_inventario, afecta_contabilidad, activo)
SELECT 'Factura Contado', 'FC', '550e8400-e29b-41d4-a716-446655440006', 'Factura de contado', true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_factura WHERE codigo = 'FC' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_documento_factura (nombre, codigo, pais_id, descripcion, requiere_impuesto, requiere_cliente, afecta_inventario, afecta_contabilidad, activo)
SELECT 'Factura Crédito', 'FCR', '550e8400-e29b-41d4-a716-446655440006', 'Factura a crédito', true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_factura WHERE codigo = 'FCR' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_documento_factura (nombre, codigo, pais_id, descripcion, requiere_impuesto, requiere_cliente, afecta_inventario, afecta_contabilidad, activo)
SELECT 'Nota de Crédito', 'NC', '550e8400-e29b-41d4-a716-446655440006', 'Nota de crédito', true, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_factura WHERE codigo = 'NC' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_documento_factura (nombre, codigo, pais_id, descripcion, requiere_impuesto, requiere_cliente, afecta_inventario, afecta_contabilidad, activo)
SELECT 'Nota de Débito', 'ND', '550e8400-e29b-41d4-a716-446655440006', 'Nota de débito', true, true, false, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_documento_factura WHERE codigo = 'ND' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

-- Datos demo: Tipos de movimiento de tesorería
INSERT INTO tipo_movimiento_tesoreria (nombre, codigo, pais_id, descripcion, tipo, afecta_caja, afecta_banco, activo)
SELECT 'Ingreso', 'ING', '550e8400-e29b-41d4-a716-446655440006', 'Ingreso de dinero', 'INGRESO', true, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento_tesoreria WHERE codigo = 'ING' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_movimiento_tesoreria (nombre, codigo, pais_id, descripcion, tipo, afecta_caja, afecta_banco, activo)
SELECT 'Egreso', 'EGR', '550e8400-e29b-41d4-a716-446655440006', 'Salida de dinero', 'EGRESO', true, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento_tesoreria WHERE codigo = 'EGR' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');

INSERT INTO tipo_movimiento_tesoreria (nombre, codigo, pais_id, descripcion, tipo, afecta_caja, afecta_banco, activo)
SELECT 'Transferencia', 'TRF', '550e8400-e29b-41d4-a716-446655440006', 'Transferencia entre cuentas', 'TRANSFERENCIA', false, true, true
WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento_tesoreria WHERE codigo = 'TRF' AND pais_id = '550e8400-e29b-41d4-a716-446655440006');