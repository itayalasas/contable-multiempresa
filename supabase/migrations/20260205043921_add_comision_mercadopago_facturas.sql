/*
  # Agregar campos para comisión de Mercado Pago en facturas

  1. Campos Nuevos
    - `comision_mp_porcentaje` (numeric) - Porcentaje de comisión que cobra MP
    - `comision_mp_monto` (numeric) - Monto de la comisión de MP
    - `ingreso_neto` (numeric) - Ingreso real después de comisión MP (total - comision_mp_monto)
  
  2. Propósito
    - Registrar la comisión que cobra Mercado Pago/pasarela de pago
    - Calcular el ingreso neto real que ingresará a la cuenta bancaria
    - Permitir trazabilidad contable completa
    - Generar asientos contables que reflejen el gasto por comisión MP
  
  3. Notas
    - Si no hay comisión MP (pago directo), estos campos quedan en NULL o 0
    - El ingreso_neto es lo que realmente ingresa a la cuenta bancaria
    - La comisión MP es un GASTO para la empresa
*/

-- Agregar campos para comisión de Mercado Pago
ALTER TABLE facturas_venta
ADD COLUMN IF NOT EXISTS comision_mp_porcentaje numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comision_mp_monto numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ingreso_neto numeric(15,2);

-- Comentarios para documentación
COMMENT ON COLUMN facturas_venta.comision_mp_porcentaje IS 'Porcentaje de comisión que cobra la pasarela de pago (ej: Mercado Pago)';
COMMENT ON COLUMN facturas_venta.comision_mp_monto IS 'Monto de la comisión que se descuenta del total';
COMMENT ON COLUMN facturas_venta.ingreso_neto IS 'Ingreso real después de descontar comisión MP (total - comision_mp_monto)';

-- Calcular ingreso_neto para facturas existentes
UPDATE facturas_venta
SET ingreso_neto = CAST(total AS numeric) - COALESCE(comision_mp_monto, 0)
WHERE ingreso_neto IS NULL;
