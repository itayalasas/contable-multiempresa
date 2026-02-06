# Debug: Problema con Administrador Viendo Solo Dashboard

## ✅ Correcciones Aplicadas

### Problema 1: Roles de Administrador No Reconocidos
**Causa**: El código solo reconocía `"administrador_sistema"` exactamente.
**Solución**: Ahora reconoce múltiples variantes:
- `administrador_sistema`
- `admin`
- `administrador`
- `superadmin`

### Cambios Realizados

#### 1. Hook `usePermissions` (`/src/hooks/usePermissions.ts`)
Agregué una función `isAdmin` que verifica múltiples variantes:

```typescript
const isAdmin = useMemo(() => {
  if (!role) return false;
  const adminRoles = ['administrador_sistema', 'admin', 'administrador', 'superadmin'];
  return adminRoles.includes(role.toLowerCase());
}, [role]);
```

Ahora todas las funciones usan `isAdmin` en lugar de `role === 'administrador_sistema'`.

#### 2. Sidebar (`/src/components/layout/Sidebar.tsx`)
Actualizado para usar `isAdmin`:

```typescript
const { hasModuleAccess, isAdmin } = usePermissions();

const filteredMenuItems = React.useMemo(() => {
  if (isAdmin) {
    return menuItems;  // Administrador ve TODO
  }
  // ... resto del filtrado
}, [isAdmin, hasModuleAccess]);
```

#### 3. Logs de Debug Agregados
Agregué logs detallados en la consola para diagnosticar el problema:
- `🔍 Filtrando menús - isAdmin: true/false`
- `✅ Usuario es admin, mostrando todos los menús`
- `📁 Menú Padre: ✅ MOSTRAR / ❌ OCULTAR`
- `📋 Submenú: true/false`
- `🎯 Menús filtrados: [lista]`

## 🔍 Cómo Verificar

### Paso 1: Limpiar Caché
```
1. DevTools (F12)
2. Application → Storage → Clear site data
3. O Ctrl+Shift+Del → Borrar todo
```

### Paso 2: Iniciar Sesión con Administrador

### Paso 3: Abrir la Consola del Navegador

Busca estos logs:

#### Si el usuario ES administrador:
```
👤 Usuario enriquecido con permisos: {
  metadata: {
    role: "admin",  // o "administrador", "administrador_sistema", etc.
    permissions: { ... }
  }
}

🔍 Filtrando menús - isAdmin: true
✅ Usuario es admin, mostrando todos los menús
```

**Resultado esperado**: Debería ver TODOS los menús.

#### Si el usuario NO es administrador:
```
👤 Usuario enriquecido con permisos: {
  metadata: {
    role: "gerente",
    permissions: {
      "dashboard": ["read"],
      "plan-cuentas": ["read"],
      ...
    }
  }
}

🔍 Filtrando menús - isAdmin: false
📄 Dashboard (dashboard): ✅ MOSTRAR
📁 Contabilidad: ✅ MOSTRAR (3 submenús accesibles)
  📋 Contabilidad → Plan de Cuentas (plan-cuentas): true
  📋 Contabilidad → Asientos Contables (asientos): true
  📋 Contabilidad → Libro Mayor (mayor): true
  ...
🎯 Menús filtrados: ["Dashboard", "Contabilidad", "Ventas", ...]
```

**Resultado esperado**: Debería ver solo los menús con permisos.

## ❓ Posibles Problemas

### Problema 1: Usuario es admin pero NO ve todos los menús

**Diagnóstico en consola:**
```
👤 Usuario enriquecido con permisos: {
  metadata: {
    role: "gerente",  // ❌ NO es admin
    permissions: { "dashboard": [] }
  }
}

🔍 Filtrando menús - isAdmin: false  // ❌ Se detecta como NO admin
```

**Causa**: Tu sistema de autenticación está retornando `role: "gerente"` cuando debería retornar `role: "admin"`.

**Solución**: Verifica que el token incluya el rol correcto. Decodifica el token en https://jwt.io y busca el campo `role`.

### Problema 2: Usuario NO es admin pero solo ve Dashboard

**Diagnóstico en consola:**
```
🔍 Filtrando menús - isAdmin: false
📄 Dashboard (dashboard): ✅ MOSTRAR
📁 Contabilidad: ❌ OCULTAR (0 submenús accesibles)
  📋 Contabilidad → Plan de Cuentas (plan-cuentas): false
  📋 Contabilidad → Asientos Contables (asientos): false
  ...
🎯 Menús filtrados: ["Dashboard"]
```

**Causa**: El usuario tiene permisos para dashboard pero NO para otros módulos.

**Verificar permissions en consola:**
```javascript
{
  "dashboard": ["read"],  // ✅ Tiene permiso
  "plan-cuentas": [],     // ❌ Array vacío = sin acceso
  "asientos": []          // ❌ Array vacío = sin acceso
}
```

O peor aún:
```javascript
{
  "dashboard": ["read"]   // ✅ Solo este módulo tiene permisos
  // Los demás módulos NI SIQUIERA están en el objeto
}
```

**Solución**: Configura permisos correctos en tu sistema de autenticación. Ver `/ejemplos-roles/gerente.json` para plantillas.

### Problema 3: Todos los arrays están vacíos

**Diagnóstico en consola:**
```
👤 Usuario enriquecido con permisos: {
  metadata: {
    role: "gerente",
    permissions: {
      "dashboard": []  // ❌ Array vacío
    }
  }
}

🔍 Filtrando menús - isAdmin: false
📄 Dashboard (dashboard): ❌ OCULTAR  // Arrays vacíos = sin acceso
🎯 Menús filtrados: []  // ❌ NO hay menús!
```

**Causa**: El sistema de autenticación está enviando arrays vacíos en lugar de permisos reales.

**Solución**: Corrige tu sistema de autenticación para enviar arrays CON permisos:
```json
{
  "dashboard": ["read"],          // ✅ Con permiso
  "plan-cuentas": ["read"],      // ✅ Con permiso
  "asientos": ["read", "create"] // ✅ Con múltiples permisos
}
```

## 🎯 Qué Buscar en los Logs

### Log Clave 1: Usuario Enriquecido
```
👤 Usuario enriquecido con permisos:
```
Verifica:
- ✅ `metadata.role` existe y tiene valor
- ✅ `metadata.permissions` existe y tiene módulos
- ✅ Cada módulo tiene un array CON elementos (no vacío)

### Log Clave 2: isAdmin
```
🔍 Filtrando menús - isAdmin: true/false
```
- Si es `true` → Debería ver TODOS los menús
- Si es `false` → Solo verá menús con permisos

### Log Clave 3: Filtrado de Menús
```
📁 Contabilidad: ✅ MOSTRAR (3 submenús accesibles)
```
o
```
📁 Contabilidad: ❌ OCULTAR (0 submenús accesibles)
```

Verifica que los números tengan sentido según los permisos.

### Log Clave 4: Menús Finales
```
🎯 Menús filtrados: ["Dashboard", "Contabilidad", "Ventas"]
```

Esta lista debería coincidir con lo que ves en el sidebar.

## 🔧 Próximos Pasos

1. **Limpia caché** del navegador
2. **Inicia sesión** con el usuario administrador
3. **Abre la consola** (F12)
4. **Copia TODOS los logs** que empiezan con 👤, 🔍, 📁, 📋, 🎯
5. **Comparte esos logs** para diagnóstico detallado

## 📋 Checklist

- [ ] Limpié caché del navegador
- [ ] Volví a iniciar sesión
- [ ] Abrí la consola del navegador
- [ ] Vi el log `👤 Usuario enriquecido con permisos:`
- [ ] Vi el log `🔍 Filtrando menús - isAdmin:`
- [ ] Copié todos los logs de filtrado
- [ ] El `role` es correcto en metadata
- [ ] El `permissions` tiene módulos con arrays NO vacíos
- [ ] Si soy admin, `isAdmin: true`
- [ ] Si soy admin, veo todos los menús
- [ ] Si NO soy admin, veo solo menús con permisos

## ⚠️ Importante: Remover Logs en Producción

Los logs agregados son TEMPORALES para debugging. Una vez que identifiques el problema, debes removerlos editando `/src/components/layout/Sidebar.tsx` y eliminando todos los `console.log`.

## 🆘 Si Necesitas Ayuda

Copia y pega EXACTAMENTE esto de la consola:
1. El log completo de `👤 Usuario enriquecido con permisos:`
2. El log completo de `🔍 Filtrando menús`
3. El log completo de `🎯 Menús filtrados:`
4. Lo que ves en el sidebar (captura de pantalla)

Con esta información podré identificar exactamente qué está fallando.
