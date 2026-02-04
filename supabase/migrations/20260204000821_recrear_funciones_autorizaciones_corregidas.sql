/*
  # Recrear funciones de autorizaciones con nombres correctos

  Actualiza las funciones para usar los nombres de columnas correctos de la tabla existente
*/

-- Eliminar funciones anteriores
DROP FUNCTION IF EXISTS ejecutar_eliminacion_movimiento(uuid, text, text);
DROP FUNCTION IF EXISTS rechazar_solicitud_autorizacion(uuid, text, text);

-- Función para ejecutar eliminación aprobada de movimiento
CREATE OR REPLACE FUNCTION ejecutar_eliminacion_movimiento(
  p_solicitud_id uuid,
  p_aprobado_por text,
  p_comentario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud RECORD;
  v_movimiento RECORD;
BEGIN
  -- Obtener la solicitud
  SELECT * INTO v_solicitud
  FROM solicitudes_autorizacion
  WHERE id = p_solicitud_id
  AND estado = 'PENDIENTE';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solicitud no encontrada o ya procesada'
    );
  END IF;

  -- Verificar que no sea el mismo usuario
  IF v_solicitud.solicitado_por = p_aprobado_por THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No puedes aprobar tu propia solicitud'
    );
  END IF;

  -- Obtener el movimiento
  SELECT * INTO v_movimiento
  FROM movimientos_tesoreria
  WHERE id = v_solicitud.entidad_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Movimiento no encontrado'
    );
  END IF;

  -- Marcar como aprobada la solicitud
  UPDATE solicitudes_autorizacion
  SET
    estado = 'APROBADA',
    revisado_por = p_aprobado_por,
    revisado_en = now(),
    comentarios_revision = p_comentario,
    ejecutado_en = now()
  WHERE id = p_solicitud_id;

  -- Realizar eliminación lógica del movimiento
  UPDATE movimientos_tesoreria
  SET
    eliminado = true,
    fecha_eliminacion = now(),
    eliminado_por = p_aprobado_por,
    motivo_eliminacion = v_solicitud.motivo
  WHERE id = v_solicitud.entidad_id;

  -- Si tiene asiento contable asociado, también marcarlo como eliminado
  IF v_movimiento.asiento_contable_id IS NOT NULL THEN
    UPDATE asientos_contables
    SET
      eliminado = true,
      fecha_eliminacion = now(),
      eliminado_por = p_aprobado_por,
      motivo_eliminacion = 'Asiento asociado a movimiento eliminado: ' || v_solicitud.motivo
    WHERE id = v_movimiento.asiento_contable_id;
  END IF;

  -- Recalcular saldo de cuenta bancaria
  IF v_movimiento.tipo_movimiento = 'INGRESO' THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual - v_movimiento.monto
    WHERE id = v_movimiento.cuenta_bancaria_id;
  ELSIF v_movimiento.tipo_movimiento = 'EGRESO' THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual + v_movimiento.monto
    WHERE id = v_movimiento.cuenta_bancaria_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'movimiento_id', v_solicitud.entidad_id,
    'solicitud_id', p_solicitud_id
  );
END;
$$;

-- Función para rechazar solicitud
CREATE OR REPLACE FUNCTION rechazar_solicitud_autorizacion(
  p_solicitud_id uuid,
  p_rechazado_por text,
  p_comentario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud RECORD;
BEGIN
  -- Obtener la solicitud
  SELECT * INTO v_solicitud
  FROM solicitudes_autorizacion
  WHERE id = p_solicitud_id
  AND estado = 'PENDIENTE';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solicitud no encontrada o ya procesada'
    );
  END IF;

  -- Verificar que no sea el mismo usuario
  IF v_solicitud.solicitado_por = p_rechazado_por THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No puedes rechazar tu propia solicitud'
    );
  END IF;

  -- Marcar como rechazada
  UPDATE solicitudes_autorizacion
  SET
    estado = 'RECHAZADA',
    revisado_por = p_rechazado_por,
    revisado_en = now(),
    comentarios_revision = p_comentario
  WHERE id = p_solicitud_id;

  RETURN jsonb_build_object(
    'success', true,
    'solicitud_id', p_solicitud_id
  );
END;
$$;