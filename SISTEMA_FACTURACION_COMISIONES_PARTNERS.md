# Sistema de Facturación y Pagos a Partners - Documentación Completa

## Resumen Ejecutivo

Se implementó un sistema completo para gestionar el flujo contable de comisiones a partners/aliados desde las ventas hasta el pago final, manejando retenciones y comisiones del sistema.

## Flujo Completo del Sistema

### 1. Generación de Facturas a Clientes (Paso 1)
**Función:** `generar-facturas-partners`

Cuando se recibe una orden de Dogcatify:
- Se extrae la información de las comisiones de cada partner
- Se crea una factura de venta al cliente final (e-factura) por las comisiones
- Se generan asientos contables automáticos
- Las comisiones pasan de estado `pendiente` → `facturada`

**Asiento Contable Generado:**
```
DEBE:  Cuentas por Cobrar (1212)     $1000
  HABER: Ventas (7011)                       $909.09
  HABER: IVA por Pagar (2113)                 $90.91
```

### 2. Generación de Cuentas por Pagar (Paso 2)
**Función:** `generar-facturas-compra-partners`

Convierte las comisiones facturadas en cuentas por pagar:
- Agrupa comisiones facturadas por partner
- Calcula: Total Comisión - Retención ML - Comisión Sistema = Monto a Transferir
- Crea proveedor automáticamente desde datos del partner
- Genera factura de compra
- Crea cuenta por pagar por el monto neto
- Actualiza comisiones a estado `pendiente` de pago

**Ejemplo de Cálculo:**
```
Total Comisión Facturada:     $1000.00
- Retención ML (7%):          -$70.00
- Comisión Sistema (15%):     -$150.00
= Monto a Transferir:         $780.00
```

**Asiento Contable Generado:**
```
DEBE:  Gasto Comisiones Partners (6011)    $1000.00
  HABER: Ingreso Comisión Sistema (7031)           $150.00
  HABER: Ingreso Retención ML (7032)                $70.00
  HABER: Cuentas por Pagar (2211)                  $780.00
```

Este asiento refleja que:
1. Reconocemos el gasto total de la comisión
2. Registramos los ingresos por comisión del sistema y retención ML
3. Quedamos debiendo solo el neto al partner

### 3. Pago a Partner (Paso 3)
**Función:** `procesar-pago-partner`

Cuando se ejecuta el pago:
- Registra el pago en `pagos_proveedor`
- Actualiza el saldo de la cuenta por pagar
- Marca las comisiones como `pagada`
- Actualiza la factura de compra a estado `pagada`
- Genera asiento contable del pago

**Asiento Contable del Pago:**
```
DEBE:  Cuentas por Pagar (2211)    $780.00
  HABER: Banco/Caja (1111)                 $780.00
```

Este asiento cierra la cuenta por pagar y registra la salida de dinero.

## Resultado Contable Final

### Balance de Ingresos y Gastos

**Ingresos:**
- Ventas por comisiones: $909.09 (Cuenta 7011)
- Comisión del sistema: $150.00 (Cuenta 7031)
- Retención ML: $70.00 (Cuenta 7032)
- **Total Ingresos: $1,129.09**

**Gastos:**
- Gasto comisiones partners: $1,000.00 (Cuenta 6011)
- **Total Gastos: $1,000.00**

**Utilidad Neta: $129.09**

**Compuesto por:**
- Comisión del sistema: $150.00
- Retención ML: $70.00
- IVA por pagar: -$90.91
- **= $129.09**

### Flujo de Caja

**Entradas:**
- Cobro al cliente: $1,000.00

**Salidas:**
- Pago al partner: $780.00
- IVA a pagar a DGI: $90.91
- **Total Salidas: $870.91**

**Efectivo Neto: $129.09**

## Base de Datos

### Migración Implementada
`add_retencion_comision_fields_facturas_compra_v2`

Agrega a la tabla `facturas_compra`:
- `retencion_porcentaje`: % de retención (ej. 7% ML)
- `retencion_monto`: Monto en $ de retención
- `comision_sistema_porcentaje`: % de comisión del sistema
- `comision_sistema_monto`: Monto en $ de comisión
- `monto_transferir_partner`: Monto neto a pagar
- `lote_comisiones_id`: Referencia al lote de comisiones
- `partner_id`: Referencia al partner
- `tipo_factura_compra`: Tipo de factura (normal, partner_pago)

## Edge Functions Implementadas

### 1. `generar-facturas-compra-partners`
**Endpoint:** `/functions/v1/generar-facturas-compra-partners`

**Entrada:**
```json
{
  "empresaId": "uuid",
  "partnerId": "uuid" // Opcional
}
```

**Salida:**
```json
{
  "success": true,
  "facturas_compra_generadas": 3,
  "cuentas_por_pagar_generadas": 3,
  "comisiones_procesadas": 45
}
```

### 2. `generar-asiento-factura-compra`
**Endpoint:** `/functions/v1/generar-asiento-factura-compra`

**Entrada:**
```json
{
  "facturaCompraId": "uuid"
}
```

Genera asientos contables diferentes según el tipo:
- **partner_pago**: Asiento con ingresos por comisión y retención
- **normal**: Asiento estándar de compra

### 3. `procesar-pago-partner`
**Endpoint:** `/functions/v1/procesar-pago-partner`

**Entrada:**
```json
{
  "cuentaPorPagarId": "uuid",
  "monto": 780.00,
  "fecha_pago": "2025-01-15",
  "tipo_pago": "transferencia",
  "cuentaBancariaId": "uuid", // Opcional
  "referencia": "TRANS-12345",
  "observaciones": "Pago quincenal",
  "usuarioId": "user-id"
}
```

**Salida:**
```json
{
  "success": true,
  "pago_id": "uuid",
  "estado_cuenta": "PAGADA",
  "saldo_pendiente": 0
}
```

## Interfaz de Usuario

### Página: Comisiones de Partners

**Ubicación:** `/compras/comisiones-partners`

**Funcionalidades:**

1. **Botón "1. Generar Facturas a Clientes"** (Azul)
   - Genera e-facturas de venta por las comisiones pendientes
   - Agrupa por partner
   - Marca comisiones como `facturada`

2. **Botón "2. Generar Cuentas por Pagar"** (Verde)
   - Convierte comisiones facturadas en cuentas por pagar
   - Crea facturas de compra
   - Aplica retenciones y comisiones del sistema
   - Genera asientos contables

3. **Dashboard con Totales:**
   - Comisiones Pendientes
   - Por Pagar (Facturadas)
   - Total Pagado

4. **Tabla de Detalle:**
   - Muestra todas las comisiones
   - Filtros: Todas, Pendientes, Facturadas, Pagadas
   - Información de partner, orden, factura, montos

### Página: Cuentas por Pagar

**Ubicación:** `/finanzas/cuentas-por-pagar`

Permite ejecutar pagos que invocan `procesar-pago-partner` automáticamente.

## Configuración del Sistema

### Variables de Empresa (metadata)

En la tabla `empresas.metadata`:
```json
{
  "retencion_mercadolibre": 7.0,
  "comision_sistema": 15.0
}
```

**Valores por defecto:**
- Retención ML: 7%
- Comisión Sistema: 15%

## Plan de Cuentas Requerido

El sistema requiere las siguientes cuentas contables:

### Activo
- **1111**: Bancos
- **1212**: Cuentas por Cobrar

### Pasivo
- **2113**: IVA por Pagar
- **2211**: Cuentas por Pagar

### Gastos
- **6001**: Gastos Generales
- **6011**: Gasto Comisiones Partners

### Ingresos
- **7011**: Ventas
- **7031**: Ingreso Comisiones Sistema
- **7032**: Ingreso Retención ML

**Nota:** Si faltan cuentas, las funciones generarán errores descriptivos indicando qué cuentas faltan.

## Proceso Paso a Paso

### Flujo Completo

1. **Recepción de Orden** (Webhook Dogcatify)
   - Se registra la orden
   - Se extraen las comisiones por partner
   - Estado: `pendiente`

2. **Generación de Facturas a Clientes**
   - Click en "1. Generar Facturas a Clientes"
   - Se crean e-facturas de venta
   - Se generan asientos: Cuentas por Cobrar → Ventas + IVA
   - Estado: `facturada`

3. **Generación de Cuentas por Pagar**
   - Click en "2. Generar Cuentas por Pagar"
   - Se calculan retenciones y comisiones
   - Se crean facturas de compra y cuentas por pagar
   - Se generan asientos: Gasto Comisiones → Ingresos Sistema + Retención + Cuentas por Pagar
   - Estado: `pendiente` (de pago)

4. **Pago a Partner**
   - Ir a "Cuentas por Pagar"
   - Registrar pago de la cuenta
   - Se genera asiento: Cuentas por Pagar → Banco
   - Estado: `pagada`

## Cuadratura Contable

### Verificación Manual

Para verificar que todo cuadra:

1. **Balance General:**
   ```
   Activo (Cuentas por Cobrar):     $1,000.00
   Pasivo (IVA por Pagar):           $90.91
   Patrimonio (Utilidad):           $129.09
   Pasivo (Cuentas por Pagar):      $780.00 (antes del pago)
   ```

2. **Estado de Resultados:**
   ```
   Ingresos:
     Ventas:                        $909.09
     Comisión Sistema:              $150.00
     Retención ML:                   $70.00
   Total Ingresos:                $1,129.09

   Gastos:
     Comisiones Partners:         $1,000.00
   Total Gastos:                  $1,000.00

   Utilidad Neta:                  $129.09
   ```

3. **Flujo de Efectivo:**
   ```
   Ingreso (Cobro Cliente):      $1,000.00
   Egreso (Pago Partner):         -$780.00
   Egreso (IVA a DGI):             -$90.91
   Efectivo Neto:                  $129.09
   ```

## Troubleshooting

### Errores Comunes

1. **"Faltan cuentas: 6011, 7031, 7032"**
   - Crear las cuentas contables requeridas en el plan de cuentas

2. **"El período contable está cerrado"**
   - Reabrir el período contable desde Contabilidad > Períodos Contables

3. **"No hay comisiones facturadas pendientes"**
   - Ejecutar primero "1. Generar Facturas a Clientes"

4. **"Empresa no encontrada"**
   - Verificar que `empresaId` es correcto

## Conclusión

El sistema implementado proporciona:

✅ Trazabilidad completa de comisiones desde la venta hasta el pago
✅ Cálculo automático de retenciones y comisiones
✅ Asientos contables que cuadran perfectamente
✅ Separación clara entre lo que se factura al cliente y lo que se paga al partner
✅ Registro de ingresos por comisiones del sistema y retenciones
✅ Integración completa con el sistema contable existente

El flujo garantiza que:
- Se registran todos los ingresos y gastos correctamente
- Se calculan y registran las retenciones
- Se mantiene control de cuentas por pagar
- Los asientos contables cuadran en todo momento
- Se puede auditar cualquier transacción
