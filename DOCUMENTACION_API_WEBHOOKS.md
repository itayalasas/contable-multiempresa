# Documentación de API y Webhooks - Sistema Contable

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Webhooks](#webhooks)
4. [Eventos Soportados](#eventos-soportados)
5. [Ejemplos de Integración](#ejemplos-de-integración)
6. [Manejo de Errores](#manejo-de-errores)
7. [Reintentos](#reintentos)
8. [Seguridad](#seguridad)

---

## Introducción

Este documento describe cómo integrar sistemas externos (CRM, aplicaciones de ventas, marketplaces) con el sistema contable mediante webhooks.

### ¿Qué son los Webhooks?

Los webhooks son notificaciones HTTP que tu sistema envía a nuestro sistema cuando ocurren eventos importantes (por ejemplo, cuando un cliente realiza un pago o cancela una orden).

### Flujo General

```
Tu Sistema → Evento (pago/cancelación) → POST a nuestro Webhook → Sistema Contable procesa → Respuesta
```

---

## Autenticación

### Webhook Secret

Cada webhook debe incluir un secret en el header para autenticación:

```http
POST /functions/v1/webhooks-orders
Host: [tu-proyecto].supabase.co
Content-Type: application/json
X-Webhook-Secret: tu-secret-aqui
```

### Obtener tu Webhook Secret

1. Contacta al administrador del sistema contable
2. Recibirás un `WEBHOOK_SECRET` único para tu empresa
3. Guarda este secret de forma segura (NO lo compartas públicamente)

---

## Webhooks

### Endpoint Principal

```
URL: https://[tu-proyecto].supabase.co/functions/v1/webhooks-orders
Método: POST
Content-Type: application/json
Headers: X-Webhook-Secret
```

### URL de Ejemplo

```
https://abcdefgh.supabase.co/functions/v1/webhooks-orders
```

---

## Eventos Soportados

### 1. Order Paid (Orden Pagada)

Se envía cuando un cliente completa un pago.

#### Estructura del Payload

```json
{
  "event": "order.paid",
  "order_id": "ORD-12345",
  "empresa_id": "uuid-de-tu-empresa",
  "crm_customer_id": "CRM-CUST-789",

  "customer": {
    "nombre": "Juan Pérez",
    "documento": "12345678-9",
    "email": "juan@email.com",
    "telefono": "+598 99 123 456",
    "direccion": "Av. Principal 123, Montevideo"
  },

  "service": {
    "tipo": "veterinaria",
    "descripcion": "Consulta veterinaria general",
    "partner_id": "VET-001",
    "partner_name": "Veterinaria Dr. Pérez"
  },

  "amounts": {
    "total": 1000,
    "partner_commission": 800,
    "platform_fee": 200,
    "tax": 180
  },

  "payment": {
    "method": "mercadopago",
    "transaction_id": "MP-98765",
    "paid_at": "2025-11-19T15:30:00Z"
  }
}
```

#### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `event` | string | Debe ser `"order.paid"` |
| `order_id` | string | ID único de la orden en tu sistema |
| `empresa_id` | string | UUID de la empresa (proporcionado por el sistema contable) |
| `customer.nombre` | string | Nombre completo del cliente |
| `customer.documento` | string | Número de documento de identidad |
| `customer.email` | string | Email del cliente |
| `service.descripcion` | string | Descripción del servicio/producto |
| `amounts.total` | number | Monto total incluido IVA |
| `amounts.tax` | number | Monto del IVA |
| `payment.method` | string | Método de pago usado |
| `payment.transaction_id` | string | ID de la transacción |
| `payment.paid_at` | string | Fecha y hora del pago (ISO 8601) |

#### Respuesta Exitosa

```json
{
  "success": true,
  "data": {
    "factura_id": "uuid-de-la-factura",
    "numero_factura": "00000123"
  }
}
```

#### Ejemplo de Código (Node.js)

```javascript
const axios = require('axios');

async function enviarOrdenPagada(orderData) {
  try {
    const response = await axios.post(
      'https://tu-proyecto.supabase.co/functions/v1/webhooks-orders',
      {
        event: 'order.paid',
        order_id: orderData.id,
        empresa_id: 'tu-empresa-uuid',
        customer: {
          nombre: orderData.customer_name,
          documento: orderData.customer_doc,
          email: orderData.customer_email,
          telefono: orderData.customer_phone
        },
        service: {
          tipo: orderData.service_type,
          descripcion: orderData.service_description
        },
        amounts: {
          total: orderData.total_amount,
          tax: orderData.tax_amount
        },
        payment: {
          method: orderData.payment_method,
          transaction_id: orderData.transaction_id,
          paid_at: new Date().toISOString()
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET
        }
      }
    );

    console.log('Factura creada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enviando webhook:', error.response?.data || error.message);
    throw error;
  }
}
```

#### Ejemplo de Código (Python)

```python
import requests
from datetime import datetime

def enviar_orden_pagada(order_data):
    url = "https://tu-proyecto.supabase.co/functions/v1/webhooks-orders"

    payload = {
        "event": "order.paid",
        "order_id": order_data['id'],
        "empresa_id": "tu-empresa-uuid",
        "customer": {
            "nombre": order_data['customer_name'],
            "documento": order_data['customer_doc'],
            "email": order_data['customer_email'],
            "telefono": order_data['customer_phone']
        },
        "service": {
            "tipo": order_data['service_type'],
            "descripcion": order_data['service_description']
        },
        "amounts": {
            "total": order_data['total_amount'],
            "tax": order_data['tax_amount']
        },
        "payment": {
            "method": order_data['payment_method'],
            "transaction_id": order_data['transaction_id'],
            "paid_at": datetime.utcnow().isoformat() + "Z"
        }
    }

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Secret": os.environ['WEBHOOK_SECRET']
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()

    print("Factura creada:", response.json())
    return response.json()
```

---

### 2. Order Cancelled (Orden Cancelada)

Se envía cuando se cancela una orden y se debe anular la factura.

#### Estructura del Payload

```json
{
  "event": "order.cancelled",
  "order_id": "ORD-12345",
  "empresa_id": "uuid-de-tu-empresa",
  "factura_id": "uuid-de-la-factura",

  "motivo": "cliente_solicita_reembolso",
  "tipo_anulacion": "total",
  "monto_devolver": 1000,

  "refund": {
    "method": "mercadopago",
    "transaction_id": "MP-REFUND-123",
    "status": "completed"
  },

  "metadata": {
    "cancelled_by": "customer",
    "cancelled_at": "2025-11-19T16:00:00Z",
    "reason_detail": "Cliente no pudo asistir a la consulta"
  }
}
```

#### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `event` | string | Debe ser `"order.cancelled"` |
| `order_id` | string | ID único de la orden en tu sistema |
| `empresa_id` | string | UUID de la empresa |
| `motivo` | string | Motivo de la cancelación (ver opciones abajo) |
| `tipo_anulacion` | string | `"total"` o `"parcial"` |
| `monto_devolver` | number | Monto a devolver al cliente |
| `metadata.cancelled_by` | string | Quién canceló: `customer`, `partner`, `admin` |
| `metadata.cancelled_at` | string | Fecha y hora de cancelación (ISO 8601) |
| `metadata.reason_detail` | string | Descripción detallada del motivo |

#### Motivos de Cancelación

- `cliente_solicita_reembolso`
- `servicio_no_prestado`
- `error_en_cobro`
- `aliado_cancela`
- `producto_defectuoso`
- `cancelacion_pedido`
- `error_facturacion`

#### Respuesta Exitosa

```json
{
  "success": true,
  "data": {
    "nota_credito_id": "uuid-de-la-nota-credito",
    "numero_nota": "00000001",
    "factura_anulada_id": "uuid-de-la-factura"
  }
}
```

#### Ejemplo de Código (Node.js)

```javascript
async function enviarCancelacion(orderData) {
  try {
    const response = await axios.post(
      'https://tu-proyecto.supabase.co/functions/v1/webhooks-orders',
      {
        event: 'order.cancelled',
        order_id: orderData.id,
        empresa_id: 'tu-empresa-uuid',
        factura_id: orderData.factura_id, // Opcional si no lo tienes
        motivo: 'cliente_solicita_reembolso',
        tipo_anulacion: 'total',
        monto_devolver: orderData.total_amount,
        refund: {
          method: orderData.payment_method,
          transaction_id: orderData.refund_transaction_id,
          status: 'completed'
        },
        metadata: {
          cancelled_by: 'customer',
          cancelled_at: new Date().toISOString(),
          reason_detail: orderData.cancellation_reason
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET
        }
      }
    );

    console.log('Nota de crédito creada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enviando webhook:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## Ejemplos de Integración

### Caso de Uso 1: Marketplace de Servicios (DogCatiFy)

#### Flujo Completo

```javascript
// 1. Cliente completa el pago en tu app
app.post('/api/orders/:id/payment-completed', async (req, res) => {
  const order = await Order.findById(req.params.id);

  // 2. Enviar webhook al sistema contable
  await enviarOrdenPagada({
    id: order.id,
    customer_name: order.customer.name,
    customer_doc: order.customer.document,
    customer_email: order.customer.email,
    service_type: order.service_type,
    service_description: order.service_description,
    total_amount: order.total,
    tax_amount: order.tax,
    payment_method: order.payment.method,
    transaction_id: order.payment.transaction_id
  });

  // 3. Guardar referencia de la factura
  order.accounting = {
    factura_id: response.data.factura_id,
    numero_factura: response.data.numero_factura
  };
  await order.save();

  res.json({ success: true });
});

// 4. Cliente cancela la orden
app.post('/api/orders/:id/cancel', async (req, res) => {
  const order = await Order.findById(req.params.id);

  // 5. Procesar reembolso
  const refund = await processRefund(order);

  // 6. Enviar webhook de cancelación
  await enviarCancelacion({
    id: order.id,
    factura_id: order.accounting.factura_id,
    total_amount: order.total,
    payment_method: order.payment.method,
    refund_transaction_id: refund.id,
    cancellation_reason: req.body.reason
  });

  res.json({ success: true });
});
```

### Caso de Uso 2: E-Commerce

```javascript
// Webhook después del checkout exitoso
stripe.webhooks.on('checkout.session.completed', async (session) => {
  const order = await getOrderBySessionId(session.id);

  await enviarOrdenPagada({
    id: order.id,
    customer_name: session.customer_details.name,
    customer_doc: order.customer_document,
    customer_email: session.customer_details.email,
    service_type: 'producto',
    service_description: order.items.map(i => i.name).join(', '),
    total_amount: session.amount_total / 100,
    tax_amount: session.total_details.amount_tax / 100,
    payment_method: 'stripe',
    transaction_id: session.payment_intent
  });
});
```

---

## Manejo de Errores

### Códigos de Error

| Código | Descripción | Solución |
|--------|-------------|----------|
| 401 | Secret inválido | Verifica que el header `X-Webhook-Secret` sea correcto |
| 400 | Datos inválidos | Revisa que todos los campos requeridos estén presentes |
| 404 | Factura no encontrada | Verifica el `factura_id` o `order_id` |
| 500 | Error interno | Contacta al soporte, el evento quedará registrado para reintento |

### Respuesta de Error

```json
{
  "error": "Invalid webhook secret",
  "details": "..."
}
```

### Manejo de Errores en tu Código

```javascript
try {
  const response = await enviarWebhook(data);
  console.log('Success:', response.data);
} catch (error) {
  if (error.response) {
    // El servidor respondió con un código de error
    console.error('Error status:', error.response.status);
    console.error('Error data:', error.response.data);

    if (error.response.status === 401) {
      console.error('Secret inválido, verifica tu configuración');
    } else if (error.response.status === 500) {
      console.log('Error temporal, el sistema reintentará automáticamente');
    }
  } else {
    // Error de red o timeout
    console.error('Error de red:', error.message);
  }
}
```

---

## Reintentos

### Política de Reintentos Automáticos

El sistema contable automáticamente reintentará procesar eventos fallidos:

- **1er reintento**: Después de 5 minutos
- **2do reintento**: Después de 30 minutos
- **3er reintento**: Después de 2 horas
- **4to reintento**: Después de 12 horas

### Reintentos Manuales

Desde el panel del sistema contable, los administradores pueden:

1. Ver eventos fallidos
2. Ver el error específico
3. Reintentar manualmente

---

## Seguridad

### Mejores Prácticas

1. **Nunca compartas tu Webhook Secret públicamente**
2. **Usa HTTPS siempre**
3. **Valida los datos antes de enviar**
4. **Implementa logs en tu sistema**
5. **Maneja errores apropiadamente**

### Verificación de Integridad

```javascript
// Opcional: Generar un hash del payload para verificación adicional
const crypto = require('crypto');

function generarFirma(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

const firma = generarFirma(payload, WEBHOOK_SECRET);
// Enviar firma en header adicional si se requiere
headers['X-Webhook-Signature'] = firma;
```

---

## Testing

### Ambiente de Pruebas

Solicita acceso al ambiente de pruebas donde puedes:

- Probar webhooks sin afectar datos reales
- Ver logs detallados
- Simular diferentes escenarios

### Herramientas Recomendadas

- **Postman**: Para probar webhooks manualmente
- **ngrok**: Para exponer tu servidor local y recibir webhooks
- **RequestBin**: Para inspeccionar requests

### Ejemplo de Test con Postman

```
POST https://tu-proyecto.supabase.co/functions/v1/webhooks-orders

Headers:
  Content-Type: application/json
  X-Webhook-Secret: tu-secret-de-prueba

Body (raw JSON):
{
  "event": "order.paid",
  "order_id": "TEST-001",
  "empresa_id": "uuid-de-prueba",
  "customer": {
    "nombre": "Cliente de Prueba",
    "documento": "12345678-9",
    "email": "test@test.com"
  },
  "service": {
    "tipo": "test",
    "descripcion": "Servicio de prueba"
  },
  "amounts": {
    "total": 100,
    "tax": 18
  },
  "payment": {
    "method": "test",
    "transaction_id": "TEST-TXN-001",
    "paid_at": "2025-11-19T15:00:00Z"
  }
}
```

---

## Soporte

### Contacto

- **Email**: soporte@sistemacontable.com
- **Slack**: #integraciones
- **Documentación**: https://docs.sistemacontable.com

### Información a Proveer en Caso de Problemas

1. ID del evento (`order_id`)
2. Timestamp del error
3. Código de error recibido
4. Payload enviado (sin datos sensibles)
5. Logs de tu sistema

---

## Changelog

### Versión 1.0 (2025-11-19)

- Soporte inicial para `order.paid` y `order.cancelled`
- Autenticación mediante webhook secret
- Reintentos automáticos
- Documentación completa

### Próximas Funcionalidades

- [ ] Soporte para anulaciones parciales
- [ ] Webhook para actualizaciones de orden
- [ ] Notificaciones de envío exitoso a DGI
- [ ] API REST para consultar facturas
- [ ] Webhooks de eventos contables (asientos, pagos)

---

## Apéndice

### Estructura Completa de Campos Opcionales

```json
{
  "event": "order.paid",
  "order_id": "string",
  "empresa_id": "uuid",
  "crm_customer_id": "string (opcional)",

  "customer": {
    "nombre": "string",
    "documento": "string",
    "email": "string",
    "telefono": "string (opcional)",
    "direccion": "string (opcional)"
  },

  "service": {
    "tipo": "string (opcional)",
    "descripcion": "string",
    "partner_id": "string (opcional)",
    "partner_name": "string (opcional)"
  },

  "amounts": {
    "total": number,
    "partner_commission": number (opcional),
    "platform_fee": number (opcional),
    "tax": number
  },

  "payment": {
    "method": "string",
    "transaction_id": "string",
    "paid_at": "ISO 8601 string"
  }
}
```

### Códigos de País Soportados

- Uruguay (UY)
- Argentina (AR) - próximamente
- Chile (CL) - próximamente
- Perú (PE) - próximamente

---

**Última actualización**: 19 de Noviembre, 2025
**Versión**: 1.0
