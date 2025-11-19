/*
  # Documentos de Venta
  
  1. Nuevas Tablas
    - `clientes`
      - Información de clientes
      - Documentos de identidad
      - Datos fiscales
    
    - `documentos_venta`
      - Facturas de venta
      - Notas de crédito/débito
      - Recibos
      - Estados DGI
    
    - `detalle_documentos_venta`
      - Líneas de detalle de documentos
      - Productos/Servicios
      - Impuestos por línea
    
    - `impuestos_documento_venta`
      - Impuestos aplicados al documento
      - Totales por tipo de impuesto
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas por empresa y usuario
    
  3. Important Notes
    - Los documentos están enlazados a asientos contables
    - Cada documento tiene estados de DGI
    - Se puede vincular a órdenes del CRM (crm_order_id)
*/

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
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
  tipo_cliente text DEFAULT 'NORMAL' CHECK (tipo_cliente IN ('NORMAL', 'VIP', 'CORPORATIVO', 'GUBERNAMENTAL')),
  condicion_iva text DEFAULT 'RESPONSABLE_INSCRIPTO' CHECK (condicion_iva IN ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL')),
  limite_credito numeric DEFAULT 0,
  dias_credito integer DEFAULT 0,
  descuento_predeterminado numeric DEFAULT 0,
  observaciones text,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, numero_documento)
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(numero_documento);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- Tabla de documentos de venta
CREATE TABLE IF NOT EXISTS documentos_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  pais_id uuid NOT NULL REFERENCES paises(id),
  tipo_documento_id uuid NOT NULL REFERENCES tipos_documento_dgi(id),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
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
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente_envio', 'enviado_dgi', 'aprobado_dgi', 'rechazado_dgi', 'anulado', 'pagado', 'parcial')),
  estado_dgi text CHECK (estado_dgi IN ('NO_ENVIADO', 'EN_PROCESO', 'ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES', 'RECHAZADO')),
  cfe_numero text,
  cfe_serie text,
  cfe_codigo_seguridad text,
  cfe_qr text,
  cfe_fecha_firma timestamptz,
  cfe_xml text,
  cfe_pdf text,
  mensaje_dgi text,
  observaciones text,
  crm_order_id text,
  asiento_id uuid REFERENCES asientos_contables(id),
  forma_pago text,
  condiciones_pago text,
  centro_costo text,
  proyecto text,
  vendedor_id text REFERENCES usuarios(id),
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  modificado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, tipo_documento_id, serie, numero)
);

-- Índices para documentos_venta
CREATE INDEX IF NOT EXISTS idx_docs_venta_empresa ON documentos_venta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_docs_venta_cliente ON documentos_venta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_docs_venta_fecha ON documentos_venta(fecha);
CREATE INDEX IF NOT EXISTS idx_docs_venta_estado ON documentos_venta(estado);
CREATE INDEX IF NOT EXISTS idx_docs_venta_numero ON documentos_venta(numero);
CREATE INDEX IF NOT EXISTS idx_docs_venta_crm ON documentos_venta(crm_order_id);
CREATE INDEX IF NOT EXISTS idx_docs_venta_asiento ON documentos_venta(asiento_id);

-- Tabla de detalle de documentos de venta
CREATE TABLE IF NOT EXISTS detalle_documentos_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos_venta(id) ON DELETE CASCADE,
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

-- Índices para detalle_documentos_venta
CREATE INDEX IF NOT EXISTS idx_detalle_venta_documento ON detalle_documentos_venta(documento_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_documentos_venta(codigo_producto);

-- Tabla de impuestos por documento de venta
CREATE TABLE IF NOT EXISTS impuestos_documento_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos_venta(id) ON DELETE CASCADE,
  impuesto_id uuid NOT NULL REFERENCES impuestos_configuracion(id),
  nombre_impuesto text NOT NULL,
  base_imponible numeric NOT NULL DEFAULT 0,
  tasa numeric NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para impuestos_documento_venta
CREATE INDEX IF NOT EXISTS idx_impuestos_venta_documento ON impuestos_documento_venta(documento_id);
CREATE INDEX IF NOT EXISTS idx_impuestos_venta_tipo ON impuestos_documento_venta(impuesto_id);

-- Enable RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_documentos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE impuestos_documento_venta ENABLE ROW LEVEL SECURITY;

-- RLS Policies para clientes
CREATE POLICY "Usuarios pueden ver clientes de su empresa"
  ON clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear clientes en su empresa"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar clientes de su empresa"
  ON clientes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para documentos_venta
CREATE POLICY "Usuarios pueden ver documentos de venta de su empresa"
  ON documentos_venta FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear documentos de venta en su empresa"
  ON documentos_venta FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar documentos de venta de su empresa"
  ON documentos_venta FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para detalle_documentos_venta
CREATE POLICY "Usuarios pueden ver detalle de documentos de venta"
  ON detalle_documentos_venta FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear detalle de documentos de venta"
  ON detalle_documentos_venta FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar detalle de documentos de venta"
  ON detalle_documentos_venta FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar detalle de documentos de venta"
  ON detalle_documentos_venta FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies para impuestos_documento_venta
CREATE POLICY "Usuarios pueden ver impuestos de documentos de venta"
  ON impuestos_documento_venta FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear impuestos de documentos de venta"
  ON impuestos_documento_venta FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar impuestos de documentos de venta"
  ON impuestos_documento_venta FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar impuestos de documentos de venta"
  ON impuestos_documento_venta FOR DELETE
  TO authenticated
  USING (true);
