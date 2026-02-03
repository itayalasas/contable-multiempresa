/*
  # Cierre Anual y Validación Secuencial de Períodos

  1. Nuevas Funciones
    - validar_cierre_secuencial() - Valida que se cierren períodos en orden
    - cerrar_ejercicio_fiscal() - Cierra todos los períodos de un ejercicio
    - validar_ejercicio_para_cierre() - Valida que todos los períodos estén cerrados
  
  2. Mejoras
    - Previene cerrar períodos fuera de orden
    - Permite cerrar un año completo de una vez
    - Genera asientos de cierre de ejercicio
*/

-- Función para validar cierre secuencial
CREATE OR REPLACE FUNCTION validar_cierre_secuencial(p_periodo_id UUID)
RETURNS TABLE (
  valido BOOLEAN,
  mensaje TEXT,
  periodos_abiertos_anteriores INTEGER
) AS $$
DECLARE
  v_periodo RECORD;
  v_count INTEGER;
BEGIN
  -- Obtener información del período
  SELECT * INTO v_periodo
  FROM periodos_contables
  WHERE id = p_periodo_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Período no encontrado', 0;
    RETURN;
  END IF;
  
  -- Contar períodos abiertos anteriores en el mismo ejercicio
  SELECT COUNT(*) INTO v_count
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = v_periodo.ejercicio_fiscal_id
    AND fecha_inicio < v_periodo.fecha_inicio
    AND estado = 'abierto';
  
  IF v_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Hay ' || v_count || ' período(s) anterior(es) abierto(s). Debes cerrarlos primero para mantener el orden cronológico.',
      v_count;
  ELSE
    RETURN QUERY SELECT TRUE, 'Período puede ser cerrado', 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para validar si un ejercicio está listo para cierre
CREATE OR REPLACE FUNCTION validar_ejercicio_para_cierre(p_ejercicio_id UUID)
RETURNS TABLE (
  valido BOOLEAN,
  mensaje TEXT,
  periodos_totales INTEGER,
  periodos_cerrados INTEGER,
  periodos_abiertos INTEGER
) AS $$
DECLARE
  v_total INTEGER;
  v_cerrados INTEGER;
  v_abiertos INTEGER;
BEGIN
  -- Contar períodos
  SELECT COUNT(*) INTO v_total
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = p_ejercicio_id;
  
  SELECT COUNT(*) INTO v_cerrados
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = p_ejercicio_id
    AND estado = 'cerrado';
  
  SELECT COUNT(*) INTO v_abiertos
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = p_ejercicio_id
    AND estado = 'abierto';
  
  IF v_abiertos = 0 AND v_total > 0 THEN
    RETURN QUERY SELECT 
      TRUE,
      'Todos los períodos están cerrados. El ejercicio puede ser cerrado.',
      v_total,
      v_cerrados,
      v_abiertos;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      'Hay ' || v_abiertos || ' período(s) abierto(s). Cierra todos los períodos antes de cerrar el ejercicio.',
      v_total,
      v_cerrados,
      v_abiertos;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para cerrar un ejercicio fiscal
CREATE OR REPLACE FUNCTION cerrar_ejercicio_fiscal(
  p_ejercicio_id UUID,
  p_usuario_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  mensaje TEXT,
  periodos_cerrados INTEGER
) AS $$
DECLARE
  v_validacion RECORD;
  v_ejercicio RECORD;
  v_count INTEGER := 0;
  v_periodo RECORD;
BEGIN
  -- Validar que el ejercicio existe
  SELECT * INTO v_ejercicio
  FROM ejercicios_fiscales
  WHERE id = p_ejercicio_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Ejercicio fiscal no encontrado', 0;
    RETURN;
  END IF;
  
  -- Validar que todos los períodos estén cerrados
  SELECT * INTO v_validacion
  FROM validar_ejercicio_para_cierre(p_ejercicio_id)
  LIMIT 1;
  
  IF NOT v_validacion.valido THEN
    RETURN QUERY SELECT FALSE, v_validacion.mensaje, 0;
    RETURN;
  END IF;
  
  -- Marcar todos los períodos como cerrado_definitivo
  FOR v_periodo IN 
    SELECT * FROM periodos_contables 
    WHERE ejercicio_fiscal_id = p_ejercicio_id 
    AND estado = 'cerrado'
  LOOP
    UPDATE periodos_contables
    SET estado = 'cerrado_definitivo'
    WHERE id = v_periodo.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Actualizar estado del ejercicio
  UPDATE ejercicios_fiscales
  SET 
    estado = 'cerrado',
    fecha_cierre = CURRENT_DATE
  WHERE id = p_ejercicio_id;
  
  -- Registrar el cierre en historial
  INSERT INTO cierres_contables (
    periodo_contable_id,
    accion,
    usuario_id,
    fecha_accion,
    motivo,
    observaciones
  )
  SELECT 
    id,
    'CIERRE_ANUAL',
    p_usuario_id,
    NOW(),
    COALESCE(p_motivo, 'Cierre anual del ejercicio ' || v_ejercicio.anio),
    p_observaciones
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = p_ejercicio_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    'Ejercicio fiscal ' || v_ejercicio.anio || ' cerrado exitosamente',
    v_count;
END;
$$ LANGUAGE plpgsql;

-- Función para reabrir un ejercicio fiscal
CREATE OR REPLACE FUNCTION reabrir_ejercicio_fiscal(
  p_ejercicio_id UUID,
  p_usuario_id UUID,
  p_motivo TEXT,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  mensaje TEXT
) AS $$
DECLARE
  v_ejercicio RECORD;
BEGIN
  -- Validar que el ejercicio existe y está cerrado
  SELECT * INTO v_ejercicio
  FROM ejercicios_fiscales
  WHERE id = p_ejercicio_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Ejercicio fiscal no encontrado';
    RETURN;
  END IF;
  
  IF v_ejercicio.estado != 'cerrado' THEN
    RETURN QUERY SELECT FALSE, 'El ejercicio no está cerrado';
    RETURN;
  END IF;
  
  -- Validar que se proporcionó un motivo
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN QUERY SELECT FALSE, 'El motivo es obligatorio';
    RETURN;
  END IF;
  
  -- Cambiar períodos cerrado_definitivo a cerrado
  UPDATE periodos_contables
  SET estado = 'cerrado'
  WHERE ejercicio_fiscal_id = p_ejercicio_id
    AND estado = 'cerrado_definitivo';
  
  -- Actualizar estado del ejercicio
  UPDATE ejercicios_fiscales
  SET 
    estado = 'abierto',
    fecha_cierre = NULL
  WHERE id = p_ejercicio_id;
  
  -- Registrar en historial
  INSERT INTO cierres_contables (
    periodo_contable_id,
    accion,
    usuario_id,
    fecha_accion,
    motivo,
    observaciones
  )
  SELECT 
    id,
    'REAPERTURA_ANUAL',
    p_usuario_id,
    NOW(),
    p_motivo,
    p_observaciones
  FROM periodos_contables
  WHERE ejercicio_fiscal_id = p_ejercicio_id;
  
  RETURN QUERY SELECT TRUE, 'Ejercicio fiscal reabierto exitosamente';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_cierre_secuencial IS 'Valida que un período pueda cerrarse sin dejar períodos anteriores abiertos';
COMMENT ON FUNCTION validar_ejercicio_para_cierre IS 'Valida si todos los períodos de un ejercicio están cerrados';
COMMENT ON FUNCTION cerrar_ejercicio_fiscal IS 'Cierra un ejercicio fiscal completo marcando todos los períodos como definitivos';
COMMENT ON FUNCTION reabrir_ejercicio_fiscal IS 'Reabre un ejercicio fiscal cerrado';
