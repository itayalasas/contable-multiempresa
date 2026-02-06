# Guía de Roles y Permisos del Sistema

## Roles Disponibles

El sistema cuenta con los siguientes roles de usuario:

### 1. **Super Admin** (`super_admin`)
- **Descripción**: Acceso completo al sistema
- **Permisos**: Todos los permisos disponibles
- **Puede**: Gestionar todas las empresas, usuarios, configuraciones y aprobar/rechazar solicitudes

### 2. **Administrador** (`admin`)
- **Descripción**: Administrador con acceso a múltiples funcionalidades
- **Permisos**: Gestión de empresas asignadas, usuarios y aprobación de solicitudes
- **Puede**: Aprobar/rechazar solicitudes, gestionar usuarios de sus empresas

### 3. **Administrador de Empresa** (`admin_empresa`)
- **Descripción**: Administrador con acceso limitado a su(s) empresa(s)
- **Permisos**: Gestión completa de su empresa, aprobación de solicitudes
- **Puede**: Aprobar/rechazar solicitudes de su empresa, gestionar usuarios de su empresa

### 4. **Supervisor** (`supervisor`)
- **Descripción**: Usuario con permisos de supervisión y aprobación
- **Permisos**: Autorización de operaciones críticas (eliminar/modificar registros)
- **Puede**: Aprobar/rechazar solicitudes de autorización
- **No puede**: Gestionar usuarios ni configuraciones del sistema

### 5. **Contador** (`contador`)
- **Descripción**: Usuario con permisos contables
- **Permisos**: Crear y editar asientos contables, gestionar cuentas
- **Puede**: Crear movimientos de tesorería, asientos contables
- **No puede**: Aprobar/rechazar solicitudes de autorización

### 6. **Usuario** (`usuario`)
- **Descripción**: Usuario con permisos limitados de lectura
- **Permisos**: Solo visualización de datos
- **Puede**: Ver reportes, facturas, asientos
- **No puede**: Crear, editar o eliminar registros, ni aprobar solicitudes

## Roles que Pueden Aprobar/Rechazar Solicitudes

Los siguientes roles tienen permiso para aprobar o rechazar solicitudes de autorización:

- ✅ `super_admin` - Super Administrador
- ✅ `admin` - Administrador
- ✅ `admin_empresa` - Administrador de Empresa
- ✅ `supervisor` - Supervisor

Los siguientes roles **NO** pueden aprobar/rechazar solicitudes:

- ❌ `contador` - Contador
- ❌ `usuario` - Usuario

## Cómo Asignar Roles a Usuarios

### Opción 1: Desde la Base de Datos (Administradores)

Para asignar o modificar el rol de un usuario directamente en la base de datos:

```sql
-- Ver usuarios actuales y sus roles
SELECT id, nombre, email, rol, empresas_asignadas
FROM usuarios;

-- Actualizar rol de un usuario
UPDATE usuarios
SET rol = 'supervisor'  -- o 'admin', 'admin_empresa', 'contador', 'usuario'
WHERE email = 'usuario@ejemplo.com';

-- Ejemplo: Convertir a Pedro Ayala en supervisor
UPDATE usuarios
SET rol = 'supervisor'
WHERE email = 'payalaortiz@gmail.com';
```

### Opción 2: Desde la Interfaz Web (Próximamente)

La sección **"Gestión de Usuarios"** en el menú de Administración permitirá:

1. Navegar a: **Administración > Gestión de Usuarios**
2. Seleccionar el usuario a modificar
3. Cambiar el rol en el campo "Rol del Usuario"
4. Guardar los cambios

**Nota**: Esta funcionalidad requiere tener rol de `super_admin` o `admin`.

## Sistema de Aprobaciones

### Flujo de Trabajo

1. **Usuario crea solicitud**: Un usuario intenta eliminar o modificar un registro crítico
2. **Sistema valida**: Se verifica que el usuario tenga permisos para crear la solicitud
3. **Solicitud generada**: Se crea una solicitud de autorización con estado "PENDIENTE"
4. **Usuario autorizado aprueba/rechaza**: Un usuario con rol autorizado revisa y decide
5. **Ejecución**: Si se aprueba, el sistema ejecuta la acción automáticamente

### Validaciones del Sistema

- ✅ Un usuario NO puede aprobar su propia solicitud
- ✅ Solo usuarios con rol autorizado pueden aprobar/rechazar
- ✅ El usuario debe tener acceso a la empresa de la solicitud
- ✅ La solicitud debe estar en estado "PENDIENTE"

## Mensajes de Error Comunes

### "El usuario no tiene permisos para aprobar solicitudes"

**Causa**: El usuario actual no tiene un rol autorizado para aprobar/rechazar solicitudes.

**Solución**:
1. Verificar el rol actual del usuario en la base de datos
2. Si necesita aprobar solicitudes, actualizar su rol a: `supervisor`, `admin`, `super_admin` o `admin_empresa`
3. Contactar al administrador del sistema para solicitar el cambio de rol

### "No puedes aprobar tu propia solicitud"

**Causa**: Está intentando aprobar una solicitud que usted mismo creó (principio de doble control).

**Solución**:
- Solicitar a otro usuario con permisos de aprobación que revise la solicitud
- Este es un control de seguridad que no se puede omitir

## Verificar Permisos de Usuario

Para verificar los permisos de un usuario específico:

```sql
-- Ver información completa de un usuario
SELECT
  id,
  nombre,
  email,
  rol,
  empresas_asignadas,
  permisos,
  activo
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

## Usuarios de Prueba

El sistema incluye los siguientes usuarios de prueba:

| Email                 | Rol          | Puede Aprobar | Notas                          |
|-----------------------|--------------|---------------|--------------------------------|
| supervisor@test.com   | supervisor   | ✅ Sí         | Usuario para pruebas de aprobación |
| contador@test.com     | contador     | ❌ No         | Usuario para pruebas contables     |
| usuario@test.com      | usuario      | ❌ No         | Usuario con permisos limitados     |

**Importante**: Estos usuarios deben ser creados también en Firebase Authentication para poder iniciar sesión.

## Recomendaciones de Seguridad

1. **Principio de mínimo privilegio**: Asignar solo los permisos necesarios para cada usuario
2. **Separación de funciones**: Idealmente, quien crea un registro no debe ser quien lo aprueba
3. **Auditoría**: Todas las aprobaciones y rechazos quedan registrados con usuario, fecha y comentarios
4. **Revisión periódica**: Revisar y actualizar los roles de usuarios regularmente
5. **Usuarios inactivos**: Desactivar usuarios que ya no necesitan acceso al sistema

## Migración Relacionada

Los roles y permisos están definidos en las siguientes migraciones:

- `20251119132538_insert_datos_demo.sql` - Creación de usuarios iniciales
- `20260204005603_insertar_usuarios_prueba_roles.sql` - Usuarios de prueba con roles
- `20260204000032_agregar_funciones_autorizaciones.sql` - Sistema de autorizaciones

## Soporte

Si tienes problemas con roles o permisos, contacta al administrador del sistema o revisa los logs de la aplicación para más detalles sobre errores específicos.
