/*
  # Agregar Cuenta Contable para Comisión Mercado Pago

  ## Descripción
  Agrega la cuenta 512005 "Comisión Mercado Pago" al plan de cuentas
  para registrar correctamente los asientos de comisiones de pasarela de pago.

  ## Estructura
  5 - GASTOS
  51 - Gastos Operacionales
  512 - Comisiones
  512005 - Comisión Mercado Pago
*/

DO $$
DECLARE
  empresa_record RECORD;
  cuenta_padre_id UUID;
  cuenta_gastos_op_id UUID;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   AGREGAR CUENTA COMISIÓN MERCADO PAGO (512005)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  FOR empresa_record IN SELECT id, pais_id, razon_social FROM empresas LOOP
  
    RAISE NOTICE 'Procesando empresa: %', empresa_record.razon_social;

    -- Verificar si ya existe la cuenta 512005
    IF EXISTS (
      SELECT 1 FROM plan_cuentas 
      WHERE empresa_id = empresa_record.id 
      AND codigo = '512005'
    ) THEN
      RAISE NOTICE '  ⏭️  Cuenta 512005 ya existe, saltando...';
      RAISE NOTICE '';
      CONTINUE;
    END IF;

    -- Buscar cuenta padre "512 - Comisiones"
    SELECT id INTO cuenta_padre_id
    FROM plan_cuentas
    WHERE empresa_id = empresa_record.id
      AND codigo = '512'
    LIMIT 1;

    IF cuenta_padre_id IS NULL THEN
      -- Si no existe 512, buscar 51 "Gastos Operacionales"
      SELECT id INTO cuenta_gastos_op_id
      FROM plan_cuentas
      WHERE empresa_id = empresa_record.id
        AND codigo = '51'
      LIMIT 1;

      IF cuenta_gastos_op_id IS NULL THEN
        RAISE NOTICE '  ⚠️  No se encontró cuenta padre (512 o 51), saltando empresa';
        RAISE NOTICE '';
        CONTINUE;
      END IF;

      -- Crear cuenta 512 "Comisiones"
      INSERT INTO plan_cuentas (
        empresa_id,
        pais_id,
        codigo,
        nombre,
        tipo,
        nivel,
        activa,
        cuenta_padre,
        saldo
      ) VALUES (
        empresa_record.id,
        empresa_record.pais_id,
        '512',
        'Comisiones',
        'GASTO',
        3,
        true,
        cuenta_gastos_op_id,
        0
      )
      RETURNING id INTO cuenta_padre_id;

      RAISE NOTICE '  ✅ Cuenta 512 "Comisiones" creada';
    END IF;

    -- Crear cuenta 512005 "Comisión Mercado Pago"
    INSERT INTO plan_cuentas (
      empresa_id,
      pais_id,
      codigo,
      nombre,
      tipo,
      nivel,
      activa,
      cuenta_padre,
      saldo
    ) VALUES (
      empresa_record.id,
      empresa_record.pais_id,
      '512005',
      'Comisión Mercado Pago',
      'GASTO',
      4,
      true,
      cuenta_padre_id,
      0
    );

    RAISE NOTICE '  ✅ Cuenta 512005 "Comisión Mercado Pago" creada';
    RAISE NOTICE '';

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Proceso completado - Cuenta de comisión MP agregada a todas las empresas';
  RAISE NOTICE '';
  
END $$;
