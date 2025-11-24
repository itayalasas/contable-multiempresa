/*
  # Reestructuración del Plan de Cuentas a Formato de 6 Dígitos

  Este script reestructura completamente el plan de cuentas para seguir
  el estándar de 6 dígitos sin puntos.

  ADVERTENCIA: Elimina movimientos y asientos contables existentes.
*/

-- Paso 1: Eliminar movimientos y asientos contables
DELETE FROM movimientos_contables 
WHERE asiento_id IN (
  SELECT id FROM asientos_contables 
  WHERE empresa_id IN (SELECT id FROM empresas)
);

DELETE FROM asientos_contables 
WHERE empresa_id IN (SELECT id FROM empresas);

-- Paso 2: Eliminar cuentas existentes
DELETE FROM plan_cuentas 
WHERE empresa_id IN (SELECT id FROM empresas);

-- Paso 3: Crear nueva estructura
DO $$
DECLARE
  v_empresa_id uuid;
  v_pais_id uuid;
  v_activo_id uuid;
  v_pasivo_id uuid;
  v_patrimonio_id uuid;
  v_ingreso_id uuid;
  v_gasto_id uuid;
  v_activo_corriente_id uuid;
  v_cuentas_cobrar_id uuid;
  v_inventarios_id uuid;
  v_activo_fijo_id uuid;
  v_pasivo_corriente_id uuid;
  v_capital_id uuid;
  v_resultados_id uuid;
  v_ventas_id uuid;
  v_otros_ingresos_id uuid;
  v_compras_id uuid;
  v_gastos_servicios_id uuid;
  v_otros_gastos_id uuid;
  v_disponibilidades_id uuid;
  v_bancos_id uuid;
  v_cxc_comerciales_id uuid;
  v_mercaderias_id uuid;
  v_inmuebles_id uuid;
  v_tributos_id uuid;
  v_comisiones_pagar_id uuid;
  v_cxp_comerciales_id uuid;
  v_cxp_diversas_id uuid;
  v_capital_social_id uuid;
  v_utilidades_id uuid;
  v_perdidas_id uuid;
  v_ventas_mercaderias_id uuid;
  v_otros_ing_gestion_id uuid;
  v_compras_mercaderias_id uuid;
  v_compras_comisiones_id uuid;
  v_servicios_terceros_id uuid;
  v_servicios_basicos_id uuid;
  v_gastos_generales_id uuid;
BEGIN
  SELECT id INTO v_empresa_id FROM empresas LIMIT 1;
  SELECT id INTO v_pais_id FROM paises WHERE codigo = 'UY' LIMIT 1;
  
  IF v_empresa_id IS NULL OR v_pais_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró empresa o país';
  END IF;

  -- NIVEL 1
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, pais_id, empresa_id, activa) VALUES ('1', 'ACTIVO', 'ACTIVO', 1, v_pais_id, v_empresa_id, true) RETURNING id INTO v_activo_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, pais_id, empresa_id, activa) VALUES ('2', 'PASIVO', 'PASIVO', 1, v_pais_id, v_empresa_id, true) RETURNING id INTO v_pasivo_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, pais_id, empresa_id, activa) VALUES ('5', 'PATRIMONIO', 'PATRIMONIO', 1, v_pais_id, v_empresa_id, true) RETURNING id INTO v_patrimonio_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, pais_id, empresa_id, activa) VALUES ('7', 'INGRESOS', 'INGRESO', 1, v_pais_id, v_empresa_id, true) RETURNING id INTO v_ingreso_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, pais_id, empresa_id, activa) VALUES ('6', 'GASTOS', 'GASTO', 1, v_pais_id, v_empresa_id, true) RETURNING id INTO v_gasto_id;

  -- NIVEL 2: ACTIVO
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('11', 'ACTIVO CORRIENTE', 'ACTIVO', 2, v_activo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_activo_corriente_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('12', 'CUENTAS POR COBRAR', 'ACTIVO', 2, v_activo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_cuentas_cobrar_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('13', 'INVENTARIOS', 'ACTIVO', 2, v_activo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_inventarios_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('14', 'ACTIVO FIJO', 'ACTIVO', 2, v_activo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_activo_fijo_id;

  -- NIVEL 2: PASIVO
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('21', 'PASIVO CORRIENTE', 'PASIVO', 2, v_pasivo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_pasivo_corriente_id;

  -- NIVEL 2: PATRIMONIO
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('51', 'CAPITAL', 'PATRIMONIO', 2, v_patrimonio_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_capital_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('59', 'RESULTADOS ACUMULADOS', 'PATRIMONIO', 2, v_patrimonio_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_resultados_id;

  -- NIVEL 2: INGRESOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('71', 'VENTAS', 'INGRESO', 2, v_ingreso_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_ventas_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('75', 'OTROS INGRESOS', 'INGRESO', 2, v_ingreso_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_otros_ingresos_id;

  -- NIVEL 2: GASTOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('61', 'COMPRAS', 'GASTO', 2, v_gasto_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_compras_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('63', 'GASTOS DE SERVICIOS', 'GASTO', 2, v_gasto_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_gastos_servicios_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('65', 'OTROS GASTOS DE GESTIÓN', 'GASTO', 2, v_gasto_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_otros_gastos_id;

  -- NIVEL 3: ACTIVO CORRIENTE
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('111', 'DISPONIBILIDADES', 'ACTIVO', 3, v_activo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_disponibilidades_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('112', 'BANCOS', 'ACTIVO', 3, v_activo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_bancos_id;

  -- NIVEL 3: CUENTAS POR COBRAR
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('121', 'Cuentas por Cobrar Comerciales', 'ACTIVO', 3, v_cuentas_cobrar_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_cxc_comerciales_id;

  -- NIVEL 3: INVENTARIOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('131', 'Mercaderías', 'ACTIVO', 3, v_inventarios_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_mercaderias_id;

  -- NIVEL 3: ACTIVO FIJO
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('141', 'Inmuebles, Maquinaria y Equipo', 'ACTIVO', 3, v_activo_fijo_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_inmuebles_id;

  -- NIVEL 3: PASIVO CORRIENTE
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('211', 'Tributos por Pagar', 'PASIVO', 3, v_pasivo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_tributos_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('212', 'Comisiones por Pagar', 'PASIVO', 3, v_pasivo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_comisiones_pagar_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('213', 'Cuentas por Pagar Comerciales', 'PASIVO', 3, v_pasivo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_cxp_comerciales_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('214', 'Cuentas por Pagar Diversas', 'PASIVO', 3, v_pasivo_corriente_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_cxp_diversas_id;

  -- NIVEL 3: CAPITAL
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('511', 'Capital Social', 'PATRIMONIO', 3, v_capital_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_capital_social_id;

  -- NIVEL 3: RESULTADOS ACUMULADOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('591', 'Utilidades', 'PATRIMONIO', 3, v_resultados_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_utilidades_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('592', 'Pérdidas', 'PATRIMONIO', 3, v_resultados_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_perdidas_id;

  -- NIVEL 3: VENTAS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('711', 'Ventas de Mercaderías', 'INGRESO', 3, v_ventas_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_ventas_mercaderias_id;

  -- NIVEL 3: OTROS INGRESOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('751', 'Otros Ingresos de Gestión', 'INGRESO', 3, v_otros_ingresos_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_otros_ing_gestion_id;

  -- NIVEL 3: COMPRAS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('611', 'Mercaderías', 'GASTO', 3, v_compras_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_compras_mercaderias_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('612', 'Comisiones', 'GASTO', 3, v_compras_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_compras_comisiones_id;

  -- NIVEL 3: GASTOS DE SERVICIOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('631', 'Servicios de Terceros', 'GASTO', 3, v_gastos_servicios_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_servicios_terceros_id;
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('636', 'Servicios Básicos', 'GASTO', 3, v_gastos_servicios_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_servicios_basicos_id;

  -- NIVEL 3: OTROS GASTOS
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, pais_id, empresa_id, activa) VALUES ('651', 'Gastos Generales', 'GASTO', 3, v_otros_gastos_id, v_pais_id, v_empresa_id, true) RETURNING id INTO v_gastos_generales_id;

  -- NIVEL 4: CUENTAS DETALLE (6 dígitos)
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('111001', 'Caja MN', 'ACTIVO', 4, v_disponibilidades_id, 'Caja en moneda nacional', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('111002', 'Caja ME', 'ACTIVO', 4, v_disponibilidades_id, 'Caja en moneda extranjera', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('112001', 'Cuentas Corrientes Operativas', 'ACTIVO', 4, v_bancos_id, 'Cuentas corrientes en bancos', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('112002', 'Banco Itaú', 'ACTIVO', 4, v_bancos_id, 'Cuenta Banco Itaú', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('112003', 'Banco BROU', 'ACTIVO', 4, v_bancos_id, 'Cuenta Banco República', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('121001', 'Facturas no emitidas', 'ACTIVO', 4, v_cxc_comerciales_id, 'Facturas pendientes de emisión', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('121002', 'Facturas emitidas en cartera', 'ACTIVO', 4, v_cxc_comerciales_id, 'Facturas emitidas pendientes de cobro', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('131001', 'Mercaderías manufacturadas', 'ACTIVO', 4, v_mercaderias_id, 'Productos terminados', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('141001', 'Terrenos', 'ACTIVO', 4, v_inmuebles_id, 'Terrenos propios', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('141002', 'Maquinarias y equipos', 'ACTIVO', 4, v_inmuebles_id, 'Maquinaria y equipos de producción', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('141003', 'Unidades de transporte', 'ACTIVO', 4, v_inmuebles_id, 'Vehículos y unidades de transporte', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('211001', 'IVA por Pagar', 'PASIVO', 4, v_tributos_id, 'Impuesto al Valor Agregado', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('211002', 'IGV por Pagar', 'PASIVO', 4, v_tributos_id, 'Impuesto General a las Ventas', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('212001', 'Comisiones por Pagar - Partners', 'PASIVO', 4, v_comisiones_pagar_id, 'Comisiones a partners', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('212002', 'Comisiones MercadoPago por Pagar', 'PASIVO', 4, v_comisiones_pagar_id, 'Comisión MercadoPago', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('213001', 'Facturas emitidas por pagar', 'PASIVO', 4, v_cxp_comerciales_id, 'Facturas de proveedores', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('213002', 'Cuentas por Pagar - Partners', 'PASIVO', 4, v_cxp_comerciales_id, 'Cuentas por pagar partners', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('214001', 'Pasivos por compra de activo', 'PASIVO', 4, v_cxp_diversas_id, 'Pasivos por activos fijos', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('511001', 'Acciones', 'PATRIMONIO', 4, v_capital_social_id, 'Capital social', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('591001', 'Utilidades no distribuidas', 'PATRIMONIO', 4, v_utilidades_id, 'Utilidades acumuladas', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('592001', 'Pérdidas acumuladas', 'PATRIMONIO', 4, v_perdidas_id, 'Pérdidas del ejercicio', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('711001', 'Mercaderías manufacturadas', 'INGRESO', 4, v_ventas_mercaderias_id, 'Venta de productos', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('751001', 'Servicios en beneficio del personal', 'INGRESO', 4, v_otros_ing_gestion_id, 'Servicios al personal', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('751002', 'Otros ingresos diversos', 'INGRESO', 4, v_otros_ing_gestion_id, 'Otros ingresos', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('611001', 'Mercaderías manufacturadas', 'GASTO', 4, v_compras_mercaderias_id, 'Compra de mercaderías', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('612001', 'Comisiones a Partners', 'GASTO', 4, v_compras_comisiones_id, 'Comisiones partners', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('612002', 'Comisiones MercadoPago', 'GASTO', 4, v_compras_comisiones_id, 'Comisiones MP', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('631001', 'Transporte y correos', 'GASTO', 4, v_servicios_terceros_id, 'Transporte y envíos', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('631002', 'Mantenimiento y reparaciones', 'GASTO', 4, v_servicios_terceros_id, 'Mantenimiento', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('636001', 'Energía eléctrica', 'GASTO', 4, v_servicios_basicos_id, 'Electricidad', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('636002', 'Gas', 'GASTO', 4, v_servicios_basicos_id, 'Gas', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('636003', 'Agua', 'GASTO', 4, v_servicios_basicos_id, 'Agua', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('636004', 'Teléfono', 'GASTO', 4, v_servicios_basicos_id, 'Teléfono', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('636005', 'Internet', 'GASTO', 4, v_servicios_basicos_id, 'Internet', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('651001', 'Seguros', 'GASTO', 4, v_gastos_generales_id, 'Seguros', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('651002', 'Suministros', 'GASTO', 4, v_gastos_generales_id, 'Suministros oficina', v_pais_id, v_empresa_id, true);
  INSERT INTO plan_cuentas (codigo, nombre, tipo, nivel, cuenta_padre, descripcion, pais_id, empresa_id, activa) VALUES ('651003', 'Otros gastos diversos', 'GASTO', 4, v_gastos_generales_id, 'Otros gastos', v_pais_id, v_empresa_id, true);

END $$;