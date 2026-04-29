/*
  # Reforzar auditoria y aprobaciones

  1. Amplia la deteccion de usuario responsable en triggers de auditoria
  2. Resuelve empresa para notas de credito items
  3. Agrega triggers faltantes para notas de credito y sus items
*/

CREATE OR REPLACE FUNCTION public.resolver_empresa_auditoria_detallada(
  p_table_name text,
  p_new jsonb,
  p_old jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_factura_id uuid;
  v_asiento_id uuid;
  v_nota_credito_id uuid;
BEGIN
  v_empresa_id := COALESCE(
    NULLIF(p_new ->> 'empresa_id', '')::uuid,
    NULLIF(p_old ->> 'empresa_id', '')::uuid
  );

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  IF p_table_name = 'empresas' THEN
    RETURN COALESCE(NULLIF(p_new ->> 'id', '')::uuid, NULLIF(p_old ->> 'id', '')::uuid);
  END IF;

  IF p_table_name = 'facturas_venta_items' THEN
    v_factura_id := COALESCE(NULLIF(p_new ->> 'factura_id', '')::uuid, NULLIF(p_old ->> 'factura_id', '')::uuid);
    IF v_factura_id IS NOT NULL THEN
      SELECT empresa_id INTO v_empresa_id FROM facturas_venta WHERE id = v_factura_id;
      RETURN v_empresa_id;
    END IF;
  END IF;

  IF p_table_name = 'facturas_compra_items' THEN
    v_factura_id := COALESCE(NULLIF(p_new ->> 'factura_id', '')::uuid, NULLIF(p_old ->> 'factura_id', '')::uuid);
    IF v_factura_id IS NOT NULL THEN
      SELECT empresa_id INTO v_empresa_id FROM facturas_compra WHERE id = v_factura_id;
      RETURN v_empresa_id;
    END IF;
  END IF;

  IF p_table_name = 'notas_credito_items' THEN
    v_nota_credito_id := COALESCE(
      NULLIF(p_new ->> 'nota_credito_id', '')::uuid,
      NULLIF(p_old ->> 'nota_credito_id', '')::uuid
    );
    IF v_nota_credito_id IS NOT NULL THEN
      SELECT empresa_id INTO v_empresa_id FROM notas_credito WHERE id = v_nota_credito_id;
      RETURN v_empresa_id;
    END IF;
  END IF;

  IF p_table_name = 'movimientos_contables' THEN
    v_asiento_id := COALESCE(NULLIF(p_new ->> 'asiento_id', '')::uuid, NULLIF(p_old ->> 'asiento_id', '')::uuid);
    IF v_asiento_id IS NOT NULL THEN
      SELECT empresa_id INTO v_empresa_id FROM asientos_contables WHERE id = v_asiento_id;
      RETURN v_empresa_id;
    END IF;
  END IF;

  RETURN NULL;
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
    'EXITO',
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.notas_credito') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_notas_credito ON notas_credito';
    EXECUTE 'CREATE TRIGGER trg_auditoria_notas_credito
      AFTER INSERT OR UPDATE OR DELETE ON notas_credito
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''VENTAS'')';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.notas_credito_items') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_notas_credito_items ON notas_credito_items';
    EXECUTE 'CREATE TRIGGER trg_auditoria_notas_credito_items
      AFTER INSERT OR UPDATE OR DELETE ON notas_credito_items
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''VENTAS'')';
  END IF;
END $$;
