/*
  Script para actualizar permisos de usuario en metadata

  Este script actualiza el campo metadata del usuario para incluir
  los permisos necesarios según su rol.
*/

-- Actualizar el usuario Pedro Ayala con permisos de administrador
UPDATE usuarios
SET metadata = jsonb_build_object(
  'role', 'administrador_del_sistema',
  'permissions', jsonb_build_object(
    'dashboard', ARRAY['create', 'delete', 'read', 'update']::text[],
    'plan-cuentas', ARRAY['create', 'delete', 'read', 'update']::text[],
    'asientos', ARRAY['create', 'delete', 'read', 'update']::text[],
    'mayor', ARRAY['create', 'delete', 'read', 'update']::text[],
    'balance-comprobacion', ARRAY['create', 'delete', 'read', 'update']::text[],
    'periodos', ARRAY['create', 'delete', 'read', 'update']::text[],
    'clientes', ARRAY['create', 'delete', 'read', 'update']::text[],
    'facturas', ARRAY['create', 'delete', 'read', 'update']::text[],
    'notas-credito', ARRAY['create', 'delete', 'read', 'update']::text[],
    'notas-debito', ARRAY['create', 'delete', 'read', 'update']::text[],
    'recibos', ARRAY['create', 'delete', 'read', 'update']::text[],
    'proveedores', ARRAY['create', 'delete', 'read', 'update']::text[],
    'partners', ARRAY['create', 'delete', 'read', 'update']::text[],
    'comisiones', ARRAY['create', 'delete', 'read', 'update']::text[],
    'cuentas-cobrar', ARRAY['create', 'delete', 'read', 'update']::text[],
    'cuentas-pagar', ARRAY['create', 'delete', 'read', 'update']::text[],
    'tesoreria', ARRAY['create', 'delete', 'read', 'update']::text[],
    'conciliacion', ARRAY['create', 'delete', 'read', 'update']::text[],
    'centros-costo', ARRAY['create', 'delete', 'read', 'update']::text[],
    'balance-general', ARRAY['create', 'delete', 'read', 'update']::text[],
    'empresas', ARRAY['create', 'delete', 'read', 'update']::text[],
    'usuarios', ARRAY['create', 'delete', 'read', 'update']::text[],
    'autorizaciones', ARRAY['create', 'delete', 'read', 'update']::text[],
    'configuracion', ARRAY['create', 'delete', 'read', 'update']::text[],
    'configuracion-mapeo', ARRAY['create', 'delete', 'read', 'update']::text[],
    'impuestos', ARRAY['create', 'delete', 'read', 'update']::text[],
    'integraciones', ARRAY['create', 'delete', 'read', 'update']::text[],
    'auditoria', ARRAY['create', 'delete', 'read', 'update']::text[],
    'multimoneda', ARRAY['create', 'delete', 'read', 'update']::text[]
  )
)
WHERE email = 'payalaortiz@gmail.com';

-- Verificar la actualización
SELECT
  id,
  nombre,
  email,
  rol,
  metadata
FROM usuarios
WHERE email = 'payalaortiz@gmail.com';
