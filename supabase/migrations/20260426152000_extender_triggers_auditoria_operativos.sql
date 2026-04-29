/*
  # Extender triggers de auditoría a módulos operativos

  Cubre tablas con escrituras directas desde frontend/servicios que aún no
  tenían trigger explícito de auditoría.
*/

DO $$
BEGIN
  IF to_regclass('public.centros_costo') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_centros_costo ON public.centros_costo';
    EXECUTE 'CREATE TRIGGER trg_auditoria_centros_costo
      AFTER INSERT OR UPDATE OR DELETE ON public.centros_costo
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ANALISIS'')';
  END IF;

  IF to_regclass('public.segmentos_negocio') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_segmentos_negocio ON public.segmentos_negocio';
    EXECUTE 'CREATE TRIGGER trg_auditoria_segmentos_negocio
      AFTER INSERT OR UPDATE OR DELETE ON public.segmentos_negocio
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ANALISIS'')';
  END IF;

  IF to_regclass('public.presupuesto_centro_costo') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_presupuesto_centro_costo ON public.presupuesto_centro_costo';
    EXECUTE 'CREATE TRIGGER trg_auditoria_presupuesto_centro_costo
      AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_centro_costo
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ANALISIS'')';
  END IF;

  IF to_regclass('public.impuestos_configuracion') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_impuestos_configuracion ON public.impuestos_configuracion';
    EXECUTE 'CREATE TRIGGER trg_auditoria_impuestos_configuracion
      AFTER INSERT OR UPDATE OR DELETE ON public.impuestos_configuracion
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.mapeo_archivos_bancarios') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_mapeo_archivos_bancarios ON public.mapeo_archivos_bancarios';
    EXECUTE 'CREATE TRIGGER trg_auditoria_mapeo_archivos_bancarios
      AFTER INSERT OR UPDATE OR DELETE ON public.mapeo_archivos_bancarios
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''TESORERIA'')';
  END IF;

  IF to_regclass('public.lotes_pago_bancario') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_lotes_pago_bancario ON public.lotes_pago_bancario';
    EXECUTE 'CREATE TRIGGER trg_auditoria_lotes_pago_bancario
      AFTER INSERT OR UPDATE OR DELETE ON public.lotes_pago_bancario
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''TESORERIA'')';
  END IF;

  IF to_regclass('public.pagos_lote') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_pagos_lote ON public.pagos_lote';
    EXECUTE 'CREATE TRIGGER trg_auditoria_pagos_lote
      AFTER INSERT OR UPDATE OR DELETE ON public.pagos_lote
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''TESORERIA'')';
  END IF;

  IF to_regclass('public.empresas_config_fiscal') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_config_fiscal ON public.empresas_config_fiscal';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_config_fiscal
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_config_fiscal
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.empresas_config_cfe') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_config_cfe ON public.empresas_config_cfe';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_config_cfe
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_config_cfe
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.empresas_series_documentos') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_series_documentos ON public.empresas_series_documentos';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_series_documentos
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_series_documentos
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.empresas_config_bps') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_config_bps ON public.empresas_config_bps';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_config_bps
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_config_bps
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.empresas_sucursales') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_sucursales ON public.empresas_sucursales';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_sucursales
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_sucursales
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.empresas_actividades') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_empresas_actividades ON public.empresas_actividades';
    EXECUTE 'CREATE TRIGGER trg_auditoria_empresas_actividades
      AFTER INSERT OR UPDATE OR DELETE ON public.empresas_actividades
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''ADMINISTRACION'')';
  END IF;

  IF to_regclass('public.partners_aliados') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_partners_aliados ON public.partners_aliados';
    EXECUTE 'CREATE TRIGGER trg_auditoria_partners_aliados
      AFTER INSERT OR UPDATE OR DELETE ON public.partners_aliados
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''COMPRAS'')';
  END IF;

  IF to_regclass('public.comisiones_partners') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_comisiones_partners ON public.comisiones_partners';
    EXECUTE 'CREATE TRIGGER trg_auditoria_comisiones_partners
      AFTER INSERT OR UPDATE OR DELETE ON public.comisiones_partners
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''COMPRAS'')';
  END IF;

  IF to_regclass('public.documentos_compra') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_documentos_compra ON public.documentos_compra';
    EXECUTE 'CREATE TRIGGER trg_auditoria_documentos_compra
      AFTER INSERT OR UPDATE OR DELETE ON public.documentos_compra
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''COMPRAS'')';
  END IF;

  IF to_regclass('public.eventos_externos') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_auditoria_eventos_externos ON public.eventos_externos';
    EXECUTE 'CREATE TRIGGER trg_auditoria_eventos_externos
      AFTER INSERT OR UPDATE OR DELETE ON public.eventos_externos
      FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_trigger(''INTEGRACIONES'')';
  END IF;
END $$;
