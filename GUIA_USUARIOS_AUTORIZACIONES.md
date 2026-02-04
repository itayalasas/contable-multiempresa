# Guía de Usuarios y Autorizaciones

## Resumen de Cambios Implementados

Se ha implementado un sistema completo de gestión de usuarios, roles y autorizaciones que permite:

1. **Gestionar usuarios con diferentes roles y permisos**
2. **Asignar usuarios a empresas**
3. **Sistema de autorizaciones de doble control (maker-checker)**
4. **Roles predefinidos con permisos específicos**

---

## Roles Disponibles

### 1. Administrador (`admin`)
- **Descripción**: Acceso completo a todas las funcionalidades
- **Permisos**: Todos los permisos del sistema
- **Uso**: Para gerentes o administradores de la empresa

### 2. Supervisor (`supervisor`)
- **Descripción**: Puede autorizar eliminaciones y ver información
- **Permisos**:
  - Autorizar eliminaciones de registros
  - Ver facturas de venta y compra
  - Ver reportes
  - Ver asientos contables
  - Crear movimientos de tesorería
- **Uso**: Para supervisores que deben aprobar operaciones críticas

### 3. Contador (`contador`)
- **Descripción**: Puede crear y editar asientos contables
- **Permisos**:
  - Crear y editar asientos contables
  - Crear y editar cuentas
  - Ver reportes
  - Crear movimientos de tesorería
- **Uso**: Para contadores que manejan la contabilidad

### 4. Usuario (`usuario`)
- **Descripción**: Acceso limitado solo para consultas
- **Permisos**:
  - Ver asientos contables
  - Ver facturas
  - Ver reportes
- **Uso**: Para personal que solo necesita consultar información

---

## Usuarios de Prueba Creados

Se han creado 3 usuarios de prueba en la base de datos:

### 1. Usuario Supervisor
- **Email**: supervisor@test.com
- **Rol**: Supervisor
- **Permisos**: Puede autorizar eliminaciones

### 2. Usuario Contador
- **Email**: contador@test.com
- **Rol**: Contador
- **Permisos**: Puede crear asientos contables

### 3. Usuario Normal
- **Email**: usuario@test.com
- **Rol**: Usuario
- **Permisos**: Solo consulta

**IMPORTANTE**: Estos usuarios están creados en Supabase, pero necesitas crearlos también en Firebase Authentication para poder loguearte.

---

## Cómo Crear Usuarios en Firebase Authentication

Para poder loguearte con los usuarios de prueba, necesitas crearlos en Firebase:

1. Ve a la consola de Firebase: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a "Authentication" en el menú lateral
4. Haz clic en "Add user"
5. Crea cada usuario con su email y una contraseña (ej: "Test123!")
   - supervisor@test.com
   - contador@test.com
   - usuario@test.com

---

## Cómo Asignar Usuarios a Empresas

### Opción 1: Desde la Gestión de Empresas
1. Ve a **Admin → Gestión de Empresas**
2. Haz clic en el icono de usuarios (👥) en la empresa
3. Selecciona el usuario en el desplegable
4. Haz clic en "Asignar"
5. El usuario ahora puede acceder a esa empresa

### Opción 2: Desde la Gestión de Usuarios
1. Ve a **Admin → Gestión de Usuarios**
2. Haz clic en editar (✏️) en el usuario
3. Selecciona el rol deseado
4. Personaliza los permisos si es necesario
5. Guarda los cambios

---

## Cómo Funciona el Sistema de Autorizaciones

### Flujo de Eliminación con Autorización

1. **Usuario crea un movimiento de tesorería**
   - El usuario con rol Contador crea un movimiento
   - Se genera el asiento contable automáticamente

2. **Usuario solicita eliminar el movimiento**
   - El sistema detecta que tiene asiento contable asociado
   - Solicita un motivo para la eliminación
   - Crea una solicitud de autorización

3. **Supervisor aprueba o rechaza**
   - Ve a **Admin → Bandeja de Autorizaciones**
   - Revisa la solicitud con todos los detalles
   - Aprueba o rechaza con comentarios
   - El sistema ejecuta la eliminación si se aprueba

### Características de Seguridad

- **Doble control**: Un usuario no puede aprobar su propia solicitud
- **Auditoría completa**: Se registra quién solicita, quién aprueba y cuándo
- **Reversión automática**: Si se elimina un movimiento, se revierten los asientos contables
- **Histórico**: Todas las solicitudes quedan registradas

---

## Permisos Disponibles en el Sistema

### Contabilidad
- `contabilidad:asientos:crear` - Crear Asientos Contables
- `contabilidad:asientos:editar` - Editar Asientos Contables
- `contabilidad:asientos:eliminar` - Eliminar Asientos Contables
- `contabilidad:asientos:ver` - Ver Asientos Contables
- `contabilidad:cuentas:crear` - Crear Cuentas
- `contabilidad:cuentas:editar` - Editar Cuentas

### Ventas
- `ventas:facturas:crear` - Crear Facturas de Venta
- `ventas:facturas:editar` - Editar Facturas de Venta
- `ventas:facturas:eliminar` - Eliminar Facturas de Venta
- `ventas:clientes:crear` - Crear Clientes
- `ventas:clientes:editar` - Editar Clientes

### Compras
- `compras:facturas:crear` - Crear Facturas de Compra
- `compras:proveedores:crear` - Crear Proveedores

### Tesorería
- `tesoreria:movimientos:crear` - Crear Movimientos de Tesorería
- `tesoreria:movimientos:eliminar` - Eliminar Movimientos de Tesorería
- `tesoreria:autorizar` - **Autorizar Eliminaciones** ⭐

### Reportes
- `reportes:ver` - Ver Reportes

### Configuración
- `configuracion:general` - Configuración General

### Administración
- `usuarios:gestionar` - Gestionar Usuarios
- `empresas:gestionar` - Gestionar Empresas

---

## Cómo Probar el Sistema de Autorizaciones

### Paso 1: Crear usuarios en Firebase
Crea los 3 usuarios de prueba en Firebase Authentication como se explicó arriba.

### Paso 2: Verifica que estén asignados a la empresa
1. Loguéate con tu usuario actual (payalaortiz@gmail.com)
2. Ve a **Admin → Gestión de Empresas**
3. Haz clic en el icono de usuarios en "Ayala IT S.A.S"
4. Verifica que los 3 usuarios estén asignados
5. Si no están, asígnalos usando el desplegable

### Paso 3: Prueba con el Contador
1. Cierra sesión
2. Loguéate con: **contador@test.com**
3. Ve a **Finanzas → Tesorería**
4. Crea un movimiento de egreso
5. Intenta eliminarlo
6. Deberías ver el modal pidiendo motivo
7. Ingresa un motivo y envía la solicitud

### Paso 4: Aprueba con el Supervisor
1. Cierra sesión
2. Loguéate con: **supervisor@test.com**
3. Ve a **Admin → Bandeja de Autorizaciones**
4. Deberías ver la solicitud pendiente
5. Haz clic en "Aprobar"
6. Ingresa un comentario (ej: "Aprobado - Error de captura")
7. Confirma la aprobación

### Paso 5: Verifica la eliminación
1. Ve a **Finanzas → Tesorería**
2. El movimiento debería estar marcado como eliminado
3. El asiento contable asociado también debería estar eliminado

---

## Notas Importantes

### Permisos y Roles
- Los permisos se asignan automáticamente según el rol
- Puedes personalizar los permisos de cada usuario individualmente
- Los permisos están agrupados por categoría para facilitar su gestión

### Seguridad
- Solo los usuarios con permiso `tesoreria:autorizar` pueden aprobar solicitudes
- Un usuario no puede aprobar su propia solicitud (maker-checker)
- Todas las operaciones quedan auditadas en la base de datos

### Empresas
- Los botones de crear/editar/eliminar empresas están disponibles
- Solo usuarios con permisos de administración pueden gestionarlas
- Cada empresa puede tener múltiples usuarios asignados

---

## Solución de Problemas

### "No tiene empresas asignadas"
**Problema**: Al loguearte con un usuario nuevo, dice que no tiene empresas asignadas.

**Solución**:
1. Loguéate con un usuario administrador
2. Ve a Gestión de Empresas
3. Haz clic en el icono de usuarios de la empresa
4. Asigna el usuario nuevo a la empresa

### Los permisos no se ven en la edición de usuarios
**Problema**: El campo de permisos aparece vacío.

**Solución**: Esto ya está corregido. Los permisos ahora se cargan automáticamente y están agrupados por categoría.

### No puedo aprobar una solicitud
**Problema**: No aparece el botón de aprobar/rechazar.

**Solución**:
1. Verifica que el usuario tenga el permiso `tesoreria:autorizar`
2. Asegúrate de que no seas el mismo usuario que creó la solicitud
3. Verifica que la solicitud esté en estado "PENDIENTE"

---

## Próximos Pasos Recomendados

1. **Crear usuarios reales en Firebase**
   - Crea usuarios para todo tu equipo en Firebase Authentication
   - Asígnalos a las empresas correspondientes
   - Configura sus roles y permisos según sus responsabilidades

2. **Definir políticas de autorizaciones**
   - Decide qué operaciones requieren autorización
   - Establece quiénes pueden autorizar qué
   - Documenta los procedimientos

3. **Capacitar al equipo**
   - Muestra a los usuarios cómo solicitar autorizaciones
   - Explica a los supervisores cómo aprobar/rechazar
   - Establece tiempos de respuesta

4. **Monitorear el uso**
   - Revisa la bandeja de autorizaciones periódicamente
   - Verifica que no haya solicitudes pendientes antiguas
   - Ajusta permisos según sea necesario
