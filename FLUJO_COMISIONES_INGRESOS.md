# ⚠️ DOCUMENTO OBSOLETO

**NOTA IMPORTANTE:** Este documento describía un modelo INCORRECTO donde las comisiones se trataban como gastos.

👉 **Ver el documento actualizado:** `FLUJO_COMISIONES_INGRESOS_CORREGIDO.md`

El modelo correcto trata las comisiones como **INGRESOS** de la aplicación, no como gastos.

---

# Flujo Completo de Comisiones e Ingresos (OBSOLETO)

## 📊 Ejemplo Numérico

**Venta al Cliente:** $100 + IVA ($122 total)
- Subtotal: $100
- IVA 22%: $22
- **Total a cobrar al cliente: $122**

**Comisiones:**
- Partner recibe: 25% del subtotal = $25
- MercadoPago (parte del aliado): $7
- **Total comisiones a pagar: $32**

**Ganancia neta de la empresa: $100 - $32 = $68**

---

## 🔄 Flujo Contable Actual

### 1️⃣ CUANDO SE EMITE LA FACTURA AL CLIENTE

**Asiento Contable Automático:**
```
DEBE: 1212 - Cuentas por Cobrar          $122.00
  HABER: 7011 - Ventas                           $100.00
  HABER: 2113 - IVA por Pagar                    $22.00
  DEBE: 5211 - Comisiones de Ventas      $25.00
    HABER: 2114 - Comisiones por Pagar - Partners  $25.00
  DEBE: 5212 - Comisiones MercadoPago    $7.00
    HABER: 2115 - Comisiones MP por Pagar          $7.00
```

**Estado Financiero en este momento:**
- ✅ **Ingresos por Ventas: +$100** (se reconoce el ingreso)
- ❌ **Gastos por Comisiones: -$32** (se reconoce el gasto)
- 💰 **Resultado Bruto: $68** (ganancia esperada)

**Tesorería:** No hay movimiento aún (nadie ha pagado)

---

### 2️⃣ CUANDO EL CLIENTE PAGA LA FACTURA

**Asiento Contable Automático (Cobro):**
```
DEBE: 1111 - Banco/Caja                  $122.00
  HABER: 1212 - Cuentas por Cobrar              $122.00
```

**Movimiento de Tesorería Automático:**
```
INGRESO: $122.00
  Tipo: COBRO_CLIENTE
  Descripción: Cobro factura XXX - Cliente
  Cuenta Bancaria: [Seleccionada al momento del cobro]
```

**Estado Financiero:**
- ✅ **Ingreso en Tesorería: +$122** ← **AQUÍ ESTÁ EL INGRESO**
- Cuentas por Cobrar: -$122 (se reduce el activo)

---

### 3️⃣ CUANDO SE PAGA AL PARTNER

**Asiento Contable Automático (Pago):**
```
DEBE: 2114 - Comisiones por Pagar        $25.00
  HABER: 1111 - Banco/Caja                      $25.00
```

**Movimiento de Tesorería Automático:**
```
EGRESO: $25.00
  Tipo: PAGO_PROVEEDOR
  Descripción: Pago comisión partner XXX
  Cuenta Bancaria: [Seleccionada al momento del pago]
```

**Estado Financiero:**
- ❌ **Egreso en Tesorería: -$25**
- Comisiones por Pagar: -$25 (se reduce el pasivo)

---

### 4️⃣ CUANDO SE PAGA A MERCADOPAGO (Parte del Partner)

**Asiento Contable Automático (Pago):**
```
DEBE: 2115 - Comisiones MP por Pagar     $7.00
  HABER: 1111 - Banco/Caja                       $7.00
```

**Movimiento de Tesorería Automático:**
```
EGRESO: $7.00
  Tipo: PAGO_PROVEEDOR
  Descripción: Pago comisión MP partner XXX
  Cuenta Bancaria: [Seleccionada al momento del pago]
```

**Estado Financiero:**
- ❌ **Egreso en Tesorería: -$7**

---

## 💰 RESUMEN DE TESORERÍA

### Movimientos Totales:
1. **INGRESO:** Cliente paga factura = **+$122**
2. **EGRESO:** Pago comisión partner = **-$25**
3. **EGRESO:** Pago comisión MercadoPago = **-$7**

### **FLUJO NETO DE CAJA: +$90**

### Desglose del Flujo Neto:
- Ingreso total: $122
- IVA por pagar a DGI: -$22 (se pagará después)
- Comisiones pagadas: -$32
- **Efectivo neto disponible: $68** (ganancia real)
- Más el IVA que aún no se ha pagado: +$22
- **Total en banco: $90**

---

## 📈 DÓNDE VER LOS INGRESOS

### 1. En Tesorería
**Ruta:** Finanzas → Tesorería

Verás:
- ✅ **Ingresos:** Cobros de clientes (tipo: COBRO_CLIENTE)
- ❌ **Egresos:** Pagos a partners (tipo: PAGO_PROVEEDOR)
- 💵 **Saldo Actual:** Diferencia neta en cada cuenta bancaria

### 2. En el Estado de Resultados (Libro Mayor)
**Ruta:** Contabilidad → Libro Mayor

Busca las cuentas:
- **7011 - Ventas:** Verás $100 (el ingreso por la venta)
- **5211 - Comisiones de Ventas:** Verás $25 (el gasto por comisión partner)
- **5212 - Comisiones MercadoPago:** Verás $7 (el gasto por comisión MP)
- **Resultado:** $100 - $25 - $7 = $68 de ganancia bruta

### 3. En Cuentas por Cobrar
**Ruta:** Finanzas → Cuentas por Cobrar

Verás:
- Estado: PAGADA (cuando el cliente pagó)
- Total cobrado: $122
- Fecha de cobro

### 4. En el Dashboard
**Ruta:** Dashboard principal

Verás:
- Total de ingresos del período
- Total de gastos del período
- Flujo de caja

---

## ❓ PREGUNTAS FRECUENTES

### ¿Por qué en Tesorería solo veo el total ($122) y no la ganancia ($68)?

Porque Tesorería registra **movimientos de dinero reales**, no ganancias contables:
- Cuando el cliente paga $122, entran $122 al banco
- Cuando pagas comisiones, salen $32 del banco
- El IVA ($22) sale después cuando lo pagas a DGI

La **ganancia** se calcula en el Estado de Resultados (Libro Mayor), no en Tesorería.

### ¿Dónde está mi ganancia de $68?

Tu ganancia de $68 está distribuida así:
- En el banco: $90 (efectivo disponible)
- Menos IVA por pagar: -$22 (obligación con DGI)
- **Ganancia real: $68**

Para verla:
1. Ve a **Contabilidad → Libro Mayor**
2. Filtra por cuenta **7011 - Ventas**
3. Resta los gastos de cuentas **5211** y **5212**

### ¿El sistema está calculando bien mis ganancias?

✅ **SÍ.** El sistema está funcionando correctamente:

**Contabilidad (Devengado):**
- Ingreso reconocido: $100 ✓
- Gastos reconocidos: -$32 ✓
- Ganancia bruta: $68 ✓

**Tesorería (Caja):**
- Ingreso en banco: +$122 ✓
- Egresos en banco: -$32 ✓
- Saldo neto: $90 ✓

**Diferencia:** Los $22 de diferencia son el IVA que cobras pero luego tienes que pagar a DGI.

---

## 🎯 CONCLUSIÓN

### Los ingresos por comisiones SÍ están registrados:

1. ✅ **En Contabilidad:** Como "Ventas" ($100) menos "Gastos por Comisiones" ($32) = Ganancia $68
2. ✅ **En Tesorería:** Como "Cobro Cliente" ($122) menos "Pago Partners" ($32) = Flujo $90
3. ✅ **La diferencia ($22):** Es el IVA que aún tienes que pagar a DGI

### La ganancia real de la empresa es $68:
- Vendiste un servicio por $100
- Pagaste comisiones de $32
- Te quedaron $68 de ganancia
- Más $22 de IVA que cobras temporalmente (pero luego pagas a DGI)

Todo está correcto. La confusión viene porque:
- **Tesorería** muestra movimientos de dinero (entrada/salida del banco)
- **Contabilidad** muestra ingresos y gastos (ganancia/pérdida del negocio)

Son dos perspectivas diferentes pero ambas correctas.
