/*
  # Asignar registros a períodos automáticamente
  
  1. Problema identificado
    - Las facturas y comisiones no tienen periodo_contable_id asignado
    - El período está "cerrado" pero los registros están visibles
    - Falta la asignación automática al cerrar períodos
  
  2. Solución
    - Función para asignar registros a períodos basándose en fechas
    - Actualizar proceso de cierre para asignar automáticamente
    - Corregir datos históricos
  
  3. Funciones creadas
    - asignar_facturas_a_periodo() - Asigna facturas por fecha
    - asignar_comisiones_a_periodo() - Asigna comisiones por fecha
    - asignar_todos_registros_a_periodos() - Asigna TODOS los registros sin período
*/

-- Función para asignar facturas de venta a un período basándose en su fecha
CREATE OR REPLACE FUNCTION asignar_facturas_a_periodo(periodo_id_param UUID)
RETURNS TABLE (
  facturas_venta_asignadas BIGINT,
  facturas_compra_asignadas BIGINT
) AS $$
DECLARE
  fv_count BIGINT;
  fc_count BIGINT;
  fecha_inicio DATE;
  fecha_fin DATE;
BEGIN
  -- Obtener fechas del período
  SELECT p.fecha_inicio, p.fecha_fin 
  INTO fecha_inicio, fecha_fin
  FROM periodos_contables p
  WHERE p.id = periodo_id_param;

  IF fecha_inicio IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  -- Asignar facturas de venta
  WITH updated_fv AS (
    UPDATE facturas_venta
    SET periodo_contable_id = periodo_id_param
    WHERE fecha_emision >= fecha_inicio
      AND fecha_emision <= fecha_fin
      AND (periodo_contable_id IS NULL OR periodo_contable_id != periodo_id_param)
    RETURNING *
  )
  SELECT COUNT(*) INTO fv_count FROM updated_fv;

  -- Asignar facturas de compra
  WITH updated_fc AS (
    UPDATE facturas_compra
    SET periodo_contable_id = periodo_id_param
    WHERE fecha_emision >= fecha_inicio
      AND fecha_emision <= fecha_fin
      AND (periodo_contable_id IS NULL OR periodo_contable_id != periodo_id_param)
    RETURNING *
  )
  SELECT COUNT(*) INTO fc_count FROM updated_fc;

  RETURN QUERY SELECT fv_count, fc_count;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar comisiones a un período basándose en su fecha
CREATE OR REPLACE FUNCTION asignar_comisiones_a_periodo(periodo_id_param UUID)
RETURNS BIGINT AS $$
DECLARE
  cp_count BIGINT;
  fecha_inicio DATE;
  fecha_fin DATE;
BEGIN
  -- Obtener fechas del período
  SELECT p.fecha_inicio, p.fecha_fin 
  INTO fecha_inicio, fecha_fin
  FROM periodos_contables p
  WHERE p.id = periodo_id_param;

  IF fecha_inicio IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  -- Asignar comisiones
  WITH updated_cp AS (
    UPDATE comisiones_partners
    SET periodo_contable_id = periodo_id_param
    WHERE fecha >= fecha_inicio
      AND fecha <= fecha_fin
      AND (periodo_contable_id IS NULL OR periodo_contable_id != periodo_id_param)
    RETURNING *
  )
  SELECT COUNT(*) INTO cp_count FROM updated_cp;

  RETURN cp_count;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar TODOS los registros a sus períodos correspondientes
CREATE OR REPLACE FUNCTION asignar_todos_registros_a_periodos()
RETURNS TABLE (
  periodos_procesados BIGINT,
  facturas_venta_asignadas BIGINT,
  facturas_compra_asignadas BIGINT,
  comisiones_asignadas BIGINT
) AS $$
DECLARE
  periodo_record RECORD;
  total_periodos BIGINT := 0;
  total_fv BIGINT := 0;
  total_fc BIGINT := 0;
  total_cp BIGINT := 0;
  fv_count BIGINT;
  fc_count BIGINT;
  cp_count BIGINT;
BEGIN
  -- Procesar cada período
  FOR periodo_record IN 
    SELECT id, fecha_inicio, fecha_fin, nombre FROM periodos_contables
    ORDER BY fecha_inicio
  LOOP
    total_periodos := total_periodos + 1;
    
    -- Asignar facturas
    SELECT * INTO fv_count, fc_count
    FROM asignar_facturas_a_periodo(periodo_record.id);
    
    total_fv := total_fv + fv_count;
    total_fc := total_fc + fc_count;
    
    -- Asignar comisiones
    SELECT * INTO cp_count
    FROM asignar_comisiones_a_periodo(periodo_record.id);
    
    total_cp := total_cp + cp_count;
    
    RAISE NOTICE 'Período %: % facturas venta, % facturas compra, % comisiones', 
      periodo_record.nombre, fv_count, fc_count, cp_count;
  END LOOP;

  RETURN QUERY SELECT total_periodos, total_fv, total_fc, total_cp;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar asignación para corregir datos históricos
SELECT * FROM asignar_todos_registros_a_periodos();

COMMENT ON FUNCTION asignar_facturas_a_periodo IS 'Asigna facturas de venta y compra a un período específico basándose en la fecha de emisión';
COMMENT ON FUNCTION asignar_comisiones_a_periodo IS 'Asigna comisiones a un período específico basándose en la fecha';
COMMENT ON FUNCTION asignar_todos_registros_a_periodos IS 'Asigna todos los registros sin período a sus períodos correspondientes basándose en fechas';
