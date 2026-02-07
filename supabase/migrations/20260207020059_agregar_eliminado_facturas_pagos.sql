/*
  # Agregar campos de eliminación lógica a facturas y pagos

  1. Tablas afectadas
    - facturas_por_pagar
    - pagos_proveedor
    - pagos_cliente

  2. Campos agregados
    - eliminado (boolean): Indica si el registro fue eliminado lógicamente
    - fecha_eliminacion (timestamptz): Cuándo se eliminó
    - eliminado_por (text): ID del usuario que eliminó
    - motivo_eliminacion (text): Razón de la eliminación

  3. Índices
    - Índices para filtrar registros no eliminados
*/

-- Agregar campos a facturas_por_pagar
ALTER TABLE facturas_por_pagar ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false;
ALTER TABLE facturas_por_pagar ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;
ALTER TABLE facturas_por_pagar ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id);
ALTER TABLE facturas_por_pagar ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

CREATE INDEX IF NOT EXISTS idx_facturas_por_pagar_no_eliminadas 
ON facturas_por_pagar(eliminado) 
WHERE eliminado = false;

-- Agregar campos a pagos_proveedor
ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false;
ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;
ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id);
ALTER TABLE pagos_proveedor ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_no_eliminados 
ON pagos_proveedor(eliminado) 
WHERE eliminado = false;

-- Agregar campos a pagos_cliente
ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS eliminado boolean DEFAULT false;
ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz;
ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS eliminado_por text REFERENCES usuarios(id);
ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_no_eliminados 
ON pagos_cliente(eliminado) 
WHERE eliminado = false;
