# ContaEmpresa AI Development Guide

## Project Overview

**ContaEmpresa** is a multi-company accounting system built with React + TypeScript + Tailwind CSS on the frontend, and dual backend infrastructure (Firebase + Supabase). The system handles accounting, invoicing, treasury management, partner commissions, and DGI (Uruguayan tax authority) integrations for multiple companies across different countries.

## Architecture & Data Flow

### Dual Backend Strategy
- **Firebase (Firestore)**: Legacy system, mock data for development, nomencladores (catalogs)
- **Supabase (PostgreSQL)**: Primary production database with RLS, edge functions for webhooks/DGI
- **Migration Pattern**: Services have both Firebase and Supabase implementations (e.g., `tesoreriaService.ts` vs `tesoreriaSupabaseService.ts`)

### Authentication Flow
1. External auth system redirects to `/callback?code=XXX&state=authenticated`
2. `AuthContext` exchanges code for tokens via edge function
3. User data synced to Supabase `usuarios` table
4. User enriched with `metadata.permissions` object containing module-based permissions
5. See [FIX_AUTENTICACION_PERMISOS.md](../FIX_AUTENTICACION_PERMISOS.md) for complete flow

### Context Architecture
- **AuthContext**: Authentication, user object with `metadata.permissions`, `hasAccess(empresaId)`
- **SesionContext**: Company selection, user's available companies, formatting utilities
- Both contexts must be present for proper app functionality

### Service Layer Pattern
All services follow this naming convention:
- Supabase: `{domain}SupabaseService` or `{domain}Service` (e.g., `empresasSupabaseService`, `autorizacionesService`)
- Firebase: `{domain}Service` or `{domain}FirebaseService` (e.g., `TesoreriaFirebaseService`)
- Hybrid: `{Domain}Service` classes use both (e.g., `EmpresasService`, `PaisesService`)

## Role-Based Access Control (RBAC)

### Roles Hierarchy
- `super_admin`: Full system access, all companies
- `admin_empresa`: Company admin, can approve requests
- `supervisor`: Can approve authorization requests
- `contador`: Create/edit accounting entries, cannot approve
- `usuario`: Read-only access

### Permission Structure
Permissions stored in `usuario.metadata.permissions` as:
```typescript
{
  "dashboard": ["read"],
  "facturas": ["read", "create", "update"],
  "clientes": ["read", "create"],
  "tesoreria": ["read", "create", "authorize"]
}
```

### Using Permissions in Components
```typescript
import { usePermissions } from '../hooks/usePermissions';

const { hasPermission, canView, canCreate } = usePermissions();

if (!hasPermission('facturas', 'create')) return null;
if (canView('clientes')) { /* render */ }
```

### Module Slugs
Map page paths to permission modules:
- `/plan-cuentas` → `contabilidad` module
- `/facturas` → `ventas` module
- `/tesoreria` → `finanzas` module
- See `src/hooks/usePermissions.ts` lines 47-85 for complete mapping

## Authorization Workflow System

### Critical Operations Requiring Approval
- Delete/edit facturas, notas crédito, movimientos tesorería
- Operations create `solicitudes_autorizacion` records with estado: `PENDIENTE`
- Only roles with `supervisor`, `admin_empresa`, or `super_admin` can approve/reject
- After approval, operations execute automatically via triggers

### Implementation Pattern
```typescript
// Check if user can authorize
if (hasPermission('tesoreria', 'authorize')) {
  // User can delete directly
  await tesoreriaSupabaseService.eliminarMovimiento(id);
} else {
  // Request authorization
  await autorizacionesService.crearSolicitudEliminacion({
    empresaId,
    tipoOperacion: 'ELIMINAR_MOVIMIENTO',
    tablaAfectada: 'movimientos_tesoreria',
    ```instructions
    # Guía de desarrollo con IA para ContaEmpresa

    ## Resumen del proyecto

    **ContaEmpresa** es un sistema contable multiempresa construido con React + TypeScript + Tailwind CSS en el frontend, y una infraestructura backend dual (Firebase + Supabase). El sistema maneja contabilidad, facturación, tesorería, comisiones de partners e integraciones con DGI (autoridad tributaria de Uruguay) para múltiples empresas en distintos países.

    ## Arquitectura y flujo de datos

    ### Estrategia de doble backend
    - **Firebase (Firestore)**: sistema heredado, datos mock para desarrollo, nomencladores (catálogos)
    - **Supabase (PostgreSQL)**: base principal en producción con RLS y edge functions para webhooks/DGI
    - **Patrón de migración**: los servicios tienen implementaciones Firebase y Supabase (ej.: `tesoreriaService.ts` vs `tesoreriaSupabaseService.ts`)

    ### Flujo de autenticación
    1. El sistema externo redirige a `/callback?code=XXX&state=authenticated`
    2. `AuthContext` intercambia el código por tokens vía edge function
    3. Se sincronizan los datos del usuario en la tabla `usuarios` de Supabase
    4. El usuario se enriquece con `metadata.permissions` (permisos por módulo)
    5. Ver [FIX_AUTENTICACION_PERMISOS.md](../FIX_AUTENTICACION_PERMISOS.md) para el flujo completo

    ### Arquitectura de contextos
    - **AuthContext**: autenticación, usuario con `metadata.permissions`, `hasAccess(empresaId)`
    - **SesionContext**: selección de empresa, empresas disponibles y utilidades de formato
    - Ambos contextos deben estar presentes para que la app funcione correctamente

    ### Patrón de capa de servicios
    Todos los servicios siguen esta convención de nombres:
    - Supabase: `{domain}SupabaseService` o `{domain}Service` (ej.: `empresasSupabaseService`, `autorizacionesService`)
    - Firebase: `{domain}Service` o `{domain}FirebaseService` (ej.: `TesoreriaFirebaseService`)
    - Híbridos: clases `{Domain}Service` usan ambos (ej.: `EmpresasService`, `PaisesService`)

    ## Control de acceso basado en roles (RBAC)

    ### Jerarquía de roles
    - `super_admin`: acceso total al sistema, todas las empresas
    - `admin_empresa`: admin de empresa, puede aprobar solicitudes
    - `supervisor`: puede aprobar solicitudes de autorización
    - `contador`: crea/edita asientos, no aprueba
    - `usuario`: solo lectura

    ### Estructura de permisos
    Los permisos viven en `usuario.metadata.permissions`:
    ```typescript
    {
      "dashboard": ["read"],
      "facturas": ["read", "create", "update"],
      "clientes": ["read", "create"],
      "tesoreria": ["read", "create", "authorize"]
    }
    ```

    ### Uso de permisos en componentes
    ```typescript
    import { usePermissions } from '../hooks/usePermissions';

    const { hasPermission, canView, canCreate } = usePermissions();

    if (!hasPermission('facturas', 'create')) return null;
    if (canView('clientes')) { /* render */ }
    ```

    ### Slugs de módulos
    Mapeo de rutas a módulos de permisos:
    - `/plan-cuentas` → módulo `contabilidad`
    - `/facturas` → módulo `ventas`
    - `/tesoreria` → módulo `finanzas`
    - Ver el mapeo completo en `src/hooks/usePermissions.ts` (líneas 47-85)

    ## Sistema de flujo de autorizaciones

    ### Operaciones críticas que requieren aprobación
    - Eliminar/editar facturas, notas de crédito y movimientos de tesorería
    - Se crean registros `solicitudes_autorizacion` con estado `PENDIENTE`
    - Solo roles `supervisor`, `admin_empresa` o `super_admin` pueden aprobar/rechazar
    - Tras la aprobación, las operaciones se ejecutan automáticamente vía triggers

    ### Patrón de implementación
    ```typescript
    // Verificar si el usuario puede autorizar
    if (hasPermission('tesoreria', 'authorize')) {
      // Puede eliminar directamente
      await tesoreriaSupabaseService.eliminarMovimiento(id);
    } else {
      // Solicitar autorización
      await autorizacionesService.crearSolicitudEliminacion({
        empresaId,
        tipoOperacion: 'ELIMINAR_MOVIMIENTO',
        tablaAfectada: 'movimientos_tesoreria',
        registroId: id,
        motivo: 'Corrección de error'
      });
    }
    ```

    ## Integraciones clave

    ### Webhooks (órdenes de marketplace)
    - Edge function: `supabase/functions/webhooks-orders/index.ts`
    - Soporta formato V2 con `items[]` (múltiples productos/servicios)
    - Crea partners, clientes, facturas y comisiones automáticamente
    - Cada empresa tiene su secret validado en headers
    - Registra eventos en la tabla `eventos_externos`

    ### Envío automático a DGI (Uruguay CFE)
    - Edge function: `supabase/functions/auto-send-dgi/index.ts`
    - Trigger en `facturas_venta` al insertar llama la edge function
    - Genera XML CFE, envía a DGI y actualiza la factura con CAE
    - Configurable por empresa vía `empresas_auto_send_dgi` (por defecto: OFF)

    ## Comandos de desarrollo

    ```bash
    npm run dev          # Iniciar Vite (frontend)
    npm run build        # Build de producción
    npm run lint         # ESLint
    ```

    ### Desarrollo local con Supabase
    ```bash
    supabase start       # Iniciar Supabase local (Docker requerido)
    supabase db reset    # Reset de BD y migraciones
    supabase functions serve  # Probar edge functions localmente
    ```

    ## Patrones de base de datos

    ### Aislamiento multiempresa
    - Todas las tablas tienen columna `empresa_id`
    - Las políticas RLS aplican `empresa_id = current_setting('app.empresa_id')`
    - Las edge functions usan rol `anon` con validación manual de empresa

    ### Bloqueo de períodos
    - Tabla `periodos_contables` con booleano `cerrado`
    - Al cerrar, los registros se ocultan con `ocultar_por_periodo_cerrado`
    - Al reabrir, se muestran nuevamente y se recalculan balances

    ### Generación automática de asientos
    - Facturas, pagos y tesorería crean `asientos_contables` automáticamente
    - Cada registro guarda `asiento_id` y `asiento_sincronizado`
    - Servicios en `src/services/supabase/asientosAutomaticos.ts`

    ## Convenciones específicas del proyecto

    ### Organización de archivos
    - Páginas en `src/pages/{modulo}/` (ej.: `contabilidad/`, `admin/`, `tesoreria/`)
    - Componentes en `src/components/{modulo}/` o `src/components/common/`
    - Servicios en `src/services/{backend}/` (firebase, supabase, auth, api)
    - Tipos en `src/types/` y `shared/types/`

    ### Patrones de componentes
    - Usar `useModals()` para modales de confirmación/notificación
    - Usar `useSesion()` para la empresa actual y `useAuth()` para el usuario
    - Lazy load de páginas grandes con React.lazy() (ver App.tsx)
    - Proteger rutas con chequeos de permisos en las definiciones de rutas

    ### Migraciones SQL
    - Ubicadas en `supabase/migrations/`
    - Nombre con timestamp: `YYYYMMDDHHMMSS_description.sql`
    - Incluir políticas RLS para nuevas tablas
    - Agregar índices para `empresa_id` y claves foráneas

    ### Tipos TypeScript
    - Tipos principales en `src/types/index.ts` (Usuario, Empresa, Pais, etc.)
    - Tipos de permisos en `src/types/permissions.ts` (ModuleSlug, Permission, RoleName)
    - Tipos compartidos en `shared/types/index.ts`

    ## Archivos clave a consultar

    - [README.md](../README.md) - setup, scripts, stack tecnológico
    - [SISTEMA_ROLES_IMPLEMENTADO.md](../SISTEMA_ROLES_IMPLEMENTADO.md) - implementación completa de RBAC
    - [GUIA_ROLES_PERMISOS.md](../GUIA_ROLES_PERMISOS.md) - descripción y uso de roles
    - [SISTEMA_COMPLETO_IMPLEMENTADO.md](../SISTEMA_COMPLETO_IMPLEMENTADO.md) - implementación DGI/webhooks
    - [src/App.tsx](../src/App.tsx) - estructura de rutas y lazy loading
    - [src/hooks/usePermissions.ts](../src/hooks/usePermissions.ts) - utilidades de permisos
    - [src/context/AuthContext.tsx](../src/context/AuthContext.tsx) - flujo de auth

    ## Errores comunes

    1. **No saltear RLS**: usar servicios, nunca consultas Supabase directas desde frontend
    2. **Validar permisos temprano**: en rutas y componentes
    3. **Contexto de empresa requerido**: muchas operaciones necesitan `empresaActual` de `useSesion()`
    4. **Autorización vs autenticación**: permiso `authorize` ≠ rol admin
    5. **Datos mock en Firebase**: Firebase devuelve mocks para desarrollo
    6. **Bloqueo de períodos**: no se borran registros, se ocultan con `ocultar_por_periodo_cerrado = true`

    ## Enfoque de pruebas

    - Pruebas manuales en UI (no hay tests automatizados)
    - Scripts SQL en la raíz (ej.: `BORRAR_USUARIO_RESET.sql`, `ACTUALIZAR_PERMISOS_RAPIDO.sql`)
    - Guía de webhooks: [GUIA_RAPIDA_TEST_WEBHOOK.md](../GUIA_RAPIDA_TEST_WEBHOOK.md)
    - Logs de edge functions en Supabase o `supabase functions logs`

    ````
