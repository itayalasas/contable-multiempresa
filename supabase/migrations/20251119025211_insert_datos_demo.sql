/*
  # Insertar Datos Demo para ContaEmpresa

  ## Cambios
  
  1. Datos de Países
    - Inserta datos de países latinoamericanos (Perú, Colombia, México, Argentina, Chile)
  
  2. Datos de Nomencladores
    - Tipos de documento de identidad por país
    - Tipos de documento de factura por país
    - Tipos de impuestos por país
    - Tipos de moneda por país
    - Formas de pago por país
    - Tipos de movimiento de tesorería
    - Bancos por país
  
  3. Empresas Demo
    - Empresas de ejemplo para cada país
    - Configuración contable básica
  
  ## Notas
  - Todos los datos están marcados como activos
  - Los datos son representativos de cada país
  - Se pueden eliminar o modificar según necesidad
*/

-- =====================================================
-- INSERTAR PAÍSES
-- =====================================================
INSERT INTO paises (id, nombre, codigo, codigo_iso, moneda_principal, simbolo_moneda, formato_fecha, separador_decimal, separador_miles, activo)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Perú', 'PE', 'PER', 'PEN', 'S/', 'DD/MM/YYYY', '.', ',', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Colombia', 'CO', 'COL', 'COP', '$', 'DD/MM/YYYY', ',', '.', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'México', 'MX', 'MEX', 'MXN', '$', 'DD/MM/YYYY', '.', ',', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Argentina', 'AR', 'ARG', 'ARS', '$', 'DD/MM/YYYY', ',', '.', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Chile', 'CL', 'CHL', 'CLP', '$', 'DD/MM/YYYY', ',', '.', true)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- INSERTAR TIPOS DE DOCUMENTO DE IDENTIDAD
-- =====================================================
INSERT INTO tipo_documento_identidad (nombre, codigo, descripcion, pais_id, activo)
VALUES
  -- Perú
  ('DNI', 'DNI', 'Documento Nacional de Identidad', '550e8400-e29b-41d4-a716-446655440001', true),
  ('RUC', 'RUC', 'Registro Único de Contribuyentes', '550e8400-e29b-41d4-a716-446655440001', true),
  ('Carnet de Extranjería', 'CE', 'Carnet de Extranjería', '550e8400-e29b-41d4-a716-446655440001', true),
  -- Colombia
  ('Cédula de Ciudadanía', 'CC', 'Cédula de Ciudadanía', '550e8400-e29b-41d4-a716-446655440002', true),
  ('NIT', 'NIT', 'Número de Identificación Tributaria', '550e8400-e29b-41d4-a716-446655440002', true),
  -- México
  ('RFC', 'RFC', 'Registro Federal de Contribuyentes', '550e8400-e29b-41d4-a716-446655440003', true),
  ('CURP', 'CURP', 'Clave Única de Registro de Población', '550e8400-e29b-41d4-a716-446655440003', true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- INSERTAR TIPOS DE IMPUESTO
-- =====================================================
INSERT INTO tipo_impuesto (nombre, codigo, porcentaje, tipo, pais_id, activo)
VALUES
  -- Perú
  ('IGV', 'IGV', 18.00, 'IGV', '550e8400-e29b-41d4-a716-446655440001', true),
  -- Colombia
  ('IVA', 'IVA', 19.00, 'IVA', '550e8400-e29b-41d4-a716-446655440002', true),
  -- México
  ('IVA', 'IVA', 16.00, 'IVA', '550e8400-e29b-41d4-a716-446655440003', true),
  -- Argentina
  ('IVA 21%', 'IVA21', 21.00, 'IVA', '550e8400-e29b-41d4-a716-446655440004', true),
  -- Chile
  ('IVA', 'IVA', 19.00, 'IVA', '550e8400-e29b-41d4-a716-446655440005', true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- INSERTAR TIPOS DE MONEDA
-- =====================================================
INSERT INTO tipo_moneda (nombre, codigo, simbolo, pais_id, activo, es_principal)
VALUES
  -- Perú
  ('Sol Peruano', 'PEN', 'S/', '550e8400-e29b-41d4-a716-446655440001', true, true),
  ('Dólar Americano', 'USD', '$', '550e8400-e29b-41d4-a716-446655440001', true, false),
  -- Colombia
  ('Peso Colombiano', 'COP', '$', '550e8400-e29b-41d4-a716-446655440002', true, true),
  -- México
  ('Peso Mexicano', 'MXN', '$', '550e8400-e29b-41d4-a716-446655440003', true, true),
  -- Argentina
  ('Peso Argentino', 'ARS', '$', '550e8400-e29b-41d4-a716-446655440004', true, true),
  -- Chile
  ('Peso Chileno', 'CLP', '$', '550e8400-e29b-41d4-a716-446655440005', true, true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- INSERTAR FORMAS DE PAGO
-- =====================================================
INSERT INTO forma_pago (nombre, codigo, descripcion, pais_id, activo, requiere_banco, requiere_referencia)
VALUES
  ('Efectivo', 'EFECTIVO', 'Pago en efectivo', '550e8400-e29b-41d4-a716-446655440001', true, false, false),
  ('Transferencia Bancaria', 'TRANSFERENCIA', 'Transferencia bancaria', '550e8400-e29b-41d4-a716-446655440001', true, true, true),
  ('Tarjeta de Crédito', 'TC', 'Tarjeta de crédito', '550e8400-e29b-41d4-a716-446655440001', true, false, false),
  ('Tarjeta de Débito', 'TD', 'Tarjeta de débito', '550e8400-e29b-41d4-a716-446655440001', true, false, false),
  ('Cheque', 'CHEQUE', 'Pago con cheque', '550e8400-e29b-41d4-a716-446655440001', true, true, true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- INSERTAR BANCOS (PERÚ)
-- =====================================================
INSERT INTO bancos (nombre, codigo, pais_id, activo)
VALUES
  ('Banco de Crédito del Perú', 'BCP', '550e8400-e29b-41d4-a716-446655440001', true),
  ('BBVA Perú', 'BBVA', '550e8400-e29b-41d4-a716-446655440001', true),
  ('Scotiabank Perú', 'SCOTIA', '550e8400-e29b-41d4-a716-446655440001', true),
  ('Interbank', 'INTERBANK', '550e8400-e29b-41d4-a716-446655440001', true),
  ('Banco Pichincha', 'PICHINCHA', '550e8400-e29b-41d4-a716-446655440001', true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- INSERTAR EMPRESAS DEMO
-- =====================================================
INSERT INTO empresas (id, nombre, razon_social, numero_identificacion, pais_id, subdominio, direccion, telefono, email, moneda_principal, activa, usuarios_asignados)
VALUES
  (
    '650e8400-e29b-41d4-a716-446655440001',
    'TechSolutions Perú SAC',
    'TechSolutions Perú Sociedad Anónima Cerrada',
    '20123456789',
    '550e8400-e29b-41d4-a716-446655440001',
    'techsolutions-pe',
    'Av. Javier Prado 123, San Isidro, Lima',
    '+51 1 234-5678',
    'contacto@techsolutions.pe',
    'PEN',
    true,
    ARRAY['e762511c-84ee-4d44-9ee4-802cf5f71d2b']::text[]
  ),
  (
    '650e8400-e29b-41d4-a716-446655440002',
    'Comercial Lima EIRL',
    'Comercial Lima Empresa Individual de Responsabilidad Limitada',
    '20987654321',
    '550e8400-e29b-41d4-a716-446655440001',
    'comercial-lima',
    'Jr. de la Unión 456, Cercado de Lima',
    '+51 1 987-6543',
    'ventas@comerciallima.pe',
    'PEN',
    true,
    ARRAY['e762511c-84ee-4d44-9ee4-802cf5f71d2b']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ACTUALIZAR USUARIO CON EMPRESAS ASIGNADAS
-- =====================================================
UPDATE usuarios
SET empresas_asignadas = ARRAY['650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002']::text[],
    rol = 'super_admin'
WHERE id = 'e762511c-84ee-4d44-9ee4-802cf5f71d2b';
