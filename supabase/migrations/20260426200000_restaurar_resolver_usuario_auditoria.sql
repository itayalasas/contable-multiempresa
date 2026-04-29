/*
  # Restaurar funcion auxiliar de auditoria

  1. Recreate resolver_usuario_auditoria si una base no aplico la migracion original
  2. Evita que triggers de auditoria rompan aprobaciones y actualizaciones operativas
*/

CREATE OR REPLACE FUNCTION public.resolver_usuario_auditoria(
  p_empresa_id uuid,
  p_usuario_candidato text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_usuario text;
BEGIN
  IF p_usuario_candidato IS NOT NULL AND EXISTS (
    SELECT 1
      FROM usuarios
     WHERE id = p_usuario_candidato
  ) THEN
    RETURN p_usuario_candidato;
  END IF;

  SELECT id
    INTO v_usuario
    FROM usuarios
   WHERE p_empresa_id IS NOT NULL
     AND p_empresa_id::text = ANY(empresas_asignadas)
   ORDER BY ultima_conexion DESC NULLS LAST, fecha_creacion ASC
   LIMIT 1;

  IF v_usuario IS NOT NULL THEN
    RETURN v_usuario;
  END IF;

  SELECT id
    INTO v_usuario
    FROM usuarios
   ORDER BY ultima_conexion DESC NULLS LAST, fecha_creacion ASC
   LIMIT 1;

  RETURN v_usuario;
END;
$$;
