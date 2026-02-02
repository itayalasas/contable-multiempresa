/*
  # Fix Auto-Send DGI Trigger URL Configuration

  ## Descripción
  Actualiza el trigger de envío automático a DGI para usar la URL correcta de Supabase.
  
  ## Cambios
  1. Crea tabla para almacenar la configuración de URLs
  2. Actualiza la función del trigger para usar la URL configurada
  3. Inserta la URL de Supabase actual
  
  ## Funcionamiento
  - El trigger obtiene la URL desde la tabla de configuración
  - Si no existe, usa la URL de las variables de entorno de Supabase
  - Hace el request HTTP a la edge function auto-send-dgi
*/

-- 1. Crear tabla para configuración global del sistema
CREATE TABLE IF NOT EXISTS sistema_configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar URL de Supabase (se actualizará en producción)
INSERT INTO sistema_configuracion (clave, valor, descripcion)
VALUES (
  'supabase_url',
  COALESCE(
    current_setting('app.supabase_url', true),
    'https://lssdhxkipgqawrvgnfat.supabase.co'
  ),
  'URL base de Supabase para edge functions'
)
ON CONFLICT (clave) DO NOTHING;

-- RLS para configuración
ALTER TABLE sistema_configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system config"
  ON sistema_configuracion FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

CREATE POLICY "Service role can update system config"
  ON sistema_configuracion FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Actualizar función del trigger para usar configuración
CREATE OR REPLACE FUNCTION trigger_auto_send_dgi()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_request_id BIGINT;
  v_auto_send_enabled BOOLEAN;
BEGIN
  -- Verificar si la empresa tiene auto-send habilitado
  SELECT auto_send_enabled INTO v_auto_send_enabled
  FROM empresas_auto_send_dgi
  WHERE empresa_id = NEW.empresa_id;
  
  -- Si no existe configuración o está deshabilitado, no hacer nada
  IF v_auto_send_enabled IS NULL OR v_auto_send_enabled = false THEN
    RAISE LOG 'Auto-send DGI deshabilitado para empresa %', NEW.empresa_id;
    RETURN NEW;
  END IF;
  
  -- Solo enviar si es una factura nueva y no está ya enviada a DGI
  IF NEW.dgi_enviada = false OR NEW.dgi_enviada IS NULL THEN
    
    -- Obtener URL de Supabase desde configuración
    SELECT valor INTO v_supabase_url
    FROM sistema_configuracion
    WHERE clave = 'supabase_url';
    
    -- Si no está configurada, intentar obtenerla de variables de sistema
    IF v_supabase_url IS NULL THEN
      v_supabase_url := COALESCE(
        current_setting('app.supabase_url', true),
        'https://lssdhxkipgqawrvgnfat.supabase.co'
      );
    END IF;
    
    RAISE LOG 'Enviando factura % a DGI usando URL: %', NEW.numero_factura, v_supabase_url;
    
    -- Realizar llamada HTTP asíncrona a la edge function
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/auto-send-dgi',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'facturaId', NEW.id
        ),
        timeout_milliseconds := 30000
      ) INTO v_request_id;
      
      RAISE LOG 'Auto-send DGI iniciado para factura % (request_id: %)', NEW.numero_factura, v_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error al enviar factura % a DGI: %', NEW.numero_factura, SQLERRM;
        -- No lanzar error para no bloquear la inserción
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentarios
COMMENT ON TABLE sistema_configuracion IS 'Configuración global del sistema';
COMMENT ON FUNCTION trigger_auto_send_dgi IS 'Trigger que envía automáticamente facturas a DGI usando pg_net';
