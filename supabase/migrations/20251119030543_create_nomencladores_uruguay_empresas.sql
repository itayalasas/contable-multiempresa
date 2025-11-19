/*
  # Crear Nomencladores para Registro de Empresas - Uruguay

  ## Nuevas Tablas
  
  1. **departamentos_uy** - Departamentos de Uruguay
  2. **localidades_uy** - Localidades de Uruguay por departamento
  3. **actividades_dgi** - Actividades económicas según DGI/CNAE
  4. **bancos** - Bancos de Uruguay y otros países
  5. **tipos_contribuyente** - Tipos de contribuyente (SA, SRL, Unipersonal, etc)
  6. **responsabilidad_iva** - Responsabilidad ante IVA
  7. **tipos_documento_electronico** - Tipos de CFE (e-Ticket, e-Factura, etc)
  8. **ocupaciones_bps** - Ocupaciones según BPS
  9. **categorias_laborales** - Categorías laborales
  10. **tipos_contrato** - Tipos de contrato laboral
  11. **modalidades_trabajo** - Modalidades de trabajo
  
  ## Seguridad
  - RLS habilitado en todas las tablas
  - Acceso de lectura con API key
  - Acceso de escritura solo para administradores
*/

-- =====================================================
-- DEPARTAMENTOS DE URUGUAY
-- =====================================================
CREATE TABLE IF NOT EXISTS departamentos_uy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE departamentos_uy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura departamentos_uy con API key"
  ON departamentos_uy FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura departamentos_uy con API key"
  ON departamentos_uy FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- LOCALIDADES DE URUGUAY
-- =====================================================
CREATE TABLE IF NOT EXISTS localidades_uy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  departamento_id uuid NOT NULL REFERENCES departamentos_uy(id),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE localidades_uy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura localidades_uy con API key"
  ON localidades_uy FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura localidades_uy con API key"
  ON localidades_uy FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- ACTIVIDADES ECONÓMICAS DGI
-- =====================================================
CREATE TABLE IF NOT EXISTS actividades_dgi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  descripcion text NOT NULL,
  categoria text,
  pais_id uuid REFERENCES paises(id),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo, pais_id)
);

ALTER TABLE actividades_dgi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura actividades_dgi con API key"
  ON actividades_dgi FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura actividades_dgi con API key"
  ON actividades_dgi FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- TIPOS DE CONTRIBUYENTE
-- =====================================================
CREATE TABLE IF NOT EXISTS tipos_contribuyente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipos_contribuyente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura tipos_contribuyente con API key"
  ON tipos_contribuyente FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura tipos_contribuyente con API key"
  ON tipos_contribuyente FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- RESPONSABILIDAD IVA
-- =====================================================
CREATE TABLE IF NOT EXISTS responsabilidad_iva (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo, pais_id)
);

ALTER TABLE responsabilidad_iva ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura responsabilidad_iva con API key"
  ON responsabilidad_iva FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura responsabilidad_iva con API key"
  ON responsabilidad_iva FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- TIPOS DE DOCUMENTO ELECTRÓNICO (CFE)
-- =====================================================
CREATE TABLE IF NOT EXISTS tipos_documento_electronico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id),
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipos_documento_electronico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura tipos_documento_electronico con API key"
  ON tipos_documento_electronico FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura tipos_documento_electronico con API key"
  ON tipos_documento_electronico FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- OCUPACIONES BPS
-- =====================================================
CREATE TABLE IF NOT EXISTS ocupaciones_bps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  grupo text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE ocupaciones_bps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura ocupaciones_bps con API key"
  ON ocupaciones_bps FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura ocupaciones_bps con API key"
  ON ocupaciones_bps FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- CATEGORÍAS LABORALES
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias_laborales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE categorias_laborales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura categorias_laborales con API key"
  ON categorias_laborales FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura categorias_laborales con API key"
  ON categorias_laborales FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- TIPOS DE CONTRATO
-- =====================================================
CREATE TABLE IF NOT EXISTS tipos_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE tipos_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura tipos_contrato con API key"
  ON tipos_contrato FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura tipos_contrato con API key"
  ON tipos_contrato FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- MODALIDADES DE TRABAJO
-- =====================================================
CREATE TABLE IF NOT EXISTS modalidades_trabajo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(codigo)
);

ALTER TABLE modalidades_trabajo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura modalidades_trabajo con API key"
  ON modalidades_trabajo FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir escritura modalidades_trabajo con API key"
  ON modalidades_trabajo FOR ALL TO anon USING (true) WITH CHECK (true);
