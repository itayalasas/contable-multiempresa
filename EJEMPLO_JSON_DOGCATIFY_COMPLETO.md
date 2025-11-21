# Ejemplo Completo de JSON para Webhook de Dogcatify

## URL del Webhook
```
POST https://TU_DOMINIO.com/api/webhooks/orders
```

## Headers
```
Content-Type: application/json
X-Webhook-Secret: tu_secreto_configurado (opcional)
```

## Ejemplo 1: Orden Simple con Partner (Caso más común)

```json
{
  "event": "order.created",
  "timestamp": "2025-11-21T14:30:00Z",
  "order": {
    "order_id": "DOG-2025-001234",
    "order_number": "ORD-001234",
    "created_at": "2025-11-21T14:30:00Z",
    "status": "completed",
    "total": 1250.00,
    "subtotal": 1000.00,
    "tax": 220.00,
    "shipping": 30.00,
    "currency": "UYU",
    "payment_method": "credit_card",
    "payment_status": "paid"
  },
  "customer": {
    "customer_id": "CUST-789",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+598 99 123 456",
    "document_type": "CI",
    "document_number": "12345678",
    "address": {
      "street": "Av. 18 de Julio 1234",
      "city": "Montevideo",
      "state": "Montevideo",
      "zip": "11200",
      "country": "UY"
    }
  },
  "items": [
    {
      "item_id": "ITEM-001",
      "sku": "COLLAR-PERRO-M",
      "name": "Collar para Perro Mediano",
      "description": "Collar ajustable de nylon para perros medianos",
      "quantity": 2,
      "unit_price": 350.00,
      "subtotal": 700.00,
      "tax_rate": 22.00,
      "tax_amount": 154.00,
      "total": 854.00,
      "category": "Accesorios",
      "partner_id": "PARTNER-VET-CENTRO",
      "partner_commission_percentage": 15.00
    },
    {
      "item_id": "ITEM-002",
      "sku": "ALIMENTO-GATO-2KG",
      "name": "Alimento Premium para Gatos 2kg",
      "description": "Alimento balanceado premium para gatos adultos",
      "quantity": 1,
      "unit_price": 300.00,
      "subtotal": 300.00,
      "tax_rate": 22.00,
      "tax_amount": 66.00,
      "total": 366.00,
      "category": "Alimentos",
      "partner_id": "PARTNER-VET-CENTRO",
      "partner_commission_percentage": 15.00
    }
  ],
  "shipping": {
    "method": "standard",
    "carrier": "DAC",
    "tracking_number": "DAC123456789UY",
    "cost": 30.00
  },
  "partner": {
    "partner_id": "PARTNER-VET-CENTRO",
    "name": "Veterinaria Centro",
    "email": "admin@vetcentro.com.uy",
    "phone": "+598 2 123 4567",
    "document_type": "RUT",
    "document_number": "217654320018",
    "commission_default": 15.00,
    "billing_frequency": "quincenal",
    "billing_day": 15,
    "bank_account": "001234567890",
    "bank_name": "BROU",
    "account_type": "corriente"
  },
  "metadata": {
    "source": "dogcatify_web",
    "channel": "online_store",
    "campaign": "black_friday_2025",
    "notes": "Cliente solicitó envío express",
    "internal_order_id": 98765
  }
}
```

## Ejemplo 2: Orden Sin Partner (Venta Directa)

```json
{
  "event": "order.created",
  "timestamp": "2025-11-21T15:45:00Z",
  "order": {
    "order_id": "DOG-2025-001235",
    "order_number": "ORD-001235",
    "created_at": "2025-11-21T15:45:00Z",
    "status": "completed",
    "total": 580.00,
    "subtotal": 475.41,
    "tax": 104.59,
    "shipping": 0,
    "currency": "UYU",
    "payment_method": "debit_card",
    "payment_status": "paid"
  },
  "customer": {
    "customer_id": "CUST-456",
    "name": "María González",
    "email": "maria.gonzalez@example.com",
    "phone": "+598 94 876 543",
    "document_type": "CI",
    "document_number": "87654321",
    "address": {
      "street": "21 de Setiembre 2890",
      "city": "Montevideo",
      "state": "Montevideo",
      "zip": "11600",
      "country": "UY"
    }
  },
  "items": [
    {
      "item_id": "ITEM-003",
      "sku": "JUGUETE-PERRO-001",
      "name": "Juguete Interactivo para Perros",
      "description": "Juguete de goma resistente con sonido",
      "quantity": 1,
      "unit_price": 475.41,
      "subtotal": 475.41,
      "tax_rate": 22.00,
      "tax_amount": 104.59,
      "total": 580.00,
      "category": "Juguetes"
    }
  ],
  "shipping": {
    "method": "pickup",
    "cost": 0
  },
  "metadata": {
    "source": "dogcatify_mobile_app",
    "channel": "mobile",
    "notes": "Retiro en tienda física"
  }
}
```

## Ejemplo 3: Orden con Múltiples Partners

```json
{
  "event": "order.created",
  "timestamp": "2025-11-21T16:20:00Z",
  "order": {
    "order_id": "DOG-2025-001236",
    "order_number": "ORD-001236",
    "created_at": "2025-11-21T16:20:00Z",
    "status": "completed",
    "total": 3250.00,
    "subtotal": 2663.93,
    "tax": 586.07,
    "shipping": 50.00,
    "currency": "UYU",
    "payment_method": "bank_transfer",
    "payment_status": "paid"
  },
  "customer": {
    "customer_id": "CUST-999",
    "name": "Refugio Patitas Felices",
    "email": "contacto@patitasfelices.org",
    "phone": "+598 99 888 777",
    "document_type": "RUT",
    "document_number": "215678901234",
    "address": {
      "street": "Ruta 8 Km 28",
      "city": "Canelones",
      "state": "Canelones",
      "zip": "90100",
      "country": "UY"
    }
  },
  "items": [
    {
      "item_id": "ITEM-004",
      "sku": "ALIMENTO-PERRO-15KG",
      "name": "Alimento para Perros 15kg",
      "description": "Alimento balanceado para perros adultos",
      "quantity": 3,
      "unit_price": 650.00,
      "subtotal": 1950.00,
      "tax_rate": 22.00,
      "tax_amount": 429.00,
      "total": 2379.00,
      "category": "Alimentos",
      "partner_id": "PARTNER-AGROVETERINARIA",
      "partner_commission_percentage": 12.00
    },
    {
      "item_id": "ITEM-005",
      "sku": "CAMA-PERRO-L",
      "name": "Cama para Perro Grande",
      "description": "Cama ortopédica lavable",
      "quantity": 2,
      "unit_price": 356.97,
      "subtotal": 713.93,
      "tax_rate": 22.00,
      "tax_amount": 157.07,
      "total": 871.00,
      "category": "Accesorios",
      "partner_id": "PARTNER-PETSHOP-NORTE",
      "partner_commission_percentage": 18.00
    }
  ],
  "shipping": {
    "method": "express",
    "carrier": "UES",
    "tracking_number": "UES987654321UY",
    "cost": 50.00
  },
  "partners": [
    {
      "partner_id": "PARTNER-AGROVETERINARIA",
      "name": "Agroveterinaria del Este",
      "email": "ventas@agrovet.com.uy",
      "phone": "+598 2 345 6789",
      "document_type": "RUT",
      "document_number": "214567890123",
      "commission_default": 12.00,
      "billing_frequency": "mensual",
      "billing_day": 1
    },
    {
      "partner_id": "PARTNER-PETSHOP-NORTE",
      "name": "Pet Shop Norte",
      "email": "info@petshopnorte.com",
      "phone": "+598 2 987 6543",
      "document_type": "RUT",
      "document_number": "213456789012",
      "commission_default": 18.00,
      "billing_frequency": "quincenal",
      "billing_day": 15
    }
  ],
  "metadata": {
    "source": "dogcatify_web",
    "channel": "b2b",
    "notes": "Cliente institucional - Refugio de animales",
    "discount_applied": false
  }
}
```

## Ejemplo 4: Orden con Descuentos y Promociones

```json
{
  "event": "order.created",
  "timestamp": "2025-11-21T17:00:00Z",
  "order": {
    "order_id": "DOG-2025-001237",
    "order_number": "ORD-001237",
    "created_at": "2025-11-21T17:00:00Z",
    "status": "completed",
    "total": 1098.00,
    "subtotal": 900.00,
    "discount": 100.00,
    "tax": 198.00,
    "shipping": 0,
    "currency": "UYU",
    "payment_method": "credit_card",
    "payment_status": "paid"
  },
  "customer": {
    "customer_id": "CUST-555",
    "name": "Carlos Rodríguez",
    "email": "carlos.r@example.com",
    "phone": "+598 91 234 567",
    "document_type": "CI",
    "document_number": "11223344",
    "address": {
      "street": "Bulevar Artigas 1500",
      "city": "Montevideo",
      "state": "Montevideo",
      "zip": "11300",
      "country": "UY"
    }
  },
  "items": [
    {
      "item_id": "ITEM-006",
      "sku": "PACK-CACHORRO",
      "name": "Pack Inicio para Cachorros",
      "description": "Incluye: alimento 3kg, collar, plato y juguete",
      "quantity": 1,
      "unit_price": 1000.00,
      "discount": 100.00,
      "subtotal": 900.00,
      "tax_rate": 22.00,
      "tax_amount": 198.00,
      "total": 1098.00,
      "category": "Packs Promocionales",
      "partner_id": "PARTNER-VET-CENTRO",
      "partner_commission_percentage": 10.00
    }
  ],
  "discounts": [
    {
      "code": "BIENVENIDA10",
      "description": "Descuento de bienvenida 10%",
      "amount": 100.00,
      "type": "percentage",
      "value": 10
    }
  ],
  "shipping": {
    "method": "pickup",
    "cost": 0
  },
  "partner": {
    "partner_id": "PARTNER-VET-CENTRO",
    "name": "Veterinaria Centro",
    "email": "admin@vetcentro.com.uy",
    "phone": "+598 2 123 4567",
    "document_type": "RUT",
    "document_number": "217654320018",
    "commission_default": 10.00,
    "billing_frequency": "quincenal",
    "billing_day": 15
  },
  "metadata": {
    "source": "dogcatify_web",
    "channel": "online_store",
    "campaign": "welcome_campaign",
    "notes": "Primer compra del cliente",
    "discount_applied": true,
    "discount_code": "BIENVENIDA10"
  }
}
```

## Campos Requeridos vs Opcionales

### ✅ Campos REQUERIDOS

```javascript
{
  "event": "order.created",              // REQUERIDO: Tipo de evento
  "order": {
    "order_id": "",                      // REQUERIDO: ID único de la orden
    "total": 0,                          // REQUERIDO: Total de la orden
    "subtotal": 0,                       // REQUERIDO: Subtotal sin IVA
    "currency": "UYU"                    // REQUERIDO: Moneda
  },
  "customer": {
    "name": "",                          // REQUERIDO: Nombre del cliente
    "email": "",                         // REQUERIDO: Email del cliente
    "document_type": "",                 // REQUERIDO: CI o RUT
    "document_number": ""                // REQUERIDO: Número de documento
  },
  "items": [                             // REQUERIDO: Al menos 1 item
    {
      "name": "",                        // REQUERIDO: Nombre del producto
      "quantity": 1,                     // REQUERIDO: Cantidad
      "unit_price": 0,                   // REQUERIDO: Precio unitario
      "total": 0                         // REQUERIDO: Total del item
    }
  ]
}
```

### 📋 Campos OPCIONALES (pero recomendados)

- `order.tax`: Monto del IVA
- `order.shipping`: Costo de envío
- `order.payment_method`: Método de pago
- `customer.phone`: Teléfono del cliente
- `customer.address`: Dirección completa
- `items[].sku`: Código del producto
- `items[].partner_id`: ID del partner (para comisiones)
- `items[].partner_commission_percentage`: % de comisión
- `partner`: Datos completos del partner
- `shipping`: Información de envío
- `metadata`: Datos adicionales

## Respuestas del Webhook

### ✅ Respuesta Exitosa (200 OK)
```json
{
  "success": true,
  "message": "Orden procesada correctamente",
  "data": {
    "order_id": "DOG-2025-001234",
    "factura_id": "uuid-de-la-factura",
    "factura_numero": "e-Fact 101-000123",
    "cliente_id": "uuid-del-cliente",
    "comisiones_generadas": 2,
    "total_comisiones": 150.00
  }
}
```

### ❌ Respuesta de Error (400 Bad Request)
```json
{
  "success": false,
  "error": "Datos inválidos",
  "details": {
    "field": "customer.document_number",
    "message": "Número de documento requerido"
  }
}
```

### ⚠️ Respuesta de Orden Duplicada (409 Conflict)
```json
{
  "success": false,
  "error": "Orden duplicada",
  "message": "La orden DOG-2025-001234 ya fue procesada",
  "existing_order": {
    "order_id": "DOG-2025-001234",
    "factura_id": "uuid-existente",
    "processed_at": "2025-11-21T14:30:00Z"
  }
}
```

## Notas Importantes

1. **IDs Únicos**: El `order_id` debe ser único. Órdenes duplicadas serán rechazadas.

2. **Montos**: Todos los montos deben incluir 2 decimales (ej: 100.00, no 100)

3. **Documentos Uruguay**:
   - CI: 8 dígitos (ej: "12345678")
   - RUT: 12 dígitos (ej: "217654320018")

4. **IVA**: En Uruguay la tasa estándar es 22%

5. **Partners**: Si un item tiene `partner_id`, se generará automáticamente la comisión

6. **Facturación Automática**: Si la empresa tiene habilitado CFE y envío automático a DGI, la factura se enviará automáticamente

7. **Timestamp**: Usar formato ISO 8601 (ej: "2025-11-21T14:30:00Z")

8. **Moneda**: Soporta UYU (peso uruguayo), USD (dólar), EUR (euro)

## Testing

Para probar el webhook, puedes usar:

```bash
curl -X POST https://TU_DOMINIO.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -d @ejemplo_orden.json
```

O usar Postman/Insomnia importando estos ejemplos.
