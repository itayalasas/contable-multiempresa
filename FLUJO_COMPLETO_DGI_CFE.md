# Flujo Completo de Integración DGI/CFE

## 🎯 Resumen

La integración con el sistema de facturación electrónica se realiza en **DOS PASOS**:

1. **POST** → Crear CFE y obtener ID
2. **GET** → Obtener detalle completo con CAE

## 📡 Variables de Entorno Configuradas

```env
VITE_DGI_API_CREATE_URL=https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b
VITE_DGI_API_DETAIL_URL=https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b
VITE_DGI_INTEGRATION_KEY=pub_90e731b2639b030baad40d14f7622afb10dfb10b1b05933d7b67fc920f3fb734
```

## 🔄 Paso 1: Crear CFE

### Request
```http
POST https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b
Content-Type: application/json
X-Integration-Key: pub_90e731b2639b030baad40d14f7622afb10dfb10b1b05933d7b67fc920f3fb734
```

### Body (Generado Automáticamente)
```json
{
  "tipo_comprobante": 101,
  "numero_interno": "8b7f7075-d6b5-496f-903a-52c735ef2098",
  "forma_pago": 1,
  "fecha_emision": "14/11/2025",
  "sucursal": 572,
  "moneda": "UYU",
  "montos_brutos": 1,
  "numero_orden": "INV-1763161474",
  "lugar_entrega": "Retiro en tienda",
  "cliente": "Juan Pérez",
  "items": [
    {
      "codigo": "",
      "cantidad": 1,
      "concepto": "Pelota de fútbol",
      "precio": 200,
      "indicador_facturacion": 3,
      "descuento_tipo": "",
      "descuento_cantidad": 0
    }
  ],
  "adenda": "Orden DC-1763161459323"
}
```

### Response
```json
{
  "id": 334467,
  "serie": "MT",
  "numero": "389526",
  "hash": "4oT4Sr8kb+Ze33GWG3QOvo6ZRqc="
}
```

## 🔍 Paso 2: Obtener Detalle CFE

### Request
```http
GET https://api.flowbridge.site/functions/v1/api-gateway/e9bebebc-351e-42ea-a431-4ff02105ef8b?id=334467
X-Integration-Key: pub_90e731b2639b030baad40d14f7622afb10dfb10b1b05933d7b67fc920f3fb734
```

### Response (Completo con CAE)
```json
[
  {
    "id": 334467,
    "tipo_comprobante": 101,
    "serie": "MT",
    "numero": 389526,
    "sucursal": 572,
    "numero_interno": "8b7f7075-d6b5-496f-903a-52c735ef2098",
    "informacion_adicional": null,
    "moneda": "UYU",
    "tasa_cambio": "1.000",
    "montos_brutos": 1,
    "numero_orden": "INV-1763161474",
    "lugar_entrega": "Retiro en tienda",
    "indicador_cobranza_propia": 0,
    "items": [
      {
        "id": 541372,
        "codigo": "",
        "codigo_ean": [],
        "codigo_dun": [],
        "cantidad": "1.000",
        "concepto": "Pelota de fútbol",
        "descripcion": [],
        "precio": "200.000000",
        "indicador_facturacion": 3,
        "impuesto_tasa": "0.220",
        "descuento_tipo": "$",
        "descuento_cantidad": "0.000",
        "recargo_tipo": "$",
        "recargo_cantidad": "0.000",
        "indicador_agente_responsable": [],
        "retenciones_percepciones": []
      }
    ],
    "retenciones_percepciones": null,
    "tot_iva_tasa_min": 0,
    "tot_iva_tasa_bas": 36.07,
    "tot_iva_tasa_otra": 0,
    "descuentosRecargos": null,
    "total": "200.00",
    "estado": "Envío no corresponde",
    "cliente": [],
    "referencia_global": null,
    "razon_referencia": "",
    "modalidad_venta": null,
    "clausula_venta": "N/A",
    "via_transporte": null,
    "tipo_traslado": null,
    "adenda": "Orden DC-1763161459323",
    "esNotaAjuste": false,
    "fecha_creacion": "2025-11-19 15:13:23",
    "fecha_emision": "2025-11-14",
    "fecha_vencimiento": null,
    "indicador_pagos_terceros": null,
    "cae": {
      "numero": "90264315890",
      "serie": "MT",
      "inicio": 1,
      "fin": 9999999,
      "fecha_expiracion": "2027-02-06"
    }
  }
]
```

## 💾 Datos Guardados en Base de Datos

Después del proceso completo, se guardan en `facturas_venta`:

| Campo | Ejemplo | Fuente |
|-------|---------|--------|
| `dgi_enviada` | `true` | Sistema |
| `dgi_id` | `334467` | Response POST - id |
| `dgi_serie` | `"MT"` | Response POST - serie |
| `dgi_numero` | `389526` | Response POST - numero |
| `dgi_hash` | `"4oT4Sr8kb+Ze..."` | Response POST - hash |
| `dgi_cae` | `"90264315890"` | Response GET - cae.numero |
| `dgi_cae_numero` | `"90264315890"` | Response GET - cae.numero |
| `dgi_cae_serie` | `"MT"` | Response GET - cae.serie |
| `dgi_cae_vencimiento` | `"2027-02-06"` | Response GET - cae.fecha_expiracion |
| `dgi_fecha_envio` | `"2025-11-19T..."` | Sistema |
| `dgi_detalle_completo` | `{...}` | Response GET - JSON completo |
| `dgi_response` | `{...}` | Ambas respuestas + payload |

## 🔍 Consultar Información del CFE

### Ver CAE y Datos Principales
```sql
SELECT
  numero_factura,
  dgi_id,
  dgi_serie,
  dgi_numero,
  dgi_hash,
  dgi_cae_numero,
  dgi_cae_serie,
  dgi_cae_vencimiento,
  dgi_enviada,
  dgi_fecha_envio
FROM facturas_venta
WHERE id = 'tu-factura-id';
```

### Ver Detalle Completo del CFE
```sql
SELECT
  numero_factura,
  dgi_detalle_completo
FROM facturas_venta
WHERE id = 'tu-factura-id';
```

### Ver Respuestas de Ambas Llamadas
```sql
SELECT
  numero_factura,
  dgi_response -> 'create_response' as respuesta_post,
  dgi_response -> 'detail_response' as respuesta_get,
  dgi_response -> 'payload_enviado' as payload_enviado
FROM facturas_venta
WHERE id = 'tu-factura-id';
```

## 🎯 Ventajas de Este Flujo

### ✅ Trazabilidad Completa
- ID único del CFE en el sistema externo
- Hash de validación para verificar integridad
- CAE con número, serie y fecha de vencimiento
- Detalle completo del comprobante para auditoría

### ✅ Información para Futuro
- `dgi_detalle_completo`: JSON completo para análisis futuro
- `dgi_response`: Historial de ambas llamadas API
- Items con códigos, tasas, descuentos detallados
- Estados y fechas de creación/emisión

### ✅ Validación y Auditoría
- CAE con fecha de vencimiento para validar vigencia
- Hash para verificar que no fue modificado
- Estado del comprobante en el sistema externo
- Totales de IVA por tasa (mínima, básica, otra)

## 🚀 Uso desde la Aplicación

```typescript
// Enviar factura a DGI (hace automáticamente POST + GET)
import { enviarFacturaDGI } from './services/supabase/facturas';

try {
  const resultado = await enviarFacturaDGI(facturaId);

  console.log('CFE ID:', resultado.dgi_id);
  console.log('Serie-Número:', `${resultado.dgi_serie}-${resultado.dgi_numero}`);
  console.log('CAE:', resultado.dgi_cae_numero);
  console.log('Vence:', resultado.dgi_cae_vencimiento);

} catch (error) {
  console.error('Error:', error.message);
}
```

## 🔧 Manejo de Errores

El sistema captura y guarda errores en ambos pasos:

```sql
-- Ver si hubo error
SELECT
  numero_factura,
  dgi_enviada,
  dgi_response -> 'success' as exitoso,
  dgi_response -> 'error' as error_mensaje
FROM facturas_venta
WHERE id = 'tu-factura-id';
```

## 📊 Reportes Útiles

### Facturas Enviadas con CAE Válido
```sql
SELECT
  numero_factura,
  dgi_id,
  dgi_serie || '-' || dgi_numero as cfe_numero,
  dgi_cae_numero,
  dgi_cae_vencimiento,
  CASE
    WHEN dgi_cae_vencimiento > CURRENT_DATE THEN 'Vigente'
    ELSE 'Vencido'
  END as estado_cae
FROM facturas_venta
WHERE dgi_enviada = true
ORDER BY fecha_emision DESC;
```

### CAEs Próximos a Vencer
```sql
SELECT
  numero_factura,
  dgi_cae_numero,
  dgi_cae_vencimiento,
  dgi_cae_vencimiento - CURRENT_DATE as dias_restantes
FROM facturas_venta
WHERE dgi_enviada = true
  AND dgi_cae_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
ORDER BY dgi_cae_vencimiento;
```

## 🎬 Ejemplo de Log Completo

Al enviar una factura, verás en la consola:

```
CFE creado exitosamente: {
  id: 334467,
  serie: "MT",
  numero: "389526",
  hash: "4oT4Sr8kb+Ze33GWG3QOvo6ZRqc="
}

Detalle CFE obtenido: {
  id: 334467,
  serie: "MT",
  numero: 389526,
  cae: {
    numero: "90264315890",
    serie: "MT",
    fecha_expiracion: "2027-02-06"
  },
  // ... más información
}
```

## ✅ Checklist de Implementación

- [x] Variables de entorno configuradas
- [x] Tabla `empresas_config_cfe` creada
- [x] Campos de trazabilidad agregados a `facturas_venta`
- [x] Función POST para crear CFE
- [x] Función GET para obtener detalle
- [x] Guardar toda la información del CAE
- [x] Guardar JSON completo para auditoría
- [x] Manejo de errores implementado
- [x] Build compilado exitosamente

## 🎯 Próximos Pasos

1. **Probar el envío** desde la interfaz web
2. **Verificar los datos** guardados en la base de datos
3. **Revisar el JSON completo** en `dgi_detalle_completo`
4. **Validar el CAE** con su fecha de vencimiento

¡La integración está lista para usar!
