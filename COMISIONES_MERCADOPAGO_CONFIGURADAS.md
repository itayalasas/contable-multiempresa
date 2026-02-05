# Sistema de Comisiones Mercado Pago Configurado

## Cambios Realizados

### 1. Comisiones Calculadas Según Configuración del Partner

**Problema Original**: El sistema aplicaba una comisión genérica del 7% a nivel de orden, sin considerar la configuración específica de cada partner.

**Solución**: Ahora cada partner tiene su configuración de Mercado Pago:

```typescript
// Configuración del Partner
{
  dias_acreditacion: 21,              // 0 = instantáneo, 21 = a 21 días
  habilitacion_cuotas: false,         // ¿Ofrece cuotas sin interés?
  comision_cuotas_tasa: 2.49         // Tasa si habilita cuotas
}
```

### 2. Comisiones por Item (No por Orden)

Las comisiones de Mercado Pago se calculan **por cada item** del partner, no a nivel de orden completa:

**Ejemplo de Orden**:
```json
{
  "order_id": "123",
  "total": 6120,
  "items": [
    {
      "partner": "Animales Felices",
      "total": 6120,
      "base_amount": 5016.39,  // Sin IVA después de descuentos
      "tax_amount": 1103.61
    }
  ]
}
```

**Comisiones Generadas**:

1. **Comisión Partner** (5% sobre base sin IVA):
   - Base: $5,016.39
   - Porcentaje: 5%
   - Monto: $250.82
   - Tipo: `partner`
   - Estado: `pendiente` → Se factura al cliente

2. **Comisión Acreditación MP** (4.99% sobre total con IVA):
   - Base: $6,120.00
   - Porcentaje: 4.99% (porque el partner tiene `dias_acreditacion = 21`)
   - Monto: $305.39
   - Tipo: `acreditacion_21_dias`
   - Beneficiario: `MercadoPago`
   - Estado: `auto_cobrada` → NO se factura

3. **Comisión Cuotas MP** (si `habilitacion_cuotas = true`):
   - Base: $6,120.00
   - Porcentaje: 2.49%
   - Monto: $152.39
   - Tipo: `financiamiento_cuotas`
   - Beneficiario: `MercadoPago`
   - Estado: `auto_cobrada` → NO se factura

### 3. Tipos de Comisiones

El sistema ahora registra todos estos tipos en la tabla unificada `comisiones_partners`:

| Tipo | Descripción | Se Factura | Beneficiario |
|------|-------------|-----------|--------------|
| `partner` | Comisión al partner/aliado | ✅ Sí | Partner |
| `marketplace` | Comisión de MercadoLibre | ❌ No | MercadoLibre |
| `acreditacion_instantanea` | MP acreditación inmediata (5.99%) | ❌ No | MercadoPago |
| `acreditacion_21_dias` | MP acreditación 21 días (4.99%) | ❌ No | MercadoPago |
| `financiamiento_cuotas` | MP cuotas sin interés (2.49%) | ❌ No | MercadoPago |

### 4. Estado de Pago

Nuevo estado: `auto_cobrada`

- `pendiente`: Comisión registrada, no facturada aún
- `facturada`: Factura generada al cliente
- `pagada`: Factura pagada
- `auto_cobrada`: **Comisión descontada automáticamente** (no requiere facturación)

### 5. Exclusión de Facturación

Las comisiones con `estado_pago = 'auto_cobrada'` se **excluyen** de:

1. **Generación de Facturas a Clientes**: No se incluyen en e-tickets
2. **Generación de Facturas de Compra**: No se crean cuentas por pagar
3. **Resúmenes "Pendientes"**: No aparecen en el total a facturar
4. **Resúmenes "Por Pagar"**: No aparecen en el total a pagar

Pero **SÍ se incluyen** en:

1. **Resumen "Auto-Cobradas"**: Nuevo total separado
2. **Vista detallada**: Se muestran con etiqueta azul "Auto-Cobrada"
3. **Filtros por tipo**: Se pueden ver con filtro "Marketplace" o "Mercado Pago"

## Configuración por Partner

### En el Modal de Partner

```
Configuración Mercado Pago
├─ Acreditación del Dinero
│  └─ A 21 días (4.99% + IVA)
│     └─ Tiempo de disponibilización del dinero y comisión asociada
│
└─ Habilitar Cuotas Sin Interés
   └─ ☐ Si está habilitado, se aplicará la comisión por financiamiento
```

### Tasas según Configuración

**Acreditación**:
- `dias_acreditacion = 0`: 5.99% (instantáneo)
- `dias_acreditacion = 21`: 4.99% (a 21 días)

**Cuotas**:
- `habilitacion_cuotas = false`: No se cobra
- `habilitacion_cuotas = true`: 2.49%

## Pantalla de Comisiones

### Resúmenes (4 tarjetas)

1. **Pendientes (A Facturar)**
   - Solo comisiones de partners
   - Excluye auto-cobradas
   - Color: Amarillo

2. **Por Pagar (Facturadas)**
   - Solo comisiones facturadas pero no pagadas
   - Excluye auto-cobradas
   - Color: Naranja

3. **Pagadas**
   - Solo comisiones pagadas a partners
   - Excluye auto-cobradas
   - Color: Verde

4. **Auto-Cobradas** (NUEVO)
   - Comisiones de marketplace/MP
   - Ya descontadas automáticamente
   - Color: Azul

### Filtros

**Por Estado**:
- Todas
- Pendientes
- Facturadas
- Pagadas

**Por Tipo** (NUEVO):
- Todas
- Partners: Solo comisiones de partners
- Marketplace: Solo comisiones de MercadoLibre
- Mercado Pago: Solo comisiones de procesamiento MP

### Tabla de Comisiones

| Fecha | Partner/Beneficiario | Orden | Factura | Descripción | Venta | % | Comisión | Estado |
|-------|---------------------|-------|---------|-------------|-------|---|----------|--------|
| 2/4/2026 | Animales Felices<br><small>Comisión Partner</small> | 41d4... | 00000001 | BIOFRESH Alimento... | $5,016.39 | 5% | $250.82 | 🟡 Pendiente |
| 2/4/2026 | MercadoPago<br><small>Acreditación 21 días</small> | 41d4... | 00000001 | Acreditación 21 días - BIOFRESH... | $6,120.00 | 4.99% | $305.39 | 🔵 Auto-Cobrada |

## Flujo Completo

### 1. Webhook Recibe Orden

```javascript
POST /functions/v1/webhooks-orders
{
  "order": {
    "total": 6120,
    "items": [{
      "partner": {
        "partner_id": "d4472cc4...",
        "commission_percentage": 5
      },
      "total": 6120,
      "base_amount": 5016.39
    }]
  }
}
```

### 2. Sistema Procesa

1. Crea factura de venta
2. Por cada item con partner:
   - Registra comisión del partner (`tipo_comision = 'partner'`)
   - Busca configuración MP del partner
   - Si tiene `dias_acreditacion` configurado:
     - Registra comisión de acreditación (`tipo_comision = 'acreditacion_*'`, `estado_pago = 'auto_cobrada'`)
   - Si tiene `habilitacion_cuotas = true`:
     - Registra comisión de cuotas (`tipo_comision = 'financiamiento_cuotas'`, `estado_pago = 'auto_cobrada'`)

### 3. Usuario Genera Facturas a Clientes

1. Va a `Compras > Comisiones`
2. Clic en "1. Generar Facturas a Clientes"
3. Sistema:
   - Busca comisiones con `estado_comision = 'pendiente'`
   - **Filtra solo `tipo_comision = 'partner'`**
   - Genera e-tickets para clientes
   - Marca comisiones como `estado_comision = 'facturada'`

### 4. Usuario Genera Facturas de Compra

1. Clic en "2. Generar Facturas de Compra"
2. Sistema:
   - Busca comisiones con `estado_comision = 'facturada'` Y `estado_pago != 'auto_cobrada'`
   - Agrupa por partner
   - Crea facturas de compra por partner
   - Crea cuentas por pagar

### 5. Pago a Partner

Cuando se paga al partner:
- Se marca `estado_pago = 'pagada'`
- Se registra `fecha_pagada`

## Ventajas del Sistema

1. **Transparencia Total**: Todas las comisiones visibles en un solo lugar
2. **Correcta Facturación**: Solo se facturan comisiones de partners
3. **Trazabilidad**: Cada comisión vinculada a su factura de venta
4. **Configuración Flexible**: Cada partner puede tener tasas diferentes
5. **Separación Clara**: Comisiones facturables vs auto-cobradas
6. **Reportes Precisos**: Totales correctos por tipo de comisión

## Ejemplo Completo

### Orden: $6,120 con Partner

**Configuración Partner "Animales Felices"**:
- Comisión: 5%
- Acreditación: 21 días (4.99%)
- Cuotas: No habilitadas

**Comisiones Registradas**:

| Tipo | Beneficiario | Base | % | Monto | Se Factura |
|------|--------------|------|---|-------|-----------|
| Partner | Animales Felices | $5,016.39 | 5% | $250.82 | ✅ Sí |
| Acreditación | MercadoPago | $6,120.00 | 4.99% | $305.39 | ❌ No |

**Resúmenes Mostrados**:
- Pendientes (A Facturar): **$250.82** (solo partner)
- Auto-Cobradas: **$305.39** (solo MP)

**Flujos de Facturación**:
1. "Generar Facturas a Clientes" → Crea e-ticket de $250.82 + IVA
2. "Generar Facturas de Compra" → Crea factura de compra de $250.82 (sin IVA adicional)
3. Las comisiones de MP **NO** se facturan nunca

## Notas Técnicas

- Las comisiones MP se calculan sobre el **total con IVA** (como lo hace MercadoPago)
- Las comisiones de partners se calculan sobre la **base sin IVA** (para evitar doble imposición)
- El campo `estado_pago = 'auto_cobrada'` es la clave para filtrar
- La función `generar-facturas-compra-partners` tiene filtro `.neq('estado_pago', 'auto_cobrada')`
