# Herramienta de Debug de Permisos

## ¿Qué es?

Un componente visual que te permite ver en tiempo real:
- El usuario actual
- Su rol
- Sus permisos por módulo
- Si los permisos se están cargando correctamente

## Cómo Activarlo

### Opción 1: Agregar al Layout (Temporal para Testing)

Edita `/src/components/layout/Layout.tsx` y agrega:

```typescript
import { PermissionsDebug } from '../common/PermissionsDebug';

// Dentro del return, antes del cierre del div principal:
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="...">
      {/* ... contenido existente ... */}

      {/* Agregar al final, antes del cierre del div */}
      <PermissionsDebug />
    </div>
  );
};
```

### Opción 2: Agregar solo en desarrollo

```typescript
import { PermissionsDebug } from '../common/PermissionsDebug';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="...">
      {/* ... contenido existente ... */}

      {isDevelopment && <PermissionsDebug />}
    </div>
  );
};
```

## Cómo Usarlo

1. Activa el componente siguiendo una de las opciones arriba
2. Inicia sesión en la aplicación
3. Verás un botón flotante en la esquina inferior derecha con un icono de escudo
4. Haz clic en el botón para abrir/cerrar el panel de debug
5. El panel muestra:
   - Nombre y email del usuario
   - Rol actual
   - Lista de todos los módulos con sus permisos

## Qué Verificar

### ✅ Funcionando Correctamente

Deberías ver:
```
Usuario Actual
Prueba Nueva
prueba@test.com

Rol
auditor

Permisos por Módulo
dashboard:
  read

finanzas:
  read

analisis:
  create delete read update

reportes:
  create delete read update
```

### ❌ Problema: Sin Permisos

Si ves:
```
⚠️ No se detectaron permisos. Verifica que el token incluya "role" y "permissions".
```

**Causa**: El token no incluye `role` o `permissions`, o el `AuthContext` no los está leyendo correctamente.

**Solución**:
1. Verifica que tu sistema de autenticación retorna `role` y `permissions` en el token
2. Verifica la consola del navegador para ver logs del `AuthContext`
3. Busca el log: `👤 Usuario enriquecido con permisos:`

### ❌ Problema: Permisos Incorrectos

Si los permisos no coinciden con lo que configuraste:

**Causa**: El token tiene permisos diferentes a los esperados.

**Solución**:
1. Verifica la configuración de roles en tu sistema de autenticación
2. Cierra sesión y vuelve a iniciar sesión para obtener un token fresco
3. Limpia el localStorage del navegador

## Comparar con el Token

Para verificar que los permisos del componente coinciden con el token:

1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña "Application" o "Almacenamiento"
3. Busca en "Local Storage" la key de tu sesión
4. Copia el token (access_token)
5. Decodifica el token en https://jwt.io
6. Compara los campos `role` y `permissions` con lo que muestra el componente

Deberían ser idénticos.

## Códigos de Color

Los permisos se muestran con colores:
- 🟢 **Verde** (create) - Crear
- 🔵 **Azul** (read) - Leer
- 🟡 **Amarillo** (update) - Actualizar
- 🔴 **Rojo** (delete) - Eliminar

## Ejemplos de Uso

### Caso 1: Verificar que el Auditor solo tiene Read

Esperas ver solo badges azules (read) en la mayoría de módulos.

### Caso 2: Verificar que el Contador tiene CRUD en Asientos

Esperas ver los 4 colores (create, read, update, delete) en el módulo "asientos".

### Caso 3: Verificar que el Administrador ve todos los módulos

Esperas ver una lista larga con todos los módulos del sistema.

## Desactivar en Producción

**IMPORTANTE**: Este componente es solo para desarrollo/testing.

Para desactivarlo en producción, usa la Opción 2 arriba que solo lo muestra en desarrollo:

```typescript
{import.meta.env.DEV && <PermissionsDebug />}
```

O simplemente no lo agregues al Layout en la versión de producción.

## Troubleshooting

### El botón no aparece

- Verifica que agregaste el componente al Layout
- Verifica que estás logueado
- Revisa la consola por errores

### El panel está vacío

- El usuario no tiene metadata configurado
- Revisa `AuthContext` para ver si está enriqueciendo el usuario
- Busca logs en consola: `👤 Usuario enriquecido con permisos:`

### Los permisos son diferentes al esperado

- El token tiene permisos diferentes
- Cierra sesión y vuelve a iniciar
- Verifica la configuración en tu sistema de autenticación

## Logs Útiles

En la consola del navegador, busca estos logs después de loguearte:

```
🔐 Código de autenticación detectado...
✅ Autenticación exitosa
👤 Usuario enriquecido con permisos: { ... }
```

Si no ves el último log, el problema está en el `AuthContext`.

## Siguiente Paso

Una vez que verifiques que los permisos se cargan correctamente:
1. Desactiva el componente de debug
2. Verifica que los menús se filtran correctamente
3. Verifica que los botones se ocultan según permisos
4. Prueba con diferentes roles

## Soporte

Si los permisos se muestran correctamente en el debug pero los menús no se filtran:
- Revisa el archivo `Sidebar.tsx`
- Verifica que el `filteredMenuItems` usa `hasModuleAccess`
- Revisa la consola por errores en el render del Sidebar
