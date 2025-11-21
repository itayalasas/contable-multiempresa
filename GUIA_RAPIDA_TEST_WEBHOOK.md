# Guía Rápida: Probar Webhook de Dogcatify

## 📋 Archivos Disponibles

1. **EJEMPLO_JSON_DOGCATIFY_COMPLETO.md** - Documentación completa con todos los ejemplos
2. **test-webhook-dogcatify.sh** - Script bash para pruebas rápidas
3. **test-orden-simple.json** - Orden simple con partner (caso más común)
4. **test-orden-sin-partner.json** - Venta directa sin comisiones
5. **test-orden-multiples-partners.json** - Orden con múltiples partners

## 🚀 Método 1: Usar Script Bash (Más Rápido)

```bash
# Hacer el script ejecutable (solo primera vez)
chmod +x test-webhook-dogcatify.sh

# Probar con localhost
./test-webhook-dogcatify.sh http://localhost:3000/api/webhooks/orders

# Probar con tu servidor
./test-webhook-dogcatify.sh https://tu-dominio.com/api/webhooks/orders
```

## 🧪 Método 2: Usar cURL

### Orden Simple con Partner
```bash
curl -X POST https://tu-dominio.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -d @test-orden-simple.json
```

### Orden Sin Partner
```bash
curl -X POST https://tu-dominio.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -d @test-orden-sin-partner.json
```

### Orden con Múltiples Partners
```bash
curl -X POST https://tu-dominio.com/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -d @test-orden-multiples-partners.json
```

## 📮 Método 3: Usar Postman

1. Crea una nueva request en Postman
2. Configura:
   - **Method**: POST
   - **URL**: `https://tu-dominio.com/api/webhooks/orders`
   - **Headers**:
     - `Content-Type: application/json`
   - **Body**: Raw → JSON
3. Copia el contenido de cualquier archivo `test-orden-*.json`
4. Click en "Send"

## 📱 Método 4: Usar Insomnia

1. New Request → POST
2. URL: `https://tu-dominio.com/api/webhooks/orders`
3. Body → JSON
4. Pega el contenido de un archivo de prueba
5. Send

## ✅ Respuesta Exitosa Esperada

```json
{
  "success": true,
  "message": "Orden procesada correctamente",
  "data": {
    "order_id": "DOG-2025-TEST-001",
    "factura_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "factura_numero": "e-Fact 101-000123",
    "cliente_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "comisiones_generadas": 2,
    "total_comisiones": 225.00
  }
}
```

## ❌ Posibles Errores

### Error 404 - Tabla No Encontrada
```json
{
  "code": "PGRST205",
  "message": "Could not find the table 'public.partners_aliados' in the schema cache"
}
```

**Solución**: Espera 1-2 minutos y vuelve a intentar. El caché de Supabase se está actualizando.

### Error 400 - Datos Inválidos
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

**Solución**: Revisa que todos los campos requeridos estén presentes.

### Error 409 - Orden Duplicada
```json
{
  "success": false,
  "error": "Orden duplicada",
  "message": "La orden DOG-2025-TEST-001 ya fue procesada"
}
```

**Solución**: Cambia el `order_id` por uno nuevo.

## 🔍 Verificar Resultados

Después de enviar una orden exitosamente:

### 1. Verificar Factura Creada
- Ve a **Ventas → Facturas**
- Busca la factura con el número que te devolvió el webhook
- Deberías ver todos los items de la orden

### 2. Verificar Cliente Creado/Actualizado
- Ve a **Ventas → Clientes**
- Busca el cliente por documento o nombre
- Verifica que los datos coincidan

### 3. Verificar Partner Creado (si aplica)
- Ve a **Compras → Partners**
- Busca el partner por ID o nombre
- Verifica configuración de comisiones

### 4. Verificar Comisiones Generadas (si aplica)
- Ve a **Compras → Comisiones**
- Deberías ver las comisiones pendientes
- Verifica montos y porcentajes

## 📊 Casos de Prueba Recomendados

### Caso 1: Orden Simple con Partner
**Archivo**: `test-orden-simple.json`
**Verifica**:
- ✅ Factura creada
- ✅ Cliente creado
- ✅ Partner creado
- ✅ 2 comisiones generadas (una por cada item)

### Caso 2: Orden Sin Partner
**Archivo**: `test-orden-sin-partner.json`
**Verifica**:
- ✅ Factura creada
- ✅ Cliente creado
- ❌ No se generan comisiones

### Caso 3: Múltiples Partners
**Archivo**: `test-orden-multiples-partners.json`
**Verifica**:
- ✅ Factura creada
- ✅ Cliente creado
- ✅ 2 partners creados
- ✅ Comisiones con diferentes porcentajes

## 🔄 Flujo Completo de Prueba

```bash
# 1. Enviar orden de prueba
curl -X POST http://localhost:3000/api/webhooks/orders \
  -H "Content-Type: application/json" \
  -d @test-orden-simple.json

# 2. Verificar en la UI
# - Abre el navegador
# - Ve a Ventas → Facturas
# - Busca la factura creada

# 3. Verificar comisiones
# - Ve a Compras → Comisiones
# - Verifica que las comisiones estén pendientes

# 4. Cambiar el order_id y enviar otra orden
# - Edita test-orden-simple.json
# - Cambia "DOG-2025-TEST-001" por "DOG-2025-TEST-002"
# - Vuelve a enviar
```

## 🛠️ Tips de Desarrollo

1. **IDs Únicos**: Cada prueba debe tener un `order_id` único
2. **Timestamps**: Usa fecha/hora actual para más realismo
3. **Montos**: Verifica que subtotal + tax = total
4. **Documentos**: Usa documentos válidos de Uruguay (CI: 8 dígitos, RUT: 12 dígitos)
5. **Comisiones**: El cálculo es: `subtotal * (commission_percentage / 100)`

## 📝 Modificar para Tus Necesidades

Para crear tu propio JSON de prueba:

1. Copia `test-orden-simple.json`
2. Modifica:
   - `order.order_id` → ID único
   - `customer.*` → Datos del cliente
   - `items[]` → Productos de la orden
   - `partner.partner_id` → ID del partner (o elimina si no hay)
3. Guarda y envía

## 🎯 Checklist de Validación

Antes de poner en producción, verifica:

- [ ] La orden se procesa correctamente
- [ ] La factura se crea con todos los datos
- [ ] El cliente se crea/actualiza correctamente
- [ ] Los partners se crean/actualizan
- [ ] Las comisiones se calculan correctamente
- [ ] Los totales coinciden (subtotal + tax = total)
- [ ] No se permiten órdenes duplicadas
- [ ] Los errores retornan mensajes claros

## 🔗 URLs del Webhook

### Desarrollo Local
```
http://localhost:3000/api/webhooks/orders
```

### Producción (Netlify)
```
https://tu-app.netlify.app/.netlify/functions/webhooks-orders
```

### Producción (Custom Domain)
```
https://tu-dominio.com/api/webhooks/orders
```

## 📞 Soporte

Si algo no funciona:

1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que las tablas existen en Supabase
4. Confirma que el caché de Supabase está actualizado
5. Revisa que los permisos RLS estén configurados

## 🎉 Siguiente Paso

Una vez que las pruebas funcionen correctamente, integra el webhook real desde Dogcatify configurando:

1. URL del webhook en Dogcatify
2. Secret opcional para validación
3. Eventos a escuchar: `order.created`
4. Prueba con una orden real en modo test de Dogcatify
