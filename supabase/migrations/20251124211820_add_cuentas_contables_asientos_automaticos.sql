/*
  # Agregar cuentas contables para asientos automáticos

  1. Nuevas Cuentas
    - 111101 (Caja - Efectivo) → Para pagos/cobros en efectivo
    - 112101 (Bancos - Transferencias) → Para pagos/cobros por transferencia
    - 112102 (Bancos - Cheques) → Para pagos/cobros con cheque
    - 113101 (Tarjetas de Crédito) → Para pagos/cobros con tarjeta
    - 121201 (Cuentas por Cobrar - Clientes) → Para cobros de clientes
    - 213001 (Cuentas por Pagar - Proveedores) → Para pagos a proveedores
    
  2. Notas
    - Estas cuentas se crean para todas las empresas existentes
    - Se utilizan en la generación automática de asientos de pagos/cobros
    - Son cuentas de nivel 4 según la estructura actual (6 dígitos)
*/

-- Insertar cuentas contables para cada empresa
DO $$
DECLARE
  empresa_record RECORD;
  cuenta_padre_id uuid;
BEGIN
  -- Iterar sobre todas las empresas
  FOR empresa_record IN SELECT id, pais_id FROM empresas LOOP
    
    -- 1. CAJA - EFECTIVO (111101)
    -- Buscar cuenta padre 111 (DISPONIBILIDADES)
    SELECT id INTO cuenta_padre_id 
    FROM plan_cuentas 
    WHERE empresa_id = empresa_record.id 
      AND codigo = '111'
    LIMIT 1;
    
    IF cuenta_padre_id IS NOT NULL THEN
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '111101', 'Caja - Efectivo', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- 2. BANCOS - TRANSFERENCIAS (112101)
    -- Buscar cuenta padre 112 (BANCOS)
    SELECT id INTO cuenta_padre_id 
    FROM plan_cuentas 
    WHERE empresa_id = empresa_record.id 
      AND codigo = '112'
    LIMIT 1;
    
    IF cuenta_padre_id IS NOT NULL THEN
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '112101', 'Bancos - Transferencias', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
      
      -- 3. BANCOS - CHEQUES (112102)
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '112102', 'Bancos - Cheques', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- 4. TARJETAS DE CRÉDITO (113101)
    -- Primero crear cuenta padre 113 si no existe
    SELECT id INTO cuenta_padre_id 
    FROM plan_cuentas 
    WHERE empresa_id = empresa_record.id 
      AND codigo = '113'
    LIMIT 1;
    
    IF cuenta_padre_id IS NULL THEN
      -- Buscar cuenta padre 11 (ACTIVO CORRIENTE)
      SELECT id INTO cuenta_padre_id 
      FROM plan_cuentas 
      WHERE empresa_id = empresa_record.id 
        AND codigo = '11'
      LIMIT 1;
      
      IF cuenta_padre_id IS NOT NULL THEN
        INSERT INTO plan_cuentas (
          empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
        ) VALUES (
          empresa_record.id, empresa_record.pais_id, '113', 'TARJETAS DE CRÉDITO', 'ACTIVO', 3, cuenta_padre_id, true
        ) RETURNING id INTO cuenta_padre_id;
      END IF;
    END IF;
    
    IF cuenta_padre_id IS NOT NULL THEN
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '113101', 'Tarjetas de Crédito', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- 5. CUENTAS POR COBRAR - CLIENTES (121201)
    -- Buscar cuenta padre 121 (Cuentas por Cobrar Comerciales)
    SELECT id INTO cuenta_padre_id 
    FROM plan_cuentas 
    WHERE empresa_id = empresa_record.id 
      AND codigo = '121'
    LIMIT 1;
    
    IF cuenta_padre_id IS NOT NULL THEN
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '121201', 'Cuentas por Cobrar - Clientes', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- 6. CUENTAS POR PAGAR - PROVEEDORES (213001)
    -- Buscar cuenta padre 213 (Cuentas por Pagar Comerciales)
    SELECT id INTO cuenta_padre_id 
    FROM plan_cuentas 
    WHERE empresa_id = empresa_record.id 
      AND codigo = '213'
    LIMIT 1;
    
    IF cuenta_padre_id IS NOT NULL THEN
      INSERT INTO plan_cuentas (
        empresa_id, pais_id, codigo, nombre, tipo, nivel, cuenta_padre, activa
      ) VALUES (
        empresa_record.id, empresa_record.pais_id, '213001', 'Cuentas por Pagar - Proveedores', 'ACTIVO', 4, cuenta_padre_id, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Cuentas contables creadas exitosamente para todas las empresas';
END $$;
