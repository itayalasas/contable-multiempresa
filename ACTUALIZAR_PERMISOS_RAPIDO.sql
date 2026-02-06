-- ============================================
-- Script Rápido: Actualizar Permisos de Usuario
-- ============================================
-- Copia y pega este script completo en el SQL Editor de Supabase
--
-- NOTA: Los permisos se configuran por CATEGORÍAS PRINCIPALES
-- (dashboard, contabilidad, ventas, compras, finanzas, analisis, reportes, administracion)
-- y automáticamente se aplican a todos los submódulos de cada categoría.

UPDATE usuarios
SET metadata = '{
  "role": "administrador_del_sistema",
  "permissions": {
    "dashboard": ["create", "delete", "read", "update"],
    "contabilidad": ["create", "delete", "read", "update"],
    "ventas": ["create", "delete", "read", "update"],
    "compras": ["create", "delete", "read", "update"],
    "finanzas": ["create", "delete", "read", "update"],
    "analisis": ["create", "delete", "read", "update"],
    "reportes": ["create", "delete", "read", "update"],
    "administracion": ["create", "delete", "read", "update"]
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
  jsonb_pretty(metadata->'permissions') as permisos_configurados
FROM usuarios
WHERE email = 'payalaortiz@gmail.com';
