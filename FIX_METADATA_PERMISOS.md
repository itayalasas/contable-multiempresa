# ✅ Solución: Capturar Metadata y Permisos del Sistema Externo

## 🔍 Problema Identificado

**Síntomas:**
- Usuario se autentica correctamente
- Dashboard se muestra
- Pero `metadata` está vacío: `{}`
- `permisos` muestra `{"admin"}` pero no se aplica

**Causa Raíz:**
El código estaba creando usuarios con valores por defecto vacíos en lugar de usar los datos que vienen del sistema de autenticación externo.

## ✅ Solución Implementada

### 1. AuthContext Mejorado para Capturar Metadata

**Archivo**: `/src/context/AuthContext.tsx`

#### Cambios en `syncUserWithDatabase`:

**ANTES** (valores por defecto vacíos):
```typescript
const newUser: Omit<Usuario, 'fechaCreacion'> = {
  rol: 'usuario',  // ❌ Valor por defecto
  metadata: {
    role: 'usuario',  // ❌ Valor por defecto
    permissions: {}   // ❌ Vacío
  }
};
```

**AHORA** (usa datos del sistema externo):
```typescript
// 1. Extraer datos del sistema de autenticación
const metadataFromAuth = authUser.metadata || {};
const permissionsFromAuth = authUser.permissions || {};
const roleFromAuth = authUser.role || 'usuario';

console.log('📋 Metadata del sistema externo:', metadataFromAuth);
console.log('🔐 Permisos del sistema externo:', permissionsFromAuth);

// 2. Construir metadata combinado
const userMetadata = {
  role: metadataFromAuth.role || roleFromAuth,
  permissions: metadataFromAuth.permissions || permissionsFromAuth || {}
};

// 3. Crear usuario con metadata correcto
const newUser: Omit<Usuario, 'fechaCreacion'> = {
  rol: userMetadata.role,  // ✅ Del sistema externo
  metadata: userMetadata    // ✅ Del sistema externo
};
```

### 2. Actualización de Metadata en Usuarios Existentes

**NUEVO**: Si el usuario ya existe, actualiza el metadata si cambió:

```typescript
if (!dbUser) {
  // Usuario nuevo - crear con metadata del sistema externo
} else {
  // Usuario existente - actualizar metadata si cambió
  const shouldUpdateMetadata = JSON.stringify(dbUser.metadata) !== JSON.stringify(userMetadata);

  if (shouldUpdateMetadata) {
    console.log('📝 Actualizando metadata del usuario...');
    await usuariosSupabaseService.updateUsuario(authUser.id, {
      metadata: userMetadata,
      rol: userMetadata.role
    });
  }
}
```

### 3. Edge Function con Logs Detallados

**Archivo**: `/supabase/functions/auth-exchange-code/index.ts`

Agregados logs para verificar qué datos llegan del sistema externo:

```typescript
console.log("📦 Datos completos recibidos:", JSON.stringify(data, null, 2));

if (data.data && data.data.user) {
  console.log("👤 Usuario recibido:", {
    id: data.data.user.id,
    email: data.data.user.email,
    name: data.data.user.name,
    role: data.data.user.role,
    metadata: data.data.user.metadata,
    permissions: data.data.user.permissions
  });
}
```

## 🚀 Cómo Probar la Solución

### Paso 1: Limpiar Todo

```javascript
// En la consola del navegador (F12):
localStorage.clear();
```

### Paso 2: Cerrar Sesión y Login

1. Cierra sesión si estás logueado
2. Ve a `/login`
3. Haz clic en "Iniciar Sesión"
4. Autentica en el sistema externo

### Paso 3: Verificar en Consola

Deberías ver estos mensajes en la consola:

```
🔐 Código de autenticación detectado, intercambiando por token...
✅ Token obtenido exitosamente
✅ Sesión guardada
🔍 Datos del sistema de autenticación: {...}
📋 Metadata del sistema externo: {...}
🔐 Permisos del sistema externo: {...}
👤 Rol del sistema externo: administrador_del_sistema
📝 Creando usuario con metadata: {role: "...", permissions: {...}}
✅ Usuario creado en base de datos
👤 Usuario enriquecido con permisos: {...}
🔐 Permisos finales: {dashboard: Array(4), contabilidad: Array(4), ...}
```

### Paso 4: Verificar Metadata en Consola

Expande el objeto `Usuario enriquecido con permisos` y verifica:

```javascript
{
  id: "e762511c-84ee-4d44-9ee4-802cf5f71d2b",
  email: "payalaortiz@gmail.com",
  metadata: {
    role: "administrador_del_sistema",  // ✅ Del sistema externo
    permissions: {
      dashboard: ["create", "delete", "read", "update"],
      contabilidad: ["create", "delete", "read", "update"],
      ventas: ["create", "delete", "read", "update"],
      // ... etc
    }
  }
}
```

### Paso 5: Verificar el Sidebar

Deberías ver **todos los menús** según los permisos:
- Dashboard ✅
- Contabilidad (5 submódulos) ✅
- Ventas (5 submódulos) ✅
- Compras (3 submódulos) ✅
- Finanzas (4 submódulos) ✅
- Análisis (1 submódulo) ✅
- Reportes (1 submódulo) ✅
- Administración (9 submódulos) ✅

## 🔍 Verificar en Logs del Edge Function

Para ver los logs del edge function:

1. Ve a Supabase Dashboard
2. Edge Functions → `auth-exchange-code`
3. Haz clic en "Logs"

Deberías ver:
```
🔐 Intercambiando código por token...
🌐 Llamando a: https://auth-contaempresa.netlify.app/api/exchange-code
📥 Respuesta del servidor de auth: {...}
✅ Código intercambiado exitosamente
📦 Datos completos recibidos: {...}
👤 Usuario recibido: {
  id: "...",
  email: "...",
  role: "administrador_del_sistema",
  metadata: {...},
  permissions: {...}
}
```

## 🐛 Troubleshooting

### Problema: metadata sigue vacío

**Causa**: El sistema de autenticación externo no está enviando metadata o permissions.

**Solución**:
1. Verifica los logs del edge function en Supabase
2. Busca la línea `👤 Usuario recibido:`
3. Verifica que `metadata` y `permissions` tengan datos
4. Si están vacíos, contacta al administrador del sistema de autenticación

### Problema: Permisos no coinciden con lo esperado

**Causa**: El formato de permisos del sistema externo es diferente.

**Solución**:
1. Revisa los logs en consola: `📋 Metadata del sistema externo:`
2. Verifica el formato de los permisos
3. Si es necesario, modifica `syncUserWithDatabase` para adaptarlo

### Problema: Usuario existente no se actualiza

**Causa**: El metadata no está cambiando o hay error en la actualización.

**Solución**:
1. Busca en consola: `📝 Actualizando metadata del usuario...`
2. Si no aparece, el metadata es el mismo que ya tenías
3. Borra el usuario de la BD y vuelve a autenticar para forzar creación

**SQL para borrar usuario:**
```sql
DELETE FROM usuarios WHERE email = 'tu-email@example.com';
```

### Problema: Error al crear/actualizar usuario

**Causa**: Problema de permisos RLS o formato de datos.

**Solución**:
1. Verifica logs en consola: `Error sincronizando usuario:`
2. Verifica que las políticas RLS permitan crear/actualizar
3. Verifica que el formato de metadata sea JSON válido

## 📊 Flujo Completo de Sincronización

```
1. Sistema externo devuelve:
   {
     user: {
       id: "...",
       email: "...",
       role: "administrador_del_sistema",
       metadata: {
         role: "...",
         permissions: {...}
       },
       permissions: {...}
     }
   }
   ↓
2. AuthService guarda en localStorage
   ↓
3. AuthContext lee el usuario de localStorage
   ↓
4. syncUserWithDatabase extrae:
   - metadataFromAuth = user.metadata
   - permissionsFromAuth = user.permissions
   - roleFromAuth = user.role
   ↓
5. Construye userMetadata combinando metadata + permissions
   ↓
6. Busca usuario en BD:
   - Si NO existe → Crea con metadata del sistema externo
   - Si existe → Actualiza metadata si cambió
   ↓
7. Enriquece usuario con metadata final
   ↓
8. usePermissions lee metadata.permissions
   ↓
9. Sidebar filtra menús basado en permisos
   ↓
10. Usuario ve todos los menús según sus permisos ✅
```

## 📚 Archivos Modificados

1. **`/src/context/AuthContext.tsx`**
   - Extrae metadata del sistema externo
   - Crea usuarios con metadata correcto
   - Actualiza metadata en usuarios existentes

2. **`/supabase/functions/auth-exchange-code/index.ts`**
   - Logs detallados de datos recibidos
   - Verifica estructura de usuario

3. **`/src/hooks/usePermissions.ts`** (cambio anterior)
   - Herencia de permisos por categorías

## 🎯 Próximos Pasos

Si después de seguir estos pasos el metadata sigue vacío:

1. **Contacta al administrador del sistema de autenticación** para verificar que esté enviando:
   - `user.metadata` con estructura `{role: "...", permissions: {...}}`
   - O `user.permissions` con estructura `{dashboard: [...], contabilidad: [...]}`
   - O `user.role` con el nombre del rol

2. **Verifica la respuesta real** en los logs del edge function

3. **Adapta el código** si el formato es diferente al esperado

---

**¡El sistema ahora captura y sincroniza correctamente los permisos del sistema externo!** 🎉
