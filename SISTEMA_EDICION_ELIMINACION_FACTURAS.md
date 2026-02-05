# Sistema de Edición y Eliminación de Facturas con Aprobaciones

## Resumen

Se ha implementado completamente el sistema que permite editar y eliminar facturas que ya están aprobadas (no en borrador), mediante un flujo de solicitud de aprobación.

## Funcionalidad Implementada

### 1. Botones de Acción en Facturas

Los botones de **Editar** y **Eliminar** ahora están visibles en:
- ✅ Facturas en estado **borrador** (acción directa)
- ✅ Facturas en estado **pendiente** (solicita aprobación)
- ✅ Facturas en estado **pagada** (solicita aprobación)
- ✅ Facturas en estado **vencida** (solicita aprobación)
- ❌ Facturas en estado **anulada** (no se pueden modificar ni eliminar)
- ❌ Facturas de **comisión** (generadas automáticamente, no editables)

### 2. Flujo de Edición

#### Si la factura está en BORRADOR:
1. Click en botón "Editar"
2. Se abre el modal de edición directamente
3. Se guarda sin necesidad de aprobación

#### Si la factura NO está en BORRADOR:
1. Click en botón "Editar"
2. Se abre modal de "Solicitar Modificación"
3. Usuario debe ingresar un **motivo** detallado
4. Se crea una **solicitud de aprobación** en estado "pendiente"
5. La solicitud aparece en la **Bandeja de Autorizaciones**
6. Un supervisor/admin debe aprobar o rechazar
7. Al aprobar:
   - Se ejecuta la función `modificar-factura-aprobada`
   - Se regeneran automáticamente todos los asientos contables
   - Se actualizan movimientos de tesorería y pagos asociados
   - Se registra en auditoría

### 3. Flujo de Eliminación

#### Si la factura está en BORRADOR:
1. Click en botón "Eliminar"
2. Se solicita confirmación
3. Se elimina directamente

#### Si la factura NO está en BORRADOR:
1. Click en botón "Eliminar"
2. Se abre modal de "Solicitar Eliminación"
3. Usuario debe ingresar un **motivo** detallado
4. Se crea una **solicitud de aprobación** en estado "pendiente"
5. La solicitud aparece en la **Bandeja de Autorizaciones**
6. Un supervisor/admin debe aprobar o rechazar
7. Al aprobar:
   - Se ejecuta la función `eliminar-factura-aprobada`
   - Se eliminan todos los registros asociados
   - Se registra en auditoría
   - **NOTA**: La anulación en DGI se implementará en una fase posterior

## Componentes Actualizados

### `/src/pages/ventas/Facturas.tsx`
- Agregado estado para manejar el modal de solicitud de aprobación
- Agregado `usuario` del contexto de sesión
- Modificados handlers `handleEditFactura` y `handleEliminarFactura` para detectar si requiere aprobación
- Botones de editar y eliminar ahora visibles en todas las facturas (excepto anuladas y comisiones)
- Agregado el modal `SolicitudAprobacionModal` al render

### `/src/components/ventas/SolicitudAprobacionModal.tsx`
- Actualizado para usar la nueva interfaz con `factura`, `tipo`, `usuarioId`, `empresaId`
- Integrado con `aprobacionesService` para crear solicitudes
- Muestra información contextual según el tipo de solicitud
- Validación de motivo obligatorio

## Edge Functions Utilizadas

1. **solicitar-aprobacion-factura**: Crea la solicitud de aprobación
2. **aprobar-rechazar-solicitud**: Procesa la aprobación/rechazo
3. **modificar-factura-aprobada**: Ejecuta la modificación aprobada
4. **eliminar-factura-aprobada**: Ejecuta la eliminación aprobada

## Base de Datos

### Tabla: `solicitudes_aprobacion`
Almacena todas las solicitudes de modificación y eliminación:
- `tipo_solicitud`: 'modificar_factura' | 'eliminar_factura'
- `estado`: 'pendiente' | 'aprobada' | 'rechazada'
- `solicitante_id`: Usuario que solicita
- `aprobador_id`: Usuario que aprueba/rechaza
- `factura_id`: Referencia a la factura
- `datos_originales`: Snapshot de la factura al momento de solicitar
- `motivo`: Razón de la solicitud
- `comentarios_aprobador`: Comentarios del aprobador

### Tabla: `auditoria_cambios`
Registra todos los cambios realizados en las facturas:
- Datos anteriores y nuevos
- Usuario que realizó el cambio
- Fecha y hora
- Referencia a la solicitud de aprobación

## Permisos Requeridos

Para aprobar solicitudes, el usuario debe:
- Tener rol de **supervisor** o **admin**
- Tener acceso a la empresa de la factura

## Próximos Pasos (Pendientes)

1. **Anulación en DGI**: Cuando se elimine una factura enviada a DGI, se debe:
   - Llamar al API de DGI para anular el CFE
   - Actualizar el estado en la base de datos
   - Registrar el resultado de la anulación

2. **Notificaciones**: Implementar notificaciones para:
   - Informar al supervisor cuando hay una nueva solicitud
   - Informar al solicitante cuando su solicitud fue aprobada/rechazada

3. **Dashboard de Aprobaciones**: Mejorar la visualización de:
   - Solicitudes pendientes por aprobar
   - Historial de solicitudes aprobadas/rechazadas
   - Métricas de tiempo de respuesta

## Testing

Para probar el sistema:

1. **Crear una factura en borrador**:
   - Verificar que se puede editar y eliminar directamente

2. **Cambiar estado a "pendiente"**:
   - Verificar que aparecen botones de editar/eliminar
   - Click en editar → debe abrir modal de solicitud
   - Click en eliminar → debe abrir modal de solicitud

3. **Enviar solicitud**:
   - Ingresar un motivo detallado
   - Verificar que aparece notificación de éxito
   - Verificar que la solicitud aparece en Bandeja de Autorizaciones

4. **Aprobar solicitud** (como supervisor/admin):
   - Ir a Administración → Bandeja de Autorizaciones
   - Localizar la solicitud pendiente
   - Aprobar o rechazar
   - Verificar que se ejecuta la acción correspondiente

## Notas Importantes

- Las facturas de comisión (generadas automáticamente) NO se pueden editar ni eliminar manualmente
- Las facturas anuladas NO se pueden modificar ni eliminar
- Todas las acciones quedan registradas en auditoría
- La anulación en DGI se implementará en una fase posterior (cuando se elimine una factura enviada)
