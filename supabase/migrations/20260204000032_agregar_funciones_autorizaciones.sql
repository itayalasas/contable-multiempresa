/*
  # Agregar funciones y políticas de autorizaciones

  Agrega las funciones necesarias para el sistema de autorizaciones
*/

-- Eliminar funciones existentes si existen
DROP FUNCTION IF EXISTS ejecutar_eliminacion_movimiento(uuid, text, text);
DROP FUNCTION IF EXISTS rechazar_solicitud_autorizacion(uuid, text, text);

-- Políticas adicionales
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solicitudes_autorizacion' AND policyname = 'Usuarios acceso solicitudes') THEN
    CREATE POLICY "Usuarios acceso solicitudes" ON solicitudes_autorizacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Función ejecutar eliminación
CREATE OR REPLACE FUNCTION ejecutar_eliminacion_movimiento(p_solicitud_id uuid, p_aprobado_por text, p_comentario text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solicitud RECORD;
  v_movimiento RECORD;
BEGIN
  SELECT * INTO v_solicitud FROM solicitudes_autorizacion WHERE id = p_solicitud_id AND estado = 'PENDIENTE';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada o ya procesada');
  END IF;
  
  IF v_solicitud.solicitado_por = p_aprobado_por THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes aprobar tu propia solicitud');
  END IF;
  
  SELECT * INTO v_movimiento FROM movimientos_tesoreria WHERE id = v_solicitud.registro_id::uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Movimiento no encontrado');
  END IF;
  
  UPDATE solicitudes_autorizacion SET estado = 'APROBADA', aprobado_por = p_aprobado_por, fecha_aprobacion = now(), comentario_aprobacion = p_comentario WHERE id = p_solicitud_id;
  UPDATE movimientos_tesoreria SET eliminado = true, fecha_eliminacion = now(), eliminado_por = p_aprobado_por, motivo_eliminacion = v_solicitud.motivo WHERE id = v_solicitud.registro_id::uuid;
  
  IF v_movimiento.asiento_contable_id IS NOT NULL THEN
    UPDATE asientos_contables SET eliminado = true, fecha_eliminacion = now(), eliminado_por = p_aprobado_por, motivo_eliminacion = 'Asiento asociado a movimiento eliminado: ' || v_solicitud.motivo WHERE id = v_movimiento.asiento_contable_id;
  END IF;
  
  IF v_movimiento.tipo_movimiento = 'INGRESO' THEN
    UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - v_movimiento.monto WHERE id = v_movimiento.cuenta_bancaria_id;
  ELSIF v_movimiento.tipo_movimiento = 'EGRESO' THEN
    UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + v_movimiento.monto WHERE id = v_movimiento.cuenta_bancaria_id;
  END IF;
  
  UPDATE solicitudes_autorizacion SET ejecutada = true, fecha_ejecucion = now() WHERE id = p_solicitud_id;
  RETURN jsonb_build_object('success', true, 'movimiento_id', v_solicitud.registro_id, 'solicitud_id', p_solicitud_id);
END;
$$;

-- Función rechazar
CREATE OR REPLACE FUNCTION rechazar_solicitud_autorizacion(p_solicitud_id uuid, p_rechazado_por text, p_comentario text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solicitud RECORD;
BEGIN
  SELECT * INTO v_solicitud FROM solicitudes_autorizacion WHERE id = p_solicitud_id AND estado = 'PENDIENTE';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitud no encontrada o ya procesada');
  END IF;
  
  IF v_solicitud.solicitado_por = p_rechazado_por THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes rechazar tu propia solicitud');
  END IF;
  
  UPDATE solicitudes_autorizacion SET estado = 'RECHAZADA', aprobado_por = p_rechazado_por, fecha_aprobacion = now(), comentario_aprobacion = p_comentario WHERE id = p_solicitud_id;
  RETURN jsonb_build_object('success', true, 'solicitud_id', p_solicitud_id);
END;
$$;