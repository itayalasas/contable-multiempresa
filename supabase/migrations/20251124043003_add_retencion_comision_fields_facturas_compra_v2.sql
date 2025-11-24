/*
  # Agregar campos de retención y comisión a facturas_compra

  ## Descripción
  Agrega campos necesarios para el manejo de facturas de compra a partners,
  incluyendo retenciones (ej. Mercado Libre), comisiones y tracking.

  ## Cambios
  
  1. **Nuevos campos en facturas_compra**
     - `retencion_porcentaje` (decimal): % de retención aplicada (ej. retención ML)
     - `retencion_monto` (decimal): Monto de retención en pesos
     - `comision_sistema_porcentaje` (decimal): % que se queda el sistema
     - `comision_sistema_monto` (decimal): Monto de comisión del sistema
     - `monto_transferir_partner` (decimal): Monto neto a transferir al partner
     - `lote_comisiones_id` (uuid): Referencia al lote de comisiones que originó esta factura
     - `partner_id` (uuid): Referencia al partner/aliado
     - `tipo_factura_compra` (text): Tipo específico (normal, partner_pago, etc.)

  ## Notas
  - Los campos son opcionales para mantener compatibilidad con facturas de compra regulares
  - El campo `monto_transferir_partner` es lo que efectivamente se paga al partner
  - La retención + comisión del sistema se quedan en cuentas de ingreso
*/

-- Agregar campos a facturas_compra
DO $$
BEGIN
  -- Retención (ej. Mercado Libre)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'retencion_porcentaje'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN retencion_porcentaje NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'retencion_monto'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN retencion_monto NUMERIC(15,2) DEFAULT 0;
  END IF;

  -- Comisión del sistema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'comision_sistema_porcentaje'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN comision_sistema_porcentaje NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'comision_sistema_monto'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN comision_sistema_monto NUMERIC(15,2) DEFAULT 0;
  END IF;

  -- Monto neto a transferir al partner
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'monto_transferir_partner'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN monto_transferir_partner NUMERIC(15,2) DEFAULT 0;
  END IF;

  -- Referencias
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'lote_comisiones_id'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN lote_comisiones_id UUID REFERENCES lotes_facturacion_partners(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN partner_id UUID REFERENCES partners_aliados(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'tipo_factura_compra'
  ) THEN
    ALTER TABLE facturas_compra ADD COLUMN tipo_factura_compra TEXT DEFAULT 'normal' CHECK (tipo_factura_compra IN ('normal', 'partner_pago', 'servicio', 'producto'));
  END IF;

END $$;

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_facturas_compra_partner ON facturas_compra(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_compra_lote ON facturas_compra(lote_comisiones_id) WHERE lote_comisiones_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_compra_tipo ON facturas_compra(tipo_factura_compra);

-- Comentarios
COMMENT ON COLUMN facturas_compra.retencion_porcentaje IS 'Porcentaje de retención aplicada (ej. retención de Mercado Libre)';
COMMENT ON COLUMN facturas_compra.retencion_monto IS 'Monto en pesos de la retención aplicada';
COMMENT ON COLUMN facturas_compra.comision_sistema_porcentaje IS 'Porcentaje de comisión que se queda el sistema';
COMMENT ON COLUMN facturas_compra.comision_sistema_monto IS 'Monto en pesos de comisión del sistema';
COMMENT ON COLUMN facturas_compra.monto_transferir_partner IS 'Monto neto a transferir al partner (después de retenciones y comisiones)';
COMMENT ON COLUMN facturas_compra.lote_comisiones_id IS 'Referencia al lote de comisiones que originó esta factura';
COMMENT ON COLUMN facturas_compra.partner_id IS 'Referencia al partner/aliado si esta factura es para pago de comisiones';
COMMENT ON COLUMN facturas_compra.tipo_factura_compra IS 'Tipo específico de factura: normal, partner_pago, servicio, producto';
