# 📘 Guía Completa de Integración - Webhook v2

## 🎯 Resumen Ejecutivo

Este documento explica:
1. ✅ Formato JSON exacto que DogCatify debe enviar
2. ✅ Qué hace el sistema automáticamente
3. ✅ Cuándo y cómo se generan las facturas a partners
4. ✅ Si se envían automáticamente a DGI (facturación electrónica)
5. ✅ Flujo completo paso a paso

---

## 📨 1. FORMATO JSON QUE DOGCATIFY DEBE ENVIAR

### URL del Webhook:
```
POST https://[tu-proyecto].supabase.co/functions/v1/webhooks-orders
```

### Headers:
```http
Content-Type: application/json
X-Webhook-Secret: [tu-secret]
```

### JSON Completo (Ejemplo Real):

```json
{
  "event": "order.paid",
  "version": "2.0",
  "order_id": "ORD-123474",
  "empresa_id": "a2fb84eb-c91c-4f3e-88c3-4a9c3420009e",
  "crm_customer_id": "CRM-CUST-789",

  "customer": {
    "nombre": "Juan Pérez",
    "documento": "12345678-9",
    "tipo_documento": "CI",
    "email": "juan@email.com",
    "telefono": "+598 99 123 456",
    "direccion": "Av. Principal 123, Montevideo"
  },

  "items": [
    {
      "tipo": "servicio",
      "codigo": "SERV-VET-001",
      "descripcion": "Consulta veterinaria general + vacuna antirrábica",
      "cantidad": 1,
      "precio_unitario": 1000,
      "descuento_porcentaje": 10,
      "descuento_monto": 100,
      "subtotal": 900,
      "tasa_iva": 0.22,
      "monto_iva": 198,
      "total": 1098,

      "partner": {
        "id": "VET-001",
        "nombre": "Veterinaria Dr. Pérez",
        "documento": "217654321-0",
        "tipo_documento": "RUT",
        "email": "facturacion@vetperez.com",
        "telefono": "+598 99 888 777",
        "direccion": "Av. Italia 2500, Montevideo",
        "comision_porcentaje": 80,
        "comision_monto": 720
      }
    },
    {
      "tipo": "producto",
      "codigo": "PROD-RC-15KG",
      "descripcion": "Alimento Royal Canin Medium Adult 15kg",
      "cantidad": 2,
      "precio_unitario": 1500,
      "descuento_porcentaje": 5,
      "descuento_monto": 150,
      "subtotal": 2850,
      "tasa_iva": 0.22,
      "monto_iva": 627,
      "total": 3477,

      "partner": {
        "id": "TIENDA-002",
        "nombre": "Pet Shop Central S.A.",
        "documento": "218765432-1",
        "tipo_documento": "RUT",
        "email": "ventas@petshopcentral.com",
        "telefono": "+598 99 777 666",
        "direccion": "18 de Julio 1234, Montevideo",
        "comision_porcentaje": 70,
        "comision_monto": 1995
      }
    }
  ],

  "totales": {
    "subtotal": 4300,
    "descuento_total": 250,
    "subtotal_con_descuento": 4050,
    "iva_total": 825,
    "total_factura": 4575,
    "comision_partners_total": 2715,
    "ganancia_plataforma": 1610,
    "impuesto_gateway": 137.25
  },

  "payment": {
    "method": "mercadopago",
    "gateway": "mercadopago",
    "transaction_id": "MP-98765432",
    "paid_at": "2025-11-20T15:30:00Z",
    "impuesto_gateway_porcentaje": 3.0,
    "impuesto_gateway_monto": 137.25,
    "neto_recibido": 4437.75
  },

  "metadata": {
    "plataforma": "dogcatify",
    "app_version": "2.1.0",
    "origen_venta": "app_movil",
    "id_sucursal": "SUC-001",
    "vendedor": "Maria Lopez",
    "notas": "Cliente frecuente - aplicar descuento"
  }
}
```

---

## 📋 2. CAMPOS EXPLICADOS EN DETALLE

### 🔴 Campos OBLIGATORIOS

#### Nivel Raíz:
| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `event` | string | Siempre `"order.paid"` | `"order.paid"` |
| `version` | string | Versión del formato | `"2.0"` |
| `order_id` | string | ID único de la orden en DogCatify | `"ORD-123474"` |
| `empresa_id` | uuid | UUID de tu empresa en el sistema | `"a2fb84eb-..."` |

#### Customer (Cliente que compra):
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `nombre` | string | ✅ | Nombre completo |
| `documento` | string | ✅ | CI, RUT, Pasaporte |
| `tipo_documento` | string | ❌ | CI, RUT, PASAPORTE |
| `email` | string | ✅ | Email válido |
| `telefono` | string | ❌ | Con código país |
| `direccion` | string | ❌ | Dirección completa |

#### Items (Productos/Servicios vendidos):
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `tipo` | string | ✅ | `"servicio"` o `"producto"` |
| `codigo` | string | ✅ | SKU/Código interno |
| `descripcion` | string | ✅ | Descripción completa |
| `cantidad` | number | ✅ | Cantidad vendida |
| `precio_unitario` | number | ✅ | Precio sin descuento |
| `descuento_porcentaje` | number | ✅ | % descuento (0 si no hay) |
| `descuento_monto` | number | ✅ | Monto en $ del descuento |
| `subtotal` | number | ✅ | precio * cantidad - descuento |
| `tasa_iva` | number | ✅ | 0.22 en Uruguay (22%) |
| `monto_iva` | number | ✅ | IVA calculado |
| `total` | number | ✅ | subtotal + iva |

#### Partner (Por cada item):
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | string | ✅ | ID del partner en DogCatify |
| `nombre` | string | ✅ | Razón social o nombre |
| `documento` | string | ✅ | RUT del partner |
| `tipo_documento` | string | ❌ | Generalmente "RUT" |
| `email` | string | ✅ | Email para facturación |
| `telefono` | string | ❌ | Teléfono de contacto |
| `direccion` | string | ❌ | Dirección fiscal |
| `comision_porcentaje` | number | ✅ | % que se lleva el partner |
| `comision_monto` | number | ✅ | Monto en $ de la comisión |

#### Totales:
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `subtotal` | number | ✅ | Suma de precios sin desc. |
| `descuento_total` | number | ✅ | Suma de todos los desc. |
| `subtotal_con_descuento` | number | ✅ | subtotal - descuentos |
| `iva_total` | number | ✅ | Suma de todos los IVAs |
| `total_factura` | number | ✅ | Total que paga el cliente |
| `comision_partners_total` | number | ✅ | Suma comisiones partners |
| `ganancia_plataforma` | number | ✅ | Lo que queda DogCatify |
| `impuesto_gateway` | number | ✅ | Costo MercadoPago/Stripe |

#### Payment:
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `method` | string | ✅ | mercadopago, stripe, etc |
| `gateway` | string | ✅ | Nombre del gateway |
| `transaction_id` | string | ✅ | ID de transacción |
| `paid_at` | string | ✅ | ISO 8601 fecha/hora pago |
| `impuesto_gateway_porcentaje` | number | ✅ | % cobrado por gateway |
| `impuesto_gateway_monto` | number | ✅ | Monto en $ del impuesto |
| `neto_recibido` | number | ✅ | Total - impuesto gateway |

---

## ⚙️ 3. QUÉ HACE EL SISTEMA AUTOMÁTICAMENTE

### ✅ AL RECIBIR EL WEBHOOK (INMEDIATO):

#### Paso 1: Validación
```
1. Valida X-Webhook-Secret
2. Valida estructura JSON
3. Valida campos obligatorios
4. Valida que empresa_id exista
```

#### Paso 2: Procesamiento Cliente
```
1. Busca si el cliente ya existe (por documento)
2. Si NO existe → Crea nuevo cliente
3. Si existe → Actualiza datos si cambiaron
```

#### Paso 3: Procesamiento Partners (por cada item)
```
Por cada partner en items[]:
  1. Busca si el partner ya existe (por partner_id)
  2. Si NO existe → Crea nuevo partner con datos recibidos
  3. Si existe → Actualiza email, teléfono si cambiaron
```

#### Paso 4: Crear Factura de Venta (AL CLIENTE)
```
1. Genera número de factura: 00000001, 00000002, etc.
2. Crea factura_venta con:
   - cliente_id
   - items con descuentos
   - subtotal, iva, total
   - estado: "borrador"
3. Inserta todos los items (facturas_venta_items)
```

#### Paso 5: Registrar Comisiones (por cada item)
```
Por cada item con partner:
  1. Crea registro en comisiones_partners:
     - factura_venta_id
     - partner_id
     - order_id (de DogCatify)
     - comision_monto
     - comision_porcentaje
     - estado_comision: "pendiente"  ← NO FACTURADA AÚN
     - estado_pago: "pendiente"       ← NO PAGADA AÚN
```

#### Paso 6: Generar Asientos Contables (AUTOMÁTICO)
```
Asiento 1 - Venta al cliente:
  DEBE:  Cuentas por Cobrar        $4,575.00
  HABER: Ventas                     $4,050.00
  HABER: IVA por Pagar              $  525.00

Asiento 2 - Comisiones (gasto):
  DEBE:  Gastos - Comisiones        $2,715.00
  HABER: Cuentas por Pagar Partners $2,715.00

Asiento 3 - Impuesto Gateway:
  DEBE:  Gastos - Comisión Financ.  $  137.25
  HABER: Bancos                      $  137.25
```

#### Paso 7: Respuesta a DogCatify
```json
{
  "success": true,
  "data": {
    "factura_id": "uuid-de-la-factura",
    "numero_factura": "00000123",
    "cliente_id": "uuid-del-cliente",
    "comisiones_registradas": 2,
    "total_comisiones": 2715.00
  }
}
```

### ⏱️ TIEMPO DE PROCESAMIENTO:
- ✅ **2-3 segundos** en promedio
- ✅ Todo es **transaccional** (si algo falla, nada se guarda)

---

## 🔄 4. FACTURACIÓN ELECTRÓNICA (DGI)

### 🟢 Factura AL CLIENTE (Venta):

**¿Se envía automáticamente a DGI?**
```
❌ NO, por defecto NO se envía automáticamente

✅ Opciones para enviar:

1. MANUAL (Recomendado para empezar):
   - Usuario entra al sistema
   - Ve la factura en estado "borrador"
   - Click en "Enviar a DGI"
   - Sistema envía y marca como enviada

2. AUTOMÁTICA (Configurable):
   - Puedes activar envío automático
   - Al crear la factura → envía a DGI inmediatamente
   - Requiere configuración CFE previa
```

**¿Cómo se envía manualmente?**
```
1. Usuario accede a "Ventas > Facturas"
2. Busca factura por número o cliente
3. Click en botón "📤 Enviar a DGI"
4. Sistema:
   - Genera XML CFE
   - Envía a API de DGI
   - Recibe CAE (Código de Autorización)
   - Actualiza factura con:
     * dgi_enviada: true
     * dgi_cae: "CAE-123456"
     * dgi_fecha_envio: timestamp
     * dgi_hash: hash del documento
```

**Estado después de envío:**
```
ANTES:
  estado: "borrador"
  dgi_enviada: false

DESPUÉS:
  estado: "borrador"  ← NO CAMBIA (enviado ≠ pagado)
  dgi_enviada: true
  dgi_cae: "CAE-123456"
```

### 🔴 Facturas A PARTNERS (Compra):

**¿Cuándo se generan?**
```
📅 Cada 15 días (o frecuencia configurada por partner)

Día 15 de cada mes (o día configurado):
  1. Job automático busca comisiones pendientes
  2. Agrupa por partner
  3. Genera 1 factura de compra por partner
  4. Marca comisiones como "facturadas"
```

**¿Se envían automáticamente a DGI?**
```
❌ NO, las facturas de compra (a proveedores) generalmente
   NO se envían a DGI porque:

   1. El partner debe emitir SU propia factura
   2. Esta es una factura interna de registro
   3. Sirve para:
      - Control contable interno
      - Saber cuánto debemos a cada partner
      - Generar el pago
```

**Flujo real:**
```
DogCatify debe pagarle a Partner:
  1. DogCatify genera factura interna (registro)
  2. DogCatify notifica al Partner: "Te debemos $X"
  3. Partner emite SU factura a DogCatify (esta sí va a DGI)
  4. DogCatify recibe factura del partner
  5. DogCatify paga al partner
```

---

## 📆 5. PROCESO DE FACTURACIÓN A PARTNERS

### Ejemplo Cronológico Completo:

```
📅 DÍA 1 (Lunes 1 Nov):
  Cliente compra en DogCatify → Orden ORD-001
  ↓
  Webhook → Sistema Contable
  ↓
  Crea factura venta: FACT-00001
  ↓
  Registra comisión:
    partner: VET-001
    monto: $800
    estado: "pendiente"

📅 DÍA 3 (Miércoles 3 Nov):
  Cliente compra en DogCatify → Orden ORD-002
  ↓
  Registra comisión:
    partner: VET-001
    monto: $650
    estado: "pendiente"

📅 DÍA 7 (Domingo 7 Nov):
  Cliente compra en DogCatify → Orden ORD-003
  ↓
  Registra comisión:
    partner: VET-001
    monto: $920
    estado: "pendiente"

📅 DÍA 15 (Lunes 15 Nov) ⚡ JOB AUTOMÁTICO:
  Sistema revisa comisiones pendientes
  ↓
  Encuentra para VET-001:
    - ORD-001: $800
    - ORD-002: $650
    - ORD-003: $920
    - TOTAL:   $2,370
  ↓
  Genera:
    1. Lote de Facturación #1
       periodo: 1-15 Nov
       total: $2,370

    2. Factura de Compra #FC-0001
       proveedor: VET-001
       concepto: "Comisiones periodo 1-15 Nov"
       items:
         - ORD-001: $800
         - ORD-002: $650
         - ORD-003: $920
       total: $2,370
  ↓
  Actualiza comisiones:
    estado_comision: "facturada"
    lote_facturacion_id: #1
    factura_compra_id: FC-0001
  ↓
  Notifica a VET-001:
    "Tu liquidación del periodo 1-15 Nov está lista"
    "Total a pagar: $2,370"
    "Adjunto: detalle_comisiones.pdf"

📅 DÍA 17 (Miércoles 17 Nov):
  VET-001 emite su factura a DogCatify
  ↓
  DogCatify registra la factura recibida
  ↓
  DogCatify transfiere $2,370 a VET-001
  ↓
  Sistema actualiza:
    estado_pago: "pagada"
    fecha_pagada: 17-Nov-2025
```

---

## 🎯 6. CONFIGURACIÓN DE PARTNERS

### Frecuencias de Facturación:

```javascript
{
  "semanal": {
    dias: 7,
    descripcion: "Cada lunes se genera factura"
  },

  "quincenal": {
    dias: 15,
    descripcion: "Día 15 y 30 de cada mes",
    default: true  // ← Recomendado
  },

  "mensual": {
    dias: 30,
    descripcion: "Último día del mes"
  },

  "bimensual": {
    dias: 60,
    descripcion: "Cada 2 meses"
  }
}
```

### Ejemplo de Configuración de Partner:

```javascript
// Cuando llega el primer webhook con un partner nuevo:
{
  partner_id_externo: "VET-001",
  razon_social: "Veterinaria Dr. Pérez S.A.",
  documento: "217654321-0",
  email: "facturacion@vetperez.com",

  // Se configura automáticamente:
  comision_porcentaje_default: 80,  // Del JSON
  facturacion_frecuencia: "quincenal",  // Default
  dia_facturacion: 15,  // Default
  activo: true
}

// Después se puede modificar manualmente:
// "Cambiar a facturación semanal para este partner"
```

---

## 📊 7. CONSULTAS Y REPORTES

### Dashboard de Comisiones (Vista Administrador):

```sql
-- Ver comisiones pendientes por partner
SELECT
  p.razon_social,
  COUNT(*) as ordenes,
  SUM(c.comision_monto) as total_pendiente
FROM comisiones_partners c
JOIN partners_aliados p ON p.id = c.partner_id
WHERE c.estado_comision = 'pendiente'
  AND c.empresa_id = '[tu-empresa-id]'
GROUP BY p.id, p.razon_social
ORDER BY total_pendiente DESC;
```

**Resultado:**
```
┌──────────────────────────┬─────────┬─────────────────┐
│ Razón Social             │ Órdenes │ Total Pendiente │
├──────────────────────────┼─────────┼─────────────────┤
│ Veterinaria Dr. Pérez    │   12    │    $9,450.00    │
│ Pet Shop Central         │    8    │    $6,780.00    │
│ Grooming Deluxe          │    5    │    $3,200.00    │
└──────────────────────────┴─────────┴─────────────────┘
```

### Detalle de Comisiones de un Partner:

```sql
-- Ver todas las comisiones de VET-001
SELECT
  c.order_id,
  c.fecha,
  c.descripcion,
  c.comision_monto,
  c.estado_comision,
  c.estado_pago,
  f.numero_factura
FROM comisiones_partners c
JOIN facturas_venta f ON f.id = c.factura_venta_id
WHERE c.partner_id = '[partner-uuid]'
ORDER BY c.fecha DESC
LIMIT 20;
```

---

## 🚀 8. TESTING Y VALIDACIÓN

### Test 1: Enviar Orden Simple

```bash
curl -X POST https://tu-proyecto.supabase.co/functions/v1/webhooks-orders \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: tu-secret" \
  -d '{
    "event": "order.paid",
    "version": "2.0",
    "order_id": "TEST-001",
    "empresa_id": "tu-empresa-uuid",
    "customer": {
      "nombre": "Test Cliente",
      "documento": "12345678-9",
      "email": "test@test.com"
    },
    "items": [{
      "tipo": "servicio",
      "codigo": "TEST-SERV",
      "descripcion": "Servicio de prueba",
      "cantidad": 1,
      "precio_unitario": 1000,
      "descuento_porcentaje": 0,
      "descuento_monto": 0,
      "subtotal": 1000,
      "tasa_iva": 0.22,
      "monto_iva": 220,
      "total": 1220,
      "partner": {
        "id": "TEST-PARTNER",
        "nombre": "Partner de Prueba",
        "documento": "99999999-9",
        "email": "partner@test.com",
        "comision_porcentaje": 80,
        "comision_monto": 800
      }
    }],
    "totales": {
      "subtotal": 1000,
      "descuento_total": 0,
      "subtotal_con_descuento": 1000,
      "iva_total": 220,
      "total_factura": 1220,
      "comision_partners_total": 800,
      "ganancia_plataforma": 200,
      "impuesto_gateway": 36.60
    },
    "payment": {
      "method": "mercadopago",
      "gateway": "mercadopago",
      "transaction_id": "TEST-MP-001",
      "paid_at": "2025-11-20T10:00:00Z",
      "impuesto_gateway_porcentaje": 3,
      "impuesto_gateway_monto": 36.60,
      "neto_recibido": 1183.40
    }
  }'
```

### Validar Resultado:

```sql
-- 1. Verificar que se creó la factura
SELECT * FROM facturas_venta
WHERE metadata->>'order_id' = 'TEST-001';

-- 2. Verificar que se creó el partner
SELECT * FROM partners_aliados
WHERE partner_id_externo = 'TEST-PARTNER';

-- 3. Verificar que se registró la comisión
SELECT * FROM comisiones_partners
WHERE order_id = 'TEST-001';

-- 4. Verificar asientos contables
SELECT * FROM asientos_contables
WHERE referencia LIKE '%TEST-001%';
```

---

## ✅ 9. CHECKLIST DE IMPLEMENTACIÓN

### En DogCatify:

- [ ] Actualizar código para enviar JSON v2
- [ ] Incluir array `items[]` en vez de `service`
- [ ] Calcular y enviar descuentos
- [ ] Calcular y enviar comisiones por item
- [ ] Incluir impuesto de gateway (MercadoPago)
- [ ] Incluir datos completos de partner por item
- [ ] Probar en ambiente de desarrollo
- [ ] Validar cálculos matemáticos
- [ ] Implementar retry en caso de error

### En Sistema Contable:

- [x] ✅ Base de datos creada (partners, comisiones, lotes)
- [x] ✅ Migraciones aplicadas
- [ ] Actualizar webhook para procesar `items[]`
- [ ] Implementar registro de comisiones
- [ ] Crear job de facturación periódica
- [ ] Crear página de gestión de partners
- [ ] Crear dashboard de comisiones
- [ ] Implementar notificaciones a partners

---

## 📞 10. SOPORTE Y CONTACTO

### En caso de errores:

**Errores 400 (Bad Request):**
```json
{
  "error": "Invalid data",
  "details": {
    "field": "items[0].partner.email",
    "message": "Email is required"
  }
}
```
→ Revisar que todos los campos obligatorios estén presentes

**Errores 401 (Unauthorized):**
```json
{
  "error": "Invalid webhook secret"
}
```
→ Verificar el header `X-Webhook-Secret`

**Errores 500 (Server Error):**
```json
{
  "error": "Internal server error",
  "request_id": "req-123456"
}
```
→ Contactar soporte con el `request_id`

### Logs en DogCatify:

```javascript
// Loguear siempre antes de enviar
console.log('Enviando orden a Sistema Contable:', {
  order_id: order.id,
  total: order.total,
  items_count: order.items.length,
  partners_count: order.items.filter(i => i.partner).length
});

// Loguear respuesta
console.log('Respuesta de Sistema Contable:', response.data);
```

---

## 📝 RESUMEN FINAL

### ✅ Lo que hace el sistema AUTOMÁTICAMENTE:

1. ✅ Recibe webhook de DogCatify
2. ✅ Crea/actualiza clientes
3. ✅ Crea/actualiza partners
4. ✅ Genera factura de venta al cliente
5. ✅ Registra comisiones por cada item (estado: pendiente)
6. ✅ Genera asientos contables automáticos
7. ✅ **Cada 15 días**: Agrupa comisiones y genera facturas a partners

### ❌ Lo que NO hace automáticamente:

1. ❌ NO envía facturas a DGI automáticamente (es manual)
2. ❌ NO paga a los partners automáticamente (requiere aprobación)

### 📋 Formato JSON:

- ✅ Soporta múltiples items (servicios + productos)
- ✅ Descuentos por item (% y monto)
- ✅ Comisiones por item (% y monto)
- ✅ Impuesto de gateway (MercadoPago, etc)
- ✅ Partner diferente por cada item

---

**Versión:** 2.0
**Última actualización:** 20 de Noviembre, 2025
**Estado:** ✅ Base de datos lista, webhook pendiente de actualización
