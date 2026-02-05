/*
  # Agregar configuración completa de comisiones Mercado Pago
  
  1. Nuevos Campos en partners_aliados
    - `habilitacion_cuotas`: Si el partner ofrece financiamiento en cuotas
    - `cantidad_cuotas_max`: Número máximo de cuotas (ej: 12)
    - `dias_acreditacion`: Días para acreditación (0 = instante, 21 = 21 días)
    - `comision_cuotas_tasa`: Tasa de comisión por financiamiento de cuotas
  
  2. Nuevas Configuraciones de Comisiones
    - COMISION_COBRANZA_ELECTRONICA: Comisión base de procesamiento (varía por método de pago)
    - COMISION_ACREDITACION_INSTANTANEA: 5.99% por acreditación al instante
    - COMISION_ACREDITACION_21_DIAS: 4.99% por acreditación a 21 días
    - COMISION_FINANCIAMIENTO_CUOTAS: 2.49% por ofrecer cuotas sin interés (12 cuotas)
  
  3. Notas
    - Todas las tasas están sin IVA (se aplica IVA sobre estas comisiones)
    - La comisión de cobranza electrónica varía: 5.99% medios tradicionales, 4.99% otros
    - Las comisiones son configurables por país
    - Se aplican en cascada: base + acreditación + cuotas (si aplica)
*/

-- 1. Agregar campos a partners_aliados para configuración de Mercado Pago
ALTER TABLE partners_aliados 
ADD COLUMN IF NOT EXISTS habilitacion_cuotas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cantidad_cuotas_max INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_acreditacion INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS comision_cuotas_tasa DECIMAL(5,2) DEFAULT 2.49;

-- Comentarios explicativos
COMMENT ON COLUMN partners_aliados.habilitacion_cuotas IS 
  'Si el partner ofrece financiamiento en cuotas sin interés';

COMMENT ON COLUMN partners_aliados.cantidad_cuotas_max IS 
  'Número máximo de cuotas que el partner ofrece (ej: 3, 6, 12)';

COMMENT ON COLUMN partners_aliados.dias_acreditacion IS 
  'Días para acreditación del dinero: 0 = al instante (5.99%), 21 = a 21 días (4.99%)';

COMMENT ON COLUMN partners_aliados.comision_cuotas_tasa IS 
  'Tasa de comisión por ofrecer cuotas sin interés (default: 2.49% para 12 cuotas)';

-- 2. Agregar configuraciones de comisiones de Mercado Pago para Uruguay
DO $$
DECLARE
  v_pais_id uuid;
BEGIN
  -- Obtener ID de Uruguay
  SELECT id INTO v_pais_id FROM paises WHERE codigo = 'UY' LIMIT 1;
  
  IF v_pais_id IS NOT NULL THEN
    
    -- Comisión de cobranza electrónica (base Mercado Pago)
    -- Varía según método: 5.99% medios tradicionales, 4.99% otros
    INSERT INTO impuestos_configuracion (
      pais_id, tipo, codigo, nombre, tasa, descripcion, activo,
      aplica_ventas, aplica_compras, configuracion
    )
    SELECT 
      v_pais_id, 'OTRO', 'COMISION_COBRANZA_ELECTRONICA',
      'Comisión de Cobranza Electrónica', 5.99,
      'Comisión base de Mercado Pago por procesar el pago. Varía según método de pago.',
      true, false, false,
      jsonb_build_object(
        'tipo_comision', 'cobranza',
        'metodo_pago_tarjetas', 5.99,
        'metodo_pago_otros', 4.99,
        'aplica_iva', true,
        'descripcion', 'Comisión por procesamiento de pagos electrónicos'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM impuestos_configuracion 
      WHERE codigo = 'COMISION_COBRANZA_ELECTRONICA' AND pais_id = v_pais_id
    );
    
    -- Comisión por acreditación instantánea
    INSERT INTO impuestos_configuracion (
      pais_id, tipo, codigo, nombre, tasa, descripcion, activo,
      aplica_ventas, aplica_compras, configuracion
    )
    SELECT 
      v_pais_id, 'OTRO', 'COMISION_ACREDITACION_INSTANTANEA',
      'Comisión por Acreditación Instantánea', 5.99,
      'Gasto financiero por recibir el dinero al instante (0 días)',
      true, false, false,
      jsonb_build_object(
        'tipo_comision', 'acreditacion',
        'dias_acreditacion', 0,
        'aplica_iva', true,
        'descripcion', 'Gasto financiero por acreditación anticipada al instante'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM impuestos_configuracion 
      WHERE codigo = 'COMISION_ACREDITACION_INSTANTANEA' AND pais_id = v_pais_id
    );
    
    -- Comisión por acreditación a 21 días
    INSERT INTO impuestos_configuracion (
      pais_id, tipo, codigo, nombre, tasa, descripcion, activo,
      aplica_ventas, aplica_compras, configuracion
    )
    SELECT 
      v_pais_id, 'OTRO', 'COMISION_ACREDITACION_21_DIAS',
      'Comisión por Acreditación a 21 Días', 4.99,
      'Gasto financiero por recibir el dinero a los 21 días',
      true, false, false,
      jsonb_build_object(
        'tipo_comision', 'acreditacion',
        'dias_acreditacion', 21,
        'aplica_iva', true,
        'descripcion', 'Gasto financiero por acreditación a 21 días'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM impuestos_configuracion 
      WHERE codigo = 'COMISION_ACREDITACION_21_DIAS' AND pais_id = v_pais_id
    );
    
    -- Comisión por financiamiento de cuotas sin interés
    INSERT INTO impuestos_configuracion (
      pais_id, tipo, codigo, nombre, tasa, descripcion, activo,
      aplica_ventas, aplica_compras, configuracion
    )
    SELECT 
      v_pais_id, 'OTRO', 'COMISION_FINANCIAMIENTO_CUOTAS',
      'Comisión por Financiamiento en Cuotas', 2.49,
      'Comisión adicional por ofrecer cuotas sin interés al cliente (12 cuotas)',
      true, false, false,
      jsonb_build_object(
        'tipo_comision', 'financiamiento_cuotas',
        'cuotas', 12,
        'aplica_iva', true,
        'descripcion', 'Costo por ofrecer financiamiento en cuotas sin interés al comprador'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM impuestos_configuracion 
      WHERE codigo = 'COMISION_FINANCIAMIENTO_CUOTAS' AND pais_id = v_pais_id
    );
    
    RAISE NOTICE 'Configuraciones de comisiones Mercado Pago agregadas correctamente';
  ELSE
    RAISE WARNING 'No se encontró el país Uruguay';
  END IF;
END $$;

-- 3. Crear índice para búsquedas por tipo de comisión
CREATE INDEX IF NOT EXISTS idx_impuestos_config_tipo_comision 
  ON impuestos_configuracion ((configuracion->>'tipo_comision'))
  WHERE tipo = 'OTRO';

-- 4. Actualizar partners existentes con valores por defecto
UPDATE partners_aliados
SET 
  habilitacion_cuotas = false,
  cantidad_cuotas_max = 0,
  dias_acreditacion = 21,
  comision_cuotas_tasa = 2.49
WHERE habilitacion_cuotas IS NULL;
