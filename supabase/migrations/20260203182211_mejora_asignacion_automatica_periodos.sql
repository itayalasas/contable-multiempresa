/*
  # Mejora de Asignación Automática a Períodos

  1. Mejoras
    - Trigger automático al insertar facturas para asignar período
    - Trigger automático al insertar asientos para asignar período
    - Trigger automático al insertar comisiones para asignar período
    - Función helper para encontrar período por fecha
  
  2. Validaciones
    - Solo asigna a períodos abiertos
    - Prioriza el período más reciente si hay múltiples
    - Registra warning si no se encuentra período
*/

-- Función helper para encontrar período por fecha
CREATE OR REPLACE FUNCTION encontrar_periodo_por_fecha(
  p_empresa_id UUID,
  p_fecha DATE
)
RETURNS UUID AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  -- Buscar período abierto que contenga la fecha
  SELECT id INTO v_periodo_id
  FROM periodos_contables
  WHERE empresa_id = p_empresa_id
    AND p_fecha >= fecha_inicio
    AND p_fecha <= fecha_fin
    AND estado = 'abierto'
  ORDER BY fecha_inicio DESC
  LIMIT 1;
  
  RETURN v_periodo_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar período a facturas de venta
CREATE OR REPLACE FUNCTION trigger_asignar_periodo_factura_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  -- Si ya tiene período asignado, no hacer nada
  IF NEW.periodo_contable_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar período correspondiente
  v_periodo_id := encontrar_periodo_por_fecha(NEW.empresa_id, NEW.fecha_emision);
  
  IF v_periodo_id IS NOT NULL THEN
    NEW.periodo_contable_id := v_periodo_id;
    RAISE NOTICE 'Factura venta asignada a período: %', v_periodo_id;
  ELSE
    RAISE WARNING 'No se encontró período abierto para fecha % en empresa %', 
      NEW.fecha_emision, NEW.empresa_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_periodo_factura_venta ON facturas_venta;
CREATE TRIGGER trigger_asignar_periodo_factura_venta
  BEFORE INSERT ON facturas_venta
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asignar_periodo_factura_venta();

-- Trigger para asignar período a facturas de compra
CREATE OR REPLACE FUNCTION trigger_asignar_periodo_factura_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  IF NEW.periodo_contable_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  v_periodo_id := encontrar_periodo_por_fecha(NEW.empresa_id, NEW.fecha_emision);
  
  IF v_periodo_id IS NOT NULL THEN
    NEW.periodo_contable_id := v_periodo_id;
    RAISE NOTICE 'Factura compra asignada a período: %', v_periodo_id;
  ELSE
    RAISE WARNING 'No se encontró período abierto para fecha % en empresa %', 
      NEW.fecha_emision, NEW.empresa_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_periodo_factura_compra ON facturas_compra;
CREATE TRIGGER trigger_asignar_periodo_factura_compra
  BEFORE INSERT ON facturas_compra
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asignar_periodo_factura_compra();

-- Trigger para asignar período a asientos contables
CREATE OR REPLACE FUNCTION trigger_asignar_periodo_asiento()
RETURNS TRIGGER AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  IF NEW.periodo_contable_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  v_periodo_id := encontrar_periodo_por_fecha(NEW.empresa_id, NEW.fecha);
  
  IF v_periodo_id IS NOT NULL THEN
    NEW.periodo_contable_id := v_periodo_id;
    RAISE NOTICE 'Asiento asignado a período: %', v_periodo_id;
  ELSE
    RAISE WARNING 'No se encontró período abierto para fecha % en empresa %', 
      NEW.fecha, NEW.empresa_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_periodo_asiento ON asientos_contables;
CREATE TRIGGER trigger_asignar_periodo_asiento
  BEFORE INSERT ON asientos_contables
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asignar_periodo_asiento();

-- Trigger para asignar período a comisiones partners
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comisiones_partners') THEN
    CREATE OR REPLACE FUNCTION trigger_asignar_periodo_comision()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_periodo_id UUID;
    BEGIN
      IF NEW.periodo_contable_id IS NOT NULL THEN
        RETURN NEW;
      END IF;
      
      v_periodo_id := encontrar_periodo_por_fecha(NEW.empresa_id, NEW.fecha);
      
      IF v_periodo_id IS NOT NULL THEN
        NEW.periodo_contable_id := v_periodo_id;
        RAISE NOTICE 'Comisión asignada a período: %', v_periodo_id;
      ELSE
        RAISE WARNING 'No se encontró período abierto para fecha % en empresa %', 
          NEW.fecha, NEW.empresa_id;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_asignar_periodo_comision ON comisiones_partners;
    CREATE TRIGGER trigger_asignar_periodo_comision
      BEFORE INSERT ON comisiones_partners
      FOR EACH ROW
      EXECUTE FUNCTION trigger_asignar_periodo_comision();
  END IF;
END $$;

COMMENT ON FUNCTION encontrar_periodo_por_fecha IS 'Encuentra el período contable abierto correspondiente a una fecha';
COMMENT ON FUNCTION trigger_asignar_periodo_factura_venta IS 'Asigna automáticamente período contable a facturas de venta al insertarlas';
COMMENT ON FUNCTION trigger_asignar_periodo_factura_compra IS 'Asigna automáticamente período contable a facturas de compra al insertarlas';
COMMENT ON FUNCTION trigger_asignar_periodo_asiento IS 'Asigna automáticamente período contable a asientos contables al insertarlos';
