-- ============================================
-- Script Rápido: Actualizar Permisos de Usuario
-- ============================================
-- Copia y pega este script completo en el SQL Editor de Supabase

UPDATE usuarios
SET metadata = '{
  "role": "administrador_del_sistema",
  "permissions": {
    "dashboard": ["create", "delete", "read", "update"],
    "plan-cuentas": ["create", "delete", "read", "update"],
    "asientos": ["create", "delete", "read", "update"],
    "mayor": ["create", "delete", "read", "update"],
    "balance-comprobacion": ["create", "delete", "read", "update"],
    "periodos": ["create", "delete", "read", "update"],
    "clientes": ["create", "delete", "read", "update"],
    "facturas": ["create", "delete", "read", "update"],
    "notas-credito": ["create", "delete", "read", "update"],
    "notas-debito": ["create", "delete", "read", "update"],
    "recibos": ["create", "delete", "read", "update"],
    "proveedores": ["create", "delete", "read", "update"],
    "partners": ["create", "delete", "read", "update"],
    "comisiones": ["create", "delete", "read", "update"],
    "cuentas-cobrar": ["create", "delete", "read", "update"],
    "cuentas-pagar": ["create", "delete", "read", "update"],
    "tesoreria": ["create", "delete", "read", "update"],
    "conciliacion": ["create", "delete", "read", "update"],
    "centros-costo": ["create", "delete", "read", "update"],
    "balance-general": ["create", "delete", "read", "update"],
    "empresas": ["create", "delete", "read", "update"],
    "usuarios": ["create", "delete", "read", "update"],
    "autorizaciones": ["create", "delete", "read", "update"],
    "configuracion": ["create", "delete", "read", "update"],
    "configuracion-mapeo": ["create", "delete", "read", "update"],
    "impuestos": ["create", "delete", "read", "update"],
    "integraciones": ["create", "delete", "read", "update"],
    "auditoria": ["create", "delete", "read", "update"],
    "multimoneda": ["create", "delete", "read", "update"]
  }
}'::jsonb
WHERE email = 'payalaortiz@gmail.com';

-- Verificar el resultado
SELECT
  id,
  nombre,
  email,
  rol,
  metadata->>'role' as metadata_role,
  jsonb_object_keys(metadata->'permissions') as permisos_configurados
FROM usuarios
WHERE email = 'payalaortiz@gmail.com';
