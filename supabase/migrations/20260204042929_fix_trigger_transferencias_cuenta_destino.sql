/*
  # Fix Trigger para Transferencias - Actualizar Cuenta Destino

  1. Problema
    - El trigger actual solo actualiza la cuenta origen
    - Las transferencias no actualizan la cuenta destino
    - cuenta_destino_id está en metadata, no como columna

  2. Solución
    - Modificar el trigger para detectar transferencias
    - Actualizar también la cuenta destino cuando metadata.cuenta_destino_id existe
    
  3. Resultado
    - Las transferencias ahora actualizan ambas cuentas correctamente
*/

CREATE OR REPLACE FUNCTION trg_actualizar_saldo_cuenta_bancaria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- En INSERT o UPDATE, actualizar cuenta del nuevo movimiento
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM recalcular_saldo_cuenta_bancaria(NEW.cuenta_bancaria_id);
    
    -- Si es TRANSFERENCIA, también actualizar cuenta destino
    IF NEW.tipo_movimiento = 'TRANSFERENCIA' AND 
       NEW.metadata IS NOT NULL AND 
       NEW.metadata->>'cuenta_destino_id' IS NOT NULL THEN
      PERFORM recalcular_saldo_cuenta_bancaria((NEW.metadata->>'cuenta_destino_id')::uuid);
    END IF;
    
    -- Si UPDATE y cambió de cuenta, actualizar también la cuenta anterior
    IF (TG_OP = 'UPDATE' AND OLD.cuenta_bancaria_id != NEW.cuenta_bancaria_id) THEN
      PERFORM recalcular_saldo_cuenta_bancaria(OLD.cuenta_bancaria_id);
    END IF;
    
    -- Si UPDATE de transferencia y cambió cuenta destino, actualizar la cuenta destino anterior
    IF (TG_OP = 'UPDATE' AND 
        OLD.tipo_movimiento = 'TRANSFERENCIA' AND 
        OLD.metadata->>'cuenta_destino_id' IS NOT NULL AND
        (NEW.metadata->>'cuenta_destino_id' IS NULL OR 
         OLD.metadata->>'cuenta_destino_id' != NEW.metadata->>'cuenta_destino_id')) THEN
      PERFORM recalcular_saldo_cuenta_bancaria((OLD.metadata->>'cuenta_destino_id')::uuid);
    END IF;
    
    RETURN NEW;
  END IF;

  -- En DELETE, actualizar cuenta del movimiento eliminado
  IF (TG_OP = 'DELETE') THEN
    PERFORM recalcular_saldo_cuenta_bancaria(OLD.cuenta_bancaria_id);
    
    -- Si era TRANSFERENCIA, también actualizar cuenta destino
    IF OLD.tipo_movimiento = 'TRANSFERENCIA' AND 
       OLD.metadata IS NOT NULL AND 
       OLD.metadata->>'cuenta_destino_id' IS NOT NULL THEN
      PERFORM recalcular_saldo_cuenta_bancaria((OLD.metadata->>'cuenta_destino_id')::uuid);
    END IF;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION trg_actualizar_saldo_cuenta_bancaria() IS
  'Función trigger que actualiza automáticamente el saldo_actual de cuentas bancarias cuando hay cambios en movimientos_tesoreria. Para transferencias, también actualiza la cuenta destino usando metadata.cuenta_destino_id';
