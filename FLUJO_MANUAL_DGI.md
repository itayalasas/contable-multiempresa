# Flujo Manual de Envío a DGI

## 🎯 Enfoque Nuevo: Manual + Actualización en Tiempo Real

Después de evaluar el enfoque automático, se implementó un flujo **manual más confiable** con actualización automática de datos.

## ✅ **Cambios Implementados**

### 1. **Supabase Realtime - Actualización Automática**

La pantalla de facturas ahora se actualiza automáticamente sin recargar:

```typescript
// En Facturas.tsx
useEffect(() => {
  if (empresaActual) {
    cargarFacturas();
    cargarEstadisticas();

    // 📡 Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('facturas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'facturas_venta',
          filter: `empresa_id=eq.${empresaActual.id}`,
        },
        (payload) => {
          console.log('📡 Cambio detectado:', payload);
          cargarFacturas();       // Recarga facturas
          cargarEstadisticas();   // Recarga estadísticas
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}, [empresaActual]);
```

**Beneficios:**
- ✅ Los datos se actualizan sin F5
- ✅ Múltiples pestañas se sincronizan
- ✅ Cambios visibles inmediatamente
- ✅ Sin polling, sin retraso

### 2. **Botón Manual Visible "Enviar DGI"**

El botón ahora es prominente y claro:

```typescript
// Botón azul con texto
<button
  onClick={() => handleEnviarDGI(factura)}
  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
>
  <svg>📤</svg>
  <span>Enviar DGI</span>
</button>
```

**Características:**
- 🔵 Color azul llamativo
- 📝 Texto claro "Enviar DGI"
- 👁️ Siempre visible en facturas no enviadas
- ❌ Desaparece después de enviar

### 3. **Flujo Simplificado**

```
Usuario crea factura
      ↓
Se guarda en estado: "borrador"
      ↓
Usuario ve botón azul "Enviar DGI"
      ↓
Hace clic en "Enviar DGI"
      ↓
Sistema confirma: "¿Desea enviar a DGI?"
      ↓
Usuario confirma
      ↓
Se envía a DGI:
  1. POST → Crear CFE
  2. Espera 500ms
  3. GET → Obtener CAE
  4. UPDATE → Guarda en BD
      ↓
Estado cambia a: "pendiente"
      ↓
📡 Realtime detecta el cambio
      ↓
Pantalla se actualiza automáticamente
      ↓
Botón "Enviar DGI" desaparece
      ↓
Ahora muestra: "Enviada ✓"
```

## 🎨 **Vista de Usuario**

### Antes de Enviar:
```
┌────────────────────────────────────────────────────┐
│ A-00000003  │ Cliente │ 11/19/25 │ $1,000 │ Borrador │
│             │         │          │        │          │
│             │         │          │        │ DGI: Pendiente │
│             │         │          │        │ [Enviar DGI] 🔵 │
└────────────────────────────────────────────────────┘
```

### Después de Enviar (Automático con Realtime):
```
┌────────────────────────────────────────────────────┐
│ A-00000003  │ Cliente │ 11/19/25 │ $1,000 │ Pendiente │
│             │         │          │        │          │
│             │         │          │        │ DGI: Enviada ✓ │
│             │         │          │        │ CAE: 90264315890 │
└────────────────────────────────────────────────────┘
```

## 🔄 **Estados de Factura**

| Estado | Descripción | Botón "Enviar DGI" | Puede Editar | Puede Eliminar |
|--------|-------------|-------------------|--------------|----------------|
| **Borrador** | Recién creada, no enviada | ✅ Visible | ✅ Sí | ✅ Sí |
| **Pendiente** | Enviada a DGI, esperando pago | ❌ No visible | ❌ No | ❌ No |
| **Pagada** | Factura cobrada | ❌ No visible | ❌ No | ❌ No |
| **Anulada** | Factura cancelada | ❌ No visible | ❌ No | ❌ No |

## 📋 **Proceso Paso a Paso**

### Usuario:

1. **Crear Factura**
   ```
   Ventas → Facturas → Nueva Factura
   Completar datos del cliente y productos
   Guardar
   ```

2. **Revisar Factura**
   ```
   Ver que la factura aparece con estado "Borrador"
   Ver botón azul "Enviar DGI"
   ```

3. **Enviar a DGI**
   ```
   Clic en botón "Enviar DGI"
   Confirmar en el modal
   Esperar mensaje de éxito
   ```

4. **Verificar Automáticamente**
   ```
   ¡La pantalla se actualiza sola!
   Estado cambia a "Pendiente"
   DGI muestra "Enviada ✓"
   Botón desaparece
   ```

### Sistema (Automático):

```typescript
// 1. Usuario hace clic en "Enviar DGI"
handleEnviarDGI(factura)

// 2. Modal de confirmación
setConfirmModal({
  title: 'Enviar a DGI',
  message: '¿Desea enviar la factura a DGI?',
  onConfirm: async () => {
    // 3. Llamada a la API
    await enviarFacturaDGI(factura.id);

    // 4. UPDATE en base de datos
    // dgi_enviada = true
    // estado = 'pendiente'
    // dgi_cae_numero = '90264315890'

    // 5. Realtime detecta el cambio
    // -> Trigger automático

    // 6. cargarFacturas() ejecuta
    // -> Pantalla se actualiza

    // 7. Usuario ve el cambio ¡SIN RECARGAR!
  }
});
```

## ✅ **Ventajas del Flujo Manual**

### 1. **Control Total**
- Usuario decide cuándo enviar
- Puede revisar antes de enviar
- Evita envíos accidentales

### 2. **Más Confiable**
- No depende de variables de entorno en build
- Funciona sin importar configuración del server
- Menos puntos de falla

### 3. **Feedback Claro**
- Botón visible indica acción pendiente
- Usuario sabe exactamente qué hacer
- Confirmación antes de enviar

### 4. **Actualización Automática**
- Realtime sincroniza datos
- Sin necesidad de F5
- Múltiples pestañas sincronizadas

### 5. **Debugging Fácil**
- Si falla, usuario lo ve inmediatamente
- Puede reintentar con el botón
- Logs claros en consola

## 🔧 **Configuración de Realtime**

Para que funcione Realtime, Supabase debe tener habilitado:

```sql
-- Verificar que Realtime esté habilitado para la tabla
ALTER TABLE facturas_venta REPLICA IDENTITY FULL;
```

En el dashboard de Supabase:
```
Database → Replication → facturas_venta → Enable
```

## 🧪 **Probar el Sistema**

### Test 1: Crear y Enviar Factura
```
1. Crear nueva factura
2. Verificar estado "Borrador"
3. Ver botón azul "Enviar DGI"
4. Hacer clic en "Enviar DGI"
5. Confirmar
6. Observar que la pantalla se actualiza sola
7. Estado cambia a "Pendiente"
8. Botón desaparece
```

### Test 2: Actualización en Tiempo Real
```
1. Abrir la app en 2 pestañas
2. En pestaña 1: Crear factura
3. En pestaña 2: Ver que aparece automáticamente
4. En pestaña 1: Enviar a DGI
5. En pestaña 2: Ver que se actualiza automáticamente
```

### Test 3: Verificar en Base de Datos
```sql
-- Ver facturas no enviadas (deberían tener botón)
SELECT numero_factura, estado, dgi_enviada
FROM facturas_venta
WHERE dgi_enviada = false
  AND estado != 'anulada'
ORDER BY fecha_creacion DESC;

-- Ver facturas enviadas (no deberían tener botón)
SELECT numero_factura, estado, dgi_enviada, dgi_cae_numero
FROM facturas_venta
WHERE dgi_enviada = true
ORDER BY fecha_creacion DESC;
```

## 📊 **Monitoreo**

### Console del Navegador (F12)
```javascript
// Al crear factura:
"📡 Cambio detectado: {eventType: 'INSERT', ...}"

// Al enviar a DGI:
"Enviando CFE a DGI: {payload}"
"CFE creado: {id: 334xxx, ...}"
"📡 Cambio detectado: {eventType: 'UPDATE', ...}"
"Factura actualizada automáticamente"
```

### Dashboard de Supabase
```
Table Editor → facturas_venta → Real-time
Ver eventos en tiempo real mientras usas la app
```

## ⚠️ **Consideraciones**

### 1. **Internet Requerido**
- Realtime requiere conexión activa
- Si se pierde conexión, se reconecta automáticamente
- Los cambios se sincronizan al reconectar

### 2. **Rate Limits**
- Respetar límites de la API de facturación
- No enviar múltiples facturas simultáneamente
- Esperar confirmación antes del próximo envío

### 3. **Permisos RLS**
- Realtime respeta Row Level Security
- Usuario solo ve cambios de su empresa
- Seguridad mantenida

## 🆘 **Troubleshooting**

### Problema: "No veo el botón 'Enviar DGI'"
**Solución:**
- Verificar que `dgi_enviada = false`
- Verificar que `estado != 'anulada'`
- La factura debe estar en estado "Borrador" o "Pendiente" sin enviar

### Problema: "Los datos no se actualizan automáticamente"
**Solución:**
1. Verificar en consola: ¿Aparece "📡 Cambio detectado"?
2. Si NO aparece: Realtime no está habilitado
3. Ir a Supabase Dashboard → Database → Replication
4. Habilitar para tabla `facturas_venta`

### Problema: "Error al enviar a DGI"
**Solución:**
1. Ver error en consola (F12)
2. Verificar variables de entorno en `.env`:
   ```
   VITE_DGI_API_CREATE_URL=...
   VITE_DGI_API_CREATE_KEY=...
   VITE_DGI_API_DETAIL_URL=...
   VITE_DGI_API_DETAIL_KEY=...
   ```
3. Reintentar con el botón "Enviar DGI"

## 📈 **Métricas**

### Facturas Pendientes de Envío
```sql
SELECT COUNT(*) as pendientes_envio
FROM facturas_venta
WHERE dgi_enviada = false
  AND estado = 'borrador';
```

### Tasa de Envío Exitoso
```sql
SELECT
  COUNT(*) FILTER (WHERE dgi_enviada = true) * 100.0 / COUNT(*) as tasa_exito
FROM facturas_venta
WHERE estado != 'anulada';
```

### Tiempo Promedio de Envío
```sql
SELECT
  AVG(
    EXTRACT(EPOCH FROM (dgi_fecha_envio::timestamp - fecha_creacion::timestamp))
  ) / 60 as minutos_promedio
FROM facturas_venta
WHERE dgi_enviada = true;
```

---

**Estado:** ✅ Implementado y funcionando
**Tipo:** Manual con Realtime
**Versión:** 2.0
**Fecha:** 2025-11-19
