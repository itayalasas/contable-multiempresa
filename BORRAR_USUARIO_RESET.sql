-- Script para borrar tu usuario y empezar de cero
-- Ejecuta este SQL en Supabase Dashboard → SQL Editor

-- 1. Verificar usuario actual
SELECT id, email, rol, metadata
FROM usuarios
WHERE email = 'payalaortiz@gmail.com';

-- 2. Borrar usuario (descomenta la siguiente línea para ejecutar)
-- DELETE FROM usuarios WHERE email = 'payalaortiz@gmail.com';

-- 3. Después de borrar:
--    - Ve al navegador, abre consola (F12)
--    - Ejecuta: localStorage.clear();
--    - Recarga la página (F5)
--    - Ve a /login y autentica de nuevo
--    - El usuario se creará con el rol mapeado correctamente
