/*
  # Vista de saldos de wallet por partner

  Objetivo:
  - Ver saldo actual por aliado/partner
  - Separar total créditos, débitos y saldo neto
  - Facilitar reportes operativos y conciliación
*/

DROP VIEW IF EXISTS v_partner_wallet_saldos;

CREATE VIEW v_partner_wallet_saldos AS
SELECT
  pwm.empresa_id,
  e.razon_social AS empresa_nombre,
  pwm.partner_id,
  p.partner_id_externo,
  p.razon_social AS partner_nombre,
  p.documento AS partner_documento,
  p.email AS partner_email,
  pwm.moneda,
  COUNT(*) AS cantidad_movimientos,
  COALESCE(SUM(CASE WHEN pwm.signo = 1 THEN pwm.monto ELSE 0 END), 0)::NUMERIC(18,2) AS total_creditos,
  COALESCE(SUM(CASE WHEN pwm.signo = -1 THEN pwm.monto ELSE 0 END), 0)::NUMERIC(18,2) AS total_debitos,
  COALESCE(SUM((pwm.signo * pwm.monto)), 0)::NUMERIC(18,2) AS saldo_actual,
  MAX(pwm.created_at) AS ultima_actualizacion
FROM partner_wallet_movimientos pwm
INNER JOIN partners_aliados p ON p.id = pwm.partner_id
INNER JOIN empresas e ON e.id = pwm.empresa_id
GROUP BY
  pwm.empresa_id,
  e.razon_social,
  pwm.partner_id,
  p.partner_id_externo,
  p.razon_social,
  p.documento,
  p.email,
  pwm.moneda;

GRANT SELECT ON v_partner_wallet_saldos TO authenticated, anon;

COMMENT ON VIEW v_partner_wallet_saldos IS
  'Saldos actuales de wallet por partner. saldo_actual = total_creditos - total_debitos.';
