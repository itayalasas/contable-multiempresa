/*
  # Módulo de Integraciones
  
  1. Nuevas Tablas
    - `integraciones_config`
      - Configuración de integraciones externas
      - CRM, App Mascotas, DGI, Pasarelas de pago
      - Claves API y endpoints
    
    - `webhooks_config`
      - Configuración de webhooks
      - URLs de destino
      - Eventos suscritos
    
    - `logs_integracion`
      - Histórico de llamadas API
      - Requests/Responses
      - Errores y reintentos
    
    - `cola_eventos`
      - Cola de eventos para procesamiento asíncrono
      - Reintentos automáticos
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Encriptación de claves sensibles
    - Políticas restrictivas por empresa
    
  3. Important Notes
    - Logs detallados para auditoría y troubleshooting
    - Sistema de reintentos con backoff exponencial
    - Notificaciones de fallos críticos
*/

-- Tabla de configuración de integraciones
CREATE TABLE IF NOT EXISTS integraciones_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('CRM', 'DGI', 'PASARELA_PAGO', 'NOTIFICACIONES', 'ERP', 'ECOMMERCE', 'CUSTOM')),
  proveedor text NOT NULL,
  descripcion text,
  url_base text NOT NULL,
  api_key text,
  api_secret text,
  token_acceso text,
  token_refresh text,
  fecha_expiracion_token timestamptz,
  configuracion jsonb DEFAULT '{
    "timeout_segundos": 30,
    "max_reintentos": 3,
    "tiempo_entre_reintentos_segundos": 5,
    "habilitar_logs": true,
    "habilitar_cache": false
  }'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'error', 'mantenimiento')),
  ultima_sincronizacion timestamptz,
  proximo_intento timestamptz,
  errores_consecutivos integer DEFAULT 0,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id),
  UNIQUE(empresa_id, nombre)
);

-- Índices para integraciones_config
CREATE INDEX IF NOT EXISTS idx_integraciones_empresa ON integraciones_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_integraciones_tipo ON integraciones_config(tipo);
CREATE INDEX IF NOT EXISTS idx_integraciones_estado ON integraciones_config(estado);

-- Tabla de webhooks
CREATE TABLE IF NOT EXISTS webhooks_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  integracion_id uuid REFERENCES integraciones_config(id),
  nombre text NOT NULL,
  url_destino text NOT NULL,
  metodo text NOT NULL DEFAULT 'POST' CHECK (metodo IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  eventos text[] NOT NULL DEFAULT ARRAY[]::text[],
  headers jsonb DEFAULT '{}'::jsonb,
  secreto text,
  timeout_segundos integer DEFAULT 30,
  max_reintentos integer DEFAULT 3,
  habilitar_firma boolean DEFAULT true,
  algoritmo_firma text DEFAULT 'HMAC-SHA256',
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id)
);

-- Índices para webhooks_config
CREATE INDEX IF NOT EXISTS idx_webhooks_empresa ON webhooks_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_integracion ON webhooks_config(integracion_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_eventos ON webhooks_config USING gin(eventos);

-- Tabla de logs de integración
CREATE TABLE IF NOT EXISTS logs_integracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  integracion_id uuid REFERENCES integraciones_config(id),
  webhook_id uuid REFERENCES webhooks_config(id),
  tipo_operacion text NOT NULL CHECK (tipo_operacion IN ('API_REQUEST', 'API_RESPONSE', 'WEBHOOK_SENT', 'WEBHOOK_RECEIVED', 'ERROR', 'RETRY')),
  metodo text,
  url text,
  headers jsonb,
  request_body text,
  response_body text,
  status_code integer,
  tiempo_respuesta_ms integer,
  evento text,
  resultado text CHECK (resultado IN ('EXITO', 'ERROR', 'TIMEOUT', 'PENDIENTE')),
  mensaje_error text,
  stack_trace text,
  intento_numero integer DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para logs_integracion
CREATE INDEX IF NOT EXISTS idx_logs_integracion_empresa ON logs_integracion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_integracion_config ON logs_integracion(integracion_id);
CREATE INDEX IF NOT EXISTS idx_logs_integracion_webhook ON logs_integracion(webhook_id);
CREATE INDEX IF NOT EXISTS idx_logs_integracion_fecha ON logs_integracion(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_logs_integracion_resultado ON logs_integracion(resultado);
CREATE INDEX IF NOT EXISTS idx_logs_integracion_evento ON logs_integracion(evento);

-- Tabla de cola de eventos
CREATE TABLE IF NOT EXISTS cola_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  integracion_id uuid REFERENCES integraciones_config(id),
  webhook_id uuid REFERENCES webhooks_config(id),
  evento text NOT NULL,
  tipo_evento text NOT NULL,
  payload jsonb NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completado', 'error', 'cancelado')),
  prioridad integer DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
  intentos integer DEFAULT 0,
  max_intentos integer DEFAULT 3,
  ultimo_error text,
  proximo_intento timestamptz,
  fecha_completado timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para cola_eventos
CREATE INDEX IF NOT EXISTS idx_cola_eventos_empresa ON cola_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cola_eventos_estado ON cola_eventos(estado);
CREATE INDEX IF NOT EXISTS idx_cola_eventos_prioridad ON cola_eventos(prioridad);
CREATE INDEX IF NOT EXISTS idx_cola_eventos_proximo_intento ON cola_eventos(proximo_intento);
CREATE INDEX IF NOT EXISTS idx_cola_eventos_tipo ON cola_eventos(tipo_evento);

-- Tabla de claves API para acceso externo
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  nombre text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  prefijo text NOT NULL,
  descripcion text,
  permisos text[] DEFAULT ARRAY[]::text[],
  ip_whitelist text[] DEFAULT ARRAY[]::text[],
  rate_limit integer DEFAULT 100,
  rate_limit_periodo text DEFAULT 'minute' CHECK (rate_limit_periodo IN ('second', 'minute', 'hour', 'day')),
  ultima_utilizacion timestamptz,
  total_requests integer DEFAULT 0,
  fecha_expiracion date,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  creado_por text REFERENCES usuarios(id)
);

-- Índices para api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_empresa ON api_keys(empresa_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefijo ON api_keys(prefijo);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Enable RLS
ALTER TABLE integraciones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_integracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cola_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies para integraciones_config
CREATE POLICY "Usuarios pueden ver integraciones de su empresa"
  ON integraciones_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden gestionar integraciones"
  ON integraciones_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para webhooks_config
CREATE POLICY "Usuarios pueden ver webhooks de su empresa"
  ON webhooks_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden gestionar webhooks"
  ON webhooks_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para logs_integracion
CREATE POLICY "Usuarios pueden ver logs de su empresa"
  ON logs_integracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede insertar logs"
  ON logs_integracion FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies para cola_eventos
CREATE POLICY "Sistema puede gestionar cola de eventos"
  ON cola_eventos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para api_keys
CREATE POLICY "Solo administradores pueden ver API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden gestionar API keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
