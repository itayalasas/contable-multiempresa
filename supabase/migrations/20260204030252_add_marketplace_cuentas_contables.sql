/*
  # Agregar Cuentas Contables para Marketplace

  1. Nuevas Cuentas
    - `112104` - Banco MercadoLibre/MercadoPago: Cuenta temporal donde se depositan las ventas del marketplace
    - `412001` - Ingresos por Comisiones: Ingresos propios de la empresa por comisiones (con IVA)
    - `512003` - Gastos Administrativos - Comisión MercadoLibre: Gastos por uso de la plataforma

  2. Cambios
    - Se agregan las cuentas necesarias para el flujo correcto del marketplace
    - Estas cuentas son esenciales para registrar correctamente:
      * Ingresos totales en cuenta temporal ML
      * Comisión cobrada por MercadoLibre (gasto)
      * Comisión propia (ingreso con IVA a facturar a DGI)
      * Cuentas por pagar a partners
*/

DO $$
DECLARE
  v_empresa_id uuid;
  v_pais_id uuid;
  v_cuenta_bancos_id uuid;
  v_cuenta_ingresos_id uuid;
  v_cuenta_gastos_id uuid;
  v_cuenta_412_id uuid;
  v_cuenta_512_id uuid;
BEGIN
  -- Obtener el ID de la primera empresa (para demo)
  SELECT id INTO v_empresa_id FROM empresas LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'No se encontró ninguna empresa, saltando inserción de cuentas';
    RETURN;
  END IF;

  -- Obtener pais_id de la empresa
  SELECT pais_id INTO v_pais_id 
  FROM empresas 
  WHERE id = v_empresa_id;

  -- Obtener ID de cuenta padre BANCOS (112)
  SELECT id INTO v_cuenta_bancos_id 
  FROM plan_cuentas 
  WHERE empresa_id = v_empresa_id AND codigo = '112' AND nivel = 2;

  -- 1. Agregar cuenta Banco MercadoLibre
  IF NOT EXISTS (
    SELECT 1 FROM plan_cuentas 
    WHERE empresa_id = v_empresa_id AND codigo = '112104'
  ) AND v_cuenta_bancos_id IS NOT NULL THEN
    INSERT INTO plan_cuentas (
      empresa_id, codigo, nombre, tipo, nivel, cuenta_padre, 
      pais_id, saldo, activa
    ) VALUES (
      v_empresa_id, '112104', 'Banco MercadoLibre/MercadoPago', 'ACTIVO', 3, 
      v_cuenta_bancos_id, v_pais_id, 0, true
    );
    RAISE NOTICE '✅ Cuenta 112104 - Banco MercadoLibre creada';
  END IF;

  -- Obtener ID de cuenta padre INGRESOS (4)
  SELECT id INTO v_cuenta_ingresos_id 
  FROM plan_cuentas 
  WHERE empresa_id = v_empresa_id AND codigo = '4' AND nivel = 1;

  -- 2. Crear estructura de Ingresos por Comisiones si no existe
  -- Primero el nivel 2 (412 - Ingresos por Comisiones)
  IF NOT EXISTS (
    SELECT 1 FROM plan_cuentas 
    WHERE empresa_id = v_empresa_id AND codigo = '412'
  ) AND v_cuenta_ingresos_id IS NOT NULL THEN
    INSERT INTO plan_cuentas (
      empresa_id, codigo, nombre, tipo, nivel, cuenta_padre, 
      pais_id, saldo, activa
    ) VALUES (
      v_empresa_id, '412', 'Ingresos por Comisiones', 'INGRESO', 2, 
      v_cuenta_ingresos_id, v_pais_id, 0, true
    );
    RAISE NOTICE '✅ Cuenta 412 - Ingresos por Comisiones (nivel 2) creada';
  END IF;

  -- Obtener ID de cuenta 412
  SELECT id INTO v_cuenta_412_id 
  FROM plan_cuentas 
  WHERE empresa_id = v_empresa_id AND codigo = '412';

  -- Ahora el nivel 3 (412001)
  IF NOT EXISTS (
    SELECT 1 FROM plan_cuentas 
    WHERE empresa_id = v_empresa_id AND codigo = '412001'
  ) AND v_cuenta_412_id IS NOT NULL THEN
    INSERT INTO plan_cuentas (
      empresa_id, codigo, nombre, tipo, nivel, cuenta_padre, 
      pais_id, saldo, activa
    ) VALUES (
      v_empresa_id, '412001', 'Ingresos por Comisiones Marketplace', 'INGRESO', 3, 
      v_cuenta_412_id, v_pais_id, 0, true
    );
    RAISE NOTICE '✅ Cuenta 412001 - Ingresos por Comisiones Marketplace creada';
  END IF;

  -- Obtener ID de cuenta padre GASTOS (5)
  SELECT id INTO v_cuenta_gastos_id 
  FROM plan_cuentas 
  WHERE empresa_id = v_empresa_id AND codigo = '5' AND nivel = 1;

  -- 3. Crear estructura de Gastos Administrativos si no existe
  -- Primero el nivel 2 (512 - Gastos Administrativos)
  IF NOT EXISTS (
    SELECT 1 FROM plan_cuentas 
    WHERE empresa_id = v_empresa_id AND codigo = '512'
  ) AND v_cuenta_gastos_id IS NOT NULL THEN
    INSERT INTO plan_cuentas (
      empresa_id, codigo, nombre, tipo, nivel, cuenta_padre, 
      pais_id, saldo, activa
    ) VALUES (
      v_empresa_id, '512', 'Gastos Administrativos', 'GASTO', 2, 
      v_cuenta_gastos_id, v_pais_id, 0, true
    );
    RAISE NOTICE '✅ Cuenta 512 - Gastos Administrativos (nivel 2) creada';
  END IF;

  -- Obtener ID de cuenta 512
  SELECT id INTO v_cuenta_512_id 
  FROM plan_cuentas 
  WHERE empresa_id = v_empresa_id AND codigo = '512';

  -- Ahora el nivel 3 (512003)
  IF NOT EXISTS (
    SELECT 1 FROM plan_cuentas 
    WHERE empresa_id = v_empresa_id AND codigo = '512003'
  ) AND v_cuenta_512_id IS NOT NULL THEN
    INSERT INTO plan_cuentas (
      empresa_id, codigo, nombre, tipo, nivel, cuenta_padre, 
      pais_id, saldo, activa
    ) VALUES (
      v_empresa_id, '512003', 'Comisión MercadoLibre/Pasarelas', 'GASTO', 3, 
      v_cuenta_512_id, v_pais_id, 0, true
    );
    RAISE NOTICE '✅ Cuenta 512003 - Comisión MercadoLibre creada';
  END IF;

END $$;
