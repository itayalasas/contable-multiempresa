/*
  # Crear Trigger para Asientos Automáticos de Tesorería

  1. Problema
    - Los movimientos de tesorería se crean sin asientos contables
    - Cada tipo de movimiento requiere un asiento específico

  2. Solución
    - Crear función que genere asientos automáticamente según categoría
    - Crear trigger que se ejecute después de insertar movimiento

  3. Asientos por Categoría
    - COBRO_CLIENTE: Debe → Banco ML, Haber → Cuentas por Cobrar
    - COMISION_MARKETPLACE: Debe → Gastos Comisión ML, Haber → Banco ML
    - INGRESO_COMISION: Debe → Banco ML, Haber → Ingresos por Comisión
    - PAGO_PROVEEDOR: Debe → Cuentas por Pagar, Haber → Banco ML
*/

-- Función para generar asiento contable de movimiento de tesorería
CREATE OR REPLACE FUNCTION generar_asiento_movimiento_tesoreria()
RETURNS TRIGGER AS $$
DECLARE
  v_numero_asiento TEXT;
  v_asiento_id uuid;
  v_cuenta_banco_id uuid;
  v_cuenta_contraparte_id uuid;
  v_descripcion TEXT;
  v_pais_id uuid;
BEGIN
  -- Solo procesar si es un nuevo registro y no tiene asiento contable
  IF NEW.asiento_contable_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener país de la empresa
  SELECT pais_id INTO v_pais_id FROM empresas WHERE id = NEW.empresa_id;

  -- Obtener cuenta contable del banco
  SELECT cuenta_contable_id INTO v_cuenta_banco_id
  FROM cuentas_bancarias
  WHERE id = NEW.cuenta_bancaria_id;

  IF v_cuenta_banco_id IS NULL THEN
    RAISE NOTICE '⚠️ Cuenta bancaria sin cuenta contable vinculada';
    RETURN NEW;
  END IF;

  -- Generar número de asiento
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 5) AS INTEGER)), 0) + 1
  INTO v_numero_asiento
  FROM asientos_contables
  WHERE empresa_id = NEW.empresa_id;

  v_numero_asiento := 'ASI-' || LPAD(v_numero_asiento::TEXT, 5, '0');

  -- Determinar cuenta contraparte según categoría
  CASE NEW.categoria
    -- COBRO DE CLIENTE: Debe → Banco ML, Haber → Cuentas por Cobrar
    WHEN 'COBRO_CLIENTE' THEN
      SELECT id INTO v_cuenta_contraparte_id
      FROM plan_cuentas
      WHERE empresa_id = NEW.empresa_id AND codigo = '1212' -- Cuentas por Cobrar
      LIMIT 1;
      
      v_descripcion := 'Cobro de cliente - ' || COALESCE(NEW.descripcion, '');

    -- COMISIÓN MARKETPLACE: Debe → Gasto Comisión ML, Haber → Banco ML
    WHEN 'COMISION_MARKETPLACE' THEN
      SELECT id INTO v_cuenta_contraparte_id
      FROM plan_cuentas
      WHERE empresa_id = NEW.empresa_id AND codigo = '512003' -- Gasto Comisión ML
      LIMIT 1;
      
      v_descripcion := 'Comisión MercadoLibre - ' || COALESCE(NEW.descripcion, '');

    -- INGRESO POR COMISIÓN: Debe → Banco ML, Haber → Ingresos por Comisión
    WHEN 'INGRESO_COMISION' THEN
      SELECT id INTO v_cuenta_contraparte_id
      FROM plan_cuentas
      WHERE empresa_id = NEW.empresa_id AND codigo = '412001' -- Ingreso Comisión Marketplace
      LIMIT 1;
      
      v_descripcion := 'Ingreso por comisión marketplace - ' || COALESCE(NEW.descripcion, '');

    -- PAGO A PROVEEDOR: Debe → Cuentas por Pagar, Haber → Banco
    WHEN 'PAGO_PROVEEDOR' THEN
      SELECT id INTO v_cuenta_contraparte_id
      FROM plan_cuentas
      WHERE empresa_id = NEW.empresa_id AND codigo = '2121' -- Cuentas por Pagar
      LIMIT 1;
      
      v_descripcion := 'Pago a proveedor - ' || COALESCE(NEW.descripcion, '');

    ELSE
      -- Para otras categorías, no generar asiento automáticamente
      RETURN NEW;
  END CASE;

  -- Si no se encontró cuenta contraparte, no generar asiento
  IF v_cuenta_contraparte_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró cuenta contraparte para categoría: %', NEW.categoria;
    RETURN NEW;
  END IF;

  -- Crear asiento contable
  INSERT INTO asientos_contables (
    empresa_id,
    pais_id,
    numero,
    fecha,
    descripcion,
    referencia,
    estado,
    creado_por,
    documento_soporte
  ) VALUES (
    NEW.empresa_id,
    v_pais_id,
    v_numero_asiento,
    NEW.fecha,
    v_descripcion,
    NEW.referencia,
    'confirmado',
    NEW.creado_por,
    jsonb_build_object(
      'tipo', 'movimiento_tesoreria',
      'id', NEW.id,
      'categoria', NEW.categoria,
      'cuenta_bancaria_id', NEW.cuenta_bancaria_id
    )
  ) RETURNING id INTO v_asiento_id;

  -- Crear movimientos contables según tipo de movimiento
  IF NEW.tipo_movimiento = 'INGRESO' THEN
    -- INGRESO: Debe → Banco, Haber → Cuenta Contraparte
    INSERT INTO movimientos_contables (asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES
      (v_asiento_id, v_cuenta_banco_id, NEW.monto, 0, v_descripcion),
      (v_asiento_id, v_cuenta_contraparte_id, 0, NEW.monto, v_descripcion);

  ELSIF NEW.tipo_movimiento = 'EGRESO' THEN
    -- EGRESO: Debe → Cuenta Contraparte, Haber → Banco
    INSERT INTO movimientos_contables (asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES
      (v_asiento_id, v_cuenta_contraparte_id, NEW.monto, 0, v_descripcion),
      (v_asiento_id, v_cuenta_banco_id, 0, NEW.monto, v_descripcion);
  END IF;

  -- Actualizar el movimiento de tesorería con el asiento generado
  UPDATE movimientos_tesoreria
  SET asiento_contable_id = v_asiento_id
  WHERE id = NEW.id;

  RAISE NOTICE '✅ Asiento % generado automáticamente para movimiento tesorería', v_numero_asiento;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error generando asiento automático: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_generar_asiento_tesoreria ON movimientos_tesoreria;

CREATE TRIGGER trigger_generar_asiento_tesoreria
AFTER INSERT ON movimientos_tesoreria
FOR EACH ROW
EXECUTE FUNCTION generar_asiento_movimiento_tesoreria();

-- Comentario
COMMENT ON FUNCTION generar_asiento_movimiento_tesoreria() IS 
'Genera automáticamente asientos contables para movimientos de tesorería según su categoría';

COMMENT ON TRIGGER trigger_generar_asiento_tesoreria ON movimientos_tesoreria IS
'Trigger que genera asientos contables automáticamente al insertar movimientos de tesorería';
