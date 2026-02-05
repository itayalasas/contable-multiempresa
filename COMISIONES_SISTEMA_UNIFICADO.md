# Sistema Unificado de Comisiones

## Problema Identificado

1. **Monto incorrecto en comisiones**: Se mostraba $8,160 cuando la venta real fue de $6,120
   - **Causa**: El webhook tomaba `item.subtotal` (antes del descuento) en lugar del monto real después de descuentos
   - **Monto antes del descuento**: $8,160
   - **Descuento aplicado**: $2,040 (25%)
   - **Monto real (base_amount)**: $5,016.39 (sin IVA)
   - **Total con IVA**: $6,120

2. **Comisiones de Mercado Pago no visibles**: Las comisiones de la pasarela de pagos no se mostraban en ningún lugar del sistema

## Solución Implementada

### 1. Corrección del Cálculo de Comisiones

**Archivo**: `supabase/functions/webhooks-orders/index.ts`

Cambiamos la lógica para usar `base_amount` (monto real después de descuentos):

```typescript
// ANTES (incorrecto)
const itemSubtotal = (item.subtotal || (item.quantity * item.unit_price)) / divisor;

// DESPUÉS (correcto)
let itemSubtotalSinIva;
if (item.base_amount) {
  itemSubtotalSinIva = item.base_amount / divisor;
} else {
  const itemTotal = (item.total || 0) / divisor;
  const itemTaxRate = item.tax_rate || 0.22;
  itemSubtotalSinIva = itemTotal / (1 + itemTaxRate);
}
```

### 2. Sistema Unificado de Comisiones

**Migración**: `20260205XXXXXX_unificar_sistema_comisiones_completo.sql`

Expandimos la tabla `comisiones_partners` para registrar TODAS las comisiones del sistema:

#### Nuevos Campos

- `tipo_comision`: Identifica el tipo de comisión
  - `partner`: Comisión a partner/aliado
  - `marketplace`: Comisión de MercadoLibre
  - `cobranza_electronica`: Comisión de procesamiento Mercado Pago
  - `acreditacion_instantanea`: Comisión por dinero al instante (5.99%)
  - `acreditacion_21_dias`: Comisión por acreditación a 21 días (4.99%)
  - `financiamiento_cuotas`: Comisión por ofrecer cuotas sin interés (2.49%)

- `beneficiario`: Nombre del beneficiario (MercadoLibre, MercadoPago, nombre del partner, etc.)
- `configuracion_comision_id`: Referencia a la configuración usada para el cálculo
- `partner_id`: Ahora es NULLABLE (para comisiones que no son de partners)

### 3. Registro Automático de Comisiones

El webhook ahora registra automáticamente:

1. **Comisiones de Partners**: Por cada item vendido (como antes, pero con monto correcto)
2. **Comisión de Marketplace**: La comisión de MercadoLibre sobre el total de la venta

```typescript
await supabase
  .from('comisiones_partners')
  .insert({
    empresa_id: payload.empresa_id,
    partner_id: null,
    factura_venta_id: factura.id,
    order_id: payload.order.order_id,
    fecha: new Date().toISOString().split('T')[0],
    subtotal_venta: total.toFixed(2),
    comision_porcentaje: comisionMLPorcentaje,
    comision_monto: comisionMLMonto.toFixed(2),
    tipo_comision: 'marketplace',
    beneficiario: 'MercadoLibre',
    estado_comision: 'pendiente',
    estado_pago: 'pendiente',
    descripcion: `Comisión MercadoLibre ${comisionMLPorcentaje}%`,
  });
```

### 4. Pantalla Unificada de Comisiones

**Archivo**: `src/pages/compras/ComisionesPartners.tsx`

#### Cambios en la Vista

1. **Muestra TODAS las comisiones** (partners + marketplace + Mercado Pago)
2. **LEFT JOIN en vez de INNER JOIN**: Permite mostrar comisiones sin partner
3. **Columna beneficiario mejorada**: Muestra el nombre del partner O el beneficiario según el tipo

```tsx
{comision.partners_aliados?.razon_social || comision.beneficiario || 'N/A'}
```

4. **Etiqueta de tipo de comisión**: Indica visualmente el tipo de cada comisión
   - "Comisión Partner"
   - "Comisión Marketplace"
   - "Cobranza Electrónica"
   - "Acreditación Instantánea"
   - "Acreditación 21 días"
   - "Financiamiento Cuotas"

#### Nuevos Filtros

**Filtro por Estado** (existente):
- Todas
- Pendientes
- Facturadas
- Pagadas

**Filtro por Tipo** (nuevo):
- Todas: Muestra todas las comisiones
- Partners: Solo comisiones de partners
- Marketplace: Solo comisiones de MercadoLibre
- Mercado Pago: Solo comisiones de procesamiento de pagos

## Ejemplo de Uso

### Escenario: Venta con Partner y Comisión de Marketplace

**Datos de la orden:**
- Total: $6,120 (con IVA)
- Base sin IVA: $5,016.39
- Descuento: 25%
- Partner: Animales Felices (5% de comisión)
- Marketplace: MercadoLibre (7% de comisión)

**Comisiones registradas:**

| Beneficiario | Tipo | Base | % | Monto | Estado |
|--------------|------|------|---|-------|--------|
| Animales Felices | Partner | $5,016.39 | 5% | $250.82 | Pendiente |
| MercadoLibre | Marketplace | $6,120.00 | 7% | $428.40 | Pendiente |

**Total comisiones**: $679.22

### Cómo Ver las Comisiones

1. **Ver todas las comisiones**:
   - Ir a `Compras > Comisiones`
   - Filtro "Tipo" = "Todas"
   - Se muestran partners + marketplace

2. **Ver solo comisiones de partners**:
   - Filtro "Tipo" = "Partners"
   - Solo muestra comisiones pagaderas a partners

3. **Ver solo comisiones de marketplace**:
   - Filtro "Tipo" = "Marketplace"
   - Solo muestra comisiones de MercadoLibre

4. **Ver comisiones pendientes de pago**:
   - Filtro "Estado" = "Pendientes"
   - Muestra todas las comisiones no pagadas

## Flujo Contable

### 1. Al Procesar la Venta

**Asiento de Venta**:
```
DEBE: Cuentas por Cobrar - Cliente     $6,120.00
HABER: Ingresos por Ventas             $5,016.39
HABER: IVA por Pagar                   $1,103.61
```

### 2. Al Registrar Cobro (Automático si payment_status = paid)

**Movimiento de Tesorería - Ingreso**:
```
DEBE: Banco MercadoLibre               $6,120.00
HABER: Cuentas por Cobrar              $6,120.00
```

### 3. Al Registrar Comisión ML (Automático)

**Movimiento de Tesorería - Egreso**:
```
DEBE: Gastos - Comisión Marketplace    $428.40
HABER: Banco MercadoLibre              $428.40
```

**Registro en Comisiones**:
- Se crea una comisión tipo `marketplace`
- Beneficiario: MercadoLibre
- Monto: $428.40
- Estado: Pendiente

### 4. Al Facturar Comisión Partner (Manual)

Cuando se ejecuta "Generar Facturas a Clientes":
- Se crea factura electrónica e-ticket
- Cliente: Partner (Animales Felices)
- Total: $250.82 + IVA
- Estado comisión: `facturada`

### 5. Al Registrar Pago a Partner (Manual)

Cuando se paga al partner:
- Se registra egreso de tesorería
- Estado comisión: `pagada`

## Beneficios del Sistema Unificado

1. **Visibilidad Total**: Todos los gastos por comisiones en un solo lugar
2. **Control Financiero**: Fácil ver cuánto se debe a partners vs marketplace
3. **Reportes Precisos**: Cálculos correctos basados en montos reales
4. **Filtros Flexibles**: Analizar por tipo y estado según necesidad
5. **Trazabilidad**: Cada comisión vinculada a su factura de venta
6. **Automatización**: Comisiones se registran automáticamente al procesar webhook

## Próximas Mejoras

1. **Comisiones de Mercado Pago**: Implementar registro automático de:
   - Comisión de cobranza electrónica (variable según método)
   - Comisión de acreditación (según días configurados)
   - Comisión de financiamiento (si el partner ofrece cuotas)

2. **Dashboard de Comisiones**: Gráficos de comisiones por tipo y período

3. **Alertas**: Notificaciones cuando hay comisiones pendientes de facturar

4. **Conciliación**: Comparar comisiones registradas vs extractos de MercadoLibre
