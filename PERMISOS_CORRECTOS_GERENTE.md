# Configuración Correcta de Permisos - Rol Gerente

## ❌ Problema Detectado

Tu usuario "gerente" tiene esto:
```json
{
  "role": "gerente",
  "permissions": {
    "dashboard": []  // ¡ARRAY VACÍO!
  }
}
```

**Esto significa**: El usuario NO tiene ningún permiso, ni siquiera para ver el dashboard.

## ✅ Configuración Correcta

Un gerente debería tener permiso de **lectura (read)** en todos los módulos para ver reportes y KPIs:

```json
{
  "user": {
    "id": "d8a9e6df-9cc2-408a-a653-88961ce7ea1d",
    "email": "prueba@test.com",
    "name": "Prueba Nueva",
    "role": "gerente",
    "permissions": {
      "dashboard": ["read"],
      "plan-cuentas": ["read"],
      "asientos": ["read"],
      "mayor": ["read"],
      "balance-comprobacion": ["read"],
      "periodos": ["read"],
      "clientes": ["read"],
      "facturas": ["read"],
      "notas-credito": ["read"],
      "notas-debito": ["read"],
      "recibos": ["read"],
      "proveedores": ["read"],
      "partners": ["read"],
      "comisiones": ["read"],
      "cuentas-cobrar": ["read"],
      "cuentas-pagar": ["read"],
      "tesoreria": ["read"],
      "conciliacion": ["read"],
      "centros-costo": ["read"],
      "balance-general": ["read"]
    }
  }
}
```

## Explicación

### Arrays Vacíos = Sin Acceso
```json
"dashboard": []  // ❌ Sin acceso
```

### Arrays con Permisos = Acceso
```json
"dashboard": ["read"]  // ✅ Puede ver
"facturas": ["read", "create"]  // ✅ Puede ver y crear
"asientos": ["read", "create", "update", "delete"]  // ✅ Acceso completo
```

## Reglas de Permisos

### Los 4 Permisos Disponibles
- `"read"` - Ver información
- `"create"` - Crear nuevos registros
- `"update"` - Modificar registros existentes
- `"delete"` - Eliminar registros

### Cómo Funcionan los Menús

Un menú aparece SI Y SOLO SI:
1. Tiene al menos UN permiso en el array
2. O alguno de sus submenús tiene al menos UN permiso

**Ejemplo 1: Menú simple**
```json
"dashboard": ["read"]
```
→ ✅ Aparece el menú Dashboard

**Ejemplo 2: Menú con submenús**
```json
"contabilidad": [],  // Array vacío
"plan-cuentas": ["read"],
"asientos": ["read"]
```
→ ✅ Aparece el menú "Contabilidad" porque tiene submenús con permisos
→ ✅ Aparece el submenú "Plan de Cuentas"
→ ✅ Aparece el submenú "Asientos Contables"

**Ejemplo 3: Sin permisos**
```json
"contabilidad": [],
"plan-cuentas": [],
"asientos": []
```
→ ❌ NO aparece el menú "Contabilidad" porque ningún submenú tiene permisos

## Roles Recomendados

### 1. Gerente (Visión Estratégica)
```json
{
  "role": "gerente",
  "permissions": {
    // Solo lectura en todo
    "dashboard": ["read"],
    "balance-general": ["read"],
    "mayor": ["read"],
    "balance-comprobacion": ["read"],
    "facturas": ["read"],
    "cuentas-cobrar": ["read"],
    "cuentas-pagar": ["read"],
    "tesoreria": ["read"],
    "centros-costo": ["read"]
  }
}
```

### 2. Contador (Gestión Completa)
```json
{
  "role": "contador",
  "permissions": {
    "dashboard": ["read"],
    "plan-cuentas": ["read", "create", "update"],
    "asientos": ["read", "create", "update", "delete"],
    "mayor": ["read"],
    "balance-comprobacion": ["read"],
    "periodos": ["read", "update"],
    "facturas": ["read", "create", "update"],
    "clientes": ["read", "create", "update"],
    "proveedores": ["read", "create", "update"]
  }
}
```

### 3. Auditor (Solo Lectura Total)
```json
{
  "role": "auditor",
  "permissions": {
    "dashboard": ["read"],
    "plan-cuentas": ["read"],
    "asientos": ["read"],
    "mayor": ["read"],
    "balance-comprobacion": ["read"],
    "periodos": ["read"],
    "clientes": ["read"],
    "facturas": ["read"],
    "notas-credito": ["read"],
    "proveedores": ["read"],
    "partners": ["read"],
    "comisiones": ["read"],
    "cuentas-cobrar": ["read"],
    "cuentas-pagar": ["read"],
    "tesoreria": ["read"],
    "conciliacion": ["read"],
    "centros-costo": ["read"],
    "balance-general": ["read"],
    "auditoria": ["read"]
  }
}
```

### 4. Tesorero (Gestión Financiera)
```json
{
  "role": "tesorero",
  "permissions": {
    "dashboard": ["read"],
    "cuentas-cobrar": ["read", "update"],
    "cuentas-pagar": ["read", "update"],
    "tesoreria": ["read", "create", "update", "delete"],
    "conciliacion": ["read", "create", "update"],
    "facturas": ["read"],
    "clientes": ["read"],
    "proveedores": ["read"]
  }
}
```

### 5. Auxiliar Contable (Operaciones Básicas)
```json
{
  "role": "auxiliar_contable",
  "permissions": {
    "dashboard": ["read"],
    "asientos": ["read", "create"],
    "facturas": ["read", "create"],
    "notas-credito": ["read", "create"],
    "clientes": ["read", "create"],
    "proveedores": ["read", "create"]
  }
}
```

### 6. Administrador del Sistema (Acceso Total)
```json
{
  "role": "administrador_sistema",
  "permissions": {
    // El administrador del sistema tiene acceso a TODO automáticamente
    // No necesita permisos explícitos, pero puedes incluirlos por completitud
  }
}
```

## Mapeo Completo de Slugs

Estos son TODOS los slugs que puedes usar en permissions:

### Nivel 1: Dashboard
- `dashboard`

### Nivel 2: Contabilidad
- `plan-cuentas`
- `asientos`
- `mayor`
- `balance-comprobacion`
- `periodos`

### Nivel 3: Ventas
- `clientes`
- `facturas`
- `notas-credito`
- `notas-debito`
- `recibos`

### Nivel 4: Compras
- `proveedores`
- `partners`
- `comisiones`

### Nivel 5: Finanzas
- `cuentas-cobrar`
- `cuentas-pagar`
- `tesoreria`
- `conciliacion`

### Nivel 6: Análisis
- `centros-costo`

### Nivel 7: Reportes
- `balance-general`

### Nivel 8: Administración
- `empresas`
- `usuarios`
- `autorizaciones`
- `configuracion` (Nomencladores)
- `configuracion-mapeo`
- `impuestos`
- `integraciones`
- `auditoria`
- `multimoneda`

## Cómo Configurar en tu Sistema de Autenticación

1. **Identifica el rol del usuario**
2. **Asigna los permisos según el rol** (usa las plantillas arriba)
3. **Asegúrate de que cada módulo tenga un array con al menos un permiso**
4. **Nunca uses arrays vacíos** (eso significa sin acceso)
5. **Retorna en el JSON de login** exactamente como se muestra arriba

## Verificación Rápida

Después de configurar:
1. Decodifica el token en https://jwt.io
2. Busca el campo `permissions`
3. Verifica que cada slug tenga un array con elementos
4. Verifica que los slugs coincidan EXACTAMENTE (case-sensitive)

## Ejemplo de Token Correcto (JWT Payload)

```json
{
  "sub": "d8a9e6df-9cc2-408a-a653-88961ce7ea1d",
  "email": "prueba@test.com",
  "name": "Prueba Nueva",
  "role": "gerente",
  "permissions": {
    "dashboard": ["read"],
    "balance-general": ["read"],
    "mayor": ["read"]
  },
  "iat": 1770342350,
  "exp": 1770428750
}
```

## ¿Necesitas Ayuda?

Si no estás seguro de qué permisos asignar a un rol:
1. Revisa `/ejemplos-roles/` para ver plantillas completas
2. Lee `ROLES_PERMISOS_README.md` para entender cada rol
3. Usa el componente `<PermissionsDebug />` para verificar en tiempo real
