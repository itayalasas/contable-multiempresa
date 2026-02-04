/*
  # Insertar usuarios de prueba con diferentes roles

  ## Descripción
  Crea usuarios de prueba para poder probar el sistema de autorizaciones
  con diferentes roles: Administrador, Supervisor, Contador y Usuario.

  ## Usuarios creados
  1. Supervisor (puede autorizar eliminaciones)
     - Email: supervisor@test.com
     - Nombre: Usuario Supervisor
     - Rol: supervisor
  
  2. Contador (puede crear asientos)
     - Email: contador@test.com
     - Nombre: Usuario Contador
     - Rol: contador
  
  3. Usuario Normal (permisos limitados)
     - Email: usuario@test.com
     - Nombre: Usuario Normal
     - Rol: usuario

  ## Nota
  Estos usuarios se asignarán a la empresa existente "Ayala IT S.A.S"
  Para loguearse, necesitarás configurar estos usuarios en Firebase Auth
*/

-- Verificar que exista la empresa Ayala IT S.A.S
DO $$
DECLARE
  v_empresa_id uuid;
  v_pais_id uuid;
BEGIN
  -- Obtener ID de la empresa Ayala IT S.A.S
  SELECT id, pais_id INTO v_empresa_id, v_pais_id
  FROM empresas
  WHERE numero_identificacion = '219357800013'
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'No se encontró la empresa Ayala IT S.A.S';
    RETURN;
  END IF;

  -- Crear usuario Supervisor
  INSERT INTO usuarios (id, nombre, email, rol, empresas_asignadas, permisos, pais_id, activo)
  VALUES (
    'supervisor-test-001',
    'Usuario Supervisor',
    'supervisor@test.com',
    'supervisor',
    ARRAY[v_empresa_id],
    ARRAY[
      'tesoreria:autorizar',
      'tesoreria:movimientos:crear',
      'ventas:facturas:ver',
      'compras:facturas:ver',
      'reportes:ver',
      'contabilidad:asientos:ver'
    ],
    v_pais_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    empresas_asignadas = EXCLUDED.empresas_asignadas,
    permisos = EXCLUDED.permisos,
    activo = EXCLUDED.activo;

  -- Crear usuario Contador
  INSERT INTO usuarios (id, nombre, email, rol, empresas_asignadas, permisos, pais_id, activo)
  VALUES (
    'contador-test-001',
    'Usuario Contador',
    'contador@test.com',
    'contador',
    ARRAY[v_empresa_id],
    ARRAY[
      'contabilidad:asientos:crear',
      'contabilidad:asientos:editar',
      'contabilidad:asientos:ver',
      'contabilidad:cuentas:crear',
      'contabilidad:cuentas:editar',
      'reportes:ver',
      'tesoreria:movimientos:crear'
    ],
    v_pais_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    empresas_asignadas = EXCLUDED.empresas_asignadas,
    permisos = EXCLUDED.permisos,
    activo = EXCLUDED.activo;

  -- Crear usuario Normal
  INSERT INTO usuarios (id, nombre, email, rol, empresas_asignadas, permisos, pais_id, activo)
  VALUES (
    'usuario-test-001',
    'Usuario Normal',
    'usuario@test.com',
    'usuario',
    ARRAY[v_empresa_id],
    ARRAY[
      'contabilidad:asientos:ver',
      'ventas:facturas:ver',
      'reportes:ver'
    ],
    v_pais_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = EXCLUDED.rol,
    empresas_asignadas = EXCLUDED.empresas_asignadas,
    permisos = EXCLUDED.permisos,
    activo = EXCLUDED.activo;

  RAISE NOTICE 'Usuarios de prueba creados exitosamente en Supabase';
  RAISE NOTICE '1. Supervisor: supervisor@test.com (puede autorizar eliminaciones)';
  RAISE NOTICE '2. Contador: contador@test.com (puede crear asientos)';
  RAISE NOTICE '3. Usuario: usuario@test.com (permisos limitados)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Debes crear estos usuarios en Firebase Authentication para poder loguearte';
END $$;
