/*
  # Fix RLS for Periodos Contables with Anon Access

  1. Changes
    - Allow anon users to SELECT, INSERT, UPDATE ejercicios_fiscales
    - Allow anon users to SELECT, INSERT, UPDATE periodos_contables
    - Allow anon users to SELECT, INSERT cierres_contables
    
  2. Security
    - Enable RLS maintained
    - Policies adapted for external auth system
*/

-- Drop existing restrictive policies for ejercicios_fiscales
DROP POLICY IF EXISTS "Usuarios pueden ver ejercicios fiscales de su empresa" ON ejercicios_fiscales;
DROP POLICY IF EXISTS "Solo administradores pueden crear ejercicios fiscales" ON ejercicios_fiscales;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar ejercicios fiscales" ON ejercicios_fiscales;

-- Create new permissive policies for ejercicios_fiscales
CREATE POLICY "Allow anon select ejercicios_fiscales"
  ON ejercicios_fiscales FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert ejercicios_fiscales"
  ON ejercicios_fiscales FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon update ejercicios_fiscales"
  ON ejercicios_fiscales FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing restrictive policies for periodos_contables
DROP POLICY IF EXISTS "Usuarios pueden ver periodos contables de su empresa" ON periodos_contables;
DROP POLICY IF EXISTS "Solo administradores pueden crear periodos contables" ON periodos_contables;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar periodos contables" ON periodos_contables;

-- Create new permissive policies for periodos_contables
CREATE POLICY "Allow anon select periodos_contables"
  ON periodos_contables FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert periodos_contables"
  ON periodos_contables FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon update periodos_contables"
  ON periodos_contables FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing restrictive policies for cierres_contables
DROP POLICY IF EXISTS "Usuarios pueden ver histórico de cierres de su empresa" ON cierres_contables;
DROP POLICY IF EXISTS "Solo administradores pueden registrar cierres" ON cierres_contables;

-- Create new permissive policies for cierres_contables
CREATE POLICY "Allow anon select cierres_contables"
  ON cierres_contables FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert cierres_contables"
  ON cierres_contables FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
