# Mejoras en Visibilidad de Comisiones

## Problemas Resueltos

### 1. ✅ Comisión de Mercado Pago Visible en Tesorería

**Problema:** La comisión de Mercado Pago no era visible como una transacción separada en el módulo de Tesorería.

**Solución Implementada:**

Cuando se registra un cobro de una factura con comisión de Mercado Pago, ahora se crean **DOS movimientos** en tesorería:

1. **INGRESO** - Monto total que el cliente pagó
   - Descripción: "Cobro factura A-00000001 - Cliente"
   - Monto: $6,120 (el total de la factura)
   - Categoría: COBRO_CLIENTE

2. **EGRESO** - Comisión que cobra Mercado Pago
   - Descripción: "Comisión Mercado Pago 5% - Factura A-00000001"
   - Monto: $306 (la comisión de MP)
   - Beneficiario: Mercado Pago
   - Categoría: COMISION_PASARELA

**Resultado Neto:** $6,120 - $306 = $5,814 (el ingreso real en la cuenta bancaria) ✅

**Beneficios:**
- La comisión de MP es visible como una transacción separada
- Se puede ver claramente cuánto cobra MP en cada operación
- El saldo bancario final cuadra con el monto real que ingresa
- Facilita la conciliación bancaria

**Archivo Modificado:**
- `/supabase/functions/procesar-cobro-cliente/index.ts`

---

### 2. ✅ Estado de Factura de Comisión Actualizado Automáticamente

**Problema:** Las facturas de comisión quedaban en estado "pendiente" después de generar la factura de compra al partner. El usuario esperaba que cambiaran a "validada" automáticamente.

**Solución Implementada:**

Cuando se ejecuta "2. Generar Facturas de Compra" para facturar a los partners, el sistema ahora:

1. Crea la factura de compra al partner (como antes)
2. Crea la cuenta por pagar asociada (como antes)
3. **NUEVO:** Actualiza automáticamente las facturas de comisión de "pendiente" a "validada"

**Flujo Completo:**

```
1. Se genera factura de venta → Comisión estado: "facturada" → Factura comisión: "pendiente"
2. Se ejecuta "Generar Facturas de Compra" → Se crea factura al partner
3. AUTOMÁTICO: Factura comisión cambia a "validada" ✅
4. Se paga al partner → Estado pago: "pagada"
```

**Beneficios:**
- El estado de las facturas de comisión refleja correctamente el proceso
- "Pendiente" = Aún no se generó la cuenta por pagar al partner
- "Validada" = Ya se generó la factura de compra al partner, lista para pagar
- "Pagada" = El partner ya recibió su pago
- Reduce confusión sobre el estado de las comisiones

**Archivo Modificado:**
- `/supabase/functions/generar-facturas-compra-partners/index.ts`

---

## Visualización en el Sistema

### En Tesorería

Ahora verás:

```
MOVIMIENTOS DE TESORERÍA
┌─────────────┬──────────────────────────────────┬──────────┬──────────┐
│ FECHA       │ DESCRIPCIÓN                      │ INGRESO  │ EGRESO   │
├─────────────┼──────────────────────────────────┼──────────┼──────────┤
│ 04/02/2026  │ Cobro factura A-00000001         │ $6,120   │          │
│ 04/02/2026  │ Comisión Mercado Pago 5%         │          │ $306     │
└─────────────┴──────────────────────────────────┴──────────┴──────────┘
                                          SALDO:   $5,814 ✅
```

### En Ventas → Facturas

```
FACTURAS
┌──────────────┬─────────────────┬────────┬──────────┬─────────────┐
│ NÚMERO       │ CLIENTE         │ TOTAL  │ ESTADO   │ DGI         │
├──────────────┼─────────────────┼────────┼──────────┼─────────────┤
│ A-00000001   │ Pedro Ayala     │ $6,120 │ Pagada   │ Enviada     │
│ COM-00000001 │ Animales Felices│ $306   │ Validada │ Enviada     │
└──────────────┴─────────────────┴────────┴──────────┴─────────────┘
```

**Nota:** COM-00000001 ahora muestra estado "Validada" (antes quedaba en "Pendiente")

### En Compras → Comisiones

```
COMISIONES DE PARTNERS
┌────────────────────┬──────────────┬──────────┬─────────────┐
│ PARTNER            │ COMISIÓN     │ ESTADO   │ FACTURA     │
├────────────────────┼──────────────┼──────────┼─────────────┤
│ Animales Felices   │ $250.82      │ Facturada│ PART-00000001│
└────────────────────┴──────────────┴──────────┴─────────────┘
```

### En Compras → Cuentas por Pagar

```
FACTURAS POR PAGAR
┌──────────────┬─────────────────┬────────┬──────────┬──────────┐
│ FACTURA      │ PROVEEDOR       │ TOTAL  │ PAGADO   │ ESTADO   │
├──────────────┼─────────────────┼────────┼──────────┼──────────┤
│ PART-00000001│ Animales Felices│ $5,814 │ $5,814   │ PAGADA   │
└──────────────┴─────────────────┴────────┴──────────┴──────────┘
```

---

## Asientos Contables Generados

### Al cobrar con comisión MP:

```
ASI-00002 - Cobro Factura A-00000001

DEBE  1121 Banco MercadoPago              $5,814  (lo que ingresa)
DEBE  630501 Gastos Comisión MP           $306    (el gasto por MP)
    HABER  1212 Cuentas por Cobrar        $6,120  (la factura total)
```

### Al generar factura de compra al partner:

```
ASI-00003 - Factura Compra PART-00000001

DEBE  612001 Comisiones Partners          $205.59 (comisión sin IVA)
DEBE  2113 IVA Compras                    $45.23  (IVA recuperable)
    HABER  213002 Cuentas por Pagar       $250.82 (total a pagar)
```

---

## Testing

Para probar los cambios:

1. **Crear una venta desde webhook** con comisión de Mercado Pago activa
2. **Ver Tesorería:** Deberías ver dos movimientos (ingreso + egreso MP)
3. **Ejecutar "1. Generar Facturas a Clientes"** para crear la factura de comisión
4. **Verificar:** La factura COM-XXXXXXXX está en estado "Pendiente"
5. **Ejecutar "2. Generar Facturas de Compra"** para facturar al partner
6. **Verificar:** La factura COM-XXXXXXXX cambió automáticamente a "Validada" ✅
7. **Ver Cuentas por Pagar:** La factura PART-XXXXXXXX está lista para pagar

---

## Archivos Modificados

1. `/supabase/functions/procesar-cobro-cliente/index.ts`
   - Función `registrarMovimientoTesoreria()` actualizada
   - Ahora registra dos movimientos cuando hay comisión MP

2. `/supabase/functions/generar-facturas-compra-partners/index.ts`
   - Función `procesarCuentasPorPagar()` actualizada
   - Ahora actualiza el estado de las facturas de comisión a "validada"

## Estado

✅ Ambos problemas resueltos
✅ Edge functions desplegadas
✅ Build exitoso
✅ Listo para producción
