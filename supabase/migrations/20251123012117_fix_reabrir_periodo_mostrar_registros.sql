/*
  # Corregir reapertura de períodos - Mostrar todos los registros
  
  1. Problema identificado
    - Los períodos pueden estar "abiertos" pero los registros siguen ocultos
    - Necesitamos una forma de "forzar" la visualización de registros
  
  2. Solución
    - Crear función para mostrar todos los registros de un período
    - Actualizar cualquier registro que esté marcado como oculto pero cuyo período esté abierto
  
  3. Funciones creadas
    - mostrar_registros_periodo() - Muestra todos los registros de un período específico
    - sincronizar_visibilidad_registros() - Sincroniza visibilidad según estado del período
*/

-- Función para mostrar todos los registros de un período específico
CREATE OR REPLACE FUNCTION mostrar_registros_periodo(periodo_id_param UUID)
RETURNS TABLE (
  facturas_venta_actualizadas BIGINT,
  facturas_compra_actualizadas BIGINT,
  comisiones_actualizadas BIGINT
) AS $$
DECLARE
  fv_count BIGINT;
  fc_count BIGINT;
  cp_count BIGINT;
BEGIN
  -- Mostrar facturas de venta
  WITH updated_fv AS (
    UPDATE facturas_venta
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO fv_count FROM updated_fv;

  -- Mostrar facturas de compra
  WITH updated_fc AS (
    UPDATE facturas_compra
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO fc_count FROM updated_fc;

  -- Mostrar comisiones
  WITH updated_cp AS (
    UPDATE comisiones_partners
    SET ocultar_en_listados = false
    WHERE periodo_contable_id = periodo_id_param
      AND ocultar_en_listados = true
    RETURNING *
  )
  SELECT COUNT(*) INTO cp_count FROM updated_cp;

  RETURN QUERY SELECT fv_count, fc_count, cp_count;
END;
$$ LANGUAGE plpgsql;

-- Función para sincronizar la visibilidad de todos los registros según el estado del período
CREATE OR REPLACE FUNCTION sincronizar_visibilidad_registros()
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
BEGIN
  -- Procesar cada período
  FOR periodo_record IN 
    SELECT id, estado FROM periodos_contables
  LOOP
    total_periodos := total_periodos + 1;
    
    IF periodo_record.estado = 'abierto' THEN
      -- Período abierto: mostrar todos los registros
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
      
      total_registros := total_registros + fv_count + fc_count + cp_count;
      
    ELSIF periodo_record.estado IN ('cerrado', 'cerrado_definitivo') THEN
      -- Período cerrado: ocultar todos los registros
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
      
      total_registros := total_registros + fv_count + fc_count + cp_count;
    END IF;
  END LOOP;

  RETURN QUERY SELECT total_periodos, total_registros;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar sincronización inicial para corregir cualquier inconsistencia
SELECT * FROM sincronizar_visibilidad_registros();

COMMENT ON FUNCTION mostrar_registros_periodo IS 'Muestra todos los registros (facturas y comisiones) de un período específico';
COMMENT ON FUNCTION sincronizar_visibilidad_registros IS 'Sincroniza la visibilidad de todos los registros según el estado de sus períodos';
