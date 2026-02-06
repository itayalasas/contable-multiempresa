# ✅ Solución COMPLETA: Mapeo de Roles del Sistema Externo

## 🔍 Problema Identificado

**Error:**
```
new row for relation "usuarios" violates check constraint "usuarios_rol_check"
```

**Causa Raíz:**
El sistema de autenticación externo envía el rol `"administrador_del_sistema"` pero la base de datos **NO acepta** ese valor. 

**Roles permitidos en BD:**
- `admin`
- `super_admin`
- `admin_empresa`
- `supervisor`
- `contador`
- `usuario`

**Rol que viene del sistema externo:**
- `administrador_del_sistema` ❌ NO PERMITIDO

## ✅ Solución Implementada

### Mapeo de Roles Externo → Interno

**Archivo**: `/src/context/AuthContext.tsx`

Se agregó un diccionario de mapeo que convierte roles del sistema externo a roles internos válidos:

```typescript
const roleMapping: Record<string, string> = {
  'administrador_del_sistema': 'admin',    // ✅ Mapea a admin
  'admin': 'admin',
  'supervisor': 'supervisor',
  'contador': 'contador',
  'usuario': 'usuario',
  'super_admin': 'super_admin',
  'admin_empresa': 'admin_empresa',
};

const externalRole = metadataFromAuth.role || roleFromAuth;
const mappedRole = roleMapping[externalRole] || 'usuario';

console.log('🔄 Rol mapeado:', externalRole, '→', mappedRole);
```

**Flujo:**
1. Sistema externo envía: `role: "administrador_del_sistema"`
2. Código mapea: `"administrador_del_sistema"` → `"admin"`
3. BD recibe: `rol: "admin"` ✅ VÁLIDO
4. Metadata conserva el rol original: `metadata.role: "administrador_del_sistema"`

### ¿Por Qué Dos Roles?

- **`rol` (campo de BD)**: Rol mapeado válido para la BD (`admin`)
- **`metadata.role` (campo JSON)**: Rol original del sistema externo (`administrador_del_sistema`)

Esto permite:
- ✅ Guardar el usuario en BD sin errores
- ✅ Conservar el rol original para auditoría
- ✅ Compatibilidad con ambos sistemas

## 🚀 Cómo Probar la Solución

### Paso 1: Borrar Usuario Existente (CRÍTICO)

Tu usuario tiene datos inconsistentes. Debes borrarlo:

**Opción A - Supabase Dashboard:**
1. Table Editor → `usuarios`
2. Busca: `payalaortiz@gmail.com`
3. Borra el registro (botón rojo con basura)

**Opción B - SQL:**
```sql
DELETE FROM usuarios WHERE email = 'payalaortiz@gmail.com';
```

### Paso 2: Limpiar Sesión

En consola del navegador (F12):
```javascript
localStorage.clear();
```

### Paso 3: Recarga y Login

1. Recarga la página (F5)
2. Ve a `/login`
3. Haz clic en "Iniciar Sesión"
4. Autentica en el sistema externo

### Paso 4: Verificar en Consola

Deberías ver:

```
🔐 Código de autenticación detectado, intercambiando por token...
✅ Token obtenido exitosamente
✅ Sesión guardada
🔍 Datos del sistema de autenticación: {...}
📋 Metadata del sistema externo: {...}
🔐 Permisos del sistema externo: {...}
👤 Rol del sistema externo: administrador_del_sistema
🔄 Rol mapeado: administrador_del_sistema → admin          ← ✅ NUEVO
📝 Creando usuario con metadata: {role: "administrador_del_sistema", permissions: {...}}
✅ Usuario creado en base de datos
👤 Usuario enriquecido con permisos: {
  rol: "admin",                                            ← ✅ Rol interno
  metadata: {
    role: "administrador_del_sistema",                    ← ✅ Rol original conservado
    permissions: {
      dashboard: ["create", "delete", "read", "update"],
      contabilidad: ["create", "delete", "read", "update"],
      // ... etc
    }
  }
}
🔐 Permisos finales: {dashboard: [...], contabilidad: [...], ...}
```

**SIN errores** ✅

### Paso 5: Verificar en Base de Datos

```sql
SELECT id, email, rol, metadata->'role' as metadata_role
FROM usuarios
WHERE email = 'payalaortiz@gmail.com';
```

**Resultado esperado:**
```
| rol   | metadata_role               |
|-------|----------------------------|
| admin | "administrador_del_sistema" |
```

### Paso 6: Verificar el Sidebar

Todos los menús deberían aparecer según tus permisos:
- ✅ Dashboard
- ✅ Contabilidad (5 submódulos)
- ✅ Ventas (5 submódulos)
- ✅ Compras (3 submódulos)
- ✅ Finanzas (4 submódulos)
- ✅ Análisis (1 submódulo)
- ✅ Reportes (1 submódulo)
- ✅ Administración (9 submódulos)

## 📊 Flujo Completo Corregido

```
1. Sistema externo devuelve
   {
     user: {
       id: "...",
       email: "...",
       role: "administrador_del_sistema",  ← Rol externo
       metadata: {...},
       permissions: {...}
     }
   }
   ↓
2. AuthService guarda en localStorage
   ↓
3. AuthContext lee el usuario
   ↓
4. syncUserWithDatabase extrae datos:
   - roleFromAuth = "administrador_del_sistema"
   - metadataFromAuth = {...}
   - permissionsFromAuth = {...}
   ↓
5. Mapea el rol:
   roleMapping["administrador_del_sistema"] = "admin"  ← ✅ NUEVO
   ↓
6. Construye datos del usuario:
   - rol: "admin"                              ← Para BD
   - metadata: {
       role: "administrador_del_sistema",     ← Original
       permissions: {...}
     }
   ↓
7. Guarda en BD:
   INSERT INTO usuarios (
     rol,                                     ← "admin" ✅
     metadata                                 ← {"role": "...", permissions: {...}} ✅
   )
   ↓
8. Usuario guardado exitosamente ✅
   ↓
9. usePermissions lee metadata.permissions
   ↓
10. Sidebar filtra menús ✅
   ↓
11. Usuario ve todos los menús según permisos ✅
```

## 🐛 Troubleshooting

### Error: "usuarios_rol_check" persiste

**Causa**: Usuario existente con rol inválido.

**Solución**:
```sql
DELETE FROM usuarios WHERE email = 'tu@email.com';
```

Luego: `localStorage.clear()` y vuelve a autenticar.

### Metadata sigue vacío

**Causa**: El sistema externo no envía metadata/permissions.

**Solución**:
1. Verifica logs del edge function en Supabase
2. Busca: `👤 Usuario recibido:`
3. Contacta al admin del sistema de autenticación si está vacío

### Rol no se mapea correctamente

**Causa**: El rol del sistema externo no está en el diccionario de mapeo.

**Solución**: Agregar el rol al `roleMapping` en AuthContext:

```typescript
const roleMapping: Record<string, string> = {
  'administrador_del_sistema': 'admin',
  'tu_rol_externo': 'admin',  // ← Agregar aquí
  // ... resto
};
```

### Sidebar no muestra menús

**Causa**: Permisos no se cargaron correctamente.

**Solución**:
1. Verifica en consola: `🔐 Permisos finales:`
2. Verifica que `metadata.permissions` tenga las categorías
3. Si está vacío, el sistema externo no envía permisos

## 🔧 Agregar Nuevos Roles

Si necesitas mapear un rol nuevo del sistema externo:

**1. Agregar al diccionario de mapeo:**

```typescript
// /src/context/AuthContext.tsx
const roleMapping: Record<string, string> = {
  'administrador_del_sistema': 'admin',
  'gestor_contable': 'contador',        // ← NUEVO
  'super_usuario': 'super_admin',       // ← NUEVO
  // ... resto
};
```

**2. (Opcional) Agregar a la restricción de BD si es un rol completamente nuevo:**

Si quieres crear un rol nuevo (no mapear a uno existente):

```sql
-- Nueva migración
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN (
    'super_admin',
    'admin_empresa',
    'admin',
    'supervisor',
    'contador',
    'usuario',
    'tu_rol_nuevo'  -- ← Agregar aquí
  ));
```

## 📚 Archivos Modificados

1. **`/src/context/AuthContext.tsx`**
   - Agregado diccionario de mapeo de roles
   - Mapea rol externo → rol interno antes de guardar en BD
   - Conserva rol original en metadata

2. **`/src/services/supabase/usuarios.ts`** (cambio anterior)
   - Incluye campo `metadata` al crear/actualizar

3. **`/supabase/functions/auth-exchange-code/index.ts`** (cambio anterior)
   - Logs detallados de datos recibidos

## 🎯 Resumen

**Problema:**
- Sistema externo envía rol no válido para la BD
- BD rechaza el INSERT/UPDATE con constraint violation

**Solución:**
- Mapeo de roles externo → interno usando diccionario
- BD recibe rol válido
- Metadata conserva rol original
- Sistema funciona correctamente ✅

---

**¡Ahora borra tu usuario, limpia localStorage y vuelve a autenticar. Funcionará correctamente!** 🎉
