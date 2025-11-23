/*
  # Corregir permisos para funciones de períodos contables
  
  1. Problema identificado
    - Las funciones RPC no tienen permisos GRANT
    - Los usuarios autenticados (externos) no pueden ejecutarlas
    - El botón de reapertura no funciona por falta de permisos
  
  2. Solución
    - Agregar GRANT EXECUTE a todas las funciones relacionadas con períodos
    - Permitir acceso a usuarios autenticados y anónimos
    - Asegurar que las funciones tengan SECURITY DEFINER para poder modificar datos
  
  3. Funciones con permisos actualizados
    - mostrar_registros_periodo()
    - sincronizar_visibilidad_registros()
    - asignar_facturas_a_periodo()
    - asignar_comisiones_a_periodo()
    - asignar_todos_registros_a_periodos()
*/

-- Configurar funciones con SECURITY DEFINER para que puedan modificar datos
ALTER FUNCTION mostrar_registros_periodo(UUID) SECURITY DEFINER;
ALTER FUNCTION sincronizar_visibilidad_registros() SECURITY DEFINER;
ALTER FUNCTION asignar_facturas_a_periodo(UUID) SECURITY DEFINER;
ALTER FUNCTION asignar_comisiones_a_periodo(UUID) SECURITY DEFINER;
ALTER FUNCTION asignar_todos_registros_a_periodos() SECURITY DEFINER;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION mostrar_registros_periodo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sincronizar_visibilidad_registros() TO authenticated;
GRANT EXECUTE ON FUNCTION asignar_facturas_a_periodo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION asignar_comisiones_a_periodo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION asignar_todos_registros_a_periodos() TO authenticated;

-- Otorgar permisos de ejecución a anónimos (para autenticación externa)
GRANT EXECUTE ON FUNCTION mostrar_registros_periodo(UUID) TO anon;
GRANT EXECUTE ON FUNCTION sincronizar_visibilidad_registros() TO anon;
GRANT EXECUTE ON FUNCTION asignar_facturas_a_periodo(UUID) TO anon;
GRANT EXECUTE ON FUNCTION asignar_comisiones_a_periodo(UUID) TO anon;
GRANT EXECUTE ON FUNCTION asignar_todos_registros_a_periodos() TO anon;

-- Otorgar permisos de ejecución a service_role (para operaciones administrativas)
GRANT EXECUTE ON FUNCTION mostrar_registros_periodo(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION sincronizar_visibilidad_registros() TO service_role;
GRANT EXECUTE ON FUNCTION asignar_facturas_a_periodo(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION asignar_comisiones_a_periodo(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION asignar_todos_registros_a_periodos() TO service_role;

COMMENT ON FUNCTION mostrar_registros_periodo IS 'Muestra todos los registros de un período. Requiere autenticación. SECURITY DEFINER permite modificar ocultar_en_listados.';
COMMENT ON FUNCTION sincronizar_visibilidad_registros IS 'Sincroniza visibilidad de todos los registros según estado de períodos. SECURITY DEFINER permite modificaciones masivas.';
