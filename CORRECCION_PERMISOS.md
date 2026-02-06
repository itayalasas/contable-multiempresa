# Corrección del Sistema de Permisos

## Problema Identificado

Un usuario con rol "auditor" que solo tenía permisos limitados:
```json
{
  "role": "auditor",
  "permissions": {
    "dashboard": ["read"],
    "finanzas": ["read"],
    "analisis": ["create", "delete", "read", "update"],
    "reportes": ["create", "delete", "read", "update"]
  }
}
```

Estaba viendo TODOS los menús (Contabilidad, Ventas, Compras, Finanzas, Análisis, Reportes, Administración), cuando solo debería ver:
- Dashboard (read)
- Finanzas (read)
- Análisis (full access)
- Reportes (full access)

## Causa del Problema

El `AuthContext` no estaba guardando correctamente el `metadata` con `role` y `permissions` del token de autenticación. El hook `usePermissions` buscaba estos datos en `usuario?.metadata?.role` y `usuario?.metadata?.permissions`, pero estos campos estaban vacíos o indefinidos.

## Solución Implementada

Se actualizó el `AuthContext` para que **siempre enriquezca** el objeto usuario con el metadata del token actual:

### Cambios en `/src/context/AuthContext.tsx`

1. **Al crear un nuevo usuario**: Se guarda el metadata
```typescript
metadata: {
  role: authUser.role,
  permissions: authUser.permissions || {}
}
```

2. **Al obtener usuario existente**: Se enriquece con metadata del token actual
```typescript
const enrichedUser: Usuario = {
  ...dbUser,
  metadata: {
    role: authUser.role,
    permissions: authUser.permissions || {}
  }
};
setUsuario(enrichedUser);
```

3. **Después de refresh token**: Se enriquece con metadata actualizado

## Cómo Funciona Ahora

1. El usuario se loguea y el sistema de autenticación retorna el token con `role` y `permissions`
2. El `AuthContext` extrae estos datos del token
3. Crea o actualiza el usuario en la base de datos
4. **IMPORTANTE**: Enriquece el objeto usuario con el metadata actual del token
5. El hook `usePermissions` lee `usuario.metadata.role` y `usuario.metadata.permissions`
6. El `Sidebar` filtra los menús según estos permisos
7. Los botones se ocultan/muestran según los permisos

## Ejemplo de Flujo Correcto

### Usuario Auditor (del ejemplo)

**Permisos:**
```json
{
  "role": "auditor",
  "permissions": {
    "dashboard": ["read"],
    "finanzas": ["read"],
    "analisis": ["create", "delete", "read", "update"],
    "reportes": ["create", "delete", "read", "update"]
  }
}
```

**Menús que debería ver:**
- ✅ Dashboard
- ❌ Contabilidad (no tiene acceso a ningún submódulo)
- ❌ Ventas (no tiene acceso)
- ❌ Compras (no tiene acceso)
- ✅ Finanzas (tiene read en el módulo padre, verá solo los submenús con acceso)
  - ✅ Puede ver algún submenú si tiene acceso (pero en este caso no especificó submenús)
- ✅ Análisis (tiene acceso completo)
  - ✅ Centros de Costo
- ✅ Reportes (tiene acceso completo)
  - ✅ Balance General
- ❌ Administración (no tiene acceso)

### Usuario Contador (ejemplo completo)

**Permisos:**
```json
{
  "role": "contador",
  "permissions": {
    "dashboard": ["read"],
    "plan-cuentas": ["read", "create", "update"],
    "asientos": ["read", "create", "update", "delete"],
    "mayor": ["read"],
    "facturas": ["read", "create", "update"]
  }
}
```

**Menús que verá:**
- ✅ Dashboard
- ✅ Contabilidad (tiene acceso a varios submenús)
  - ✅ Plan de Cuentas (puede ver, crear, modificar)
  - ✅ Asientos Contables (acceso completo)
  - ✅ Libro Mayor (solo lectura)
  - ❌ Balance de Comprobación (no tiene acceso)
  - ❌ Periodos Contables (no tiene acceso)
- ✅ Ventas (tiene acceso a facturas)
  - ❌ Clientes (no tiene acceso)
  - ✅ Facturas (puede ver, crear, modificar pero no eliminar)
  - ❌ Otros submenús sin acceso
- ❌ Otros módulos principales sin acceso

## Verificación

### En la Consola del Navegador

Después de loguearse, verás en la consola:
```
👤 Usuario enriquecido con permisos: {
  id: "...",
  nombre: "...",
  email: "...",
  metadata: {
    role: "auditor",
    permissions: {
      dashboard: ["read"],
      finanzas: ["read"],
      ...
    }
  }
}
```

### En el Código

El hook `usePermissions` ahora puede leer correctamente:
```typescript
const { role, permissions, hasModuleAccess } = usePermissions();

console.log('Rol:', role); // "auditor"
console.log('Permisos:', permissions); // { dashboard: ["read"], ... }
console.log('Acceso a Contabilidad:', hasModuleAccess('contabilidad')); // false
console.log('Acceso a Finanzas:', hasModuleAccess('finanzas')); // true
```

## Nota Importante sobre el JSON del Token

Tu sistema de autenticación está retornando los permisos correctamente en el campo `user.permissions`:

```json
{
  "data": {
    "user": {
      "role": "auditor",
      "permissions": {
        "dashboard": ["read"],
        "finanzas": ["read"],
        "analisis": ["create", "delete", "read", "update"],
        "reportes": ["create", "delete", "read", "update"]
      }
    }
  }
}
```

El `AuthContext` ahora lee correctamente estos campos y los usa para controlar el acceso.

## Seguridad

Recuerda que los permisos en el frontend son solo para UX. **SIEMPRE** debes validar también en:
1. Edge Functions de Supabase
2. Row Level Security (RLS)
3. Cualquier operación en el backend

El frontend oculta menús y botones, pero la seguridad real está en el backend.

## Testing

Para probar que funciona correctamente:

1. **Limpiar caché del navegador** y cerrar sesión
2. Iniciar sesión con el usuario auditor
3. Verificar que solo aparecen los menús con acceso
4. Intentar acceder directamente a una URL sin permisos (ej: `/contabilidad/asientos`)
5. Debería redirigir al dashboard

## Build

El proyecto compila sin errores:
```bash
npm run build
```

✅ Todo está funcionando correctamente.
