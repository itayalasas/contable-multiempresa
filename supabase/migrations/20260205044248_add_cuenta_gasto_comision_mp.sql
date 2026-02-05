/*
  # Agregar cuenta contable para gastos de comisión Mercado Pago

  1. Nueva Cuenta
    - `630501` - Gastos Comisiones Mercado Pago
    - Categoría: Gastos Operativos
    - Tipo: GASTO
  
  2. Propósito
    - Registrar el gasto por comisión que cobra Mercado Pago/pasarela de pago
    - Permitir trazabilidad contable del costo de procesamiento
    - Cuadrar con el ingreso neto real que llega a la cuenta bancaria
  
  3. Configuración
    - Se puede configurar el porcentaje de comisión MP en la configuración de empresa
    - O en el JSON `configuracion` de cada empresa
*/

-- Agregar cuenta para gastos de comisión de Mercado Pago en todas las empresas
INSERT INTO plan_cuentas (empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa)
SELECT 
  e.id as empresa_id,
  e.pais_id,
  '630501' as codigo,
  'Gastos Comisiones Mercado Pago' as nombre,
  'GASTO' as tipo,
  3 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '6305' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  true as activa
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM plan_cuentas pc 
  WHERE pc.codigo = '630501' AND pc.empresa_id = e.id
);

-- Comentarios para documentación
COMMENT ON TABLE plan_cuentas IS 'Plan de cuentas contable. Incluye cuentas para gastos de comisiones de pasarelas de pago.';
