/*
  # Configuración por defecto para Itaú PAP (Pago Automático a Proveedores)

  1. Inserts
    - Configuración de mapeo para Banco Itaú Uruguay
    - Formato TXT de longitud fija según especificación PAP
    
  2. Config Fields
    - Especificaciones de cada tipo de registro (Cabecera, Detalle, Totales)
    - Longitudes y posiciones de cada campo
*/

-- Insertar configuración de Itaú PAP para cada empresa existente
INSERT INTO mapeo_archivos_bancarios (
  empresa_id,
  nombre,
  banco_id,
  banco_nombre,
  formato_archivo,
  delimitador,
  formato_fecha,
  tiene_encabezado,
  tiene_totales,
  codificacion,
  config_campos,
  activo
)
SELECT 
  id as empresa_id,
  'Itaú PAP - Pago Automático Proveedores' as nombre,
  'ITAU' as banco_id,
  'Banco Itaú' as banco_nombre,
  'TXT' as formato_archivo,
  '' as delimitador,
  'YYYYMMDD' as formato_fecha,
  true as tiene_encabezado,
  true as tiene_totales,
  'UTF-8' as codificacion,
  jsonb_build_object(
    'tipo_formato', 'LONGITUD_FIJA',
    'longitud_linea', 120,
    'registro_cabecera', jsonb_build_object(
      'tipo_registro', jsonb_build_object('posicion', 1, 'longitud', 1, 'valor', '1'),
      'rut_empresa', jsonb_build_object('posicion', 2, 'longitud', 11, 'formato', 'SIN_GUIONES', 'relleno', 'CEROS_IZQ'),
      'fecha_proceso', jsonb_build_object('posicion', 13, 'longitud', 8, 'formato', 'AAAAMMDD'),
      'numero_lote', jsonb_build_object('posicion', 21, 'longitud', 6, 'relleno', 'CEROS_IZQ'),
      'nombre_empresa', jsonb_build_object('posicion', 27, 'longitud', 30, 'formato', 'MAYUSCULAS', 'relleno', 'ESPACIOS_DER'),
      'moneda', jsonb_build_object('posicion', 57, 'longitud', 3, 'valores', '["UYU", "USD"]'),
      'relleno', jsonb_build_object('posicion', 60, 'longitud', 61, 'relleno', 'ESPACIOS')
    ),
    'registro_detalle', jsonb_build_object(
      'tipo_registro', jsonb_build_object('posicion', 1, 'longitud', 1, 'valor', '2'),
      'rut_proveedor', jsonb_build_object('posicion', 2, 'longitud', 11, 'formato', 'SIN_GUIONES', 'relleno', 'CEROS_IZQ'),
      'tipo_cuenta', jsonb_build_object('posicion', 13, 'longitud', 1, 'valores', '{"CA": "1", "CC": "2", "ITAU_PAGOS": "3"}'),
      'numero_cuenta', jsonb_build_object('posicion', 14, 'longitud', 18, 'relleno', 'CEROS_IZQ'),
      'importe', jsonb_build_object('posicion', 32, 'longitud', 13, 'formato', 'SIN_DECIMALES', 'relleno', 'CEROS_IZQ', 'descripcion', 'Multiplicar por 100, ej: 1000.50 = 00000100050'),
      'concepto', jsonb_build_object('posicion', 45, 'longitud', 30, 'relleno', 'ESPACIOS_DER'),
      'fecha_valor', jsonb_build_object('posicion', 75, 'longitud', 8, 'formato', 'AAAAMMDD'),
      'moneda', jsonb_build_object('posicion', 83, 'longitud', 3, 'valores', '["UYU", "USD"]'),
      'relleno', jsonb_build_object('posicion', 86, 'longitud', 35, 'relleno', 'ESPACIOS')
    ),
    'registro_totales', jsonb_build_object(
      'tipo_registro', jsonb_build_object('posicion', 1, 'longitud', 1, 'valor', '3'),
      'cantidad_registros', jsonb_build_object('posicion', 2, 'longitud', 6, 'relleno', 'CEROS_IZQ', 'descripcion', 'Cantidad de registros tipo 2'),
      'importe_total', jsonb_build_object('posicion', 8, 'longitud', 13, 'formato', 'SIN_DECIMALES', 'relleno', 'CEROS_IZQ'),
      'relleno', jsonb_build_object('posicion', 21, 'longitud', 100, 'relleno', 'ESPACIOS')
    ),
    'validaciones', jsonb_build_object(
      'rut_empresa_habilitado', 'El RUT de la empresa debe estar habilitado para PAP en Itaú',
      'lote_no_repetido', 'El número de lote no debe repetirse',
      'tipos_cuenta_validos', 'Solo CA (Caja de Ahorro), CC (Cuenta Corriente) o ITAU_PAGOS',
      'importes_mayores_cero', 'Todos los importes deben ser mayores a cero',
      'cuentas_habilitadas', 'Las cuentas destino deben estar habilitadas para recibir transferencias'
    )
  ) as config_campos,
  true as activo
FROM empresas
WHERE NOT EXISTS (
  SELECT 1 FROM mapeo_archivos_bancarios 
  WHERE empresa_id = empresas.id 
    AND banco_id = 'ITAU' 
    AND nombre = 'Itaú PAP - Pago Automático Proveedores'
);

COMMENT ON COLUMN mapeo_archivos_bancarios.config_campos IS 'Configuración JSON con especificaciones del formato de archivo bancario';
