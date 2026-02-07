/*
  # Agregar campos de eliminación lógica a Cuentas por Pagar
  
  ## Descripción
  Agrega campos para eliminación lógica en las tablas del módulo de Cuentas por Pagar.
  
  ## Cambios
  
  ### Columnas agregadas:
  - `eliminado` (boolean) - Indica si el registro está eliminado lógicamente
  - `fecha_eliminacion` (timestamptz) - Fecha y hora de eliminación
  
  ### Tablas modificadas:
  1. **facturas_por_pagar** - Facturas recibidas de proveedores
  2. **pagos_proveedor** - Pagos realizados a proveedores
  3. **pagos_cliente** - Pagos recibidos de clientes (si existe)
  
  ## Seguridad
  - Los campos se agregan con valores predeterminados seguros
  - `eliminado` por defecto es FALSE
  - `fecha_eliminacion` por defecto es NULL
  
  ## Notas Importantes
  1. Todos los registros existentes se marcan como NO eliminados
  2. Los triggers de rollback usan estos campos para revertir operaciones
  3. Las consultas deben filtrar por `eliminado = false` para mostrar solo registros activos
*/

-- =====================================================
-- Agregar columnas a facturas_por_pagar
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_por_pagar' AND column_name = 'eliminado'
  ) THEN
    ALTER TABLE facturas_por_pagar
    ADD COLUMN eliminado boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_por_pagar' AND column_name = 'fecha_eliminacion'
  ) THEN
    ALTER TABLE facturas_por_pagar
    ADD COLUMN fecha_eliminacion timestamptz;
  END IF;
END $$;

-- =====================================================
-- Agregar columnas a pagos_proveedor
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagos_proveedor' AND column_name = 'eliminado'
  ) THEN
    ALTER TABLE pagos_proveedor
    ADD COLUMN eliminado boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagos_proveedor' AND column_name = 'fecha_eliminacion'
  ) THEN
    ALTER TABLE pagos_proveedor
    ADD COLUMN fecha_eliminacion timestamptz;
  END IF;
END $$;

-- =====================================================
-- Agregar columnas a pagos_cliente (si existe)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'pagos_cliente'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pagos_cliente' AND column_name = 'eliminado'
    ) THEN
      ALTER TABLE pagos_cliente
      ADD COLUMN eliminado boolean DEFAULT false NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pagos_cliente' AND column_name = 'fecha_eliminacion'
    ) THEN
      ALTER TABLE pagos_cliente
      ADD COLUMN fecha_eliminacion timestamptz;
    END IF;
  END IF;
END $$;

-- =====================================================
-- Asegurar que todos los registros existentes tengan eliminado = false
-- =====================================================
UPDATE facturas_por_pagar
SET eliminado = false
WHERE eliminado IS NULL;

UPDATE pagos_proveedor
SET eliminado = false
WHERE eliminado IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'pagos_cliente'
  ) THEN
    UPDATE pagos_cliente
    SET eliminado = false
    WHERE eliminado IS NULL;
  END IF;
END $$;

-- =====================================================
-- Crear índices para mejorar rendimiento de consultas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_facturas_pagar_eliminado
  ON facturas_por_pagar(eliminado, empresa_id)
  WHERE eliminado = false;

CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_eliminado
  ON pagos_proveedor(eliminado)
  WHERE eliminado = false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'pagos_cliente'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pagos_cliente_eliminado
      ON pagos_cliente(eliminado)
      WHERE eliminado = false';
  END IF;
END $$;
