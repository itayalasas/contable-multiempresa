# Corrección Final: Sistema de Permisos Basado SOLO en Permisos del JSON

## ✅ Problema Solucionado

**Problema**: El sistema verificaba ROLES hardcodeados (como "administrador_sistema", "admin") en lugar de verificar los permisos directamente del JSON de autenticación.

**Solución**: Eliminada toda la lógica de verificación de roles. El sistema ahora se basa ÚNICAMENTE en los permisos del JSON.

## 🎯 Filosofía del Sistema

### Antes (INCORRECTO):
```typescript
// ❌ Verificaba si el rol estaba hardcodeado
if (role === 'administrador_sistema' || role === 'admin') {
  return true; // Mostrar todo
}
```

### Ahora (CORRECTO):
```typescript
// ✅ Solo verifica permisos del JSON
const hasModuleAccess = (module: ModuleSlug): boolean => {
  const modulePermissions = permissions[module] || [];
  return modulePermissions.length > 0;
};
```

## 🔧 Cambios Realizados

### 1. Hook `usePermissions` (`/src/hooks/usePermissions.ts`)

**Eliminado**:
- ❌ Variable `isAdmin`
- ❌ Lista hardcodeada de roles de admin: `['administrador_sistema', 'admin', 'administrador', 'superadmin']`
- ❌ Todas las verificaciones de `if (isAdmin)`

**Resultado**:
Todas las funciones ahora verifican SOLO los permisos del JSON:

```typescript
const hasPermission = (module: ModuleSlug, permission: Permission): boolean => {
  const modulePermissions = permissions[module] || [];
  return modulePermissions.includes(permission);
};

const hasModuleAccess = (module: ModuleSlug): boolean => {
  const modulePermissions = permissions[module] || [];
  return modulePermissions.length > 0;
};
```

### 2. Sidebar (`/src/components/layout/Sidebar.tsx`)

**Eliminado**:
- ❌ Variable `isAdmin`
- ❌ Lógica `if (isAdmin) return menuItems;`

**Resultado**:
El filtrado se basa SOLO en permisos:

```typescript
const filteredMenuItems = React.useMemo(() => {
  const filtered = menuItems
    .filter(item => {
      if (!item.slug) return true;

      if (item.submenu) {
        // Verificar si AL MENOS UN submenú tiene permisos
        const accessibleSubmenuItems = item.submenu.filter(subItem =>
          hasModuleAccess(subItem.slug)
        );
        return accessibleSubmenuItems.length > 0;
      }

      // Verificar permisos del módulo directamente
      return hasModuleAccess(item.slug);
    })
    .map(item => {
      if (item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter(subItem => hasModuleAccess(subItem.slug))
        };
      }
      return item;
    });

  return filtered;
}, [hasModuleAccess]);
```

## 📋 Cómo Verificar que Funciona

### Paso 1: Limpiar Caché

```bash
# En el navegador:
1. Abre DevTools (F12)
2. Ve a "Application" → "Storage" → "Clear site data"
3. O usa Ctrl+Shift+Del y borra cookies/caché
```

### Paso 2: Volver a Iniciar Sesión

Cierra sesión y vuelve a loguearte con el usuario auditor.

### Paso 3: Verificar en la Consola

Busca en la consola del navegador:

```
👤 Usuario enriquecido con permisos: {
  id: "...",
  nombre: "Tu Usuario",
  email: "tu@email.com",
  metadata: {
    role: "tu_rol_aqui",
    permissions: {
      "dashboard": ["read"],
      "finanzas": ["read"],
      "analisis": ["create", "delete", "read", "update"],
      "reportes": ["create", "delete", "read", "update"]
    }
  }
}

🔍 Filtrando menús basado en permisos
📄 Dashboard (dashboard): ✅ MOSTRAR
📁 Finanzas: ✅ MOSTRAR (1 submenús accesibles)
📁 Análisis: ✅ MOSTRAR (1 submenús accesibles)
📁 Reportes: ✅ MOSTRAR (1 submenús accesibles)
🎯 Menús filtrados: ["Dashboard", "Finanzas", "Análisis", "Reportes"]
```

### Paso 4: Verificar el Sidebar

Los menús que aparecen en el sidebar deben coincidir EXACTAMENTE con los que tienen permisos en el JSON.

**Regla Simple**:
- ✅ Si el módulo está en `permissions` con un array NO vacío → Se muestra
- ❌ Si el módulo NO está en `permissions` → NO se muestra
- ❌ Si el módulo tiene array vacío `[]` → NO se muestra

### Paso 5 (Opcional): Activar Debug Visual

Edita `/src/components/layout/Layout.tsx`:

```typescript
import { PermissionsDebug } from '../common/PermissionsDebug';

// Al final del return, antes del cierre:
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      {/* ... contenido existente ... */}

      {/* Solo en desarrollo */}
      {import.meta.env.DEV && <PermissionsDebug />}
    </div>
  );
};
```

Verás un botón flotante en la esquina inferior derecha. Haz clic para ver tus permisos.

## 📋 Ejemplos Concretos

### Ejemplo 1: Usuario con Permisos Limitados

**JSON de autenticación**:
```json
{
  "role": "gerente",
  "permissions": {
    "dashboard": ["read"],
    "finanzas": ["read"],
    "analisis": ["create", "delete", "read", "update"],
    "reportes": ["create", "delete", "read", "update"]
  }
}
```

**Qué ve en el sidebar**:
- ✅ Dashboard (tiene permiso "read")
- ❌ Contabilidad (ningún submenú tiene permisos)
- ❌ Ventas (ningún submenú tiene permisos)
- ❌ Compras (ningún submenú tiene permisos)
- ✅ Finanzas → pero solo submenús que tengan permisos específicos
- ✅ Análisis → Centros de Costo
- ✅ Reportes → Balance General

### Ejemplo 2: Administrador del Sistema

**JSON de autenticación**:
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
    ... // TODOS los módulos con todos los permisos
  }
}
```

**Qué ve en el sidebar**:
- ✅ TODO (porque tiene permisos para TODOS los módulos)

**Importante**: El rol `"administrador_del_sistema"` NO tiene ningún tratamiento especial. Solo ve todo porque su JSON de permisos incluye TODOS los módulos.

### Ejemplo 3: Usuario Sin Permisos

**JSON de autenticación**:
```json
{
  "role": "invitado",
  "permissions": {}
}
```

**Qué ve en el sidebar**:
- ❌ Nada (no tiene permisos para ningún módulo)

### Ejemplo 4: Arrays Vacíos

**JSON de autenticación**:
```json
{
  "role": "usuario",
  "permissions": {
    "dashboard": []  // ❌ Array vacío
  }
}
```

**Qué ve en el sidebar**:
- ❌ Nada (arrays vacíos = sin permisos)

## 🔍 Troubleshooting

### Problema: Sigo viendo todos los menús

**Solución**:
1. Limpia caché del navegador completamente
2. Cierra sesión
3. Vuelve a iniciar sesión
4. Revisa la consola: ¿Aparece el log `👤 Usuario enriquecido con permisos`?
5. Si no aparece, hay un problema en el `AuthContext`

### Problema: El log aparece pero sin metadata

```
👤 Usuario enriquecido con permisos: {
  metadata: undefined
}
```

**Causa**: El token no incluye `role` o `permissions`.

**Solución**:
1. Verifica que tu sistema de autenticación retorna estos campos en `data.user`
2. Decodifica el token en https://jwt.io
3. Busca los campos `role` y `permissions` en el payload

### Problema: Los permisos están pero los menús no se filtran

**Solución**:
1. Verifica que los slugs en `permissions` coinciden con los del `Sidebar`
2. Ejemplo: El token dice `"finanzas"` pero el menú espera `"cuentas-cobrar"`
3. Los slugs deben ser exactos (case-sensitive)

## 📚 Documentación Adicional

1. **CORRECCION_PERMISOS.md** - Explicación técnica detallada
2. **DEBUG_PERMISOS.md** - Cómo usar la herramienta de debug
3. **SISTEMA_ROLES_PERMISOS.md** - Documentación completa del sistema
4. **GUIA_APLICAR_PERMISOS.md** - Cómo aplicar a otros componentes

## 🎯 Reglas del Sistema

### Regla 1: Arrays Vacíos = Sin Acceso
```json
"dashboard": []  // ❌ NO se muestra
```

### Regla 2: Arrays con Permisos = Con Acceso
```json
"dashboard": ["read"]  // ✅ Se muestra
```

### Regla 3: No Existe en JSON = Sin Acceso
```json
{
  "permissions": {
    "dashboard": ["read"]
    // "plan-cuentas" no existe
  }
}
```
→ ❌ "plan-cuentas" NO se muestra

### Regla 4: Menús Padre
Los menús padre (como "Contabilidad", "Ventas") se muestran SI Y SOLO SI al menos uno de sus submenús tiene permisos.

```json
{
  "permissions": {
    "plan-cuentas": ["read"],  // ✅ Submenú 1 tiene permiso
    "asientos": []              // ❌ Submenú 2 NO tiene permiso
  }
}
```
→ ✅ "Contabilidad" se muestra (porque "plan-cuentas" tiene permiso)
→ ✅ Dentro de "Contabilidad" solo se ve "Plan de Cuentas"

### Regla 5: El Rol NO Importa
```json
{
  "role": "super_mega_admin_ultra",  // ← No importa
  "permissions": {
    "dashboard": ["read"]
  }
}
```
→ Solo verá Dashboard (el rol no tiene ningún efecto)

## ✅ Ventajas de Este Enfoque

1. **No hay roles hardcodeados** - Puedes crear cualquier rol sin tocar el código
2. **Permisos granulares** - Control fino sobre cada módulo
3. **Fácil de mantener** - Solo editas el JSON de permisos
4. **Flexible** - Puedes dar permisos personalizados a cada usuario
5. **Predecible** - Si está en permissions con array no vacío, se muestra

## ✅ Checklist Final

- [x] Eliminada lógica de `isAdmin`
- [x] Eliminados roles hardcodeados
- [x] Sistema basado solo en permisos del JSON
- [x] Logs de debug agregados
- [x] Build sin errores
- [ ] Verificar que funciona (TU TAREA)
- [ ] Remover logs de debug (DESPUÉS de verificar)

## 🚀 Siguiente Paso

1. **Limpiar caché del navegador**
2. **Volver a iniciar sesión**
3. **Verificar los logs en la consola**
4. **Confirmar que el sidebar muestra solo los menús con permisos**
5. **Remover los console.log del Sidebar** (después de verificar)

## 💡 Mapeo de Slugs Importante

### Slugs Válidos del Sistema

**Debes usar estos slugs EXACTOS en el JSON de permisos**:

#### Dashboard
- `dashboard`

#### Contabilidad (menús padre NO se usan, solo submenús)
- `plan-cuentas`
- `asientos`
- `mayor`
- `balance-comprobacion`
- `periodos`

#### Ventas (menús padre NO se usan, solo submenús)
- `clientes`
- `facturas`
- `notas-credito`
- `notas-debito`
- `recibos`

#### Compras (menús padre NO se usan, solo submenús)
- `proveedores`
- `partners`
- `comisiones`

#### Finanzas (menús padre NO se usan, solo submenús)
- `cuentas-cobrar`
- `cuentas-pagar`
- `tesoreria`
- `conciliacion`

#### Análisis (menús padre NO se usan, solo submenús)
- `centros-costo`

#### Reportes (menús padre NO se usan, solo submenús)
- `balance-general`

#### Administración (menús padre NO se usan, solo submenús)
- `empresas`
- `usuarios`
- `autorizaciones`
- `configuracion`
- `configuracion-mapeo`
- `impuestos`
- `integraciones`
- `auditoria`
- `multimoneda`

### ⚠️ Importante

**Los menús padre (como "contabilidad", "ventas", "finanzas") NO se usan en permissions.**

Solo debes incluir los SUBMENÚS:

**❌ INCORRECTO**:
```json
{
  "contabilidad": ["read"],
  "ventas": ["read"]
}
```

**✅ CORRECTO**:
```json
{
  "plan-cuentas": ["read"],
  "asientos": ["read"],
  "clientes": ["read"],
  "facturas": ["read"]
}
```

Si un usuario tiene permisos para "plan-cuentas" y "asientos", automáticamente verá el menú padre "Contabilidad" con esos dos submenús.

## 🚨 Importante para el Backend

Tu sistema de autenticación debe retornar el JSON con esta estructura:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "cualquier_rol_que_quieras",
    "permissions": {
      "dashboard": ["read"],
      "plan-cuentas": ["read"],
      "asientos": ["read", "create"],
      "facturas": ["read", "create", "update"],
      ...
    }
  }
}
```

**Los slugs deben coincidir EXACTAMENTE** (case-sensitive) con los del sidebar.

## ⚠️ Remover Logs de Debug

Los logs agregados en el Sidebar son TEMPORALES para debugging. Una vez que verifiques que funciona, edita `/src/components/layout/Sidebar.tsx` y elimina todos los `console.log`.

```typescript
// Eliminar estos logs:
console.log('🔍 Filtrando menús basado en permisos');
console.log(`  📋 ${item.title} → ${subItem.title} (${subItem.slug}):`, hasAccess);
console.log(`📁 ${item.title}: ${shouldShow ? '✅ MOSTRAR' : '❌ OCULTAR'} (${accessibleSubmenuItems.length} submenús accesibles)`);
console.log(`📄 ${item.title} (${item.slug}):`, hasAccess ? '✅ MOSTRAR' : '❌ OCULTAR');
console.log('🎯 Menús filtrados:', filtered.map(i => i.title));
```

## 📚 Archivos Modificados

1. `/src/hooks/usePermissions.ts` - Eliminada lógica de `isAdmin`
2. `/src/components/layout/Sidebar.tsx` - Eliminada verificación de rol

## 🎉 Conclusión

**El sistema ahora es 100% flexible y se basa únicamente en los permisos del JSON de autenticación.**

- ✅ No hay roles hardcodeados
- ✅ Permisos granulares por módulo
- ✅ Fácil de mantener
- ✅ Funciona con cualquier rol que definas
- ✅ Build sin errores

**Próximo paso**: Limpiar caché, iniciar sesión y verificar que funciona correctamente.
