-- Ver empresas y sus usuarios asignados
SELECT id, nombre, usuarios_asignados 
FROM empresas 
WHERE activa = true 
ORDER BY fecha_creacion DESC 
LIMIT 5;
