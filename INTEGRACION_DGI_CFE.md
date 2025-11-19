# Integración con Sistema de Facturación Electrónica (DGI)

## 📋 Descripción General

Este documento describe la integración del sistema ContaEmpresa con el servicio de Comprobantes Fiscales Electrónicos (CFE) de la DGI.

## 🔧 Configuración

### 1. Tabla de Configuración CFE

Cada empresa debe tener su configuración CFE en la tabla `empresas_config_cfe`:

```sql
CREATE TABLE empresas_config_cfe (
  id uuid PRIMARY KEY,
  empresa_id uuid NOT NULL,
  rut_emisor text NOT NULL,
  codigo_sucursal text,          -- Código de sucursal (ej: "572")
  ambiente text DEFAULT 'testing', -- "testing" o "produccion"
  url_webservice text,            -- URL del webservice de facturación
  habilitar_envio_automatico boolean DEFAULT true,
  -- Otros campos...
);
```

### 2. Configurar URL del Webservice

Hay dos formas de configurar la URL del webservice:

#### Opción A: Por Empresa (Recomendado)
```sql
UPDATE empresas_config_cfe
SET url_webservice = 'https://tu-proveedor-cfe.com/api/facturas'
WHERE empresa_id = 'tu-empresa-id';
```

#### Opción B: Variable de Entorno Global
En el archivo `.env`:
```
VITE_DGI_WEBSERVICE_URL=https://tu-proveedor-cfe.com/api/facturas
```

### 3. Configurar Código de Sucursal
```sql
UPDATE empresas_config_cfe
SET codigo_sucursal = '572'
WHERE empresa_id = 'tu-empresa-id';
```

## 📤 Formato del Payload Enviado a DGI

Cuando se envía una factura a DGI, el sistema construye automáticamente este JSON:

```json
{
  "tipo_comprobante": 101,
  "numero_interno": "8b7f7075-d6b5-496f-903a-52c735ef2093",
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

## 🔄 Mapeo de Datos

### Tipos de Comprobante
| Tipo Documento | Código CFE |
|----------------|------------|
| e-ticket       | 101        |
| e-factura      | 111        |
| e-nota-credito | 112        |
| e-nota-debito  | 113        |

### Formas de Pago
| Estado Factura | Código |
|----------------|--------|
| pagada         | 1 (Contado) |
| pendiente      | 2 (Crédito) |
| borrador       | 2 (Crédito) |

### Campos del Payload

- **tipo_comprobante**: Tomado del tipo de documento de la factura
- **numero_interno**: ID UUID de la factura
- **forma_pago**: 1 = Contado (si está pagada), 2 = Crédito (si está pendiente)
- **fecha_emision**: Formato DD/MM/YYYY
- **sucursal**: Código numérico desde `empresas_config_cfe.codigo_sucursal`
- **moneda**: Desde factura (UYU, USD, etc.)
- **montos_brutos**: Siempre 1
- **numero_orden**: Número de factura
- **lugar_entrega**: Desde `factura.metadata.lugar_entrega` o "Retiro en tienda"
- **cliente**: Razón social del cliente o "-"
- **items[].codigo**: Desde `item.metadata.codigo` (opcional)
- **items[].cantidad**: Cantidad del item
- **items[].concepto**: Descripción del item
- **items[].precio**: Precio unitario
- **items[].indicador_facturacion**: Siempre 3
- **items[].descuento_tipo**: "porcentaje" si hay descuento, "" si no
- **items[].descuento_cantidad**: Porcentaje de descuento
- **adenda**: Desde `factura.metadata.adenda` o `factura.observaciones`

## 🚀 Uso desde la Aplicación

### 1. Enviar Factura a DGI

```typescript
import { enviarFacturaDGI } from './services/supabase/facturas';

try {
  const resultado = await enviarFacturaDGI(facturaId);
  console.log('Factura enviada exitosamente:', resultado);
} catch (error) {
  console.error('Error al enviar factura:', error.message);
}
```

### 2. Verificar Estado del Envío

La respuesta de DGI se almacena en `facturas_venta.dgi_response`:

```sql
SELECT
  numero_factura,
  dgi_enviada,
  dgi_cae,
  dgi_fecha_envio,
  dgi_response
FROM facturas_venta
WHERE id = 'tu-factura-id';
```

## 📊 Respuestas Esperadas

### Respuesta Exitosa del Webservice
```json
{
  "success": true,
  "cae": "CAE-123456789",
  "numero_autorizacion": "12345678901234",
  "fecha_hora": "2025-11-19T10:30:00Z",
  "mensaje": "Comprobante aceptado"
}
```

### Respuesta en Caso de Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "codigo_error": "E001"
}
```

## 🔒 Seguridad

- Las credenciales y certificados deben almacenarse de forma segura
- Usar HTTPS para todas las comunicaciones
- El `certificado_password` debe estar encriptado
- Rotar certificados antes de su vencimiento

## 🧪 Modo de Simulación

Si no se configura `url_webservice`, el sistema opera en modo simulación:

- Genera un CAE ficticio
- Simula un delay de 1 segundo
- Marca la factura como enviada
- Guarda el payload que se habría enviado en `dgi_response.payload_enviado`

## ⚠️ Validaciones Importantes

Antes de enviar a DGI, el sistema valida:

1. ✅ La factura no debe estar ya enviada
2. ✅ Debe existir configuración CFE para la empresa
3. ✅ El código de sucursal debe estar configurado
4. ✅ Todos los items deben tener descripción y precio

## 📝 Ejemplo Completo

```typescript
// 1. Crear factura
const facturaId = await crearFactura({
  empresa_id: 'empresa-uuid',
  cliente_id: 'cliente-uuid',
  tipo_documento: 'e-ticket',
  moneda: 'UYU',
  metadata: {
    lugar_entrega: 'Dirección del cliente',
    adenda: 'Información adicional',
  },
  items: [
    {
      descripcion: 'Producto A',
      cantidad: 2,
      precio_unitario: 500,
      tasa_iva: 0.22,
      metadata: {
        codigo: 'PROD-001'
      }
    }
  ]
});

// 2. Enviar a DGI
const resultado = await enviarFacturaDGI(facturaId);

// 3. Verificar resultado
if (resultado.dgi_enviada) {
  console.log('CAE:', resultado.dgi_cae);
  console.log('Fecha envío:', resultado.dgi_fecha_envio);
}
```

## 🔍 Debugging

Para ver el payload que se envió:

```typescript
const factura = await obtenerFacturaPorId(facturaId);
console.log('Payload enviado:', factura.dgi_response.payload_enviado);
```

## 📞 Soporte

Si el webservice retorna errores:
1. Verificar que la configuración CFE esté completa
2. Revisar que el código de sucursal sea válido
3. Validar el formato de los datos de la factura
4. Consultar logs en `dgi_response`
