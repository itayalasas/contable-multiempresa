/*
  # Agregar configuración de comisión Mercado Pago

  ## Descripción
  Agrega configuración para manejar las comisiones de Mercado Pago que se deben
  dividir entre la aplicación y los aliados al momento de pagar.

  ## Configuración
  - Tasa: 7% (configurable)
  - División: 50% app / 50% aliado (configurable en JSON)
  - Se usa para calcular lo que se descuenta al aliado en cuentas por pagar

  ## Uso
  Al generar cuentas por pagar, se busca este impuesto activo y se calcula:
  - Comisión total = subtotal_venta * 7%
  - Parte aliado = comisión total * 50%
  - Esta parte se descuenta del pago al aliado
*/

-- Insertar configuración de Mercado Pago para Uruguay
DO $$
DECLARE
  v_pais_id uuid;
BEGIN
  -- Obtener ID de Uruguay
  SELECT id INTO v_pais_id FROM paises WHERE codigo = 'UY' LIMIT 1;
  
  IF v_pais_id IS NOT NULL THEN
    -- Insertar si no existe
    INSERT INTO impuestos_configuracion (
      pais_id,
      tipo,
      codigo,
      nombre,
      tasa,
      descripcion,
      activo,
      aplica_ventas,
      aplica_compras,
      configuracion
    )
    SELECT 
      v_pais_id,
      'OTRO',
      'COMISION_MERCADOPAGO',
      'Comisión Mercado Pago',
      7.00,
      'Comisión de pasarela Mercado Pago - Se divide 50/50 entre aplicación y aliado',
      true,
      false,
      false,
      jsonb_build_object(
        'tipo_comision', 'gateway',
        'division_porcentaje_app', 50.0,
        'division_porcentaje_aliado', 50.0,
        'aplicable_a', 'pagos_aliados',
        'descripcion', 'Comisión de pasarela de pagos que se divide entre app y aliado'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM impuestos_configuracion 
      WHERE codigo = 'COMISION_MERCADOPAGO' AND pais_id = v_pais_id
    );
    
    RAISE NOTICE 'Configuración de Mercado Pago agregada para Uruguay';
  ELSE
    RAISE NOTICE 'No se encontró el país Uruguay, por favor ejecute primero las migraciones de nomencladores';
  END IF;
END $$;

-- Comentario
COMMENT ON TABLE impuestos_configuracion IS 'Configuración de impuestos y comisiones por país. Incluye comisiones de pasarelas de pago.';
