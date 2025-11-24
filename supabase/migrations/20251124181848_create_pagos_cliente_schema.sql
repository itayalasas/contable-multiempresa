/*
  # Crear esquema de pagos de clientes

  1. Nuevas Tablas
    - `pagos_cliente`: Registra los pagos recibidos de clientes
      - `id` (uuid, primary key)
      - `factura_id` (uuid, foreign key a facturas_venta)
      - `fecha_pago` (date)
      - `monto` (numeric)
      - `tipo_pago` (text): EFECTIVO, TRANSFERENCIA, CHEQUE, TARJETA_CREDITO, etc.
      - `referencia` (text): Número de operación, cheque, etc.
      - `observaciones` (text)
      - `creado_por` (text)
      - `fecha_creacion` (timestamptz)
      - `asiento_contable_id` (uuid, foreign key a asientos_contables)

  2. Seguridad
    - Habilitar RLS en la tabla `pagos_cliente`
    - Agregar políticas para usuarios autenticados y service_role
*/

-- Crear tabla pagos_cliente
CREATE TABLE IF NOT EXISTS pagos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES facturas_venta(id) ON DELETE CASCADE,
  fecha_pago date NOT NULL,
  monto numeric(15,2) NOT NULL CHECK (monto > 0),
  tipo_pago text NOT NULL,
  referencia text,
  observaciones text,
  creado_por text NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  asiento_contable_id uuid REFERENCES asientos_contables(id) ON DELETE SET NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_factura ON pagos_cliente(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_fecha ON pagos_cliente(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_asiento ON pagos_cliente(asiento_contable_id);

-- Habilitar RLS
ALTER TABLE pagos_cliente ENABLE ROW LEVEL SECURITY;

-- Política para service_role (acceso completo)
CREATE POLICY "Service role can manage all pagos_cliente"
  ON pagos_cliente
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política SELECT para usuarios autenticados (ver pagos de su empresa)
CREATE POLICY "Users can view pagos_cliente of their company"
  ON pagos_cliente
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      WHERE fv.id = pagos_cliente.factura_id
    )
  );

-- Política INSERT para usuarios autenticados
CREATE POLICY "Users can insert pagos_cliente"
  ON pagos_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas_venta fv
      WHERE fv.id = pagos_cliente.factura_id
    )
  );
