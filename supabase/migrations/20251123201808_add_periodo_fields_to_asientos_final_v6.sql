/*
  # Agregar campos de periodo a asientos contables y mejorar sistema de visibilidad
  
  1. Cambios en asientos_contables
    - Agregar columna `periodo_contable_id` para asociar asientos a periodos
    - Agregar columna `ocultar_en_listados` para controlar visibilidad
  
  2. Actualización de funciones de visibilidad
    - Actualizar `sincronizar_visibilidad_registros()` para incluir asientos
    - Actualizar `mostrar_registros_periodo()` para incluir asientos
  
  3. Trigger para asignar periodo automáticamente
    - Crear trigger que asigne periodo_contable_id basado en la fecha del asiento
  
  4. Mejora en vista de cuentas por cobrar
    - Filtrar e-tickets (tipo_documento = 'e-ticket') de la vista
*/

-- ============================================================================
-- 1. AGREGAR COLUMNAS A ASIENTOS_CONTABLES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'asientos_contables' 
    AND column_name = 'periodo_contable_id'
  ) THEN
    ALTER TABLE asientos_contables 
    ADD COLUMN periodo_contable_id UUID REFERENCES periodos_contables(id);
    
    CREATE INDEX IF NOT EXISTS idx_asientos_periodo 
    ON asientos_contables(periodo_contable_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'asientos_contables' 
    AND column_name = 'ocultar_en_listados'
  ) THEN
    ALTER TABLE asientos_contables 
    ADD COLUMN ocultar_en_listados BOOLEAN DEFAULT false;
    
    CREATE INDEX IF NOT EXISTS idx_asientos_ocultar 
    ON asientos_contables(ocultar_en_listados);
  END IF;
END $$;

-- ============================================================================
-- 2. ASIGNAR PERIODOS A ASIENTOS EXISTENTES (DESHABILITAR TRIGGER TEMPORALMENTE)
-- ============================================================================

ALTER TABLE asientos_contables DISABLE TRIGGER trigger_validar_periodo_asiento;

UPDATE asientos_contables ac
SET periodo_contable_id = (
  SELECT pc.id
  FROM periodos_contables pc
  WHERE pc.empresa_id = ac.empresa_id
    AND ac.fecha >= pc.fecha_inicio
    AND ac.fecha <= pc.fecha_fin
  ORDER BY pc.fecha_inicio DESC
  LIMIT 1
)
WHERE periodo_contable_id IS NULL;

ALTER TABLE asientos_contables ENABLE TRIGGER trigger_validar_periodo_asiento;

-- ============================================================================
-- 3. FUNCIÓN PARA ASIGNAR PERIODO AUTOMÁTICAMENTE A ASIENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION asignar_periodo_a_asiento()
RETURNS TRIGGER AS $$
DECLARE
  periodo_id UUID;
BEGIN
  SELECT id INTO periodo_id
  FROM periodos_contables
  WHERE empresa_id = NEW.empresa_id
    AND NEW.fecha >= fecha_inicio
    AND NEW.fecha <= fecha_fin
    AND estado IN ('abierto', 'en_revision')
  ORDER BY fecha_inicio DESC
  LIMIT 1;
  
  IF periodo_id IS NOT NULL THEN
    NEW.periodo_contable_id := periodo_id;
    NEW.ocultar_en_listados := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_periodo_asiento ON asientos_contables;
CREATE TRIGGER trigger_asignar_periodo_asiento
  BEFORE INSERT ON asientos_contables
  FOR EACH ROW
  EXECUTE FUNCTION asignar_periodo_a_asiento();

-- ============================================================================
-- 4. RECREAR FUNCIONES DE VISIBILIDAD PARA INCLUIR ASIENTOS
-- ============================================================================

DROP FUNCTION IF EXISTS mostrar_registros_periodo(UUID);
DROP FUNCTION IF EXISTS sincronizar_visibilidad_registros();

CREATE FUNCTION mostrar_registros_periodo(periodo_id_param UUID)
RETURNS TABLE (
  facturas_venta_actualizadas BIGINT,
  facturas_compra_actualizadas BIGINT,
  comisiones_actualizadas BIGINT,
  asientos_actualizados BIGINT
) AS $$
DECLARE
  fv_count BIGINT;
  fc_count BIGINT;
  cp_count BIGINT;
  as_count BIGINT;
BEGIN
  WITH updated_fv AS (
    UPDATE facturas_venta
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO fv_count FROM updated_fv;

  WITH updated_fc AS (
    UPDATE facturas_compra
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO fc_count FROM updated_fc;

  WITH updated_cp AS (
    UPDATE comisiones_partners
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO cp_count FROM updated_cp;

  WITH updated_as AS (
    UPDATE asientos_contables
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO as_count FROM updated_as;

  RETURN QUERY SELECT fv_count, fc_count, cp_count, as_count;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION sincronizar_visibilidad_registros()
RETURNS TABLE (
  periodos_procesados BIGINT,
  registros_actualizados BIGINT
) AS $$
DECLARE
  periodo_record RECORD;
  total_periodos BIGINT := 0;
  total_registros BIGINT := 0;
  fv_count BIGINT;
  fc_count BIGINT;
  cp_count BIGINT;
  as_count BIGINT;
BEGIN
  FOR periodo_record IN 
    SELECT id, estado FROM periodos_contables
  LOOP
    total_periodos := total_periodos + 1;
    
    IF periodo_record.estado = 'abierto' THEN
      WITH updated_fv AS (
        UPDATE facturas_venta
        SET ocultar_en_listados = false
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = true
        RETURNING *
      )
      SELECT COUNT(*) INTO fv_count FROM updated_fv;
      
      WITH updated_fc AS (
        UPDATE facturas_compra
        SET ocultar_en_listados = false
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = true
        RETURNING *
      )
      SELECT COUNT(*) INTO fc_count FROM updated_fc;
      
      WITH updated_cp AS (
        UPDATE comisiones_partners
        SET ocultar_en_listados = false
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = true
        RETURNING *
      )
      SELECT COUNT(*) INTO cp_count FROM updated_cp;
      
      WITH updated_as AS (
        UPDATE asientos_contables
        SET ocultar_en_listados = false
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = true
        RETURNING *
      )
      SELECT COUNT(*) INTO as_count FROM updated_as;
      
      total_registros := total_registros + fv_count + fc_count + cp_count + as_count;
      
    ELSIF periodo_record.estado IN ('cerrado', 'cerrado_definitivo') THEN
      WITH updated_fv AS (
        UPDATE facturas_venta
        SET ocultar_en_listados = true
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = false
        RETURNING *
      )
      SELECT COUNT(*) INTO fv_count FROM updated_fv;
      
      WITH updated_fc AS (
        UPDATE facturas_compra
        SET ocultar_en_listados = true
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = false
        RETURNING *
      )
      SELECT COUNT(*) INTO fc_count FROM updated_fc;
      
      WITH updated_cp AS (
        UPDATE comisiones_partners
        SET ocultar_en_listados = true
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = false
        RETURNING *
      )
      SELECT COUNT(*) INTO cp_count FROM updated_cp;
      
      WITH updated_as AS (
        UPDATE asientos_contables
        SET ocultar_en_listados = true
        WHERE periodo_contable_id = periodo_record.id
          AND ocultar_en_listados = false
        RETURNING *
      )
      SELECT COUNT(*) INTO as_count FROM updated_as;
      
      total_registros := total_registros + fv_count + fc_count + cp_count + as_count;
    END IF;
  END LOOP;

  RETURN QUERY SELECT total_periodos, total_registros;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. MEJORAR VISTA DE CUENTAS POR COBRAR - FILTRAR E-TICKETS
-- ============================================================================

DROP VIEW IF EXISTS v_cuentas_por_cobrar;

CREATE VIEW v_cuentas_por_cobrar AS
SELECT 
  fv.id,
  fv.serie,
  fv.numero_factura,
  fv.tipo_documento,
  fv.cliente_id,
  c.razon_social AS cliente_nombre,
  c.numero_documento AS cliente_documento,
  fv.fecha_emision,
  fv.fecha_vencimiento,
  fv.subtotal AS monto_subtotal,
  fv.total_iva AS monto_impuestos,
  fv.total AS monto_total,
  0 AS monto_pagado,
  CASE 
    WHEN fv.estado = 'pagada' THEN 0
    ELSE fv.total
  END AS saldo_pendiente,
  CASE 
    WHEN fv.estado = 'pagada' THEN 'PAGADA'
    WHEN fv.fecha_vencimiento < CURRENT_DATE AND fv.estado != 'pagada' THEN 'VENCIDA'
    WHEN fv.estado = 'pendiente' THEN 'PENDIENTE'
    ELSE 'PENDIENTE'
  END AS estado_cxc,
  fv.moneda,
  fv.observaciones,
  fv.empresa_id,
  fv.created_by,
  fv.created_at AS fecha_creacion,
  fv.updated_at AS fecha_modificacion,
  fv.ocultar_en_listados,
  fv.periodo_contable_id
FROM facturas_venta fv
LEFT JOIN clientes c ON c.id = fv.cliente_id
WHERE fv.tipo_documento != 'e-ticket'
  AND fv.ocultar_en_listados = false;

-- ============================================================================
-- 6. EJECUTAR SINCRONIZACIÓN INICIAL
-- ============================================================================

SELECT * FROM sincronizar_visibilidad_registros();

-- Comentarios
COMMENT ON COLUMN asientos_contables.periodo_contable_id IS 'Periodo contable al que pertenece el asiento';
COMMENT ON COLUMN asientos_contables.ocultar_en_listados IS 'Indica si el asiento debe ocultarse en listados (periodo cerrado)';
COMMENT ON FUNCTION asignar_periodo_a_asiento IS 'Asigna automáticamente el periodo contable a un asiento basado en su fecha';
COMMENT ON VIEW v_cuentas_por_cobrar IS 'Vista de cuentas por cobrar - EXCLUYE e-tickets (cobros al momento)';
