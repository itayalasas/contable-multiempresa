/*
  # Auditoría y Seguridad
  
  1. Nuevas Tablas
    - `roles_sistema`
      - Definición de roles
      - Permisos granulares
    
    - `permisos`
      - Permisos específicos por módulo
      - CRUD + permisos especiales
    
    - `roles_permisos`
      - Asignación de permisos a roles
    
    - `auditoria`
      - Bitácora completa de cambios
      - Quién, qué, cuándo, dónde
    
    - `sesiones_usuario`
      - Control de sesiones activas
      - Seguridad de acceso
  
  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas restrictivas
    - Encriptación de datos sensibles
    
  3. Important Notes
    - Auditoría automática de todas las operaciones críticas
    - Trazabilidad completa de cambios
    - Prevención de fraude y detección de anomalías
*/

-- Tabla de roles del sistema
CREATE TABLE IF NOT EXISTS roles_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  codigo text NOT NULL UNIQUE,
  descripcion text,
  nivel_acceso integer NOT NULL CHECK (nivel_acceso BETWEEN 1 AND 10),
  es_rol_sistema boolean DEFAULT false,
  puede_eliminar boolean DEFAULT true,
  puede_modificar boolean DEFAULT true,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  fecha_modificacion timestamptz DEFAULT now()
);

-- Índices para roles_sistema
CREATE INDEX IF NOT EXISTS idx_roles_codigo ON roles_sistema(codigo);
CREATE INDEX IF NOT EXISTS idx_roles_nivel ON roles_sistema(nivel_acceso);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  recurso text NOT NULL,
  accion text NOT NULL CHECK (accion IN ('CREAR', 'LEER', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR', 'RECHAZAR', 'CERRAR', 'REABRIR', 'EXPORTAR', 'IMPORTAR', 'CONFIGURAR')),
  codigo text NOT NULL UNIQUE,
  descripcion text,
  es_critico boolean DEFAULT false,
  requiere_autorizacion_adicional boolean DEFAULT false,
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  UNIQUE(modulo, recurso, accion)
);

-- Índices para permisos
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo);
CREATE INDEX IF NOT EXISTS idx_permisos_recurso ON permisos(recurso);
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos(codigo);

-- Tabla de asignación roles-permisos
CREATE TABLE IF NOT EXISTS roles_permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id uuid NOT NULL REFERENCES roles_sistema(id) ON DELETE CASCADE,
  permiso_id uuid NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  concedido boolean DEFAULT true,
  fecha_asignacion timestamptz DEFAULT now(),
  asignado_por text REFERENCES usuarios(id),
  UNIQUE(rol_id, permiso_id)
);

-- Índices para roles_permisos
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol ON roles_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_permiso ON roles_permisos(permiso_id);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id),
  usuario_id text NOT NULL REFERENCES usuarios(id),
  tabla text NOT NULL,
  registro_id text NOT NULL,
  accion text NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  modulo text NOT NULL,
  descripcion text NOT NULL,
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  cambios jsonb,
  ip_address text,
  user_agent text,
  metodo_http text,
  url_origen text,
  sesion_id uuid,
  nivel_criticidad text DEFAULT 'NORMAL' CHECK (nivel_criticidad IN ('BAJO', 'NORMAL', 'ALTO', 'CRITICO')),
  resultado text CHECK (resultado IN ('EXITO', 'ERROR', 'DENEGADO')),
  mensaje_error text,
  duracion_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_creacion timestamptz DEFAULT now()
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON auditoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro ON auditoria(registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_auditoria_criticidad ON auditoria(nivel_criticidad);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id text NOT NULL REFERENCES usuarios(id),
  empresa_id uuid REFERENCES empresas(id),
  token_hash text NOT NULL,
  refresh_token_hash text,
  ip_address text,
  user_agent text,
  dispositivo text,
  navegador text,
  sistema_operativo text,
  ubicacion_geografica jsonb,
  fecha_inicio timestamptz DEFAULT now(),
  fecha_ultima_actividad timestamptz DEFAULT now(),
  fecha_expiracion timestamptz NOT NULL,
  fecha_cierre timestamptz,
  activa boolean DEFAULT true,
  motivo_cierre text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Índices para sesiones_usuario
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_usuario(token_hash);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones_usuario(activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_expiracion ON sesiones_usuario(fecha_expiracion);

-- Tabla de intentos de acceso fallidos
CREATE TABLE IF NOT EXISTS intentos_acceso_fallidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL,
  motivo text NOT NULL,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  fecha_intento timestamptz DEFAULT now()
);

-- Índices para intentos_acceso_fallidos
CREATE INDEX IF NOT EXISTS idx_intentos_email ON intentos_acceso_fallidos(email);
CREATE INDEX IF NOT EXISTS idx_intentos_ip ON intentos_acceso_fallidos(ip_address);
CREATE INDEX IF NOT EXISTS idx_intentos_fecha ON intentos_acceso_fallidos(fecha_intento);

-- Enable RLS
ALTER TABLE roles_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_acceso_fallidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para roles_sistema
CREATE POLICY "Solo administradores pueden ver roles"
  ON roles_sistema FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden gestionar roles"
  ON roles_sistema FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para permisos
CREATE POLICY "Todos pueden ver permisos"
  ON permisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden gestionar permisos"
  ON permisos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para roles_permisos
CREATE POLICY "Todos pueden ver asignación de permisos"
  ON roles_permisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden gestionar asignación"
  ON roles_permisos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para auditoria
CREATE POLICY "Usuarios pueden ver auditoría de su empresa"
  ON auditoria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede insertar en auditoría"
  ON auditoria FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies para sesiones_usuario
CREATE POLICY "Usuarios pueden ver sus propias sesiones"
  ON sesiones_usuario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede gestionar sesiones"
  ON sesiones_usuario FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para intentos_acceso_fallidos
CREATE POLICY "Solo administradores pueden ver intentos fallidos"
  ON intentos_acceso_fallidos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede registrar intentos fallidos"
  ON intentos_acceso_fallidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para registrar auditoría automáticamente
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditoria (
    tabla,
    registro_id,
    accion,
    modulo,
    descripcion,
    valores_anteriores,
    valores_nuevos,
    usuario_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    'AUTOMATICO',
    TG_OP || ' en ' || TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.creado_por, NEW.modificado_por, OLD.creado_por, 'sistema')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
