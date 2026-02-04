/*
  # Agregar Configuración de Marketplace

  1. Nuevos Campos de Configuración
    - `comision_mercadolibre`: Porcentaje de comisión que cobra MercadoLibre
    - `cuenta_ml_id`: ID de cuenta bancaria de MercadoLibre

  2. Nueva Cuenta Bancaria
    - Cuenta bancaria "MercadoLibre" vinculada a la cuenta contable 112104

  3. Propósito
    - Configurar el porcentaje de comisión de ML (ej: 5%)
    - Tener una cuenta bancaria temporal para registrar movimientos de ML
    - Facilitar el flujo correcto del marketplace
*/

DO $$
DECLARE
  v_empresa_id uuid;
  v_cuenta_contable_ml_id uuid;
  v_cuenta_bancaria_ml_id uuid;
BEGIN
  -- Obtener el ID de la primera empresa (para demo)
  SELECT id INTO v_empresa_id FROM empresas LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'No se encontró ninguna empresa, saltando configuración';
    RETURN;
  END IF;

  -- Obtener ID de la cuenta contable 112104 (Banco MercadoLibre)
  SELECT id INTO v_cuenta_contable_ml_id
  FROM plan_cuentas
  WHERE empresa_id = v_empresa_id AND codigo = '112104';

  IF v_cuenta_contable_ml_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró la cuenta contable 112104 - Banco MercadoLibre';
    RETURN;
  END IF;

  -- Verificar si ya existe cuenta bancaria MercadoLibre
  SELECT id INTO v_cuenta_bancaria_ml_id
  FROM cuentas_bancarias
  WHERE empresa_id = v_empresa_id 
    AND nombre = 'Cuenta MercadoLibre';

  -- Crear cuenta bancaria MercadoLibre si no existe
  IF v_cuenta_bancaria_ml_id IS NULL THEN
    INSERT INTO cuentas_bancarias (
      empresa_id,
      nombre,
      numero_cuenta,
      banco,
      tipo_cuenta,
      moneda,
      saldo_inicial,
      saldo_actual,
      fecha_apertura,
      activa,
      cuenta_contable_id,
      observaciones
    ) VALUES (
      v_empresa_id,
      'Cuenta MercadoLibre',
      'ML-TEMP-001',
      'MercadoLibre',
      'CORRIENTE',
      'UYU',
      0,
      0,
      CURRENT_DATE,
      true,
      v_cuenta_contable_ml_id,
      'Cuenta temporal para registrar ingresos del marketplace MercadoLibre'
    )
    RETURNING id INTO v_cuenta_bancaria_ml_id;

    RAISE NOTICE '✅ Cuenta bancaria MercadoLibre creada con ID: %', v_cuenta_bancaria_ml_id;
  ELSE
    RAISE NOTICE 'ℹ️ Cuenta bancaria MercadoLibre ya existe';
  END IF;

  -- Agregar configuración de comisión ML a la empresa
  UPDATE empresas
  SET configuracion_contable = COALESCE(configuracion_contable, '{}'::jsonb) || 
    jsonb_build_object(
      'comision_mercadolibre', 5.0,
      'cuenta_bancaria_ml_id', v_cuenta_bancaria_ml_id,
      'cuenta_contable_ml_id', v_cuenta_contable_ml_id,
      'cuenta_ingreso_comision_id', (
        SELECT id FROM plan_cuentas 
        WHERE empresa_id = v_empresa_id AND codigo = '412001'
      ),
      'cuenta_gasto_comision_ml_id', (
        SELECT id FROM plan_cuentas 
        WHERE empresa_id = v_empresa_id AND codigo = '512003'
      )
    )
  WHERE id = v_empresa_id;

  RAISE NOTICE '✅ Configuración de marketplace agregada a la empresa';
  RAISE NOTICE '   - Comisión MercadoLibre: 5%%';
  RAISE NOTICE '   - Cuenta bancaria ML: %', v_cuenta_bancaria_ml_id;
  RAISE NOTICE '   - Cuenta contable ML: %', v_cuenta_contable_ml_id;

END $$;
