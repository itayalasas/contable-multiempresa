/*
  # Registrar IP y user-agent en auditoria

  1. Agrega helpers para resolver headers enviados por PostgREST/Supabase
  2. Actualiza el trigger consolidado para guardar ip_address y user_agent
  3. Permite que auditoria_cambios almacene IP/user-agent cuando las Edge Functions lo envien
*/

ALTER TABLE IF EXISTS auditoria_cambios
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE OR REPLACE FUNCTION public.resolver_header_auditoria(p_header text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_headers jsonb;
  v_value text;
BEGIN
  v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  v_value := COALESCE(
    v_headers ->> p_header,
    v_headers ->> lower(p_header),
    v_headers ->> replace(lower(p_header), '_', '-')
  );

  RETURN NULLIF(v_value, '');
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_ip_auditoria()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_ip text;
BEGIN
  v_ip := COALESCE(
    public.resolver_header_auditoria('cf-connecting-ip'),
    public.resolver_header_auditoria('x-real-ip'),
    public.resolver_header_auditoria('x-forwarded-for')
  );

  IF v_ip IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN trim(split_part(v_ip, ',', 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_auditoria_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old jsonb := COALESCE(to_jsonb(OLD), '{}'::jsonb);
  v_new jsonb := COALESCE(to_jsonb(NEW), '{}'::jsonb);
  v_empresa_id uuid;
  v_usuario_candidato text;
  v_usuario_id text;
  v_registro_id text;
  v_descripcion text;
BEGIN
  v_empresa_id := public.resolver_empresa_auditoria_detallada(TG_TABLE_NAME, v_new, v_old);

  v_usuario_candidato := COALESCE(
    v_new ->> 'updated_by',
    v_new ->> 'updated_by_user',
    v_new ->> 'updated_by_id',
    v_new ->> 'modificado_por',
    v_new ->> 'eliminado_por',
    v_new ->> 'usuario_id',
    v_new ->> 'solicitado_por',
    v_new ->> 'aprobador_id',
    v_new ->> 'aprobado_por',
    v_new ->> 'revisado_por',
    v_new ->> 'created_by',
    v_new ->> 'creado_por',
    v_old ->> 'updated_by',
    v_old ->> 'updated_by_user',
    v_old ->> 'updated_by_id',
    v_old ->> 'modificado_por',
    v_old ->> 'eliminado_por',
    v_old ->> 'usuario_id',
    v_old ->> 'solicitado_por',
    v_old ->> 'aprobador_id',
    v_old ->> 'aprobado_por',
    v_old ->> 'revisado_por',
    v_old ->> 'created_by',
    v_old ->> 'creado_por',
    auth.uid()::text
  );

  v_usuario_id := public.resolver_usuario_auditoria(v_empresa_id, v_usuario_candidato);
  IF v_usuario_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_registro_id := COALESCE(v_new ->> 'id', v_old ->> 'id', 'sin-id');
  v_descripcion := format('%s en %s', TG_OP, TG_TABLE_NAME);

  INSERT INTO auditoria (
    empresa_id,
    usuario_id,
    tabla,
    registro_id,
    accion,
    modulo,
    descripcion,
    valores_anteriores,
    valores_nuevos,
    cambios,
    ip_address,
    user_agent,
    resultado,
    fecha_creacion
  ) VALUES (
    v_empresa_id,
    v_usuario_id,
    TG_TABLE_NAME,
    v_registro_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'INSERT'
      WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
      WHEN TG_OP = 'DELETE' THEN 'DELETE'
      ELSE 'SELECT'
    END,
    TG_ARGV[0],
    v_descripcion,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN v_old ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN v_new ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', v_old, 'new', v_new) ELSE NULL END,
    public.resolver_ip_auditoria(),
    public.resolver_header_auditoria('user-agent'),
    'EXITO',
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
