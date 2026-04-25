/*
  # Hardening de esquema para wizard de empresas

  Problema observado:
  - En algunos entornos faltan columnas usadas por el wizard (schema drift).
  - El error aparece de forma secuencial: estado_tributario, fecha_inicio_actividades,
    nombre_fantasia, etc.

  Objetivo:
  - Asegurar de forma idempotente que existan todas las columnas requeridas por
    creación/edición de empresa.
  - Mantener columnas opcionales para compatibilidad hacia atrás.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'nombre_fantasia'
  ) THEN
    ALTER TABLE empresas ADD COLUMN nombre_fantasia text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'tipo_contribuyente_id'
  ) THEN
    ALTER TABLE empresas ADD COLUMN tipo_contribuyente_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'fecha_inicio_actividades'
  ) THEN
    ALTER TABLE empresas ADD COLUMN fecha_inicio_actividades date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'estado_tributario'
  ) THEN
    ALTER TABLE empresas ADD COLUMN estado_tributario text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'domicilio_fiscal'
  ) THEN
    ALTER TABLE empresas ADD COLUMN domicilio_fiscal text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'domicilio_comercial'
  ) THEN
    ALTER TABLE empresas ADD COLUMN domicilio_comercial text;
  END IF;
END $$;

ALTER TABLE empresas
  ALTER COLUMN nombre_fantasia DROP NOT NULL,
  ALTER COLUMN tipo_contribuyente_id DROP NOT NULL,
  ALTER COLUMN fecha_inicio_actividades DROP NOT NULL,
  ALTER COLUMN estado_tributario DROP NOT NULL,
  ALTER COLUMN domicilio_fiscal DROP NOT NULL,
  ALTER COLUMN domicilio_comercial DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'tipos_contribuyente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'empresas'
      AND constraint_name = 'empresas_tipo_contribuyente_id_fkey'
  ) THEN
    ALTER TABLE empresas
      ADD CONSTRAINT empresas_tipo_contribuyente_id_fkey
      FOREIGN KEY (tipo_contribuyente_id)
      REFERENCES tipos_contribuyente(id);
  END IF;
END $$;

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

COMMENT ON COLUMN empresas.nombre_fantasia IS
  'Nombre comercial/fantasia de la empresa (opcional).';

COMMENT ON COLUMN empresas.tipo_contribuyente_id IS
  'Referencia opcional al tipo de contribuyente de la empresa.';

COMMENT ON COLUMN empresas.fecha_inicio_actividades IS
  'Fecha opcional de inicio de actividades de la empresa.';

COMMENT ON COLUMN empresas.estado_tributario IS
  'Estado tributario opcional de la empresa (activa, baja_temporal, baja_definitiva).';
