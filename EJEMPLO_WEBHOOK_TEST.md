# Ejemplo de Prueba de Webhook

## Datos de tu Empresa

- **Nombre**: Ayala IT S.A.S
- **UUID**: `a2fb84eb-c91c-4f3e-88c3-4a9c3420009e`

## Prueba con Postman

### URL del Webhook
```
https://uwyoovdvymnhksipzkwg.supabase.co/functions/v1/webhooks-orders
```

### Headers
```
Content-Type: application/json
X-Webhook-Secret: default-secret-change-in-production
```

### Body (JSON correcto para tu empresa)

```json
{
  "event": "order.paid",
  "order_id": "ORD-12345",
  "empresa_id": "a2fb84eb-c91c-4f3e-88c3-4a9c3420009e",
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

## Resultado Esperado

Si todo funciona correctamente, deberías recibir:

```json
{
  "success": true,
  "data": {
    "success": true,
    "factura_id": "uuid-de-la-factura",
    "numero_factura": "00000001"
  }
}
```

Y en tu sistema:
- Se creará un nuevo cliente "Juan Pérez" (si no existe)
- Se creará una factura automáticamente
- La factura aparecerá en `/ventas/facturas`

## Prueba de Cancelación

Para probar la cancelación de una orden, primero obtén el `factura_id` de la respuesta anterior y usa:

```json
{
  "event": "order.cancelled",
  "order_id": "ORD-12345",
  "empresa_id": "a2fb84eb-c91c-4f3e-88c3-4a9c3420009e",
  "factura_id": "PONER-UUID-DE-FACTURA-AQUI",
  "motivo": "Cliente solicitó devolución",
  "tipo_anulacion": "total",
  "monto_devolver": 1000,
  "refund": {
    "method": "mercadopago",
    "transaction_id": "MP-REF-98765",
    "status": "completed"
  },
  "metadata": {
    "cancelled_by": "sistema",
    "cancelled_at": "2025-11-19T16:00:00Z",
    "reason_detail": "Devolución por insatisfacción del cliente"
  }
}
```

Esto creará una Nota de Crédito automáticamente.
