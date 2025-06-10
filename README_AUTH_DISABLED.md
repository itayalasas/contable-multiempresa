# 🔓 Autenticación Deshabilitada para Desarrollo

## Estado Actual
La autenticación con Auth0 ha sido temporalmente deshabilitada para permitir pruebas locales sin configuración compleja.

## Cambios Realizados

### 1. AuthContext Simplificado
- ✅ Eliminada dependencia de Auth0
- ✅ Usuario mock automático para desarrollo
- ✅ Mantiene la misma interfaz para compatibilidad

### 2. Usuario Mock Predeterminado
```javascript
{
  id: 'dev-user-123',
  nombre: 'Usuario de Desarrollo',
  email: 'dev@contaempresa.com',
  rol: 'admin',
  empresas: ['dev-empresa'],
  permisos: ['admin:all']
}
```

### 3. Empresas Mock
- **Empresa de Desarrollo**: RUC 20123456789
- **Empresa Demo**: RUC 20987654321

## Cómo Usar

1. **Iniciar la aplicación**:
   ```bash
   npm run dev
   ```

2. **Acceso automático**: 
   - No necesitas hacer login
   - Automáticamente estarás logueado como administrador
   - Tendrás acceso a todas las funcionalidades

3. **Navegación libre**:
   - Todas las rutas están disponibles
   - Permisos de administrador completos
   - Datos mock para pruebas

## Funcionalidades Disponibles

### ✅ Módulos Activos
- Dashboard con datos mock
- Plan de Cuentas (con Firebase)
- Asientos Contables (con Firebase)
- Libro Mayor (interfaz)
- Balance de Comprobación (con Firebase)
- Gestión de Usuarios (interfaz)

### 🔧 Servicios Mock
- Autenticación simulada
- Empresas predefinidas
- Usuarios con permisos completos
- Datos de prueba

## Reactivar Autenticación Real

Cuando quieras volver a usar Auth0:

1. **Restaurar el AuthContext original**:
   ```bash
   # Renombrar el archivo actual
   mv src/context/AuthContext.tsx src/context/AuthContext.mock.tsx
   
   # Restaurar desde backup (si existe)
   mv src/context/AuthContext.auth0.tsx src/context/AuthContext.tsx
   ```

2. **Restaurar App.tsx**:
   - Volver a importar Auth0Provider
   - Restaurar la configuración original

3. **Configurar variables de entorno**:
   ```env
   VITE_AUTH0_DOMAIN=tu-dominio.auth0.com
   VITE_AUTH0_CLIENT_ID=tu-client-id
   # ... otras variables
   ```

## Notas Importantes

- 🚨 **Solo para desarrollo**: No usar en producción
- 🔒 **Sin seguridad real**: Todos los datos son accesibles
- 🧪 **Datos mock**: Los cambios no persisten entre recargas
- 🔄 **Fácil reversión**: Cambios mínimos para reactivar Auth0

## Estructura de Archivos Modificados

```
src/
├── context/
│   └── AuthContext.tsx          # ← Simplificado (sin Auth0)
├── App.tsx                      # ← Sin Auth0Provider
├── services/firebase/
│   └── empresas.ts             # ← Datos mock
└── types/index.ts              # ← Tipos actualizados
```

---

**¡Listo para desarrollar sin complicaciones! 🚀**