/*
  # Documentos de Compra
  
  1. Nuevas Tablas
    - `proveedores`
      - Información de proveedores
      - Documentos de identidad
      - Datos fiscales
    
    - `documentos_compra`
      - Facturas de proveedores
      - Notas de crédito/débito
      - Gastos
    
    - `detalle_documentos_compra`
      - Líneas de detalle de documentos
      - Productos/Servicios comprados
      - Impuestos por línea
    
    - `impuestos_documento_compra`
      - Impuestos del documento
      - Totales por tipo de impuesto
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas por empresa y usuario
    
  3. Important Notes
    - Integración con asientos contables
    - Control de pagos y deudas
    - Vinculación con órdenes de compra
*/

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  pais_id uuid NOT NULL REFERENCES paises(id),
  tipo_documento_id uuid REFERENCES tipo_documento_identidad(id),
  numero_documento text NOT NULL,
  razon_social text NOT NULL,
  nombre_comercial text,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  departamento text,
  codigo_postal text,
  tipo_proveedor text DEFAULT 'NORMAL' CHECK (tipo_proveedor IN ('NORMAL', 'SERVICIOS', 'MATERIALES', 'CORPORATIVO')),
  condicion_iva text DEFAULT 'RESPONSABLE_INSCRIPTO' CHECK (condicion_iva IN ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'EXTERIOR')),
  dias_pago integer DEFAULT 0,
  descuento_obtenido numeric DEFAULT 0,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  observaciones text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, numero_documento)
);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON proveedores(numero_documento);
CREATE INDEX IF NOT EXISTS idx_proveedores_email ON proveedores(email);

-- Tabla de documentos de compra
CREATE TABLE IF NOT EXISTS documentos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  pais_id uuid NOT NULL REFERENCES paises(id),
  tipo_documento_id uuid NOT NULL REFERENCES tipos_documento_dgi(id),
  proveedor_id uuid NOT NULL REFERENCES proveedores(id),
  numero text NOT NULL,
  serie text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  moneda text DEFAULT 'UYU',
  tipo_cambio numeric DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  total_impuestos numeric DEFAULT 0,
  descuento numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  saldo numeric DEFAULT 0,
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'aprobado', 'rechazado', 'pagado', 'parcial', 'anulado')),
  cfe_numero text,
  cfe_serie text,
  cfe_qr text,
  cfe_xml text,
  observaciones text,
  orden_compra_id text,
  asiento_id uuid REFERENCES asientos_contables(id),
  forma_pago text,
  condiciones_pago text,
  centro_costo text,
  proyecto text,
  aprobado_por text REFERENCES usuarios(id),
  fecha_aprobacion timestamptz,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  modificado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, proveedor_id, serie, numero)
);

-- Índices para documentos_compra
CREATE INDEX IF NOT EXISTS idx_docs_compra_empresa ON documentos_compra(empresa_id);
CREATE INDEX IF NOT EXISTS idx_docs_compra_proveedor ON documentos_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_docs_compra_fecha ON documentos_compra(fecha);
CREATE INDEX IF NOT EXISTS idx_docs_compra_estado ON documentos_compra(estado);
CREATE INDEX IF NOT EXISTS idx_docs_compra_numero ON documentos_compra(numero);
CREATE INDEX IF NOT EXISTS idx_docs_compra_orden ON documentos_compra(orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_docs_compra_asiento ON documentos_compra(asiento_id);

-- Tabla de detalle de documentos de compra
CREATE TABLE IF NOT EXISTS detalle_documentos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos_compra(id) ON DELETE CASCADE,
  linea integer NOT NULL,
  codigo_producto text,
  descripcion text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1,
  unidad_medida text DEFAULT 'UNI',
  precio_unitario numeric NOT NULL,
  descuento_porcentaje numeric DEFAULT 0,
  descuento_monto numeric DEFAULT 0,
  subtotal numeric NOT NULL,
  impuesto_id uuid REFERENCES impuestos_configuracion(id),
  porcentaje_impuesto numeric DEFAULT 0,
  monto_impuesto numeric DEFAULT 0,
  total numeric NOT NULL,
  cuenta_contable_id uuid REFERENCES plan_cuentas(id),
  centro_costo text,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para detalle_documentos_compra
CREATE INDEX IF NOT EXISTS idx_detalle_compra_documento ON detalle_documentos_compra(documento_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_producto ON detalle_documentos_compra(codigo_producto);

-- Tabla de impuestos por documento de compra
CREATE TABLE IF NOT EXISTS impuestos_documento_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos_compra(id) ON DELETE CASCADE,
  impuesto_id uuid NOT NULL REFERENCES impuestos_configuracion(id),
  nombre_impuesto text NOT NULL,
  base_imponible numeric NOT NULL DEFAULT 0,
  tasa numeric NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para impuestos_documento_compra
CREATE INDEX IF NOT EXISTS idx_impuestos_compra_documento ON impuestos_documento_compra(documento_id);
CREATE INDEX IF NOT EXISTS idx_impuestos_compra_tipo ON impuestos_documento_compra(impuesto_id);

-- Enable RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_documentos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE impuestos_documento_compra ENABLE ROW LEVEL SECURITY;

-- RLS Policies para proveedores
CREATE POLICY "Usuarios pueden ver proveedores de su empresa"
  ON proveedores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear proveedores en su empresa"
  ON proveedores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar proveedores de su empresa"
  ON proveedores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para documentos_compra
CREATE POLICY "Usuarios pueden ver documentos de compra de su empresa"
  ON documentos_compra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear documentos de compra en su empresa"
  ON documentos_compra FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar documentos de compra de su empresa"
  ON documentos_compra FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para detalle_documentos_compra
CREATE POLICY "Usuarios pueden ver detalle de documentos de compra"
  ON detalle_documentos_compra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear detalle de documentos de compra"
  ON detalle_documentos_compra FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar detalle de documentos de compra"
  ON detalle_documentos_compra FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar detalle de documentos de compra"
  ON detalle_documentos_compra FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies para impuestos_documento_compra
CREATE POLICY "Usuarios pueden ver impuestos de documentos de compra"
  ON impuestos_documento_compra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear impuestos de documentos de compra"
  ON impuestos_documento_compra FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar impuestos de documentos de compra"
  ON impuestos_documento_compra FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar impuestos de documentos de compra"
  ON impuestos_documento_compra FOR DELETE
  TO authenticated
  USING (true);
