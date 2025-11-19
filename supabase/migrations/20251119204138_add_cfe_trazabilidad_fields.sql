/*
  # Agregar Campos de Trazabilidad CFE

  1. Modificaciones
    - Agregar campos para almacenar respuesta completa de CFE
    - `dgi_id` - ID del comprobante en el sistema CFE
    - `dgi_serie` - Serie del comprobante (ej: "MT")
    - `dgi_numero` - Número del comprobante CFE
    - `dgi_hash` - Hash de validación del CFE
    - `dgi_cae_numero` - Número del CAE
    - `dgi_cae_serie` - Serie del CAE
    - `dgi_cae_vencimiento` - Fecha de vencimiento del CAE
    - `dgi_detalle_completo` - JSON con toda la información del CFE

  2. Propósito
    - Mantener trazabilidad completa de facturas electrónicas
    - Permitir auditoría y verificación de CFE
*/

-- Agregar campos de trazabilidad CFE a facturas_venta
DO $$
BEGIN
  -- ID del comprobante CFE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_id'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_id integer;
  END IF;

  -- Serie del comprobante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_serie'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_serie text;
  END IF;

  -- Número del comprobante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_numero'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_numero integer;
  END IF;

  -- Hash de validación
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_hash'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_hash text;
  END IF;

  -- Número del CAE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_cae_numero'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_cae_numero text;
  END IF;

  -- Serie del CAE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_cae_serie'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_cae_serie text;
  END IF;

  -- Fecha de vencimiento del CAE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_cae_vencimiento'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_cae_vencimiento date;
  END IF;

  -- Detalle completo del CFE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'dgi_detalle_completo'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN dgi_detalle_completo jsonb;
  END IF;
END $$;

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_facturas_venta_dgi_id ON facturas_venta(dgi_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_dgi_numero ON facturas_venta(dgi_numero);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_dgi_cae_numero ON facturas_venta(dgi_cae_numero);
