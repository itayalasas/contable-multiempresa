# Fix: Error de Autenticación y Carga de Permisos

## ✅ Problema Identificado

### Error en el Log
```
POST https://sfqtmnncgiqkveaoqckt.supabase.co/functions/v1/auth-exchange-code 401 (Unauthorized)
❌ Error al intercambiar código: Error: Error al intercambiar el código de autenticación
```

### Causa del Problema

1. **Edge Function no existe**: El endpoint `/functions/v1/auth-exchange-code` no existe en Supabase
2. **Usuario sin permisos**: El usuario en la BD no tiene el campo `metadata` con `permissions` configurado

### Usuario Actual (Sin Permisos)
```javascript
{
  id: 'e762511c-84ee-4d44-9ee4-802cf5f71d2b',
  nombre: 'Pedro Ayala Ortiz',
  email: 'payalaortiz@gmail.com',
  rol: 'admin_empresa',
  empresas_asignadas: [],
  metadata: {}  // ← VACÍO!
}
```

## 🔧 Solución Implementada

### Cambios en el Código

#### 1. AuthContext Simplificado (`/src/context/AuthContext.tsx`)

**Eliminado**:
- ❌ Intercambio de código con Edge Function que no existe
- ❌ Dependencia de `authUser.role` y `authUser.permissions` del token

**Nuevo Flujo**:
1. Usuario se autentica con Auth0 (ya funciona)
2. Auth0 guarda el usuario en localStorage
3. AuthContext carga el usuario de la BD de Supabase
4. **Lee el `metadata` directamente de la BD** (no del token)
5. Enriquece el usuario con esos datos

```typescript
// Ahora usa metadata de la BD
const enrichedUser: Usuario = {
  ...dbUser,
  metadata: dbUser.metadata || {
    role: dbUser.rol || 'usuario',
    permissions: {}
  }
};
```

### 2. Script SQL para Configurar Permisos

**Ubicación**: `/scripts/actualizar_permisos_usuario.sql`

Este script actualiza el campo `metadata` del usuario con todos los permisos necesarios.

## 🚀 Cómo Aplicar la Solución

### Paso 1: Ejecutar el Script SQL

**Opción A: Usar Supabase Dashboard**

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a "SQL Editor"
3. Copia y pega el contenido de `/scripts/actualizar_permisos_usuario.sql`
4. Ejecuta el script

**Opción B: Usar CLI (si tienes instalado)**

```bash
# Desde el directorio del proyecto
supabase db reset --local
# O ejecutar el script específico
```

**Opción C: Actualización manual en el código**

Si no tienes acceso al SQL, puedes modificar temporalmente el código para actualizar el usuario:

```typescript
// En src/context/AuthContext.tsx, en syncUserWithDatabase
// Agregar TEMPORALMENTE después de línea 109:

if (dbUser && dbUser.email === 'payalaortiz@gmail.com') {
  console.log('🔧 Actualizando permisos del administrador...');

  await usuariosSupabaseService.updateUsuario(dbUser.id, {
    metadata: {
      role: 'administrador_del_sistema',
      permissions: {
        'dashboard': ['create', 'delete', 'read', 'update'],
        'plan-cuentas': ['create', 'delete', 'read', 'update'],
        'asientos': ['create', 'delete', 'read', 'update'],
        // ... todos los demás módulos
      }
    }
  });

  // Recargar usuario
  dbUser = await usuariosSupabaseService.getUsuarioById(authUser.id);
}
```

### Paso 2: Limpiar Caché del Navegador

1. Abre DevTools (F12)
2. Ve a "Application" → "Storage" → "Clear site data"
3. Cierra sesión
4. Vuelve a iniciar sesión

### Paso 3: Verificar en la Consola

Deberías ver:

```
👤 Usuario enriquecido con permisos: {
  id: 'e762511c-84ee-4d44-9ee4-802cf5f71d2b',
  nombre: 'Pedro Ayala Ortiz',
  email: 'payalaortiz@gmail.com',
  rol: 'admin_empresa',
  empresas_asignadas: [],
  metadata: {
    role: 'administrador_del_sistema',
    permissions: {
      dashboard: ['create', 'delete', 'read', 'update'],
      'plan-cuentas': ['create', 'delete', 'read', 'update'],
      asientos: ['create', 'delete', 'read', 'update'],
      ...
    }
  }
}

🔍 Filtrando menús basado en permisos
📄 Dashboard (dashboard): ✅ MOSTRAR
📁 Contabilidad: ✅ MOSTRAR
...
🎯 Menús filtrados: ["Dashboard", "Contabilidad", "Ventas", ...]
```

### Paso 4: Verificar el Sidebar

Ahora deberías ver TODOS los menús porque el usuario tiene todos los permisos.

## 📋 Estructura del Metadata en la BD

La tabla `usuarios` tiene un campo `metadata` de tipo `jsonb` con esta estructura:

```json
{
  "role": "administrador_del_sistema",
  "permissions": {
    "dashboard": ["create", "delete", "read", "update"],
    "plan-cuentas": ["create", "delete", "read", "update"],
    "asientos": ["create", "delete", "read", "update"],
    "mayor": ["create", "delete", "read", "update"],
    "balance-comprobacion": ["create", "delete", "read", "update"],
    "periodos": ["create", "delete", "read", "update"],
    "clientes": ["create", "delete", "read", "update"],
    "facturas": ["create", "delete", "read", "update"],
    "notas-credito": ["create", "delete", "read", "update"],
    "notas-debito": ["create", "delete", "read", "update"],
    "recibos": ["create", "delete", "read", "update"],
    "proveedores": ["create", "delete", "read", "update"],
    "partners": ["create", "delete", "read", "update"],
    "comisiones": ["create", "delete", "read", "update"],
    "cuentas-cobrar": ["create", "delete", "read", "update"],
    "cuentas-pagar": ["create", "delete", "read", "update"],
    "tesoreria": ["create", "delete", "read", "update"],
    "conciliacion": ["create", "delete", "read", "update"],
    "centros-costo": ["create", "delete", "read", "update"],
    "balance-general": ["create", "delete", "read", "update"],
    "empresas": ["create", "delete", "read", "update"],
    "usuarios": ["create", "delete", "read", "update"],
    "autorizaciones": ["create", "delete", "read", "update"],
    "configuracion": ["create", "delete", "read", "update"],
    "configuracion-mapeo": ["create", "delete", "read", "update"],
    "impuestos": ["create", "delete", "read", "update"],
    "integraciones": ["create", "delete", "read", "update"],
    "auditoria": ["create", "delete", "read", "update"],
    "multimoneda": ["create", "delete", "read", "update"]
  }
}
```

## 🎯 Configurar Permisos para Otros Usuarios

Para configurar permisos de otros usuarios, usa el script SQL pero cambia el email:

```sql
UPDATE usuarios
SET metadata = jsonb_build_object(
  'role', 'contador',
  'permissions', jsonb_build_object(
    'dashboard', ARRAY['read']::text[],
    'asientos', ARRAY['create', 'read', 'update']::text[],
    'mayor', ARRAY['read']::text[],
    'balance-comprobacion', ARRAY['read']::text[]
    -- Solo los módulos que necesita
  )
)
WHERE email = 'email_del_usuario@example.com';
```

## ✅ Ventajas de Esta Solución

1. **No depende de Edge Function** - Funciona sin necesidad de crear el endpoint `auth-exchange-code`
2. **Permisos en la BD** - Fácil de administrar y actualizar
3. **Flexible** - Puedes dar permisos personalizados a cada usuario
4. **Seguro** - Los permisos se almacenan en la base de datos, no en el token

## 🚨 Importante

Una vez que actualices los permisos en la BD, debes:

1. **Cerrar sesión**
2. **Limpiar caché del navegador**
3. **Volver a iniciar sesión**

Esto es necesario porque el `AuthContext` carga el usuario de la BD al inicio de sesión.

## 📚 Archivos Modificados

1. `/src/context/AuthContext.tsx` - Simplificado el flujo de autenticación
2. `/scripts/actualizar_permisos_usuario.sql` - Script para configurar permisos

## 🎉 Resultado Esperado

Después de aplicar la solución:

- ✅ No habrá error 401 en la consola
- ✅ El usuario tendrá `metadata` con `permissions`
- ✅ El sidebar mostrará los menús según los permisos
- ✅ Los botones se habilitarán/deshabilitarán según permisos

---

**Todo listo para probar!** 🚀
