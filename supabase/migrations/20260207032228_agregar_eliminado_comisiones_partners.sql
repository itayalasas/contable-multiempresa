/*
  # Agregar campo eliminado a comisiones_partners
  
  ## Problema
  El trigger rollback_eliminar_factura_por_pagar() filtra por eliminado en comisiones_partners,
  pero esa columna no existe en la tabla.
  
  ## Solución
  Agregar columnas de eliminación lógica a:
  - comisiones_partners
  - facturas_compra (si no tiene)
  
  ## Cambios
  - Agregar eliminado (boolean, default false)
  - Agregar fecha_eliminacion (timestamptz)
*/

-- =====================================================
-- Agregar eliminado a comisiones_partners
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comisiones_partners' AND column_name = 'eliminado'
  ) THEN
    ALTER TABLE comisiones_partners
    ADD COLUMN eliminado boolean DEFAULT false NOT NULL;
    
    RAISE NOTICE 'Columna eliminado agregada a comisiones_partners';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comisiones_partners' AND column_name = 'fecha_eliminacion'
  ) THEN
    ALTER TABLE comisiones_partners
    ADD COLUMN fecha_eliminacion timestamptz;
    
    RAISE NOTICE 'Columna fecha_eliminacion agregada a comisiones_partners';
  END IF;
END $$;

-- =====================================================
-- Agregar eliminado a facturas_compra (si existe)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'facturas_compra'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'facturas_compra' AND column_name = 'eliminado'
    ) THEN
      ALTER TABLE facturas_compra
      ADD COLUMN eliminado boolean DEFAULT false NOT NULL;
      
      RAISE NOTICE 'Columna eliminado agregada a facturas_compra';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'facturas_compra' AND column_name = 'fecha_eliminacion'
    ) THEN
      ALTER TABLE facturas_compra
      ADD COLUMN fecha_eliminacion timestamptz;
      
      RAISE NOTICE 'Columna fecha_eliminacion agregada a facturas_compra';
    END IF;
  END IF;
END $$;

-- =====================================================
-- Asegurar valores por defecto
-- =====================================================
UPDATE comisiones_partners
SET eliminado = false
WHERE eliminado IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'facturas_compra'
  ) THEN
    UPDATE facturas_compra
    SET eliminado = false
    WHERE eliminado IS NULL;
  END IF;
END $$;

-- =====================================================
-- Índices para mejorar rendimiento
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_comisiones_partners_eliminado
  ON comisiones_partners(eliminado)
  WHERE eliminado = false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'facturas_compra'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_facturas_compra_eliminado
      ON facturas_compra(eliminado)
      WHERE eliminado = false';
  END IF;
END $$;
