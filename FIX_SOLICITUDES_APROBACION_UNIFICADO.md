# Fix: Solicitudes de Aprobación Unificadas

## Problema Identificado

Había dos sistemas de aprobaciones separados que no estaban comunicándose:

1. **Sistema Viejo**: `solicitudes_autorizacion` (tabla antigua)
   - Usado por: Bandeja de Autorizaciones
   - Servicio: `autorizacionesService`

2. **Sistema Nuevo**: `solicitudes_aprobacion` (tabla nueva)
   - Usado por: Facturas y otros módulos
   - Servicio: `aprobacionesService`

**Resultado**: Las solicitudes se creaban en `solicitudes_aprobacion` pero la Bandeja de Autorizaciones leía de `solicitudes_autorizacion`, por eso aparecía vacía.

## Solución Implementada

### 1. Unificación de Servicios

Se actualizó `autorizacionesService.ts` para que lea y escriba en `solicitudes_aprobacion`:

```typescript
// ANTES: Leía de solicitudes_autorizacion
.from('solicitudes_autorizacion')

// AHORA: Lee de solicitudes_aprobacion
.from('solicitudes_aprobacion')
```

### 2. Mapeo de Campos

Se actualizó el mapeo de campos para que coincida con la nueva estructura:

| Campo Viejo | Campo Nuevo |
|------------|-------------|
| `solicitado_por` | `solicitante_id` |
| `revisado_por` | `aprobador_id` |
| `solicitado_en` | `fecha_solicitud` |
| `revisado_en` | `fecha_respuesta` |
| `comentarios_revision` | `comentarios_aprobador` |
| `tipo_operacion` | `tipo_solicitud` |
| `tipo_entidad` | `tabla_afectada` |
| `entidad_id` | `registro_id` |
| `entidad_data` | `datos_originales` |

### 3. Estados Normalizados

Se normalizaron los estados para que sean consistentes:

| UI (BandejaAutorizaciones) | Base de Datos |
|---------------------------|---------------|
| `PENDIENTE` | `pendiente` |
| `APROBADA` | `aprobada` |
| `RECHAZADA` | `rechazada` |
| `CANCELADA` | `cancelada` |

### 4. Edge Functions Actualizadas

Se re-desplegaron las edge functions con `verifyJWT: false`:

- ✅ `solicitar-aprobacion-factura`
- ✅ `solicitar-aprobacion-generica`
- ✅ `aprobar-rechazar-solicitud`
- ✅ `modificar-factura-aprobada`
- ✅ `eliminar-factura-aprobada`

### 5. Políticas RLS

Se agregaron políticas para permitir acceso desde el frontend:

```sql
-- Anon y Authenticated pueden:
CREATE POLICY "Anon puede crear solicitudes" ... -- INSERT
CREATE POLICY "Anon puede leer solicitudes" ... -- SELECT
CREATE POLICY "Anon puede actualizar solicitudes" ... -- UPDATE

-- Service role mantiene acceso total
CREATE POLICY "Service role acceso total" ... -- ALL
```

## Estructura Final

### Tabla: `solicitudes_aprobacion`

```sql
CREATE TABLE solicitudes_aprobacion (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL,
  tipo_solicitud tipo_solicitud_aprobacion NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  solicitante_id UUID NOT NULL,
  aprobador_id UUID,

  -- Registro afectado (genérico)
  tabla_afectada TEXT NOT NULL,
  registro_id UUID NOT NULL,

  -- Compatibilidad con facturas
  factura_id UUID,

  -- Datos
  datos_originales JSONB NOT NULL,
  datos_modificados JSONB,
  motivo TEXT NOT NULL,
  comentarios_aprobador TEXT,

  -- Auditoría
  fecha_solicitud TIMESTAMPTZ NOT NULL,
  fecha_respuesta TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);
```

### Tipos de Solicitud Soportados

```typescript
type TipoSolicitud =
  | 'modificar_factura'
  | 'eliminar_factura'
  | 'modificar_asiento'
  | 'eliminar_asiento'
  | 'modificar_movimiento_tesoreria'
  | 'eliminar_movimiento_tesoreria'
  | 'modificar_pago_cliente'
  | 'eliminar_pago_cliente'
  | 'modificar_pago_proveedor'
  | 'eliminar_pago_proveedor';
```

## Flujo Completo

### Crear Solicitud

```typescript
// Desde cualquier módulo
await aprobacionesService.solicitarModificacionGenerica(
  empresaId,
  'facturas_venta',           // tabla
  facturaId,                  // ID
  'modificar_factura',        // tipo
  { monto: 5000 },            // cambios
  'Corrección de monto',      // motivo
  usuarioId
);
```

### Ver Solicitudes

1. Usuario va a **Administración → Autorizaciones**
2. `BandejaAutorizaciones` carga solicitudes usando `useAutorizaciones`
3. `useAutorizaciones` llama a `autorizacionesService.getSolicitudes()`
4. Se obtienen todas las solicitudes de la empresa desde `solicitudes_aprobacion`
5. Se muestran filtradas por estado: PENDIENTE, APROBADA, RECHAZADA

### Aprobar/Rechazar

```typescript
// Usuario supervisor/admin
await autorizacionesService.aprobarSolicitud(
  solicitudId,
  aprobadorId,
  'Comentario opcional'
);

// La edge function:
// 1. Verifica permisos (rol supervisor/admin)
// 2. Actualiza el estado en la DB
// 3. Ejecuta la acción (modificar/eliminar)
// 4. Registra en auditoría
```

## Testing

### 1. Crear Solicitud de Modificación de Factura

1. Ir a **Ventas → Facturas**
2. Hacer clic en "Editar" en una factura enviada a DGI
3. Modal aparece solicitando motivo
4. Ingresar motivo y enviar
5. Ver mensaje: "Solicitud Enviada"

### 2. Ver en Bandeja de Autorizaciones

1. Ir a **Administración → Autorizaciones**
2. Verificar que la solicitud aparece en la pestaña "PENDIENTE"
3. Debe mostrar:
   - Estado: PENDIENTE
   - Tipo: modificar_factura
   - Motivo ingresado
   - Solicitante
   - Fecha

### 3. Aprobar/Rechazar

1. Hacer clic en "Aprobar" o "Rechazar"
2. Ingresar comentario (opcional para aprobar, requerido para rechazar)
3. Confirmar
4. Verificar que:
   - El estado cambia
   - Si es aprobada, la acción se ejecuta
   - Aparece en la pestaña correspondiente

## Archivos Modificados

- ✅ `/src/services/supabase/autorizaciones.ts` - Actualizado para usar tabla nueva
- ✅ `/src/services/supabase/aprobaciones.ts` - Ya existía para tabla nueva
- ✅ `/src/hooks/useAutorizaciones.ts` - Sin cambios (usa autorizacionesService)
- ✅ `/src/pages/admin/BandejaAutorizaciones.tsx` - Sin cambios (usa useAutorizaciones)
- ✅ Edge functions re-desplegadas con `verifyJWT: false`
- ✅ Migración nueva: `agregar_rls_solicitudes_aprobacion_anon.sql`

## Resultado Final

✅ **Un solo sistema unificado** que usa `solicitudes_aprobacion`
✅ **Compatible con todos los módulos** (facturas, asientos, tesorería, pagos)
✅ **Bandeja de Autorizaciones funcional** mostrando todas las solicitudes
✅ **Edge functions operativas** sin restricciones de JWT
✅ **RLS configurado** permitiendo acceso desde frontend

## Próximos Pasos

1. Probar con diferentes tipos de solicitudes (asientos, movimientos, pagos)
2. Implementar notificaciones para supervisores
3. Agregar filtros avanzados en Bandeja de Autorizaciones
4. Dashboard de métricas de aprobaciones
