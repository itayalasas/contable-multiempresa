/*
  # Asegurar estado_tributario en empresas (opcional)

  Objetivo:
  - Garantizar que la columna exista para edición desde wizard.
  - Mantenerla opcional (NULL permitido).
  - Validar valores permitidos cuando se informen.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'empresas'
      AND column_name = 'estado_tributario'
  ) THEN
    ALTER TABLE empresas ADD COLUMN estado_tributario text;
  END IF;
END $$;

-- Dejarla opcional explícitamente
ALTER TABLE empresas
  ALTER COLUMN estado_tributario DROP NOT NULL;

-- Sin valor por defecto obligatorio (opcional)
ALTER TABLE empresas
  ALTER COLUMN estado_tributario DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'empresas'
      AND constraint_name = 'empresas_estado_tributario_chk'
  ) THEN
    ALTER TABLE empresas
      ADD CONSTRAINT empresas_estado_tributario_chk
      CHECK (
        estado_tributario IS NULL
        OR estado_tributario IN ('activa', 'baja_temporal', 'baja_definitiva')
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN empresas.estado_tributario IS
  'Estado tributario opcional de la empresa (activa, baja_temporal, baja_definitiva).';
