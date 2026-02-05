# Sistema de Aprobaciones para Facturas

## Descripción General

Sistema completo de aprobaciones que permite solicitar autorización para modificar o eliminar facturas, manteniendo un registro completo de auditoría de todos los cambios realizados.

## Características Principales

### 1. Solicitud de Aprobación

Los usuarios pueden solicitar aprobación para:
- **Modificar factura**: Actualizar datos de una factura existente
- **Eliminar factura**: Eliminar una factura y todos sus registros asociados

### 2. Flujo de Aprobación

```
1. Usuario solicita modificación/eliminación → Estado: PENDIENTE
2. Supervisor/Admin revisa la solicitud
3. Aprueba o Rechaza con comentarios
4. Si se aprueba:
   - Se ejecuta la modificación/eliminación automáticamente
   - Se regeneran asientos contables (si es modificación)
   - Se actualizan movimientos de tesorería y pagos
5. Todos los cambios quedan registrados en auditoría
```

### 3. Auditoría Completa

Todos los cambios quedan registrados con:
- Datos anteriores y nuevos
- Usuario que realizó el cambio
- Solicitud de aprobación asociada
- Fecha y hora exacta
- Metadata adicional

## Componentes del Sistema

### Base de Datos

#### Tabla: `solicitudes_aprobacion`

Almacena las solicitudes de modificación o eliminación.

```sql
CREATE TABLE solicitudes_aprobacion (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES empresas(id),
  tipo_solicitud text CHECK (tipo_solicitud IN ('modificar_factura', 'eliminar_factura')),
  estado text CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  solicitante_id text REFERENCES usuarios(id),
  aprobador_id text REFERENCES usuarios(id),
  factura_id uuid REFERENCES facturas_venta(id),
  datos_originales jsonb,
  datos_modificados jsonb,
  motivo text,
  comentarios_aprobador text,
  fecha_solicitud timestamptz,
  fecha_respuesta timestamptz
);
```

#### Tabla: `auditoria_cambios`

Registro de auditoría de todos los cambios.

```sql
CREATE TABLE auditoria_cambios (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES empresas(id),
  tabla_afectada text,
  registro_id uuid,
  tipo_operacion text CHECK (tipo_operacion IN ('crear', 'modificar', 'eliminar')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario_id text REFERENCES usuarios(id),
  solicitud_aprobacion_id uuid REFERENCES solicitudes_aprobacion(id),
  fecha timestamptz,
  metadata jsonb
);
```

### Edge Functions

#### 1. `solicitar-aprobacion-factura`

Crea una nueva solicitud de aprobación.

**URL**: `{SUPABASE_URL}/functions/v1/solicitar-aprobacion-factura`

**Body**:
```json
{
  "empresaId": "uuid",
  "facturaId": "uuid",
  "tipoSolicitud": "modificar_factura | eliminar_factura",
  "datosModificados": { }, // solo para modificaciones
  "motivo": "string",
  "usuarioId": "string"
}
```

**Respuesta**:
```json
{
  "success": true,
  "solicitud": { ... },
  "message": "Solicitud creada exitosamente"
}
```

#### 2. `aprobar-rechazar-solicitud`

Aprueba o rechaza una solicitud pendiente.

**URL**: `{SUPABASE_URL}/functions/v1/aprobar-rechazar-solicitud`

**Body**:
```json
{
  "solicitudId": "uuid",
  "accion": "aprobar | rechazar",
  "aprobadorId": "string",
  "comentarios": "string" // opcional para aprobar, requerido para rechazar
}
```

**Flujo**:
1. Verifica que el usuario tenga rol de supervisor o admin
2. Actualiza el estado de la solicitud
3. Si se aprueba:
   - Llama a `modificar-factura-aprobada` o `eliminar-factura-aprobada`
   - Ejecuta la operación automáticamente

#### 3. `modificar-factura-aprobada`

Modifica una factura y actualiza todos los registros asociados.

**URL**: `{SUPABASE_URL}/functions/v1/modificar-factura-aprobada`

**Operaciones que realiza**:
1. Registra la factura original en auditoría
2. Elimina asientos contables anteriores (con auditoría)
3. Actualiza la factura con los nuevos datos
4. Regenera asientos contables automáticamente
5. Si el monto cambió:
   - Actualiza movimientos de tesorería
   - Actualiza pagos de cliente
   - Registra todos los cambios en auditoría

#### 4. `eliminar-factura-aprobada`

Elimina una factura y TODOS sus registros asociados.

**URL**: `{SUPABASE_URL}/functions/v1/eliminar-factura-aprobada`

**Operaciones que realiza** (con auditoría completa):
1. Registra la factura en auditoría
2. Elimina items de la factura
3. Elimina asientos contables
4. Elimina movimientos de tesorería
5. Elimina pagos de cliente
6. Si es factura de comisión, actualiza comisiones a estado "pendiente"
7. Elimina la factura principal

### Frontend

#### Servicio: `aprobacionesService`

**Archivo**: `/src/services/supabase/aprobaciones.ts`

**Métodos principales**:
- `solicitarModificacion(empresaId, facturaId, datosModificados, motivo, usuarioId)`
- `solicitarEliminacion(empresaId, facturaId, motivo, usuarioId)`
- `aprobarSolicitud(solicitudId, aprobadorId, comentarios?)`
- `rechazarSolicitud(solicitudId, aprobadorId, comentarios)`
- `obtenerSolicitudesPendientes(empresaId)`
- `obtenerTodasSolicitudes(empresaId)`
- `obtenerAuditoriaFactura(facturaId)`

#### Hook: `useAprobacionesFacturas`

**Archivo**: `/src/hooks/useAprobacionesFacturas.ts`

**Estado que maneja**:
- `solicitudes`: Todas las solicitudes
- `loading`: Estado de carga
- `error`: Errores
- `contadorPendientes`: Número de solicitudes pendientes

**Funciones**:
- `solicitarModificacion(facturaId, datosModificados, motivo, usuarioId)`
- `solicitarEliminacion(facturaId, motivo, usuarioId)`
- `aprobarSolicitud(solicitudId, aprobadorId, comentarios?)`
- `rechazarSolicitud(solicitudId, aprobadorId, comentarios)`
- `recargarSolicitudes()`

#### Componente: `SolicitudAprobacionModal`

**Archivo**: `/src/components/ventas/SolicitudAprobacionModal.tsx`

Modal para solicitar aprobación de modificación o eliminación.

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `onSubmit`: (motivo: string) => Promise<void>
- `tipo`: 'modificar' | 'eliminar'
- `facturaNumero`: string

**Características**:
- Validación de motivo requerido
- Información sobre el flujo de aprobación
- Manejo de errores
- Estado de carga

## Integración en la Aplicación

### Página: Facturas (Ventas → Facturas)

**Modificaciones necesarias**:

1. Importar el hook y componentes:
```typescript
import { useAprobacionesFacturas } from '../../hooks/useAprobacionesFacturas';
import { SolicitudAprobacionModal } from '../../components/ventas/SolicitudAprobacionModal';
import { useAuth } from '../../context/AuthContext';
```

2. Agregar estado:
```typescript
const { usuario } = useAuth();
const {
  solicitarModificacion,
  solicitarEliminacion,
} = useAprobacionesFacturas(empresaActual?.id);

const [showSolicitudModal, setShowSolicitudModal] = useState(false);
const [tipoSolicitud, setTipoSolicitud] = useState<'modificar' | 'eliminar'>('modificar');
const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaVenta | null>(null);
```

3. Modificar `handleEditFactura`:
```typescript
const handleEditFactura = (factura: FacturaVenta) => {
  setFacturaSeleccionada(factura);
  setTipoSolicitud('modificar');
  setShowSolicitudModal(true);
};
```

4. Modificar `handleEliminarFactura`:
```typescript
const handleEliminarFactura = (factura: FacturaVenta) => {
  setFacturaSeleccionada(factura);
  setTipoSolicitud('eliminar');
  setShowSolicitudModal(true);
};
```

5. Agregar handler para el modal:
```typescript
const handleSolicitarAprobacion = async (motivo: string) => {
  if (!facturaSeleccionada || !usuario) return;

  try {
    if (tipoSolicitud === 'modificar') {
      await solicitarModificacion(
        facturaSeleccionada.id,
        {}, // datos modificados se obtendrían de un formulario
        motivo,
        usuario.id
      );
      mostrarNotificacion('success', 'Solicitud Enviada',
        'La solicitud de modificación ha sido enviada para aprobación');
    } else {
      await solicitarEliminacion(
        facturaSeleccionada.id,
        motivo,
        usuario.id
      );
      mostrarNotificacion('success', 'Solicitud Enviada',
        'La solicitud de eliminación ha sido enviada para aprobación');
    }
    setShowSolicitudModal(false);
    setFacturaSeleccionada(null);
  } catch (error: any) {
    mostrarNotificacion('error', 'Error', error.message);
  }
};
```

6. Agregar el modal en el JSX:
```typescript
<SolicitudAprobacionModal
  isOpen={showSolicitudModal}
  onClose={() => {
    setShowSolicitudModal(false);
    setFacturaSeleccionada(null);
  }}
  onSubmit={handleSolicitarAprobacion}
  tipo={tipoSolicitud}
  facturaNumero={facturaSeleccionada?.numero_factura || ''}
/>
```

### Página: Bandeja de Autorizaciones (Admin → Bandeja de Autorizaciones)

**Actualización necesaria**:

La página actual maneja autorizaciones de tesorería. Necesita actualizarse para también mostrar solicitudes de facturas:

1. Agregar hook:
```typescript
const aprobacionesFacturas = useAprobacionesFacturas(empresaActual?.id);
```

2. Combinar solicitudes:
```typescript
const todasSolicitudes = [
  ...solicitudes, // solicitudes de tesorería
  ...aprobacionesFacturas.solicitudes.map(s => ({
    ...s,
    tipoOperacion: s.tipo_solicitud,
    // mapear campos según sea necesario
  }))
];
```

3. Agregar filtros para tipo de solicitud (tesorería vs facturas)

## Permisos Requeridos

### Para Solicitar Aprobación
- Cualquier usuario autenticado puede crear solicitudes

### Para Aprobar/Rechazar
- Rol: `supervisor` o `admin`
- No puede aprobar/rechazar sus propias solicitudes
- Debe tener acceso a la empresa asociada

## Ejemplo de Uso Completo

### 1. Solicitar Eliminación de Factura

```typescript
const resultado = await aprobacionesService.solicitarEliminacion(
  '123e4567-e89b-12d3-a456-426614174000', // empresaId
  '123e4567-e89b-12d3-a456-426614174001', // facturaId
  'Factura duplicada por error del sistema', // motivo
  'user_123' // usuarioId
);

console.log(resultado);
// {
//   success: true,
//   solicitud: { id: '...', estado: 'pendiente', ... },
//   message: 'Solicitud de eliminación creada exitosamente'
// }
```

### 2. Aprobar Solicitud

```typescript
const resultado = await aprobacionesService.aprobarSolicitud(
  '123e4567-e89b-12d3-a456-426614174002', // solicitudId
  'supervisor_456', // aprobadorId
  'Aprobado. Factura efectivamente duplicada' // comentarios opcionales
);

// La factura se eliminará automáticamente al aprobar
// Todos los registros asociados se eliminarán
// Todo quedará registrado en auditoría
```

### 3. Consultar Auditoría

```typescript
const auditoria = await aprobacionesService.obtenerAuditoriaFactura(
  '123e4567-e89b-12d3-a456-426614174001' // facturaId
);

console.log(auditoria);
// [
//   {
//     id: '...',
//     tabla_afectada: 'facturas_venta',
//     tipo_operacion: 'eliminar',
//     datos_anteriores: { numero_factura: 'A-00000001', ... },
//     datos_nuevos: null,
//     usuario_id: 'supervisor_456',
//     solicitud_aprobacion_id: '...',
//     fecha: '2026-02-05T...',
//     metadata: {}
//   },
//   ...
// ]
```

## Ventajas del Sistema

1. **Trazabilidad Completa**: Todos los cambios quedan registrados con fecha, usuario y motivo
2. **Seguridad**: Requiere aprobación de supervisor/admin para operaciones críticas
3. **Auditoría Automática**: No requiere intervención manual para registrar cambios
4. **Integridad de Datos**: Las actualizaciones en cascada mantienen consistencia
5. **Reversibilidad**: Los datos anteriores quedan guardados en auditoría
6. **Control de Acceso**: Solo usuarios autorizados pueden aprobar solicitudes

## Archivos Creados

### Migraciones
- `20260205050000_crear_sistema_aprobaciones_facturas.sql`

### Edge Functions
- `/supabase/functions/solicitar-aprobacion-factura/index.ts`
- `/supabase/functions/aprobar-rechazar-solicitud/index.ts`
- `/supabase/functions/modificar-factura-aprobada/index.ts`
- `/supabase/functions/eliminar-factura-aprobada/index.ts`

### Frontend
- `/src/services/supabase/aprobaciones.ts` - Servicio para interactuar con API
- `/src/hooks/useAprobacionesFacturas.ts` - Hook personalizado
- `/src/components/ventas/SolicitudAprobacionModal.tsx` - Modal de solicitud

## Estado del Sistema

✅ Base de datos creada (tablas y funciones)
✅ Edge functions desplegadas
✅ Servicio frontend implementado
✅ Hook personalizado creado
✅ Componentes UI creados
⏳ Pendiente: Integración completa en página de Facturas
⏳ Pendiente: Actualización de Bandeja de Autorizaciones

## Testing

### Flujo de Prueba Completo

1. **Crear una factura de prueba**
   - Ir a Ventas → Facturas
   - Crear nueva factura

2. **Solicitar eliminación**
   - Click en botón eliminar
   - Ingresar motivo
   - Enviar solicitud

3. **Aprobar la solicitud**
   - Ir a Admin → Bandeja de Autorizaciones
   - Seleccionar la solicitud pendiente
   - Click en "Aprobar"
   - Verificar que la factura se eliminó automáticamente

4. **Consultar auditoría**
   - Ir a Admin → Auditoría
   - Buscar por la factura eliminada
   - Verificar que todos los registros están auditados

## Notas Importantes

- Las modificaciones regeneran automáticamente todos los asientos contables
- Las eliminaciones son en cascada (eliminan TODO lo relacionado)
- No se puede aprobar una solicitud propia
- Los comentarios son opcionales al aprobar, pero requeridos al rechazar
- Todas las operaciones son atómicas (o se completan todas o ninguna)
