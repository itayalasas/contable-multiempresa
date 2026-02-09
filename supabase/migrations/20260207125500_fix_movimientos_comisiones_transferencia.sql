/*
  # Fix movimientos de comisiones en tesorería

  - Comisiones MP: convertir a TRANSFERENCIA y neutralizar saldo
  - Cobros de facturas de comisión: convertir a TRANSFERENCIA interna
  - Movimientos sin asiento pero no requeridos: marcar CONCILIADO
*/

-- 1) Comisiones MP como transferencia neutral (misma cuenta destino)
UPDATE movimientos_tesoreria mt
SET tipo_movimiento = 'TRANSFERENCIA',
    estado_conciliacion = CASE WHEN mt.asiento_contable_id IS NOT NULL THEN 'CONTABILIZADO' ELSE 'CONCILIADO' END,
    metadata = jsonb_set(
      jsonb_set(COALESCE(mt.metadata, '{}'::jsonb), '{no_requiere_asiento}', 'true'::jsonb, true),
      '{cuenta_destino_id}', to_jsonb(mt.cuenta_bancaria_id), true
    )
WHERE mt.categoria = 'COMISION_PASARELA'
  AND mt.documento_origen_tipo = 'comision_mercadopago'
  AND mt.tipo_movimiento <> 'TRANSFERENCIA'
  AND (mt.eliminado IS NULL OR mt.eliminado = false);

-- 2) Cobros de facturas de comisión como transferencia interna neutral
UPDATE movimientos_tesoreria mt
SET tipo_movimiento = 'TRANSFERENCIA',
    categoria = 'COMISION_INTERNA',
    estado_conciliacion = CASE WHEN mt.asiento_contable_id IS NOT NULL THEN 'CONTABILIZADO' ELSE 'CONCILIADO' END,
    metadata = jsonb_set(
      jsonb_set(COALESCE(mt.metadata, '{}'::jsonb), '{no_requiere_asiento}', 'true'::jsonb, true),
      '{cuenta_destino_id}', to_jsonb(mt.cuenta_bancaria_id), true
    )
WHERE mt.documento_origen_tipo = 'pago_cliente'
  AND mt.documento_origen_id IN (
    SELECT pc.id
    FROM pagos_cliente pc
    JOIN facturas_venta fv ON fv.id = pc.factura_id
    WHERE fv.metadata->>'tipo' = 'factura_comisiones_partner'
       OR fv.serie = 'COM'
       OR (fv.numero_factura LIKE 'COM-%')
  )
  AND (mt.eliminado IS NULL OR mt.eliminado = false);

-- 3) Movimientos sin asiento pero marcados como no requeridos → CONCILIADO
UPDATE movimientos_tesoreria
SET estado_conciliacion = 'CONCILIADO'
WHERE asiento_contable_id IS NULL
  AND (metadata->>'no_requiere_asiento') = 'true'
  AND (estado_conciliacion IS NULL OR estado_conciliacion = 'PENDIENTE')
  AND (eliminado IS NULL OR eliminado = false);
