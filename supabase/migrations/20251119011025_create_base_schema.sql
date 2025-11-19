/*
  # Esquema Base del Sistema de Contabilidad Multiempresa

  ## Tablas Principales

  ### Países y Nomencladores
  - `paises` - Países soportados por el sistema
  - `tipo_documento_identidad` - Tipos de documentos de identidad por país
  - `tipo_documento_factura` - Tipos de documentos fiscales por país
  - `tipo_impuesto` - Tipos de impuestos por país
  - `tipo_moneda` - Monedas por país
  - `forma_pago` - Formas de pago por país
  - `tipo_movimiento_tesoreria` - Tipos de movimiento de tesorería
  - `bancos` - Bancos por país
  - `unidad_medida` - Unidades de medida
  - `categoria_producto` - Categorías de productos/servicios

  ### Usuarios y Empresas
  - `usuarios` - Usuarios del sistema con sus roles
  - `empresas` - Empresas registradas en el sistema

  ## Seguridad
  - Se habilita RLS en todas las tablas
  - Políticas restrictivas basadas en empresaId y usuarioId
  - Solo usuarios autenticados pueden acceder a los datos
*/

-- =====================================================
-- EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: paises
-- =====================================================
CREATE TABLE IF NOT EXISTS paises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text UNIQUE NOT NULL,
  codigo_iso text UNIQUE NOT NULL,
  moneda_principal text NOT NULL,
  simbolo_moneda text NOT NULL,
  formato_fecha text DEFAULT 'DD/MM/YYYY',
  separador_decimal text DEFAULT '.',
  separador_miles text DEFAULT ',',
  formato_numero_identificacion text,
  longitud_numero_identificacion integer,
  validacion_numero_identificacion text,
  plan_contable_base uuid,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now()
);

ALTER TABLE paises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer países activos"
  ON paises FOR SELECT
  TO authenticated
  USING (activo = true);

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  email text UNIQUE NOT NULL,
  rol text NOT NULL CHECK (rol IN ('super_admin', 'admin_empresa', 'contador', 'usuario')),
  empresas_asignadas text[] DEFAULT '{}',
  permisos text[] DEFAULT '{}',
  avatar text,
  pais_id uuid REFERENCES paises(id),
  auth0_id text,
  fecha_creacion timestamptz DEFAULT now(),
  ultima_conexion timestamptz,
  activo boolean DEFAULT true,
  configuracion jsonb DEFAULT '{
    "idioma": "es",
    "timezone": "America/Lima",
    "formato_fecha": "DD/MM/YYYY",
    "formato_moneda": "S/."
  }'::jsonb
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden leer su propia información"
  ON usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY "Usuarios pueden actualizar su propia información"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- =====================================================
-- TABLA: empresas
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  razon_social text NOT NULL,
  numero_identificacion text NOT NULL,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  subdominio text UNIQUE,
  direccion text,
  telefono text,
  email text,
  moneda_principal text NOT NULL,
  logo text,
  activa boolean DEFAULT true,
  usuarios_asignados text[] DEFAULT '{}',
  plan_contable_id uuid,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_actualizacion timestamptz DEFAULT now(),
  configuracion_contable jsonb DEFAULT '{
    "ejercicio_fiscal": 2024,
    "fecha_inicio_ejercicio": "2024-01-01",
    "fecha_fin_ejercicio": "2024-12-31",
    "metodo_costeo": "PROMEDIO",
    "tipo_inventario": "PERPETUO",
    "maneja_inventario": true,
    "decimales_moneda": 2,
    "decimales_cantidades": 2,
    "numeracion_automatica": true,
    "prefijo_asientos": "ASI",
    "longitud_numeracion": 6,
    "regimen_tributario": "",
    "configuracion_impuestos": []
  }'::jsonb
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver empresas asignadas"
  ON empresas FOR SELECT
  TO authenticated
  USING (auth.uid()::text = ANY(usuarios_asignados));

CREATE POLICY "Admin empresa puede actualizar su empresa"
  ON empresas FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = ANY(usuarios_asignados))
  WITH CHECK (auth.uid()::text = ANY(usuarios_asignados));

CREATE POLICY "Super admin puede insertar empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()::text
      AND usuarios.rol = 'super_admin'
    )
  );

-- =====================================================
-- NOMENCLADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS tipo_documento_identidad (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipo_documento_identidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer tipos de documento activos"
  ON tipo_documento_identidad FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS tipo_documento_factura (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  requiere_impuesto boolean DEFAULT true,
  requiere_cliente boolean DEFAULT true,
  afecta_inventario boolean DEFAULT true,
  afecta_contabilidad boolean DEFAULT true,
  prefijo text,
  formato text,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipo_documento_factura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer tipos de documento factura activos"
  ON tipo_documento_factura FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS tipo_impuesto (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  porcentaje numeric(5,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('IVA', 'IGV', 'ISR', 'RETENCION', 'OTRO')),
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  cuenta_contable_id uuid,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipo_impuesto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer tipos de impuesto activos"
  ON tipo_impuesto FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS tipo_moneda (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  simbolo text NOT NULL,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  es_principal boolean DEFAULT false,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipo_moneda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer tipos de moneda activos"
  ON tipo_moneda FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS forma_pago (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  requiere_banco boolean DEFAULT false,
  requiere_referencia boolean DEFAULT false,
  requiere_fecha boolean DEFAULT false,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE forma_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer formas de pago activas"
  ON forma_pago FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS tipo_movimiento_tesoreria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  afecta_saldo boolean DEFAULT true,
  requiere_referencia boolean DEFAULT false,
  requiere_documento boolean DEFAULT false,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE tipo_movimiento_tesoreria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer tipos de movimiento activos"
  ON tipo_movimiento_tesoreria FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS bancos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer bancos activos"
  ON bancos FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS unidad_medida (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  simbolo text NOT NULL,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE unidad_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer unidades de medida activas"
  ON unidad_medida FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE TABLE IF NOT EXISTS categoria_producto (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  codigo text NOT NULL,
  descripcion text,
  pais_id uuid REFERENCES paises(id) NOT NULL,
  activo boolean DEFAULT true,
  cuenta_contable_id uuid,
  UNIQUE(codigo, pais_id)
);

ALTER TABLE categoria_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer categorías de producto activas"
  ON categoria_producto FOR SELECT
  TO authenticated
  USING (activo = true);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tipo_doc_identidad_pais ON tipo_documento_identidad(pais_id);
CREATE INDEX IF NOT EXISTS idx_tipo_doc_factura_pais ON tipo_documento_factura(pais_id);
CREATE INDEX IF NOT EXISTS idx_tipo_impuesto_pais ON tipo_impuesto(pais_id);
CREATE INDEX IF NOT EXISTS idx_tipo_moneda_pais ON tipo_moneda(pais_id);
CREATE INDEX IF NOT EXISTS idx_forma_pago_pais ON forma_pago(pais_id);
CREATE INDEX IF NOT EXISTS idx_tipo_mov_tesoreria_pais ON tipo_movimiento_tesoreria(pais_id);
CREATE INDEX IF NOT EXISTS idx_bancos_pais ON bancos(pais_id);
CREATE INDEX IF NOT EXISTS idx_unidad_medida_pais ON unidad_medida(pais_id);
CREATE INDEX IF NOT EXISTS idx_categoria_producto_pais ON categoria_producto(pais_id);
CREATE INDEX IF NOT EXISTS idx_empresas_pais ON empresas(pais_id);
CREATE INDEX IF NOT EXISTS idx_empresas_activa ON empresas(activa);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
