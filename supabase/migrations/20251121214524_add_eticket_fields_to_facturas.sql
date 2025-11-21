/*
  # Agregar campos para e-Tickets

  1. Cambios
    - Agregar campo `numero_orden` para ordenes externas
    - Agregar campo `lugar_entrega` para información de entrega
    - Agregar campo `adenda` para información adicional
    - Agregar campo `orden_externa_id` para referencia externa

  2. Notas
    - Campos opcionales para soportar tanto e-tickets como e-facturas
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'numero_orden'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN numero_orden text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'lugar_entrega'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN lugar_entrega text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'adenda'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN adenda text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'facturas_venta' AND column_name = 'orden_externa_id'
  ) THEN
    ALTER TABLE facturas_venta ADD COLUMN orden_externa_id text;
  END IF;
END $$;
