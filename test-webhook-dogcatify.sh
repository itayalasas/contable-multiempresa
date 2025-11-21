#!/bin/bash

# Script de prueba para el webhook de Dogcatify
# Uso: ./test-webhook-dogcatify.sh [URL_WEBHOOK]

# Configuración
WEBHOOK_URL="${1:-http://localhost:3000/api/webhooks/orders}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ORDER_ID="DOG-TEST-$(date +%s)"

echo "=========================================="
echo "Test Webhook Dogcatify → ContaEmpresa"
echo "=========================================="
echo ""
echo "URL: $WEBHOOK_URL"
echo "Order ID: $ORDER_ID"
echo "Timestamp: $TIMESTAMP"
echo ""

# JSON de prueba con partner
JSON_PAYLOAD=$(cat <<EOF
{
  "event": "order.created",
  "timestamp": "$TIMESTAMP",
  "order": {
    "order_id": "$ORDER_ID",
    "order_number": "ORD-TEST-001",
    "created_at": "$TIMESTAMP",
    "status": "completed",
    "total": 1830.00,
    "subtotal": 1500.00,
    "tax": 330.00,
    "shipping": 0,
    "currency": "UYU",
    "payment_method": "credit_card",
    "payment_status": "paid"
  },
  "customer": {
    "customer_id": "CUST-TEST-001",
    "name": "Cliente de Prueba",
    "email": "prueba@dogcatify.com",
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
      "item_id": "ITEM-TEST-001",
      "sku": "COLLAR-PERRO-M",
      "name": "Collar para Perro Mediano",
      "description": "Collar ajustable de nylon",
      "quantity": 2,
      "unit_price": 500.00,
      "subtotal": 1000.00,
      "tax_rate": 22.00,
      "tax_amount": 220.00,
      "total": 1220.00,
      "category": "Accesorios",
      "partner_id": "PARTNER-VET-CENTRO",
      "partner_commission_percentage": 15.00
    },
    {
      "item_id": "ITEM-TEST-002",
      "sku": "ALIMENTO-GATO-2KG",
      "name": "Alimento Premium para Gatos 2kg",
      "description": "Alimento balanceado premium",
      "quantity": 1,
      "unit_price": 500.00,
      "subtotal": 500.00,
      "tax_rate": 22.00,
      "tax_amount": 110.00,
      "total": 610.00,
      "category": "Alimentos",
      "partner_id": "PARTNER-VET-CENTRO",
      "partner_commission_percentage": 15.00
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
    "commission_default": 15.00,
    "billing_frequency": "quincenal",
    "billing_day": 15,
    "bank_account": "001234567890",
    "bank_name": "BROU",
    "account_type": "corriente"
  },
  "metadata": {
    "source": "dogcatify_test",
    "channel": "api_test",
    "notes": "Orden de prueba generada automáticamente",
    "test_mode": true
  }
}
EOF
)

echo "Enviando orden de prueba..."
echo ""

# Ejecutar curl y guardar respuesta
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

# Separar body y status code
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)

echo "=========================================="
echo "Respuesta del servidor:"
echo "=========================================="
echo ""
echo "Status Code: $HTTP_STATUS"
echo ""
echo "Body:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Evaluar resultado
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ ÉXITO: Orden procesada correctamente"
  exit 0
elif [ "$HTTP_STATUS" = "409" ]; then
  echo "⚠️  ADVERTENCIA: Orden duplicada"
  exit 1
else
  echo "❌ ERROR: Falló el procesamiento de la orden"
  exit 1
fi
