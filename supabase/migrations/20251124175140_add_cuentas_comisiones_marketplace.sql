/*
  # Agregar cuentas contables para comisiones del marketplace

  ## Nuevas Cuentas Contables

  Se agregan las siguientes cuentas al plan de cuentas para empresas de Uruguay:

  ### Gastos (Tipo: GASTO)
  - **5211** - Comisiones de Ventas
    - Registra las comisiones que se deben pagar a partners/aliados por ventas realizadas
  
  - **5212** - Comisiones MercadoPago  
    - Registra las comisiones cobradas por MercadoPago en transacciones

  ### Pasivos (Tipo: PASIVO)
  - **2114** - Comisiones por Pagar - Partners
    - Obligación de pago de comisiones a partners/aliados pendientes de pago
  
  - **2115** - Comisiones MercadoPago por Pagar
    - Obligación de pago de la parte de comisión MP que corresponde al aliado

  ## Notas Importantes
  - Estas cuentas se crean solo para empresas de Uruguay que ya existen
  - Las cuentas son necesarias para el correcto registro contable de comisiones del marketplace
  - Permiten el cuadre perfecto de ingresos, gastos y obligaciones pendientes
*/

-- Insertar cuentas de GASTOS para comisiones
INSERT INTO plan_cuentas (
  empresa_id,
  pais_id,
  codigo,
  nombre,
  tipo,
  nivel,
  cuenta_padre,
  descripcion,
  activa
)
SELECT 
  e.id as empresa_id,
  e.pais_id,
  '5211' as codigo,
  'Comisiones de Ventas' as nombre,
  'GASTO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '5000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Comisiones pagadas o por pagar a partners por ventas realizadas en el marketplace' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc 
    WHERE pc.codigo = '5211' AND pc.empresa_id = e.id
  );

INSERT INTO plan_cuentas (
  empresa_id,
  pais_id,
  codigo,
  nombre,
  tipo,
  nivel,
  cuenta_padre,
  descripcion,
  activa
)
SELECT 
  e.id as empresa_id,
  e.pais_id,
  '5212' as codigo,
  'Comisiones MercadoPago' as nombre,
  'GASTO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '5000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Comisiones cobradas por MercadoPago en transacciones del marketplace' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc 
    WHERE pc.codigo = '5212' AND pc.empresa_id = e.id
  );

-- Insertar cuentas de PASIVOS para comisiones por pagar
INSERT INTO plan_cuentas (
  empresa_id,
  pais_id,
  codigo,
  nombre,
  tipo,
  nivel,
  cuenta_padre,
  descripcion,
  activa
)
SELECT 
  e.id as empresa_id,
  e.pais_id,
  '2114' as codigo,
  'Comisiones por Pagar - Partners' as nombre,
  'PASIVO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '2000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Obligación de pago de comisiones a partners/aliados del marketplace' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc 
    WHERE pc.codigo = '2114' AND pc.empresa_id = e.id
  );

INSERT INTO plan_cuentas (
  empresa_id,
  pais_id,
  codigo,
  nombre,
  tipo,
  nivel,
  cuenta_padre,
  descripcion,
  activa
)
SELECT 
  e.id as empresa_id,
  e.pais_id,
  '2115' as codigo,
  'Comisiones MercadoPago por Pagar' as nombre,
  'PASIVO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '2000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Parte de comisión MercadoPago que corresponde al aliado y está pendiente de pago' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc 
    WHERE pc.codigo = '2115' AND pc.empresa_id = e.id
  );
