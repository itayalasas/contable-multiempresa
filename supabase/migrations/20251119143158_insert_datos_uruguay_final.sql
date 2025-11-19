/*
  # Datos iniciales para Uruguay (Final)
*/

DO $$
DECLARE
  v_uruguay_id uuid;
  v_ayala_empresa_id uuid;
  v_uyu_id uuid;
  v_usd_id uuid;
BEGIN
  SELECT id INTO v_uruguay_id FROM paises WHERE codigo_iso = 'URY' LIMIT 1;
  SELECT id INTO v_ayala_empresa_id FROM empresas WHERE nombre = 'Ayala IT S.A.S' LIMIT 1;

  IF v_uruguay_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el país Uruguay';
  END IF;

  -- IMPUESTOS
  INSERT INTO impuestos_configuracion (nombre, codigo, tipo, tasa, pais_id, codigo_dgi, aplica_ventas, aplica_compras, activo) VALUES
    ('IVA Básico', 'IVA_BASICO', 'IVA', 22, v_uruguay_id, '2', true, true, true),
    ('IVA Mínimo', 'IVA_MINIMO', 'IVA', 10, v_uruguay_id, '1', true, true, true),
    ('IVA Exento', 'IVA_EXENTO', 'IVA', 0, v_uruguay_id, '3', true, true, true)
  ON CONFLICT DO NOTHING;

  -- TIPOS DE DOCUMENTO DGI
  INSERT INTO tipos_documento_dgi (nombre, codigo, codigo_dgi, tipo_operacion, pais_id, requiere_cfe, prefijo, activo) VALUES
    ('e-Ticket', 'ETICKET', '101', 'VENTA', v_uruguay_id, true, 'ET', true),
    ('e-Factura', 'EFACTURA', '111', 'VENTA', v_uruguay_id, true, 'EF', true),
    ('NC e-Ticket', 'NC_ETICKET', '102', 'NOTA_CREDITO', v_uruguay_id, true, 'NC-ET', true),
    ('NC e-Factura', 'NC_EFACTURA', '112', 'NOTA_CREDITO', v_uruguay_id, true, 'NC-EF', true),
    ('ND e-Ticket', 'ND_ETICKET', '103', 'NOTA_DEBITO', v_uruguay_id, true, 'ND-ET', true),
    ('e-Recibo', 'ERECIBO', '201', 'RECIBO', v_uruguay_id, true, 'ER', true),
    ('Factura Compra', 'FACTURA_COMPRA', '001', 'COMPRA', v_uruguay_id, false, 'FC', true)
  ON CONFLICT DO NOTHING;

  -- MONEDAS
  INSERT INTO monedas (codigo_iso, nombre, simbolo, pais_principal, decimales, activa) VALUES
    ('UYU', 'Peso Uruguayo', '$U', 'Uruguay', 2, true),
    ('USD', 'Dólar Estadounidense', 'US$', 'Estados Unidos', 2, true)
  ON CONFLICT (codigo_iso) DO NOTHING;

  SELECT id INTO v_uyu_id FROM monedas WHERE codigo_iso = 'UYU' LIMIT 1;
  SELECT id INTO v_usd_id FROM monedas WHERE codigo_iso = 'USD' LIMIT 1;

  -- TIPOS DE CAMBIO
  IF v_uyu_id IS NOT NULL AND v_usd_id IS NOT NULL THEN
    INSERT INTO tipos_cambio (moneda_origen_id, moneda_destino_id, fecha, tasa_compra, tasa_venta, fuente, tipo_cambio_oficial, validado) VALUES
      (v_usd_id, v_uyu_id, CURRENT_DATE, 40.00, 41.00, 'BCU', true, true),
      (v_uyu_id, v_usd_id, CURRENT_DATE, 0.0244, 0.0250, 'BCU', true, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- CONFIGURACIÓN MULTIMONEDA  
  IF v_ayala_empresa_id IS NOT NULL AND v_uyu_id IS NOT NULL THEN
    INSERT INTO configuracion_multimoneda (empresa_id, moneda_funcional_id, moneda_presentacion_id, habilitar_multimoneda) VALUES
      (v_ayala_empresa_id, v_uyu_id, v_uyu_id, true)
    ON CONFLICT (empresa_id) DO NOTHING;
  END IF;

  -- ROLES
  INSERT INTO roles_sistema (nombre, codigo, descripcion, nivel_acceso, es_rol_sistema) VALUES
    ('Super Admin', 'SUPER_ADMIN', 'Acceso total', 10, true),
    ('Admin Empresa', 'ADMIN_EMPRESA', 'Administra empresa', 8, true),
    ('Contador', 'CONTADOR', 'Contabilidad completa', 6, true),
    ('Tesorería', 'TESORERIA', 'Pagos y cobranzas', 5, true),
    ('Usuario', 'USUARIO', 'Acceso básico', 3, true),
    ('Auditor', 'AUDITOR', 'Solo lectura', 4, true)
  ON CONFLICT (codigo) DO NOTHING;

  -- PERMISOS
  INSERT INTO permisos (modulo, recurso, accion, codigo, descripcion) VALUES
    ('CONTABILIDAD', 'ASIENTOS', 'CREAR', 'CONT_ASI_CREAR', 'Crear asientos'),
    ('CONTABILIDAD', 'ASIENTOS', 'LEER', 'CONT_ASI_LEER', 'Ver asientos'),
    ('VENTAS', 'FACTURAS', 'CREAR', 'VEN_FAC_CREAR', 'Crear facturas'),
    ('VENTAS', 'FACTURAS', 'LEER', 'VEN_FAC_LEER', 'Ver facturas'),
    ('COMPRAS', 'FACTURAS', 'CREAR', 'COM_FAC_CREAR', 'Registrar compras'),
    ('TESORERIA', 'PAGOS', 'CREAR', 'TES_PAG_CREAR', 'Registrar pagos'),
    ('ADMIN', 'USUARIOS', 'CREAR', 'ADM_USR_CREAR', 'Crear usuarios')
  ON CONFLICT (codigo) DO NOTHING;

  RAISE NOTICE 'Datos insertados correctamente';
END $$;
