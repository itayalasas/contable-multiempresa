/*
  # Unificar Sistema de Comisiones
  
  Expandir la tabla comisiones_partners para incluir TODAS las comisiones:
  - Comisiones de partners (existente)
  - Comisiones de cobranza electrónica (Mercado Pago)
  - Comisiones de acreditación (instantánea o 21 días)
  - Comisiones de financiamiento en cuotas
  
  Esto permite tener una vista unificada de TODOS los gastos por comisiones.
*/

-- 1. Hacer partner_id nullable (para comisiones que no son de partners)
ALTER TABLE comisiones_partners 
  ALTER COLUMN partner_id DROP NOT NULL;

-- 2. Agregar campos para identificar tipo de comisión
ALTER TABLE comisiones_partners
  ADD COLUMN IF NOT EXISTS tipo_comision TEXT DEFAULT 'partner',
  ADD COLUMN IF NOT EXISTS beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS configuracion_comision_id UUID REFERENCES impuestos_configuracion(id);

-- 3. Agregar comentarios explicativos
COMMENT ON COLUMN comisiones_partners.tipo_comision IS 
  'Tipo de comisión: partner, cobranza_electronica, acreditacion_instantanea, acreditacion_21_dias, financiamiento_cuotas';

COMMENT ON COLUMN comisiones_partners.beneficiario IS 
  'Nombre del beneficiario de la comisión (nombre del partner, MercadoPago, MercadoLibre, etc)';

COMMENT ON COLUMN comisiones_partners.configuracion_comision_id IS 
  'Referencia a la configuración de impuestos/comisiones usada para el cálculo';

-- 4. Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_comisiones_tipo 
  ON comisiones_partners(tipo_comision);

CREATE INDEX IF NOT EXISTS idx_comisiones_beneficiario 
  ON comisiones_partners(beneficiario);

-- 5. Actualizar registros existentes (si hay)
UPDATE comisiones_partners 
SET tipo_comision = 'partner'
WHERE tipo_comision IS NULL;

-- 6. Agregar constraint para tipo de comisión
ALTER TABLE comisiones_partners
  ADD CONSTRAINT check_tipo_comision 
  CHECK (tipo_comision IN (
    'partner',
    'cobranza_electronica',
    'acreditacion_instantanea', 
    'acreditacion_21_dias',
    'financiamiento_cuotas',
    'marketplace'
  ));

-- 7. Actualizar la descripción de la tabla
COMMENT ON TABLE comisiones_partners IS 
  'Registro unificado de TODAS las comisiones del sistema: partners, pasarelas de pago, financiamiento, etc.';
