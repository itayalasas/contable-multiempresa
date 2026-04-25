/*
  # Wallet contable por partner (ledger de movimientos)

  Objetivo:
  - Registrar créditos por ventas del aliado
  - Registrar débitos por facturas de promoción
  - Permitir compensación automática sin modificar cierres históricos
*/

CREATE TABLE IF NOT EXISTS partner_wallet_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners_aliados(id) ON DELETE CASCADE,

  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN (
    'CREDITO_VENTA_ALIADO',
    'DEBITO_FACTURA_PROMOCION',
    'AJUSTE_MANUAL'
  )),
  signo SMALLINT NOT NULL CHECK (signo IN (1, -1)),
  monto NUMERIC(18,2) NOT NULL CHECK (monto >= 0),
  moneda TEXT NOT NULL DEFAULT 'UYU',

  referencia_tipo TEXT,
  referencia_id UUID,
  descripcion TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_partner_wallet_empresa_partner
  ON partner_wallet_movimientos(empresa_id, partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_wallet_referencia
  ON partner_wallet_movimientos(referencia_tipo, referencia_id);

ALTER TABLE partner_wallet_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow anon select partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow anon insert partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow anon update partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete partner_wallet_movimientos" ON partner_wallet_movimientos;
CREATE POLICY "Allow anon delete partner_wallet_movimientos"
  ON partner_wallet_movimientos FOR DELETE
  TO anon
  USING (true);

COMMENT ON TABLE partner_wallet_movimientos IS
  'Ledger de wallet por partner. saldo = SUM(signo * monto).';
