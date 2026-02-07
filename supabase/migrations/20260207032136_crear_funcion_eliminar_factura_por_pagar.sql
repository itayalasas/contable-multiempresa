/*
  # Función RPC para eliminar factura por pagar
  
  ## Problema
  PostgREST tiene cacheado el esquema anterior sin la columna "eliminado",
  causando error al intentar hacer UPDATE desde el frontend.
  
  ## Solución
  Crear función RPC que hace la eliminación lógica directamente,
  bypaseando el caché de PostgREST.
  
  ## Uso
  Se llama desde el frontend con:
  supabase.rpc('eliminar_factura_por_pagar', {
    p_factura_id: 'uuid',
    p_empresa_id: 'uuid'
  })
*/

-- =====================================================
-- Función: Eliminar factura por pagar (eliminación lógica)
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_factura_por_pagar(
  p_factura_id uuid,
  p_empresa_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado json;
  v_factura_numero text;
BEGIN
  -- Verificar que la factura existe y pertenece a la empresa
  SELECT numero INTO v_factura_numero
  FROM facturas_por_pagar
  WHERE id = p_factura_id
    AND empresa_id = p_empresa_id;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada o no pertenece a esta empresa';
  END IF;

  -- Realizar eliminación lógica
  -- Esto dispara el trigger que hace rollback de comisiones, asientos y pagos
  UPDATE facturas_por_pagar
  SET 
    eliminado = true,
    fecha_eliminacion = now()
  WHERE id = p_factura_id
    AND empresa_id = p_empresa_id;

  -- Retornar resultado
  v_resultado := json_build_object(
    'success', true,
    'message', 'Factura eliminada correctamente',
    'factura_id', p_factura_id,
    'factura_numero', v_factura_numero
  );
  
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar factura: %', SQLERRM;
END;
$$;

-- Comentario
COMMENT ON FUNCTION eliminar_factura_por_pagar(uuid, uuid) IS
'Elimina lógicamente una factura por pagar, disparando el trigger de rollback automático';

-- Permisos para authenticated
GRANT EXECUTE ON FUNCTION eliminar_factura_por_pagar(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION eliminar_factura_por_pagar(uuid, uuid) TO anon;
