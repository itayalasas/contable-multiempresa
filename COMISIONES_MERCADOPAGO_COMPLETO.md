# Sistema Completo de Comisiones Mercado Pago

## Descripción General

Este documento describe el sistema de comisiones de Mercado Pago implementado en el sistema contable. Las comisiones se calculan en cascada y se aplican sobre las ventas procesadas a través de partners.

## Estructura de Comisiones

### 1. Comisión de Cobranza Electrónica (Base)
**Código:** `COMISION_COBRANZA_ELECTRONICA`

- **Tarjetas de crédito/débito:** 5.99% + IVA
- **Otros medios de pago:** 4.99% + IVA

Esta es la comisión base que cobra Mercado Pago por procesar el pago. Se aplica siempre.

### 2. Comisión por Acreditación Anticipada (Financiero)
**Códigos:** `COMISION_ACREDITACION_INSTANTANEA` / `COMISION_ACREDITACION_21_DIAS`

El partner puede elegir cuándo recibir su dinero:

| Opción | Días | Comisión | Código |
|--------|------|----------|---------|
| Al instante | 0 | 5.99% + IVA | COMISION_ACREDITACION_INSTANTANEA |
| A 21 días | 21 | 4.99% + IVA | COMISION_ACREDITACION_21_DIAS |

Esta comisión se suma a la comisión de cobranza.

### 3. Comisión por Financiamiento en Cuotas (Opcional)
**Código:** `COMISION_FINANCIAMIENTO_CUOTAS`

Si el partner ofrece financiamiento en cuotas sin interés:

| Cuotas | Comisión | Aplicable |
|--------|----------|-----------|
| 3 cuotas | Variable | Solo si está habilitado |
| 6 cuotas | Variable | Solo si está habilitado |
| 12 cuotas | 2.49% + IVA | Solo si está habilitado |

Esta comisión solo se aplica si:
1. El partner tiene `habilitacion_cuotas = true`
2. La venta fue realizada en cuotas
3. El número de cuotas es ≤ `cantidad_cuotas_max`

## Configuración por Partner

En la tabla `partners_aliados` se configuran los siguientes campos:

```sql
-- Configuración de cuotas
habilitacion_cuotas BOOLEAN DEFAULT false
cantidad_cuotas_max INTEGER DEFAULT 0  -- 0, 3, 6, 12
comision_cuotas_tasa DECIMAL(5,2) DEFAULT 2.49

-- Configuración de acreditación
dias_acreditacion INTEGER DEFAULT 21  -- 0 (instante) o 21 (días)
```

## Ejemplo de Cálculo

### Escenario 1: Venta Simple sin Cuotas
**Datos:**
- Monto venta: $10,000
- Método pago: Tarjeta de crédito
- Acreditación: 21 días
- Cuotas: No habilitadas

**Cálculo:**
```
Comisión Cobranza: $10,000 × 5.99% = $599.00
IVA sobre cobranza: $599.00 × 22% = $131.78
Total cobranza: $730.78

Comisión Acreditación 21 días: $10,000 × 4.99% = $499.00
IVA sobre acreditación: $499.00 × 22% = $109.78
Total acreditación: $608.78

TOTAL COMISIONES: $730.78 + $608.78 = $1,339.56
```

### Escenario 2: Venta con Cuotas
**Datos:**
- Monto venta: $10,000
- Método pago: Tarjeta de crédito
- Acreditación: Al instante
- Cuotas: 12 cuotas habilitadas

**Cálculo:**
```
Comisión Cobranza: $10,000 × 5.99% = $599.00
IVA sobre cobranza: $599.00 × 22% = $131.78
Total cobranza: $730.78

Comisión Acreditación instantánea: $10,000 × 5.99% = $599.00
IVA sobre acreditación: $599.00 × 22% = $131.78
Total acreditación: $730.78

Comisión Financiamiento 12 cuotas: $10,000 × 2.49% = $249.00
IVA sobre financiamiento: $249.00 × 22% = $54.78
Total financiamiento: $303.78

TOTAL COMISIONES: $730.78 + $730.78 + $303.78 = $1,765.34
```

## Impacto Contable

### Asientos Automáticos Generados

Cuando se procesa una factura de venta con comisiones de Mercado Pago:

**1. Registro de la Venta**
```
DEBE: Cuentas por Cobrar - Cliente
HABER: Ingresos por Ventas
HABER: IVA por Pagar
```

**2. Registro de Comisiones Mercado Pago**
```
DEBE: Gastos Financieros - Comisión Cobranza Electrónica
DEBE: Gastos Financieros - Comisión Acreditación
DEBE: Gastos Financieros - Comisión Financiamiento Cuotas (si aplica)
DEBE: IVA Crédito Fiscal (sobre comisiones)
HABER: Cuentas por Pagar - Mercado Pago
```

**3. Registro de Comisión al Partner**
```
DEBE: Gastos - Comisiones Partners
HABER: Cuentas por Pagar - Partner
```

### Cuentas Contables Requeridas

Asegúrese de tener configuradas las siguientes cuentas:

- **51301** - Gastos Financieros - Comisión Cobranza Electrónica
- **51302** - Gastos Financieros - Comisión Acreditación
- **51303** - Gastos Financieros - Financiamiento Cuotas
- **21105** - Cuentas por Pagar - Mercado Pago

## Configuración en el Sistema

### 1. Configurar Comisiones Globales
`Administración > Gestión de Impuestos`

Aquí se configuran las tasas de comisiones aplicables:
- COMISION_COBRANZA_ELECTRONICA
- COMISION_ACREDITACION_INSTANTANEA
- COMISION_ACREDITACION_21_DIAS
- COMISION_FINANCIAMIENTO_CUOTAS

### 2. Configurar Partner
`Compras > Partners`

Para cada partner configure:
- **Acreditación del Dinero:** Al instante o 21 días
- **Habilitar Cuotas:** Sí/No
- **Cantidad Máxima de Cuotas:** 3, 6, 12
- **Comisión por Cuotas:** % (default: 2.49%)

### 3. Procesamiento Automático

Las comisiones se calculan automáticamente cuando:
1. Se recibe un webhook de orden desde el marketplace
2. El webhook contiene información de cuotas y método de pago
3. El partner tiene configuración activa de Mercado Pago

## Fuente de Información

La información de comisiones proviene de la documentación oficial de Mercado Pago:
- [¿Cuánto cuesta recibir pagos con Checkout?](https://www.mercadopago.com.uy/costs-section/cost-landing)
- [Comisiones y cuotas](https://www.mercadopago.com.uy/settings/release-options)

**Nota:** Las tasas pueden variar según el país y el tipo de cuenta. Consulte siempre la documentación actualizada de Mercado Pago.

## Actualizaciones

Este sistema es configurable y permite actualizar las tasas sin modificar código:
- Las tasas se guardan en `impuestos_configuracion`
- Se pueden actualizar desde la interfaz de administración
- Los cambios aplican a nuevas facturas automáticamente
