/*
  # Agregar campos para gestión de períodos cerrados
  
  1. Cambios en facturas_venta
    - Agregar `periodo_contable_id` para vincular factura a período
    - Agregar `ocultar_en_listados` para ocultar facturas de períodos cerrados
  
  2. Cambios en facturas_compra  
    - Agregar `periodo_contable_id` para vincular factura a período
    - Agregar `ocultar_en_listados` para ocultar facturas de períodos cerrados
  
  3. Cambios en comisiones_partners
    - Agregar `periodo_contable_id` para vincular comisión a período
    - Agregar `ocultar_en_listados` para ocultar comisiones de períodos cerrados
  
  4. Notas importantes
    - `ocultar_en_listados` se activa al cerrar el período
    - Se desactiva al reabrir el período
    - Los registros NO se eliminan, solo se ocultan en dashboards
    - El período se determina por la fecha_emision
*/

-- Agregar campos a facturas_venta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_venta' AND column_name = 'periodo_contable_id'
  ) THEN
    ALTER TABLE facturas_venta 
    ADD COLUMN periodo_contable_id uuid REFERENCES periodos_contables(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_venta' AND column_name = 'ocultar_en_listados'
  ) THEN
    ALTER TABLE facturas_venta 
    ADD COLUMN ocultar_en_listados boolean DEFAULT false;
  END IF;
END $$;

-- Agregar campos a facturas_compra
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'periodo_contable_id'
  ) THEN
    ALTER TABLE facturas_compra 
    ADD COLUMN periodo_contable_id uuid REFERENCES periodos_contables(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'ocultar_en_listados'
  ) THEN
    ALTER TABLE facturas_compra 
    ADD COLUMN ocultar_en_listados boolean DEFAULT false;
  END IF;
END $$;

-- Agregar campos a comisiones_partners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comisiones_partners' AND column_name = 'periodo_contable_id'
  ) THEN
    ALTER TABLE comisiones_partners 
    ADD COLUMN periodo_contable_id uuid REFERENCES periodos_contables(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comisiones_partners' AND column_name = 'ocultar_en_listados'
  ) THEN
    ALTER TABLE comisiones_partners 
    ADD COLUMN ocultar_en_listados boolean DEFAULT false;
  END IF;
END $$;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_facturas_venta_periodo ON facturas_venta(periodo_contable_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_ocultar ON facturas_venta(ocultar_en_listados);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_periodo ON facturas_compra(periodo_contable_id);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_ocultar ON facturas_compra(ocultar_en_listados);
CREATE INDEX IF NOT EXISTS idx_comisiones_partners_periodo ON comisiones_partners(periodo_contable_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_partners_ocultar ON comisiones_partners(ocultar_en_listados);

-- Comentarios explicativos
COMMENT ON COLUMN facturas_venta.periodo_contable_id IS 'Período contable al que pertenece la factura (según fecha_emision)';
COMMENT ON COLUMN facturas_venta.ocultar_en_listados IS 'Si true, no mostrar en dashboards ni listados (usado cuando el período está cerrado)';
COMMENT ON COLUMN facturas_compra.periodo_contable_id IS 'Período contable al que pertenece la factura (según fecha_emision)';
COMMENT ON COLUMN facturas_compra.ocultar_en_listados IS 'Si true, no mostrar en dashboards ni listados (usado cuando el período está cerrado)';
COMMENT ON COLUMN comisiones_partners.periodo_contable_id IS 'Período contable al que pertenece la comisión (según fecha)';
COMMENT ON COLUMN comisiones_partners.ocultar_en_listados IS 'Si true, no mostrar en dashboards ni listados (usado cuando el período está cerrado)';
