# ✅ Solución: Campo metadata No Se Guardaba en BD

## 🔍 Problema Identificado

**Síntomas:**
- Error: `new row for relation "usuarios" violates check constraint "usuarios_rol_check"`
- Metadata vacío `{}` en consola
- Usuario no podía guardarse con rol "admin"

**Causa Raíz:**
El servicio de usuarios NO incluía el campo `metadata` al crear o actualizar usuarios en la base de datos. Esto causaba que:

1. Al crear usuarios nuevos: `metadata` no se guardaba
2. Al actualizar usuarios: `metadata` se ignoraba
3. AuthContext intentaba actualizar pero fallaba silenciosamente

## ✅ Solución Implementada

### 1. Agregar metadata a createUsuario

**Archivo**: `/src/services/supabase/usuarios.ts`

**ANTES:**
```typescript
async createUsuario(usuario: Omit<Usuario, 'fechaCreacion'>): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      // ... otros campos
      configuracion: usuario.configuracion,
      // ❌ metadata NO se incluía
    })
    .select()
    .single();

  return {
    ...data,
    empresasAsignadas: data.empresas_asignadas,
    // ❌ metadata NO se retornaba
  };
}
```

**AHORA:**
```typescript
async createUsuario(usuario: Omit<Usuario, 'fechaCreacion'>): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      // ... otros campos
      configuracion: usuario.configuracion,
      metadata: usuario.metadata || {}, // ✅ metadata incluido
    })
    .select()
    .single();

  return {
    ...data,
    empresasAsignadas: data.empresas_asignadas,
    metadata: data.metadata || {}, // ✅ metadata retornado
  };
}
```

### 2. Agregar metadata a updateUsuario

**ANTES:**
```typescript
async updateUsuario(usuarioId: string, updates: Partial<Usuario>): Promise<void> {
  const updateData: any = {};

  if (updates.nombre) updateData.nombre = updates.nombre;
  if (updates.email) updateData.email = updates.email;
  if (updates.rol) updateData.rol = updates.rol;
  // ... otros campos
  if (updates.configuracion) updateData.configuracion = updates.configuracion;
  // ❌ metadata NO se incluía

  const { error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('id', usuarioId);

  if (error) throw error;
}
```

**AHORA:**
```typescript
async updateUsuario(usuarioId: string, updates: Partial<Usuario>): Promise<void> {
  const updateData: any = {};

  if (updates.nombre) updateData.nombre = updates.nombre;
  if (updates.email) updateData.email = updates.email;
  if (updates.rol) updateData.rol = updates.rol;
  // ... otros campos
  if (updates.configuracion) updateData.configuracion = updates.configuracion;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata; // ✅ metadata incluido

  const { error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('id', usuarioId);

  if (error) throw error;
}
```

## 🚀 Cómo Probar la Solución

### Paso 1: Borrar Usuario Existente

Como el usuario actual tiene datos inconsistentes, bórralo de la BD:

```sql
DELETE FROM usuarios WHERE email = 'tu-email@ejemplo.com';
```

O desde la consola del navegador:

```javascript
localStorage.clear();
```

### Paso 2: Logout y Login

1. Cierra sesión (si puedes)
2. Limpia localStorage en consola (F12): `localStorage.clear()`
3. Recarga la página (F5)
4. Ve a `/login`
5. Haz clic en "Iniciar Sesión"
6. Autentica en el sistema externo

### Paso 3: Verificar en Consola

Deberías ver estos mensajes:

```
🔐 Código de autenticación detectado, intercambiando por token...
✅ Token obtenido exitosamente
✅ Sesión guardada
🔍 Datos del sistema de autenticación: {...}
📋 Metadata del sistema externo: {role: "admin", permissions: {...}}
🔐 Permisos del sistema externo: {...}
👤 Rol del sistema externo: admin
📝 Creando usuario con metadata: {role: "admin", permissions: {...}}
✅ Usuario creado en base de datos
👤 Usuario enriquecido con permisos: {...}
🔐 Permisos finales: {dashboard: [...], contabilidad: [...], ...}
```

**SIN errores de constraint violation** ✅

### Paso 4: Verificar Metadata en Consola

Expande el objeto `Usuario enriquecido con permisos`:

```javascript
{
  id: "e762511c-84ee-4d44-9ee4-802cf5f71d2b",
  email: "payalaortiz@gmail.com",
  rol: "admin", // ✅ Rol correcto
  metadata: {
    role: "admin", // ✅ Ya NO está vacío
    permissions: {
      dashboard: ["create", "delete", "read", "update"],
      contabilidad: ["create", "delete", "read", "update"],
      ventas: ["create", "delete", "read", "update"],
      // ... etc
    }
  }
}
```

### Paso 5: Verificar en Base de Datos

Desde Supabase Dashboard → SQL Editor:

```sql
SELECT id, email, rol, metadata
FROM usuarios
WHERE email = 'tu-email@ejemplo.com';
```

Deberías ver:

```json
{
  "id": "e762511c-...",
  "email": "payalaortiz@gmail.com",
  "rol": "admin",
  "metadata": {
    "role": "admin",
    "permissions": {
      "dashboard": ["create", "delete", "read", "update"],
      "contabilidad": ["create", "delete", "read", "update"],
      // ... etc
    }
  }
}
```

### Paso 6: Verificar el Sidebar

Deberías ver **todos los menús** según tus permisos:
- Dashboard ✅
- Contabilidad (5 submódulos) ✅
- Ventas (5 submódulos) ✅
- Compras (3 submódulos) ✅
- Finanzas (4 submódulos) ✅
- Análisis (1 submódulo) ✅
- Reportes (1 submódulo) ✅
- Administración (9 submódulos) ✅

## 🐛 Troubleshooting

### Error: "usuarios_rol_check" todavía aparece

**Causa**: Usuario existente tiene un rol inválido en BD.

**Solución**:
1. Borra el usuario: `DELETE FROM usuarios WHERE email = 'tu@email.com';`
2. Limpia localStorage: `localStorage.clear()`
3. Vuelve a autenticar

### Metadata sigue vacío

**Causa**: El sistema de autenticación externo no envía metadata o permissions.

**Solución**:
1. Verifica logs del edge function en Supabase
2. Busca: `👤 Usuario recibido:`
3. Verifica que metadata/permissions tengan datos
4. Si están vacíos, contacta al admin del sistema de autenticación

### Error al crear usuario

**Causa**: Permisos RLS o datos inválidos.

**Solución**:
1. Verifica logs de error en consola
2. Verifica políticas RLS en tabla usuarios
3. Asegúrate que el rol esté en la lista permitida

## 📊 Flujo Completo Corregido

```
1. Sistema externo devuelve datos con metadata
   ↓
2. AuthService guarda en localStorage
   ↓
3. AuthContext extrae metadata del usuario
   ↓
4. syncUserWithDatabase construye userMetadata
   ↓
5. Busca usuario en BD:
   - Si NO existe:
     └─→ createUsuario(...) con metadata ✅
         └─→ INSERT incluye metadata ✅
   - Si existe:
     └─→ updateUsuario(...) con metadata ✅
         └─→ UPDATE incluye metadata ✅
   ↓
6. Usuario guardado en BD con metadata completo ✅
   ↓
7. AuthContext enriquece usuario con metadata
   ↓
8. usePermissions lee metadata.permissions
   ↓
9. Sidebar filtra menús ✅
   ↓
10. Usuario ve todos los menús según permisos ✅
```

## 📚 Archivos Modificados

1. **`/src/services/supabase/usuarios.ts`**
   - `createUsuario`: Incluye metadata al insertar
   - `updateUsuario`: Incluye metadata al actualizar
   - Retorna metadata en ambos métodos

2. **`/src/context/AuthContext.tsx`** (cambio anterior)
   - Extrae metadata del sistema externo
   - Crea/actualiza usuarios con metadata

3. **`/src/hooks/usePermissions.ts`** (cambio anterior)
   - Herencia de permisos por categorías

## 🎯 Resumen

El problema era que los métodos `createUsuario` y `updateUsuario` NO incluían el campo `metadata` al interactuar con la BD. Esto causaba que:

- **Crear usuarios**: metadata se perdía → usuarios con metadata vacío
- **Actualizar usuarios**: metadata se ignoraba → usuarios no se actualizaban

**Solución:** Agregar `metadata` a ambos métodos para que se guarde y actualice correctamente.

---

**¡Ahora el metadata se guarda y actualiza correctamente en la BD!** 🎉
