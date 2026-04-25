/*
  # Asegurar fecha_inicio_actividades en empresas (opcional)

  Objetivo:
  - Garantizar que la columna exista para creación/edición desde wizard.
  - Mantenerla opcional (NULL permitido).
  - Usar tipo DATE acorde al formulario y lógica actual.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'empresas'
      AND column_name = 'fecha_inicio_actividades'
  ) THEN
    ALTER TABLE empresas ADD COLUMN fecha_inicio_actividades date;
  END IF;
END $$;

-- Dejarla opcional explícitamente
ALTER TABLE empresas
  ALTER COLUMN fecha_inicio_actividades DROP NOT NULL;

-- Sin valor por defecto obligatorio (opcional)
ALTER TABLE empresas
  ALTER COLUMN fecha_inicio_actividades DROP DEFAULT;

COMMENT ON COLUMN empresas.fecha_inicio_actividades IS
  'Fecha opcional de inicio de actividades de la empresa.';
