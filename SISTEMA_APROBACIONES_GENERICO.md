# Sistema de Aprobaciones Genérico

## Resumen

Se ha implementado un sistema de aprobaciones genérico que funciona para TODAS las transacciones del sistema, no solo facturas.

## Alcance

El sistema de aprobaciones ahora soporta:

### Facturas
- ✅ Modificar facturas de venta
- ✅ Eliminar facturas de venta

### Asientos Contables
- ✅ Modificar asientos contables
- ✅ Eliminar asientos contables

### Movimientos de Tesorería
- ✅ Modificar movimientos de tesorería
- ✅ Eliminar movimientos de tesorería

### Pagos
- ✅ Modificar pagos a clientes
- ✅ Eliminar pagos a clientes
- ✅ Modificar pagos a proveedores
- ✅ Eliminar pagos a proveedores

## Arquitectura

### Base de Datos

La tabla `solicitudes_aprobacion` ha sido modificada para soportar cualquier tipo de registro:

```sql
solicitudes_aprobacion:
  - tabla_afectada: TEXT (ej: 'facturas_venta', 'asientos_contables', 'movimientos_tesoreria')
  - registro_id: UUID (ID del registro a modificar/eliminar)
  - factura_id: UUID nullable (mantiene compatibilidad con facturas)
  - tipo_solicitud: ENUM con todos los tipos
  - datos_originales: JSONB (snapshot del registro original)
  - datos_modificados: JSONB (nuevos valores propuestos)
  - motivo: TEXT (justificación de la solicitud)
  - estado: 'pendiente' | 'aprobada' | 'rechazada'
```

### Tipos de Solicitud

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

## Edge Functions

### 1. solicitar-aprobacion-generica
Crea solicitudes de aprobación para cualquier tipo de registro.

**Parámetros:**
```json
{
  "empresaId": "uuid",
  "tablaAfectada": "nombre_tabla",
  "registroId": "uuid",
  "tipoSolicitud": "modificar_xxx | eliminar_xxx",
  "datosModificados": {}, // opcional, solo para modificaciones
  "motivo": "string",
  "usuarioId": "uuid"
}
```

### 2. aprobar-rechazar-solicitud
Procesa la aprobación o rechazo de una solicitud.

**Parámetros:**
```json
{
  "solicitudId": "uuid",
  "accion": "aprobar | rechazar",
  "aprobadorId": "uuid",
  "comentarios": "string" // opcional
}
```

## Servicio de Aprobaciones

### Métodos Genéricos

```typescript
// Modificar cualquier registro
aprobacionesService.solicitarModificacionGenerica(
  empresaId,
  'asientos_contables',      // tabla
  asientoId,                  // ID del registro
  'modificar_asiento',        // tipo de solicitud
  { descripcion: 'Nueva descripción' }, // cambios
  'Corrección de error en descripción',  // motivo
  usuarioId
);

// Eliminar cualquier registro
aprobacionesService.solicitarEliminacionGenerica(
  empresaId,
  'movimientos_tesoreria',   // tabla
  movimientoId,              // ID del registro
  'eliminar_movimiento_tesoreria', // tipo
  'Movimiento duplicado',     // motivo
  usuarioId
);
```

### Métodos Específicos (Compatibilidad)

Los métodos específicos para facturas se mantienen para compatibilidad:

```typescript
// Facturas (usa métodos genéricos internamente)
aprobacionesService.solicitarModificacion(empresaId, facturaId, datos, motivo, usuarioId);
aprobacionesService.solicitarEliminacion(empresaId, facturaId, motivo, usuarioId);
```

## Cómo Implementar en Otros Módulos

### 1. Importar el Servicio

```typescript
import { aprobacionesService, TipoSolicitud } from '../../services/supabase/aprobaciones';
import { useSesion } from '../../context/SesionContext';
```

### 2. Agregar Estado para el Modal

```typescript
const { empresaActual, usuario } = useSesion();
const [showSolicitudModal, setShowSolicitudModal] = useState(false);
const [solicitudTipo, setSolicitudTipo] = useState<'modificar' | 'eliminar'>('modificar');
const [registroParaSolicitud, setRegistroParaSolicitud] = useState<any>(null);
```

### 3. Modificar Handlers de Editar/Eliminar

```typescript
const handleEditarAsiento = (asiento: any) => {
  if (asiento.estado === 'borrador') {
    // Editar directamente
    setAsientoEdit(asiento);
    setShowModal(true);
  } else {
    // Solicitar aprobación
    setRegistroParaSolicitud(asiento);
    setSolicitudTipo('modificar');
    setShowSolicitudModal(true);
  }
};

const handleEliminarAsiento = (asiento: any) => {
  if (asiento.estado === 'borrador') {
    // Eliminar directamente con confirmación
    setConfirmModal({
      show: true,
      title: 'Eliminar Asiento',
      message: '¿Está seguro?',
      onConfirm: async () => {
        await eliminarAsiento(asiento.id);
      }
    });
  } else {
    // Solicitar aprobación
    setRegistroParaSolicitud(asiento);
    setSolicitudTipo('eliminar');
    setShowSolicitudModal(true);
  }
};
```

### 4. Agregar el Modal

```typescript
{showSolicitudModal && registroParaSolicitud && usuario && empresaActual && (
  <SolicitudAprobacionModal
    registro={registroParaSolicitud}
    tablaAfectada="asientos_contables"
    tipoSolicitud={solicitudTipo === 'modificar' ? 'modificar_asiento' : 'eliminar_asiento'}
    usuarioId={usuario.id}
    empresaId={empresaActual.id}
    onClose={() => {
      setShowSolicitudModal(false);
      setRegistroParaSolicitud(null);
    }}
    onSuccess={() => {
      setShowSolicitudModal(false);
      setRegistroParaSolicitud(null);
      mostrarNotificacion(
        'success',
        'Solicitud Enviada',
        'La solicitud ha sido enviada correctamente.'
      );
      cargarDatos();
    }}
  />
)}
```

## Ejemplo Completo: Asientos Contables

```typescript
// En AsientosContables.tsx

const handleEditarAsiento = (asiento: any) => {
  if (asiento.estado === 'borrador' || !asiento.periodo_id) {
    setAsientoEdit(asiento);
    setShowModal(true);
  } else {
    setRegistroParaSolicitud(asiento);
    setSolicitudTipo('modificar');
    setShowSolicitudModal(true);
  }
};

const handleEliminarAsiento = (asiento: any) => {
  if (asiento.estado === 'borrador' || !asiento.periodo_id) {
    setConfirmModal({
      show: true,
      title: 'Eliminar Asiento',
      message: `¿Está seguro que desea eliminar el asiento ${asiento.numero}?`,
      onConfirm: async () => {
        await eliminarAsiento(asiento.id);
        cargarAsientos();
      }
    });
  } else {
    setRegistroParaSolicitud(asiento);
    setSolicitudTipo('eliminar');
    setShowSolicitudModal(true);
  }
};

// Botones en la tabla
{asiento.estado !== 'anulado' && (
  <>
    <button onClick={() => handleEditarAsiento(asiento)}>
      Editar
    </button>
    <button onClick={() => handleEliminarAsiento(asiento)}>
      Eliminar
    </button>
  </>
)}
```

## Flujo Completo

1. **Usuario intenta modificar/eliminar** un registro aprobado
2. **Sistema verifica** si requiere aprobación (ej: no es borrador)
3. **Modal se abre** solicitando el motivo
4. **Solicitud se crea** y se guarda en la base de datos
5. **Supervisor/Admin** recibe notificación (Bandeja de Autorizaciones)
6. **Aprobador revisa** los detalles y decide aprobar/rechazar
7. **Si aprueba**: Edge function específica ejecuta la acción
8. **Se registra** en auditoría todos los cambios

## Permisos

Para aprobar solicitudes:
- Rol: `supervisor` o `admin`
- Acceso a la empresa del registro

## Testing

```typescript
// Crear solicitud de modificación de asiento
await aprobacionesService.solicitarModificacionGenerica(
  'empresa-123',
  'asientos_contables',
  'asiento-456',
  'modificar_asiento',
  { descripcion: 'Nueva descripción' },
  'Corrección necesaria por auditoria',
  'usuario-789'
);

// Crear solicitud de eliminación de movimiento
await aprobacionesService.solicitarEliminacionGenerica(
  'empresa-123',
  'movimientos_tesoreria',
  'movimiento-456',
  'eliminar_movimiento_tesoreria',
  'Registro duplicado por error del sistema',
  'usuario-789'
);
```

## Próximos Pasos

1. Crear edge functions específicas para cada tipo de operación:
   - `modificar-asiento-aprobado`
   - `eliminar-asiento-aprobado`
   - `modificar-movimiento-tesoreria-aprobado`
   - etc.

2. Implementar el sistema en:
   - Asientos Contables ✅ (pendiente UI)
   - Movimientos de Tesorería ✅ (pendiente UI)
   - Pagos Cliente/Proveedor ✅ (pendiente UI)

3. Notificaciones push/email para supervisores

4. Dashboard de métricas de aprobaciones
