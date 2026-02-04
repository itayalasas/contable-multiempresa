/*
  # Agregar cuenta_bancaria_id a pagos_proveedor

  1. Cambios
    - Agrega columna cuenta_bancaria_id a pagos_proveedor (opcional)
    - Mantiene campos banco y numero_cuenta como fallback
    - Agrega foreign key a cuentas_bancarias

  2. Lógica
    - Si hay cuenta_bancaria_id: se usa la cuenta del sistema
    - Si no hay cuenta_bancaria_id: se usan los campos banco/numero_cuenta manuales
*/

-- Agregar columna cuenta_bancaria_id (nullable para permitir pagos manuales)
ALTER TABLE pagos_proveedor
ADD COLUMN IF NOT EXISTS cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_cuenta_bancaria
ON pagos_proveedor(cuenta_bancaria_id);

COMMENT ON COLUMN pagos_proveedor.cuenta_bancaria_id IS
  'Referencia a cuenta bancaria del sistema. Si es NULL, se usan campos banco/numero_cuenta manuales';
