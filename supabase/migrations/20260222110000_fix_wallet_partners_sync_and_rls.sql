/*
  # Fix wallet partners: RLS + sincronización automática + backfill

  Problema detectado:
  - partner_wallet_movimientos tenía políticas solo para rol anon.
  - El frontend opera con authenticated, por lo que podía ver 0 filas aun con datos.
  - Comisiones históricas podían existir sin movimientos wallet asociados.

  Solución:
  1) Agregar políticas RLS para authenticated.
  2) Agregar índice único por referencia para evitar duplicados.
  3) Sincronizar wallet automáticamente desde comisiones_partners (INSERT/UPDATE).
  4) Backfill de movimientos wallet históricos desde comisiones existentes.
*/

-- =====================================================
-- 1) RLS para authenticated en partner_wallet_movimientos
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated select partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow authenticated select partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow authenticated insert partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow authenticated update partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow authenticated delete partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 2) Índice único por referencia para idempotencia
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_wallet_referencia_tipo_id_mov
  ON partner_wallet_movimientos(referencia_tipo, referencia_id, tipo_movimiento)
  WHERE referencia_id IS NOT NULL;

-- =====================================================
-- 3) Trigger: comisiones_partners -> wallet créditos/débitos
-- =====================================================

CREATE OR REPLACE FUNCTION sync_wallet_desde_comision_partner()
RETURNS TRIGGER AS $$
DECLARE
  v_monto NUMERIC(18,2);
  v_eliminado BOOLEAN;
  v_es_anulada BOOLEAN;
BEGIN
  v_monto := COALESCE(NEW.comision_monto, 0);
  IF v_monto <= 0 THEN
    RETURN NEW;
  END IF;

  -- Compatible aunque el esquema cambie (evita dependencia directa de NEW.eliminado)
  v_eliminado := COALESCE((to_jsonb(NEW)->>'eliminado')::BOOLEAN, false);
  v_es_anulada := (COALESCE(NEW.estado_comision, '') = 'anulada') OR v_eliminado;

  IF v_es_anulada THEN
    -- Si la comisión queda anulada/eliminada y existía crédito, registrar reversa (solo una vez)
    IF EXISTS (
      SELECT 1
      FROM partner_wallet_movimientos pwm
      WHERE pwm.referencia_tipo = 'comision_partner'
        AND pwm.referencia_id = NEW.id
        AND pwm.tipo_movimiento = 'CREDITO_VENTA_ALIADO'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM partner_wallet_movimientos pwm
      WHERE pwm.referencia_tipo = 'comision_partner_anulada'
        AND pwm.referencia_id = NEW.id
        AND pwm.tipo_movimiento = 'AJUSTE_MANUAL'
    ) THEN
      INSERT INTO partner_wallet_movimientos (
        empresa_id,
        partner_id,
        tipo_movimiento,
        signo,
        monto,
        moneda,
        referencia_tipo,
        referencia_id,
        descripcion,
        metadata
      ) VALUES (
        NEW.empresa_id,
        NEW.partner_id,
        'AJUSTE_MANUAL',
        -1,
        ABS(v_monto),
        'UYU',
        'comision_partner_anulada',
        NEW.id,
        'Reversa wallet por comisión anulada/eliminada',
        jsonb_build_object('origen', 'sync_wallet_desde_comision_partner')
      );
    END IF;

    RETURN NEW;
  END IF;

  -- Comisión válida: registrar crédito wallet si no existe
  IF NOT EXISTS (
    SELECT 1
    FROM partner_wallet_movimientos pwm
    WHERE pwm.referencia_tipo = 'comision_partner'
      AND pwm.referencia_id = NEW.id
      AND pwm.tipo_movimiento = 'CREDITO_VENTA_ALIADO'
  ) THEN
    INSERT INTO partner_wallet_movimientos (
      empresa_id,
      partner_id,
      tipo_movimiento,
      signo,
      monto,
      moneda,
      referencia_tipo,
      referencia_id,
      descripcion,
      metadata
    ) VALUES (
      NEW.empresa_id,
      NEW.partner_id,
      'CREDITO_VENTA_ALIADO',
      1,
      ABS(v_monto),
      'UYU',
      'comision_partner',
      NEW.id,
      'Crédito wallet por comisión de partner',
      jsonb_build_object('order_id', NEW.order_id, 'origen', 'sync_wallet_desde_comision_partner')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_wallet_desde_comision_partner ON comisiones_partners;
CREATE TRIGGER trg_sync_wallet_desde_comision_partner
AFTER INSERT OR UPDATE OF estado_comision, eliminado, comision_monto ON comisiones_partners
FOR EACH ROW
EXECUTE FUNCTION sync_wallet_desde_comision_partner();

-- =====================================================
-- 4) Backfill histórico (solo comisiones activas/no anuladas)
-- =====================================================

INSERT INTO partner_wallet_movimientos (
  empresa_id,
  partner_id,
  tipo_movimiento,
  signo,
  monto,
  moneda,
  referencia_tipo,
  referencia_id,
  descripcion,
  metadata
)
SELECT
  c.empresa_id,
  c.partner_id,
  'CREDITO_VENTA_ALIADO',
  1,
  ABS(COALESCE(c.comision_monto, 0))::NUMERIC(18,2),
  'UYU',
  'comision_partner',
  c.id,
  'Crédito wallet histórico por comisión de partner',
  jsonb_build_object('order_id', c.order_id, 'origen', 'backfill_wallet_comisiones')
FROM comisiones_partners c
WHERE COALESCE(c.comision_monto, 0) > 0
  AND COALESCE(c.estado_comision, 'pendiente') <> 'anulada'
  AND COALESCE((to_jsonb(c)->>'eliminado')::BOOLEAN, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM partner_wallet_movimientos pwm
    WHERE pwm.referencia_tipo = 'comision_partner'
      AND pwm.referencia_id = c.id
      AND pwm.tipo_movimiento = 'CREDITO_VENTA_ALIADO'
  );

COMMENT ON FUNCTION sync_wallet_desde_comision_partner IS
  'Sincroniza partner_wallet_movimientos a partir de comisiones_partners (crédito/reversa e idempotencia).';
