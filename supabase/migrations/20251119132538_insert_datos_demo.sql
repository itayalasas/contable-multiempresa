-- Insertar países
INSERT INTO paises (id, nombre, codigo, codigo_iso, moneda_principal, simbolo_moneda, formato_fecha, separador_decimal, separador_miles, activo)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Perú', 'PE', 'PER', 'PEN', 'S/', 'DD/MM/YYYY', '.', ',', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'Uruguay', 'UY', 'URY', 'UYU', '$U', 'DD/MM/YYYY', ',', '.', true)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar usuario
INSERT INTO usuarios (id, nombre, email, rol, empresas_asignadas, activo, pais_id)
VALUES 
  ('e762511c-84ee-4d44-9ee4-802cf5f71d2b', 'Pedro Ayala Ortiz', 'pedro@example.com', 'super_admin', '{}', true, '550e8400-e29b-41d4-a716-446655440006')
ON CONFLICT (id) DO UPDATE 
SET rol = 'super_admin', activo = true, pais_id = '550e8400-e29b-41d4-a716-446655440006';

-- Insertar tipos de documento de identidad para Uruguay
INSERT INTO tipo_documento_identidad (nombre, codigo, descripcion, pais_id, activo)
VALUES
  ('Cédula de Identidad', 'CI', 'Cédula de Identidad', '550e8400-e29b-41d4-a716-446655440006', true),
  ('RUT', 'RUT', 'Registro Único Tributario', '550e8400-e29b-41d4-a716-446655440006', true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- Insertar tipos de impuesto para Uruguay
INSERT INTO tipo_impuesto (nombre, codigo, porcentaje, tipo, pais_id, activo)
VALUES
  ('IVA Básica', 'IVA_BASICA', 22.00, 'IVA', '550e8400-e29b-41d4-a716-446655440006', true),
  ('IVA Mínima', 'IVA_MINIMA', 10.00, 'IVA', '550e8400-e29b-41d4-a716-446655440006', true)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- Insertar moneda para Uruguay
INSERT INTO tipo_moneda (nombre, codigo, simbolo, pais_id, activo, es_principal)
VALUES
  ('Peso Uruguayo', 'UYU', '$U', '550e8400-e29b-41d4-a716-446655440006', true, true),
  ('Dólar Americano', 'USD', 'US$', '550e8400-e29b-41d4-a716-446655440006', true, false)
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- Insertar empresas demo para Uruguay
INSERT INTO empresas (id, nombre, razon_social, numero_identificacion, pais_id, subdominio, direccion, telefono, email, moneda_principal, activa, usuarios_asignados)
VALUES
  (
    'a2fb84eb-c91c-4f3e-88c3-4a9c3420009e',
    'Ayala IT S.A.S',
    'Ayala IT S.A.S',
    '219357800013',
    '550e8400-e29b-41d4-a716-446655440006',
    'ayala-it',
    'Montevideo, Uruguay',
    '+598 99 123 456',
    'contacto@ayala-it.com.uy',
    'UYU',
    true,
    ARRAY['e762511c-84ee-4d44-9ee4-802cf5f71d2b']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- Actualizar usuario con empresas asignadas
UPDATE usuarios
SET empresas_asignadas = ARRAY['a2fb84eb-c91c-4f3e-88c3-4a9c3420009e']::text[],
    rol = 'super_admin'
WHERE id = 'e762511c-84ee-4d44-9ee4-802cf5f71d2b';
