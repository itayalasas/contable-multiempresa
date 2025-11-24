/*
  # Permitir NULL en creado_por de pagos_proveedor

  1. Cambios
    - Se hace nullable el campo `creado_por` en `pagos_proveedor`
    - Esto permite que las edge functions inserten pagos sin usuario
    
  2. Seguridad
    - El campo mantiene la foreign key a usuarios
    - RLS sigue protegiendo el acceso
*/

-- Hacer nullable el campo creado_por
ALTER TABLE pagos_proveedor 
ALTER COLUMN creado_por DROP NOT NULL;
