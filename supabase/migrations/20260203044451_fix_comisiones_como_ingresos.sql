/*
  # Corregir modelo contable de comisiones - Reflejar como INGRESOS

  ## Cambio Conceptual

  **ANTES (Incorrecto):**
  - Comisiones = Gasto que hay que pagar a partners
  - Se registraba como pasivo (dinero que debemos)

  **AHORA (Correcto):**
  - Comisiones = Ingreso que la aplicación gana del marketplace
  - DogCatify ya le pagó al partner su parte
  - La aplicación registra lo que GANÓ, no lo que debe pagar

  ## Nuevas Cuentas Contables

  ### Activos (Tipo: ACTIVO)
  - **1213** - Comisiones por Cobrar
    - Registra las comisiones ganadas pendientes de cobro de DogCatify/Marketplace

  ### Ingresos (Tipo: INGRESO)
  - **7012** - Ingresos por Comisiones Marketplace
    - Ingreso reconocido por comisiones ganadas

  - **7013** - Ingresos por Comisiones Procesamiento de Pagos
    - Ingreso por la parte de comisión de MercadoPago que la app retiene

  ## Ejemplo de Asiento Correcto

  Venta: Cliente paga $100 + IVA = $122
  Comisión ganada: $25
  Comisión MP ganada: $7

  DEBE: 1212 - Cuentas por Cobrar Cliente     $122
    HABER: 7011 - Ventas                              $100
    HABER: 2113 - IVA por Pagar                        $22

  DEBE: 1213 - Comisiones por Cobrar           $32
    HABER: 7012 - Ingresos por Comisiones              $25
    HABER: 7013 - Ingresos Comisión Procesamiento      $7
*/

-- Crear cuenta: Comisiones por Cobrar (ACTIVO)
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
  '1213' as codigo,
  'Comisiones por Cobrar - Marketplace' as nombre,
  'ACTIVO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '1000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Comisiones ganadas pendientes de cobro del marketplace (DogCatify)' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc
    WHERE pc.codigo = '1213' AND pc.empresa_id = e.id
  );

-- Crear cuenta: Ingresos por Comisiones Marketplace (INGRESO)
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
  '7012' as codigo,
  'Ingresos por Comisiones Marketplace' as nombre,
  'INGRESO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '7000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Ingresos generados por comisiones del marketplace' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc
    WHERE pc.codigo = '7012' AND pc.empresa_id = e.id
  );

-- Crear cuenta: Ingresos por Comisiones de Procesamiento (INGRESO)
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
  '7013' as codigo,
  'Ingresos por Comisiones Procesamiento Pagos' as nombre,
  'INGRESO' as tipo,
  2 as nivel,
  (SELECT id FROM plan_cuentas WHERE codigo = '7000' AND empresa_id = e.id LIMIT 1) as cuenta_padre,
  'Ingresos por comisión de procesamiento de pagos que retiene la aplicación' as descripcion,
  true as activa
FROM empresas e
WHERE e.pais_id = (SELECT id FROM paises WHERE codigo = 'UY' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM plan_cuentas pc
    WHERE pc.codigo = '7013' AND pc.empresa_id = e.id
  );
