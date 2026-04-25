/*
  # Auditoria automática sobre tablas críticas

  1. Crea funciones auxiliares para resolver usuario y empresa de auditoría
  2. Registra INSERT/UPDATE/DELETE mediante triggers
  3. Cubre tablas contables y operativas clave
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
    SELECT 1 FROM usuarios WHERE id = p_usuario_candidato
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
  v_empresa_id := COALESCE(
    NULLIF(v_new ->> 'empresa_id', '')::uuid,
    NULLIF(v_old ->> 'empresa_id', '')::uuid
  );

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

DROP TRIGGER IF EXISTS trg_auditoria_facturas_venta ON facturas_venta;
CREATE TRIGGER trg_auditoria_facturas_venta
AFTER INSERT OR UPDATE OR DELETE ON facturas_venta
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('VENTAS');

DROP TRIGGER IF EXISTS trg_auditoria_facturas_compra ON facturas_compra;
CREATE TRIGGER trg_auditoria_facturas_compra
AFTER INSERT OR UPDATE OR DELETE ON facturas_compra
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('COMPRAS');

DROP TRIGGER IF EXISTS trg_auditoria_asientos_contables ON asientos_contables;
CREATE TRIGGER trg_auditoria_asientos_contables
AFTER INSERT OR UPDATE OR DELETE ON asientos_contables
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('CONTABILIDAD');

DROP TRIGGER IF EXISTS trg_auditoria_movimientos_tesoreria ON movimientos_tesoreria;
CREATE TRIGGER trg_auditoria_movimientos_tesoreria
AFTER INSERT OR UPDATE OR DELETE ON movimientos_tesoreria
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('TESORERIA');

DROP TRIGGER IF EXISTS trg_auditoria_pagos_cliente ON pagos_cliente;
CREATE TRIGGER trg_auditoria_pagos_cliente
AFTER INSERT OR UPDATE OR DELETE ON pagos_cliente
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('COBRANZAS');

DROP TRIGGER IF EXISTS trg_auditoria_pagos_proveedor ON pagos_proveedor;
CREATE TRIGGER trg_auditoria_pagos_proveedor
AFTER INSERT OR UPDATE OR DELETE ON pagos_proveedor
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('PAGOS');

DROP TRIGGER IF EXISTS trg_auditoria_periodos_contables ON periodos_contables;
CREATE TRIGGER trg_auditoria_periodos_contables
AFTER INSERT OR UPDATE OR DELETE ON periodos_contables
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('CIERRES');

DROP TRIGGER IF EXISTS trg_auditoria_conciliacion_bancaria ON conciliacion_bancaria;
CREATE TRIGGER trg_auditoria_conciliacion_bancaria
AFTER INSERT OR UPDATE OR DELETE ON conciliacion_bancaria
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger('CONCILIACION');
