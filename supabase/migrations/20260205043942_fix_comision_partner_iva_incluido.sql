/*
  # Ajustar comisiones de partners para IVA incluido

  1. Campos Nuevos
    - `iva_monto` (numeric) - Monto del IVA incluido en la comisión
    - `comision_sin_iva` (numeric) - Comisión neta sin IVA
  
  2. Cambios
    - `comision_monto` ahora representa el total CON IVA incluido
    - El porcentaje de comisión se aplica INCLUYENDO el IVA
  
  3. Ejemplo
    - Venta: $5,016.39 (sin IVA)
    - Comisión acordada: 5% TOTAL = $250.82
    - Desglose:
      * Comisión sin IVA: $250.82 / 1.22 = $205.59
      * IVA (22%): $45.23
      * Total: $250.82
  
  4. Flujo Contable
    - El partner facturará $250.82 (de los cuales $45.23 es IVA)
    - La empresa debe pagar $250.82 al partner
    - El partner debe declarar $45.23 de IVA a la DGI
*/

-- Agregar campos para desglose de IVA
ALTER TABLE comisiones_partners
ADD COLUMN IF NOT EXISTS iva_monto numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comision_sin_iva numeric(15,2);

-- Comentarios
COMMENT ON COLUMN comisiones_partners.comision_monto IS 'Monto total de comisión CON IVA incluido (lo que se le paga al partner)';
COMMENT ON COLUMN comisiones_partners.comision_sin_iva IS 'Comisión neta sin IVA';
COMMENT ON COLUMN comisiones_partners.iva_monto IS 'Monto de IVA incluido en la comisión';

-- Calcular IVA para comisiones existentes (asumiendo IVA del 22%)
UPDATE comisiones_partners
SET 
  comision_sin_iva = ROUND(CAST(comision_monto AS numeric) / 1.22, 2),
  iva_monto = ROUND(CAST(comision_monto AS numeric) - (CAST(comision_monto AS numeric) / 1.22), 2)
WHERE comision_sin_iva IS NULL 
  AND tipo_comision IN ('comision_partner', 'partner')
  AND beneficiario != 'MercadoPago';

-- Para comisiones de MP (no tienen IVA)
UPDATE comisiones_partners
SET 
  comision_sin_iva = CAST(comision_monto AS numeric),
  iva_monto = 0
WHERE comision_sin_iva IS NULL 
  AND beneficiario = 'MercadoPago';
