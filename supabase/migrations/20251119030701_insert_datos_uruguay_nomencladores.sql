/*
  # Insertar Datos de Uruguay - Nomencladores

  ## Datos insertados
  
  1. Departamentos de Uruguay (19)
  2. Localidades principales por departamento
  3. Actividades económicas DGI más comunes
  4. Tipos de contribuyente Uruguay
  5. Responsabilidad IVA Uruguay
  6. Tipos de documento electrónico (CFE)
  7. Ocupaciones BPS principales
  8. Categorías laborales
  9. Tipos de contrato
  10. Modalidades de trabajo
*/

-- =====================================================
-- DEPARTAMENTOS DE URUGUAY
-- =====================================================
INSERT INTO departamentos_uy (codigo, nombre) VALUES
  ('01', 'Artigas'),
  ('02', 'Canelones'),
  ('03', 'Cerro Largo'),
  ('04', 'Colonia'),
  ('05', 'Durazno'),
  ('06', 'Flores'),
  ('07', 'Florida'),
  ('08', 'Lavalleja'),
  ('09', 'Maldonado'),
  ('10', 'Montevideo'),
  ('11', 'Paysandú'),
  ('12', 'Río Negro'),
  ('13', 'Rivera'),
  ('14', 'Rocha'),
  ('15', 'Salto'),
  ('16', 'San José'),
  ('17', 'Soriano'),
  ('18', 'Tacuarembó'),
  ('19', 'Treinta y Tres')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- LOCALIDADES PRINCIPALES
-- =====================================================
INSERT INTO localidades_uy (codigo, nombre, departamento_id)
SELECT '10001', 'Montevideo', id FROM departamentos_uy WHERE codigo = '10'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO localidades_uy (codigo, nombre, departamento_id)
SELECT '02001', 'Canelones', id FROM departamentos_uy WHERE codigo = '02'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO localidades_uy (codigo, nombre, departamento_id)
SELECT '09001', 'Maldonado', id FROM departamentos_uy WHERE codigo = '09'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO localidades_uy (codigo, nombre, departamento_id)
SELECT '15001', 'Salto', id FROM departamentos_uy WHERE codigo = '15'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO localidades_uy (codigo, nombre, departamento_id)
SELECT '11001', 'Paysandú', id FROM departamentos_uy WHERE codigo = '11'
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- ACTIVIDADES ECONÓMICAS DGI
-- =====================================================
INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '471110', 'Comercio al por menor en comercios no especializados con predominio de la venta de alimentos, bebidas o tabaco', 'Comercio', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '620900', 'Otras actividades de tecnología de la información y servicios informáticos', 'Tecnología', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '691000', 'Actividades jurídicas', 'Servicios Profesionales', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '692000', 'Actividades de contabilidad, teneduría de libros y auditoría; consultoría fiscal', 'Servicios Profesionales', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '561010', 'Restaurantes y parrilladas', 'Gastronomía', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '551000', 'Hoteles y otros tipos de alojamiento turístico', 'Turismo', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO actividades_dgi (codigo, descripcion, categoria, pais_id)
SELECT '412000', 'Construcción de edificios', 'Construcción', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- TIPOS DE CONTRIBUYENTE
-- =====================================================
INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'UNIPERSONAL', 'Unipersonal', 'Empresa unipersonal', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'SA', 'Sociedad Anónima', 'Sociedad Anónima', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'SRL', 'Sociedad de Responsabilidad Limitada', 'Sociedad de Responsabilidad Limitada', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'SAS', 'Sociedad por Acciones Simplificada', 'Sociedad por Acciones Simplificada', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'COOPERATIVA', 'Cooperativa', 'Cooperativa', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_contribuyente (codigo, nombre, descripcion, pais_id)
SELECT 'SOCIEDAD_CIVIL', 'Sociedad Civil', 'Sociedad Civil', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- RESPONSABILIDAD IVA
-- =====================================================
INSERT INTO responsabilidad_iva (codigo, nombre, descripcion, pais_id)
SELECT 'RESPONSABLE_INSCRIPTO', 'Responsable Inscripto', 'Contribuyente inscripto en IVA', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO responsabilidad_iva (codigo, nombre, descripcion, pais_id)
SELECT 'NO_IVA', 'No IVA', 'No factura IVA', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO responsabilidad_iva (codigo, nombre, descripcion, pais_id)
SELECT 'EXPORTADOR', 'Exportador', 'Exportador - IVA 0%', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO responsabilidad_iva (codigo, nombre, descripcion, pais_id)
SELECT 'EXENTO', 'Exento', 'Exento de IVA', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- TIPOS DE DOCUMENTO ELECTRÓNICO (CFE)
-- =====================================================
INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '101', 'e-Ticket', 'Comprobante Electrónico Ticket', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '111', 'e-Factura', 'Comprobante Electrónico Factura', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '112', 'Nota de Crédito e-Factura', 'Nota de Crédito de e-Factura', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '113', 'Nota de Débito e-Factura', 'Nota de Débito de e-Factura', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '121', 'e-Remito', 'Comprobante Electrónico Remito', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '181', 'e-Factura de Exportación', 'Factura de Exportación Electrónica', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

INSERT INTO tipos_documento_electronico (codigo, nombre, descripcion, pais_id)
SELECT '182', 'e-Resguardo', 'Comprobante Electrónico Resguardo', id 
FROM paises WHERE codigo = 'UY'
ON CONFLICT (codigo, pais_id) DO NOTHING;

-- =====================================================
-- OCUPACIONES BPS
-- =====================================================
INSERT INTO ocupaciones_bps (codigo, nombre, descripcion, grupo) VALUES
  ('001', 'Empleado Administrativo', 'Empleado de oficina', 'Administrativos'),
  ('002', 'Vendedor', 'Vendedor de comercio', 'Ventas'),
  ('003', 'Contador', 'Contador profesional', 'Profesionales'),
  ('004', 'Desarrollador', 'Desarrollador de software', 'Tecnología'),
  ('005', 'Gerente', 'Gerente general o de área', 'Dirección'),
  ('006', 'Operario', 'Operario de producción', 'Producción'),
  ('007', 'Chofer', 'Conductor de vehículos', 'Transporte'),
  ('008', 'Obrero', 'Obrero de construcción', 'Construcción'),
  ('009', 'Maestro', 'Maestro o profesor', 'Educación'),
  ('010', 'Enfermero', 'Enfermero profesional', 'Salud')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- CATEGORÍAS LABORALES
-- =====================================================
INSERT INTO categorias_laborales (codigo, nombre, descripcion) VALUES
  ('JORNALERO', 'Jornalero', 'Trabajador por jornal'),
  ('MENSUAL', 'Mensual', 'Trabajador mensual'),
  ('DESTAJO', 'Destajo', 'Trabajador a destajo'),
  ('COMISION', 'Por Comisión', 'Trabajador con sueldo a comisión'),
  ('HONORARIOS', 'Honorarios', 'Profesional con honorarios')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- TIPOS DE CONTRATO
-- =====================================================
INSERT INTO tipos_contrato (codigo, nombre, descripcion) VALUES
  ('INDEFINIDO', 'Contrato Indefinido', 'Contrato por tiempo indeterminado'),
  ('PLAZO_FIJO', 'Contrato a Plazo Fijo', 'Contrato por tiempo determinado'),
  ('ZAFRAL', 'Contrato Zafral', 'Contrato para trabajo zafral o estacional'),
  ('PRUEBA', 'Período de Prueba', 'Contrato en período de prueba'),
  ('PASANTIA', 'Pasantía', 'Contrato de pasantía o práctica')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- MODALIDADES DE TRABAJO
-- =====================================================
INSERT INTO modalidades_trabajo (codigo, nombre, descripcion) VALUES
  ('TIEMPO_COMPLETO', 'Tiempo Completo', 'Jornada de 8 horas'),
  ('TIEMPO_PARCIAL', 'Tiempo Parcial', 'Jornada reducida'),
  ('TURNO_NOCTURNO', 'Turno Nocturno', 'Trabajo en horario nocturno'),
  ('REMOTO', 'Remoto', 'Teletrabajo o trabajo remoto'),
  ('HIBRIDO', 'Híbrido', 'Combinación presencial y remoto')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- AGREGAR PAÍS URUGUAY SI NO EXISTE
-- =====================================================
INSERT INTO paises (id, nombre, codigo, codigo_iso, moneda_principal, simbolo_moneda, formato_fecha, separador_decimal, separador_miles, activo)
VALUES
  ('550e8400-e29b-41d4-a716-446655440006', 'Uruguay', 'UY', 'URY', 'UYU', '$U', 'DD/MM/YYYY', ',', '.', true)
ON CONFLICT (codigo) DO NOTHING;
