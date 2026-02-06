# Sistema de Roles y Permisos - Guía Rápida

## Estado: ✅ IMPLEMENTADO Y FUNCIONAL

El sistema está completamente implementado y listo para usar. El proyecto compila sin errores.

## ¿Qué hace este sistema?

Controla qué puede ver y hacer cada usuario en la aplicación según su rol y permisos específicos.

## Los 9 Roles

1. **Auxiliar Contable** - Carga comprobantes y registros básicos
2. **Contador** - Gestión contable completa
3. **Encargado de Impuestos** - Gestión tributaria y DGI
4. **Tesorero** - Gestión de pagos y cobros
5. **Supervisor Contable** - Revisa y aprueba
6. **Administrador Contable** - Configura el sistema contable
7. **Auditor** - Solo lectura completa
8. **Gerente** - Reportes y KPIs
9. **Administrador del Sistema** - Control total

## Los 4 Permisos

- **Crear** (create) - Crear nuevos registros
- **Ver** (read) - Ver información
- **Actualizar** (update) - Modificar registros
- **Eliminar** (delete) - Eliminar registros

## ¿Cómo funciona?

### 1. El usuario se loguea

Tu sistema de autenticación retorna esto:

```json
{
  "user": {
    "id": "auth0|123456",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "contador",
    "permissions": {
      "dashboard": ["read"],
      "facturas": ["read", "create", "update"],
      "clientes": ["read", "create"]
    }
  }
}
```

### 2. La aplicación lee los permisos

El sistema lee automáticamente el `role` y `permissions` y:
- Filtra los menús del sidebar
- Oculta botones sin permisos
- Protege rutas sin acceso

### 3. Ejemplo visual

Si un usuario tiene estos permisos en facturas:
```json
"facturas": ["read", "create"]
```

Verá:
- ✅ Botón "Nueva Factura" (tiene create)
- ✅ Botón "Ver detalles" (tiene read)
- ❌ Botón "Editar" (NO tiene update)
- ❌ Botón "Eliminar" (NO tiene delete)

## Configurar Permisos por Rol

Ve a `/ejemplos-roles/` y encontrarás configuraciones completas para cada rol:

- `auxiliar-contable.json` - Operaciones básicas
- `contador.json` - Gestión contable completa
- `tesorero.json` - Gestión financiera
- `supervisor-contable.json` - Aprobaciones
- `auditor.json` - Solo lectura
- `gerente.json` - Reportes estratégicos
- `administrador-sistema.json` - Acceso total

## Mapeo de Módulos

Estos son todos los módulos (slugs) que puedes configurar:

### Contabilidad
- `plan-cuentas` - Plan de Cuentas
- `asientos` - Asientos Contables
- `mayor` - Libro Mayor
- `balance-comprobacion` - Balance
- `periodos` - Periodos Contables

### Ventas
- `clientes` - Clientes
- `facturas` - Facturas
- `notas-credito` - Notas de Crédito
- `notas-debito` - Notas de Débito
- `recibos` - Recibos

### Compras
- `proveedores` - Proveedores
- `partners` - Partners
- `comisiones` - Comisiones

### Finanzas
- `cuentas-cobrar` - Cuentas por Cobrar
- `cuentas-pagar` - Cuentas por Pagar
- `tesoreria` - Tesorería
- `conciliacion` - Conciliación Bancaria

### Otros
- `dashboard` - Dashboard principal
- `centros-costo` - Centros de Costo
- `balance-general` - Balance General
- `empresas` - Gestión de Empresas
- `usuarios` - Gestión de Usuarios
- `autorizaciones` - Bandeja de Autorizaciones
- `configuracion` - Nomencladores
- `impuestos` - Configuración de Impuestos
- `integraciones` - Integraciones
- `auditoria` - Auditoría
- `multimoneda` - Multi-moneda

## Para Desarrolladores

### Proteger un botón

```typescript
import { ProtectedButton } from '../components/common/ProtectedButton';

<ProtectedButton module="facturas" permission="create" onClick={...}>
  Nueva Factura
</ProtectedButton>
```

### Mostrar contenido condicional

```typescript
import { CanAccess } from '../components/common/CanAccess';

<CanAccess module="facturas" permission="delete">
  <button>Eliminar</button>
</CanAccess>
```

### Verificar permisos manualmente

```typescript
import { usePermissions } from '../hooks/usePermissions';

const { canCreate, canUpdate, canDelete, canRead } = usePermissions();

{canUpdate('facturas') && (
  <button>Editar</button>
)}
```

## Ejemplo Completo

Mira `/src/pages/ventas/Facturas.tsx` para ver un ejemplo completo de cómo se implementa.

## Documentación Completa

1. **SISTEMA_ROLES_PERMISOS.md** - Documentación técnica detallada
2. **SISTEMA_ROLES_IMPLEMENTADO.md** - Estado de implementación
3. **GUIA_APLICAR_PERMISOS.md** - Guía paso a paso para aplicar a componentes
4. **/ejemplos-roles/** - Configuraciones JSON de ejemplo

## Importante: Seguridad

Los permisos en el frontend solo controlan qué ve el usuario (UX).

**SIEMPRE debes validar también en el backend:**
- En Edge Functions de Supabase
- En Row Level Security (RLS)
- En triggers y funciones de base de datos

El frontend oculta botones para mejor experiencia, pero la seguridad real está en el backend.

## Checklist de Implementación

Para tu sistema de autenticación:
- [ ] Configurar los 9 roles
- [ ] Asignar permisos a cada rol
- [ ] Retornar `role` y `permissions` en el JSON de usuario
- [ ] Probar con diferentes roles
- [ ] Verificar que los menús se filtran
- [ ] Verificar que los botones se ocultan

Para el backend:
- [ ] Validar permisos en Edge Functions
- [ ] Configurar RLS en Supabase
- [ ] Probar que no se pueden hacer operaciones sin permisos

## ¿Necesitas Ayuda?

Revisa estos archivos en orden:
1. Este archivo (visión general)
2. GUIA_APLICAR_PERMISOS.md (cómo aplicar a componentes)
3. /ejemplos-roles/ (configuraciones de ejemplo)
4. SISTEMA_ROLES_PERMISOS.md (documentación técnica completa)

## Build

```bash
npm run build
```

✅ El proyecto compila sin errores. Todo está listo para usar.
