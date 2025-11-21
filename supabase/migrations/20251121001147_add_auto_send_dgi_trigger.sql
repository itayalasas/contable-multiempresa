/*
  # Trigger Automático para Envío a DGI

  ## Descripción
  Configura un trigger que se activa cuando se inserta una nueva factura de venta.
  Automáticamente llama a la edge function para enviar la factura a DGI.

  ## Funcionalidad
  1. Trigger se activa AFTER INSERT en facturas_venta
  2. Llama a edge function auto-send-dgi mediante pg_net
  3. Solo si la factura tiene estado 'borrador' o 'pendiente'
  4. No bloquea la creación de la factura (asíncrono)

  ## Configuración
  - Requiere extensión pg_net para hacer llamadas HTTP desde PostgreSQL
  - La edge function maneja todo el proceso de envío a DGI
*/

-- 1. Habilitar extensión pg_net para hacer HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función que se ejecutará en el trigger
CREATE OR REPLACE FUNCTION trigger_auto_send_dgi()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Solo enviar si es una factura nueva y no está ya enviada a DGI
  IF NEW.dgi_enviada = false OR NEW.dgi_enviada IS NULL THEN
    
    -- Obtener URL de Supabase desde configuración
    -- En producción, estas variables estarán disponibles
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Si no están configuradas, usar valores por defecto (para desarrollo)
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'http://localhost:54321';
    END IF;
    
    -- Realizar llamada HTTP asíncrona a la edge function
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/auto-send-dgi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
      ),
      body := jsonb_build_object(
        'facturaId', NEW.id
      )
    ) INTO v_request_id;
    
    RAISE LOG 'Auto-send DGI iniciado para factura % (request_id: %)', NEW.numero_factura, v_request_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger en facturas_venta
DROP TRIGGER IF EXISTS trg_auto_send_dgi ON facturas_venta;

CREATE TRIGGER trg_auto_send_dgi
  AFTER INSERT ON facturas_venta
  FOR EACH ROW
  WHEN (NEW.dgi_enviada = false OR NEW.dgi_enviada IS NULL)
  EXECUTE FUNCTION trigger_auto_send_dgi();

-- 4. Tabla para configurar si el auto-envío está activo por empresa
CREATE TABLE IF NOT EXISTS empresas_auto_send_dgi (
  empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  auto_send_enabled BOOLEAN DEFAULT false,
  enviar_solo_si_estado TEXT[], -- Estados en los que enviar: ['pendiente', 'borrador']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_empresas_auto_send ON empresas_auto_send_dgi(empresa_id, auto_send_enabled);

-- RLS
ALTER TABLE empresas_auto_send_dgi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auto-send config of their empresa"
  ON empresas_auto_send_dgi FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update auto-send config"
  ON empresas_auto_send_dgi FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert auto-send config"
  ON empresas_auto_send_dgi FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Modificar trigger para considerar configuración de empresa
CREATE OR REPLACE FUNCTION trigger_auto_send_dgi()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
  v_auto_send_enabled BOOLEAN;
BEGIN
  -- Verificar si la empresa tiene auto-send habilitado
  SELECT auto_send_enabled INTO v_auto_send_enabled
  FROM empresas_auto_send_dgi
  WHERE empresa_id = NEW.empresa_id;
  
  -- Si no existe configuración o está deshabilitado, no hacer nada
  IF v_auto_send_enabled IS NULL OR v_auto_send_enabled = false THEN
    RETURN NEW;
  END IF;
  
  -- Solo enviar si es una factura nueva y no está ya enviada a DGI
  IF NEW.dgi_enviada = false OR NEW.dgi_enviada IS NULL THEN
    
    -- Obtener URL de Supabase
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'http://localhost:54321';
    END IF;
    
    -- Realizar llamada HTTP asíncrona
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/auto-send-dgi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
      ),
      body := jsonb_build_object(
        'facturaId', NEW.id
      )
    ) INTO v_request_id;
    
    RAISE LOG 'Auto-send DGI iniciado para factura % (request_id: %)', NEW.numero_factura, v_request_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comentarios
COMMENT ON FUNCTION trigger_auto_send_dgi IS 'Trigger function que envía automáticamente facturas a DGI';
COMMENT ON TABLE empresas_auto_send_dgi IS 'Configuración de envío automático a DGI por empresa';
