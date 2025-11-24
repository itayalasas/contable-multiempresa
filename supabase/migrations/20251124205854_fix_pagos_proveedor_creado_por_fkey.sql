/*
  # Fix pagos_proveedor creado_por foreign key

  1. Changes
    - Drop foreign key constraint on creado_por column in pagos_proveedor table
    - This allows storing user IDs from external auth providers (Auth0, Firebase)
    
  2. Security
    - RLS policies remain active to protect data
    - creado_por field can now store any user identifier
*/

-- Drop the foreign key constraint
ALTER TABLE pagos_proveedor DROP CONSTRAINT IF EXISTS pagos_proveedor_creado_por_fkey;
