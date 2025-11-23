/*
  # Agregar tracking de asiento contable a facturas_compra

  1. Nuevas Columnas
    - `asiento_contable_id` ya existe pero agregamos:
    - `asiento_generado` (boolean) - Indica si se generó el asiento
    - `asiento_error` (text) - Mensaje de error si falló la generación
    - `asiento_intentos` (integer) - Número de intentos de generación

  2. Propósito
    - Permitir tracking del estado de generación del asiento contable para compras
    - Guardar errores para diagnóstico y corrección
    - Habilitar regeneración manual cuando falla
    - Mantener consistencia con facturas_venta

  3. Notas
    - DEFAULT false para asiento_generado
    - DEFAULT 0 para asiento_intentos
    - NULL permitido para error (solo cuando hay error)
*/

-- Agregar columnas de tracking de asiento contable
ALTER TABLE facturas_compra 
ADD COLUMN IF NOT EXISTS asiento_generado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS asiento_error text,
ADD COLUMN IF NOT EXISTS asiento_intentos integer DEFAULT 0;

-- Crear índice para búsquedas de facturas sin asiento
CREATE INDEX IF NOT EXISTS idx_facturas_compra_sin_asiento 
ON facturas_compra(empresa_id, asiento_generado) 
WHERE asiento_generado = false;

-- Crear índice para búsquedas de facturas con error
CREATE INDEX IF NOT EXISTS idx_facturas_compra_error_asiento 
ON facturas_compra(empresa_id) 
WHERE asiento_error IS NOT NULL;