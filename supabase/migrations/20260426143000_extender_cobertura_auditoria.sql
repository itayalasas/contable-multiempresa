/*
  # Extender cobertura de auditoría

  1. Mejora resolución de empresa para tablas hijas
  2. Reemplaza trigger central para usar la nueva resolución
  3. Agrega triggers en tablas que hoy no están cubiertas
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
    v_new ->> 'created_by',
    v_new ->> 'creado_por',
    v_old ->> 'updated_by',
    v_old ->> 'modificado_por',
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

DROP TRIGGER IF EXISTS trg_auditoria_facturas_venta_items ON facturas_venta_items;
CREATE TRIGGER trg_auditoria_facturas_venta_items
AFTER INSERT OR UPDATE OR DELETE ON facturas_venta_items
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('VENTAS');

DROP TRIGGER IF EXISTS trg_auditoria_facturas_compra_items ON facturas_compra_items;
CREATE TRIGGER trg_auditoria_facturas_compra_items
AFTER INSERT OR UPDATE OR DELETE ON facturas_compra_items
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('COMPRAS');

DROP TRIGGER IF EXISTS trg_auditoria_movimientos_contables ON movimientos_contables;
CREATE TRIGGER trg_auditoria_movimientos_contables
AFTER INSERT OR UPDATE OR DELETE ON movimientos_contables
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('CONTABILIDAD');

DROP TRIGGER IF EXISTS trg_auditoria_clientes ON clientes;
CREATE TRIGGER trg_auditoria_clientes
AFTER INSERT OR UPDATE OR DELETE ON clientes
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('VENTAS');

DROP TRIGGER IF EXISTS trg_auditoria_proveedores ON proveedores;
CREATE TRIGGER trg_auditoria_proveedores
AFTER INSERT OR UPDATE OR DELETE ON proveedores
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('COMPRAS');

DROP TRIGGER IF EXISTS trg_auditoria_plan_cuentas ON plan_cuentas;
CREATE TRIGGER trg_auditoria_plan_cuentas
AFTER INSERT OR UPDATE OR DELETE ON plan_cuentas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('CONTABILIDAD');

DROP TRIGGER IF EXISTS trg_auditoria_cuentas_bancarias ON cuentas_bancarias;
CREATE TRIGGER trg_auditoria_cuentas_bancarias
AFTER INSERT OR UPDATE OR DELETE ON cuentas_bancarias
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('TESORERIA');

DROP TRIGGER IF EXISTS trg_auditoria_configuracion_aprobaciones ON configuracion_aprobaciones;
CREATE TRIGGER trg_auditoria_configuracion_aprobaciones
AFTER INSERT OR UPDATE OR DELETE ON configuracion_aprobaciones
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('ADMINISTRACION');

DROP TRIGGER IF EXISTS trg_auditoria_empresas ON empresas;
CREATE TRIGGER trg_auditoria_empresas
AFTER INSERT OR UPDATE OR DELETE ON empresas
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('ADMINISTRACION');
