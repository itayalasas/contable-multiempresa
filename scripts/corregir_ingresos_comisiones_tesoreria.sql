-- Script para corregir ingresos de comisiones en tesorería
-- Problema: Cuando se paga a partners, se registra el EGRESO pero NO el INGRESO de la comisión retenida
-- Esto deja el saldo bancario en negativo y no refleja la ganancia real de la app

DO $$
DECLARE
  pago_record RECORD;
  factura_compra RECORD;
  comisiones RECORD;
  total_comision_app NUMERIC := 0;
  total_comision_mp_aliado NUMERIC := 0;
  total_comisiones NUMERIC := 0;
  cuenta_bancaria_id_pago UUID;
  movimientos_creados INTEGER := 0;
BEGIN

  RAISE NOTICE '🔧 Iniciando corrección de ingresos por comisiones retenidas...';
  RAISE NOTICE '';

  -- Iterar sobre todos los pagos a proveedores/partners
  FOR pago_record IN
    SELECT
      pp.id as pago_id,
      pp.factura_id,
      pp.fecha_pago,
      pp.monto as monto_pago,
      pp.cuenta_bancaria_id,
      pp.asiento_contable_id,
      fpp.numero as factura_numero,
      fpp.empresa_id,
      prov.razon_social as proveedor_nombre
    FROM pagos_proveedor pp
    INNER JOIN facturas_por_pagar fpp ON fpp.id = pp.factura_id
    LEFT JOIN proveedores prov ON prov.id = fpp.proveedor_id
    WHERE pp.eliminado = false
    ORDER BY pp.fecha_pago
  LOOP

    -- Buscar comisiones asociadas a esta factura de compra
    SELECT
      SUM(COALESCE(cp.comision_app, 0)) as suma_comision_app,
      SUM(COALESCE(cp.comision_mercadopago_aliado, 0)) as suma_comision_mp_aliado
    INTO total_comision_app, total_comision_mp_aliado
    FROM comisiones_partners cp
    WHERE cp.factura_compra_id = pago_record.factura_id
      AND cp.estado = 'facturada';

    total_comisiones := COALESCE(total_comision_app, 0) + COALESCE(total_comision_mp_aliado, 0);

    -- Si hay comisiones, verificar si ya existe el movimiento de INGRESO
    IF total_comisiones > 0 THEN

      -- Verificar si ya existe un movimiento de ingreso por comisión para este pago
      IF NOT EXISTS (
        SELECT 1 FROM movimientos_tesoreria mt
        WHERE mt.documento_origen_tipo = 'comision_marketplace'
          AND mt.documento_origen_id = pago_record.factura_id
          AND mt.metadata->>'pago_proveedor_id' = pago_record.pago_id::text
          AND mt.tipo_movimiento = 'INGRESO'
          AND mt.categoria = 'INGRESO_COMISION'
      ) THEN

        RAISE NOTICE '📝 Pago: % (Factura: %)', pago_record.pago_id, pago_record.factura_numero;
        RAISE NOTICE '   Partner: %', pago_record.proveedor_nombre;
        RAISE NOTICE '   Monto pagado: $%', pago_record.monto_pago;
        RAISE NOTICE '   Comisión App: $%, MP Aliado: $%, Total: $%',
          total_comision_app, total_comision_mp_aliado, total_comisiones;

        -- Usar la misma cuenta bancaria del pago
        cuenta_bancaria_id_pago := pago_record.cuenta_bancaria_id;

        IF cuenta_bancaria_id_pago IS NULL THEN
          RAISE WARNING '   ⚠️  No se encontró cuenta bancaria. Saltando...';
          CONTINUE;
        END IF;

        -- Crear movimiento de INGRESO por comisión retenida
        INSERT INTO movimientos_tesoreria (
          empresa_id,
          cuenta_bancaria_id,
          tipo_movimiento,
          fecha,
          monto,
          descripcion,
          referencia,
          beneficiario,
          categoria,
          asiento_contable_id,
          documento_origen_tipo,
          documento_origen_id,
          metadata
        ) VALUES (
          pago_record.empresa_id,
          cuenta_bancaria_id_pago,
          'INGRESO',
          pago_record.fecha_pago,
          total_comisiones,
          'Ingreso comisiones retenidas - Factura ' || pago_record.factura_numero,
          'COM-RETENIDA-' || pago_record.factura_numero,
          'Comisiones Marketplace',
          'INGRESO_COMISION',
          pago_record.asiento_contable_id,
          'comision_marketplace',
          pago_record.factura_id,
          jsonb_build_object(
            'factura_compra_id', pago_record.factura_id,
            'pago_proveedor_id', pago_record.pago_id,
            'comision_app', total_comision_app,
            'comision_mp_aliado', total_comision_mp_aliado,
            'tipo', 'comision_retenida',
            'origen', 'correccion_retroactiva'
          )
        );

        movimientos_creados := movimientos_creados + 1;
        RAISE NOTICE '   ✅ Movimiento de ingreso creado: $%', total_comisiones;
        RAISE NOTICE '';

      ELSE
        -- Ya existe, no hacer nada
        NULL;
      END IF;

    END IF;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Proceso completado.';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   - Movimientos de ingreso creados: %', movimientos_creados;
  RAISE NOTICE '';
  RAISE NOTICE '💡 Los saldos bancarios se actualizan automáticamente vía triggers.';
  RAISE NOTICE '💡 Verifica tesorería para confirmar que los saldos son correctos.';
  RAISE NOTICE '';

END $$;
