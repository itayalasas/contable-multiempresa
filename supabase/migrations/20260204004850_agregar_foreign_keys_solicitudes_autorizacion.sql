/*
  # Agregar foreign keys a solicitudes_autorizacion

  ## Descripción
  Agrega foreign keys a la tabla solicitudes_autorizacion para relacionar
  con la tabla usuarios y permitir hacer joins para obtener los nombres.

  ## Cambios
  - Agrega FK de solicitado_por hacia usuarios(id)
  - Agrega FK de revisado_por hacia usuarios(id)
  - Las FK son con ON DELETE SET NULL para no romper si se elimina un usuario
*/

-- Agregar foreign key para solicitado_por
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'solicitudes_autorizacion_solicitado_por_fkey'
    AND table_name = 'solicitudes_autorizacion'
  ) THEN
    ALTER TABLE solicitudes_autorizacion
    ADD CONSTRAINT solicitudes_autorizacion_solicitado_por_fkey
    FOREIGN KEY (solicitado_por)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Agregar foreign key para revisado_por
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'solicitudes_autorizacion_revisado_por_fkey'
    AND table_name = 'solicitudes_autorizacion'
  ) THEN
    ALTER TABLE solicitudes_autorizacion
    ADD CONSTRAINT solicitudes_autorizacion_revisado_por_fkey
    FOREIGN KEY (revisado_por)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Comentarios
COMMENT ON CONSTRAINT solicitudes_autorizacion_solicitado_por_fkey 
  ON solicitudes_autorizacion IS 'FK hacia usuarios para obtener nombre del solicitante';

COMMENT ON CONSTRAINT solicitudes_autorizacion_revisado_por_fkey 
  ON solicitudes_autorizacion IS 'FK hacia usuarios para obtener nombre del revisor';
