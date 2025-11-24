#!/bin/bash

# Script para probar la sincronización de usuarios
# Este script envía el usuario actual al endpoint de sincronización

SUPABASE_URL="https://uwyoovdvynmhksipzkwg.supabase.co"
ENDPOINT="${SUPABASE_URL}/functions/v1/sync-users"

echo "📡 Sincronizando usuario con ContaEmpresa..."
echo "Endpoint: $ENDPOINT"
echo ""

# Payload con el usuario actual
PAYLOAD='{
  "success": true,
  "users": [
    {
      "id": "e762511c-84ee-4d44-9ee4-802cf5f71d2b",
      "email": "payalaortiz@gmail.com",
      "name": "Pedro Ayala Ortiz",
      "role": "Administrador",
      "permissions": ["admin"],
      "metadata": {},
      "created_at": "2025-11-19T02:07:04.903892+00:00"
    }
  ]
}'

# Ejecutar request
RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "✅ Respuesta del servidor:"
echo "$RESPONSE" | jq '.'

echo ""
echo "Para verificar en Supabase:"
echo "SELECT id, nombre, email, rol, empresas_asignadas FROM usuarios WHERE id = 'e762511c-84ee-4d44-9ee4-802cf5f71d2b';"
