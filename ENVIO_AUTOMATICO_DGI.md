# Envío Automático a DGI

## 🎯 Funcionalidad Implementada

El sistema ahora **envía automáticamente** cada factura al sistema de facturación electrónica (CFE) en el momento de su creación.

## 🔄 Flujo Automático

### 1. Usuario Crea Factura
```
Usuario hace clic en "Nueva Factura"
  ↓
Completa el formulario
  ↓
Hace clic en "Guardar"
```

### 2. Sistema Procesa Automáticamente
```typescript
// En FacturaModal.tsx - handleSubmit()

// 1. Crear factura en BD
const nuevaFactura = await crearFactura(input);
// Factura creada con estado: "pendiente"

// 2. Enviar automáticamente a DGI
try {
  await enviarFacturaDGI(nuevaFactura.id);
  alert('Factura creada y enviada a DGI exitosamente');
} catch (errorDGI) {
  alert('Factura creada, pero error al enviar a DGI: ' + errorDGI.message);
}
```

### 3. Proceso de Envío a DGI

#### Paso A: POST - Crear CFE
```http
POST https://api.flowbridge.site/.../1a062194-437a-4d61-8cb3-fe7d00f90234
Header: X-Integration-Key: pub_83e398f967f43cda32a97b7f5ea1cf27...
Body: {JSON de la factura}
```

**Respuesta:**
```json
{
  "id": 334535,
  "serie": "MT",
  "numero": "390122",
  "hash": "spLQZ24lzeJHOqehFXRbCXJmFmc="
}
```

#### Paso B: Espera 500ms
Sistema espera para que el CFE sea procesado

#### Paso C: GET - Obtener Detalle con CAE
```http
GET https://api.flowbridge.site/.../e9bebebc-351e-42ea-a431-4ff02105ef8b?id=334535
Header: X-Integration-Key: pub_90e731b2639b030baad40d14f7622afb...
```

**Respuesta:**
```json
{
  "id": 334535,
  "cae": {
    "numero": "90264315890",
    "serie": "MT",
    "fecha_expiracion": "2027-02-06"
  },
  // ... más información
}
```

#### Paso D: Guardar en BD
```sql
UPDATE facturas_venta SET
  dgi_enviada = true,
  dgi_id = 334535,
  dgi_serie = 'MT',
  dgi_numero = 390122,
  dgi_hash = 'spLQZ24l...',
  dgi_cae_numero = '90264315890',
  dgi_cae_vencimiento = '2027-02-06',
  dgi_detalle_completo = {JSON completo},
  dgi_response = {ambas respuestas}
WHERE id = factura_id;
```

## ✅ Ventajas del Envío Automático

### 1. **Sin Intervención Manual**
- El usuario no necesita recordar enviar a DGI
- Se evitan olvidos o errores humanos
- Flujo continuo y eficiente

### 2. **Inmediato**
- La factura se envía en el mismo momento de creación
- No hay retrasos ni pendientes
- CAE disponible inmediatamente

### 3. **Trazabilidad Completa**
- Cada factura tiene su CFE asociado desde el inicio
- Información del CAE guardada automáticamente
- Historial completo de envío

### 4. **Manejo de Errores**
- Si falla el envío, la factura igual se guarda
- Usuario es notificado del error
- Puede reenviar manualmente después

## 🔧 Cambios Implementados

### 1. Estado Inicial de Facturas
**ANTES:**
```typescript
estado: 'borrador'
```

**AHORA:**
```typescript
estado: 'pendiente'
```

**Razón:** Las facturas se crean directamente en estado "pendiente" porque ya están enviadas a DGI y listas para cobrar.

### 2. FacturaModal.tsx - handleSubmit()
```typescript
// ANTES
await crearFactura(input);
onSuccess();

// AHORA
const nuevaFactura = await crearFactura(input);

try {
  await enviarFacturaDGI(nuevaFactura.id);
  alert('Factura creada y enviada a DGI exitosamente');
} catch (errorDGI) {
  alert('Factura creada, pero error al enviar a DGI: ' + errorDGI.message);
}

onSuccess();
```

### 3. Botones de Acciones Visibles
Los botones en la tabla de facturas se muestran según el estado:

| Estado | Ver | Editar | Pagar | DGI | PDF | Eliminar |
|--------|-----|--------|-------|-----|-----|----------|
| Pendiente | ✅ | ❌ | ✅ | ⚠️* | ✅ | ❌ |
| Pagada | ✅ | ❌ | ❌ | ⚠️* | ✅ | ❌ |
| Anulada | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

*⚠️ Solo si no fue enviada todavía (muy raro con envío automático)

## 🔍 Verificar que Funciona

### 1. Crear una Factura
```
1. Ir a Ventas → Facturas
2. Clic en "Nueva Factura"
3. Completar datos
4. Clic en "Guardar"
```

### 2. Ver en Consola del Navegador (F12)
```javascript
Enviando factura automáticamente a DGI...
Enviando CFE a DGI: {payload completo}
CFE creado exitosamente: {id, serie, numero, hash}
Detalle CFE obtenido: {JSON completo con CAE}
Factura enviada a DGI exitosamente
```

### 3. Ver Alert en Pantalla
```
"Factura creada y enviada a DGI exitosamente"
```

### 4. Verificar en Base de Datos
```sql
SELECT
  numero_factura,
  estado,
  dgi_enviada,
  dgi_id,
  dgi_serie || '-' || dgi_numero as cfe_numero,
  dgi_cae_numero,
  dgi_cae_vencimiento
FROM facturas_venta
WHERE numero_factura = 'A-00000002'  -- Última factura creada
ORDER BY fecha_creacion DESC
LIMIT 1;
```

**Resultado Esperado:**
```
numero_factura: A-00000002
estado: pendiente
dgi_enviada: true
dgi_id: 334535
cfe_numero: MT-390122
dgi_cae_numero: 90264315890
dgi_cae_vencimiento: 2027-02-06
```

## 🔀 Envío Manual (Backup)

Si una factura no se envió automáticamente por algún error, se puede enviar manualmente:

1. Ir a Ventas → Facturas
2. Buscar la factura
3. Hacer clic en el botón morado 📤 (Enviar a DGI)
4. Confirmar el envío

## 📊 Reportes

### Facturas Pendientes de Envío
```sql
SELECT
  numero_factura,
  fecha_emision,
  total,
  estado
FROM facturas_venta
WHERE dgi_enviada = false
  AND estado != 'anulada'
ORDER BY fecha_emision DESC;
```

### Facturas Enviadas Hoy
```sql
SELECT
  numero_factura,
  dgi_id,
  dgi_cae_numero,
  dgi_fecha_envio,
  total
FROM facturas_venta
WHERE dgi_fecha_envio::date = CURRENT_DATE
ORDER BY dgi_fecha_envio DESC;
```

### Resumen de Envíos
```sql
SELECT
  DATE(dgi_fecha_envio) as fecha,
  COUNT(*) as cantidad_facturas,
  SUM(total::numeric) as total_facturado
FROM facturas_venta
WHERE dgi_enviada = true
GROUP BY DATE(dgi_fecha_envio)
ORDER BY fecha DESC
LIMIT 30;
```

## ⚠️ Consideraciones

### 1. Conexión a Internet
- El envío automático requiere conexión a internet
- Si falla, la factura se guarda pero no se envía
- Usuario recibe notificación del error

### 2. Validación de Datos
- Todos los datos deben ser válidos antes de guardar
- Cliente, items, precios deben estar completos
- El sistema valida antes de intentar enviar

### 3. Límites de API
- Respetar rate limits de la API de facturación
- El sistema espera 500ms entre llamadas
- No crear múltiples facturas simultáneamente

## 🎯 Próximos Pasos

Con el envío automático implementado, se puede:

1. ✅ Integrar asientos contables automáticos
2. ✅ Generar reportes de facturación
3. ✅ Configurar notificaciones por email
4. ✅ Implementar descarga de PDF del CFE
5. ✅ Integrar con sistemas de pago

## 🆘 Troubleshooting

### Problema: "Factura creada pero error al enviar a DGI"
**Solución:**
1. Verificar conexión a internet
2. Verificar que las variables de entorno estén configuradas
3. Revisar console del navegador para ver el error exacto
4. Intentar envío manual con el botón 📤

### Problema: No se ve el botón "Enviar a DGI"
**Solución:**
- El botón solo aparece si `dgi_enviada = false`
- Con envío automático, casi nunca se verá este botón
- Es normal que todas las facturas nuevas ya estén enviadas

### Problema: Estado "pendiente" pero no enviada
**Solución:**
```sql
-- Ver factura específica
SELECT * FROM facturas_venta WHERE id = 'factura-id';

-- Ver error del envío
SELECT dgi_response FROM facturas_venta WHERE id = 'factura-id';

-- Resetear para reintentar
UPDATE facturas_venta
SET dgi_enviada = false, dgi_response = NULL
WHERE id = 'factura-id';
```
Luego usar botón manual de envío.

---

**Estado:** ✅ Implementado y funcionando
**Versión:** 1.0
**Fecha:** 2025-11-19
