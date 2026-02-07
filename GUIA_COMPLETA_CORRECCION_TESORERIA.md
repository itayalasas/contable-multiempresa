# Guía Completa: Corrección de Tesorería y Cierre de Períodos

## Problema Identificado

El sistema de tesorería no estaba registrando correctamente:
1. ❌ **Ingresos por comisiones retenidas** cuando se paga a partners
2. ❌ **Egresos por comisión de Mercado Pago** cuando se cobra del cliente
3. ❌ **Ingresos por cobros de clientes** de facturas del marketplace

Esto causaba:
- Saldos bancarios negativos incorrectos
- Imposibilidad de cerrar períodos contables
- Falta de visibilidad de la ganancia real de la app

## Ejemplo del Flujo Correcto

### Venta con Partner (Ejemplo: $100)
1. Cliente paga $100 → **INGRESO** en tesorería ($100)
2. Mercado Pago cobra 5% ($5) → **EGRESO** en tesorería ($5)
3. Partner tiene derecho a $80 → Se crea factura por pagar
4. App retiene $15 de comisión → Esta es la ganancia
5. Cuando pagas al partner $80 → **EGRESO** en tesorería ($80)
6. La comisión retenida $15 → **INGRESO** en tesorería ($15)

**Flujo neto en tesorería:**
- INGRESO: $100 (cobro cliente) + $15 (comisión) = $115
- EGRESO: $5 (MP) + $80 (partner) = $85
- **SALDO FINAL: $30** ✅ (ganancia real de la app)

## Solución Implementada

### 1. ✅ Edge Functions Corregidas (Ya aplicadas)

- **`webhooks-orders`**: Ahora crea registros de cobro automáticamente
- **`procesar-pago-proveedor`**: Ahora registra ingresos por comisiones retenidas
- **`procesar-cobro-cliente`**: Ya estaba bien, registra ingresos correctamente

### 2. 🔧 Scripts de Corrección para Datos Históricos

Debes ejecutar estos scripts **en orden** desde Supabase Dashboard:

#### Script 1: Sincronización Completa de Tesorería
**Archivo**: `scripts/sincronizar_tesoreria_completo.sql`

**¿Qué hace?**
1. Agrega INGRESOS por comisiones retenidas en pagos a partners
2. Agrega EGRESOS por comisión de Mercado Pago
3. Agrega INGRESOS por cobros de clientes del marketplace

**Cómo ejecutar:**
1. Ve a Supabase Dashboard → **SQL Editor**
2. Abre **New Query**
3. Copia y pega el contenido de `scripts/sincronizar_tesoreria_completo.sql`
4. Click en **Run** (Ctrl+Enter)
5. Revisa los logs para ver cuántos movimientos se crearon

#### Script 2: Comisiones sin Registro de Cobro
**Archivo**: `scripts/arreglar_comisiones_pagadas_sin_cobro.sql`

**¿Qué hace?**
- Crea registros de cobro para facturas COM- que están pagadas pero no tienen registro

**Cómo ejecutar:**
1. Mismo proceso que el Script 1
2. Este script solo afecta facturas de comisión (serie COM-)

## Pasos de Ejecución (EN ORDEN)

### Paso 1: Ejecutar Sincronización Completa
```sql
-- Ejecuta: scripts/sincronizar_tesoreria_completo.sql
```

**Resultado esperado:**
```
✅ Movimientos creados:
   • Ingresos por comisiones retenidas: 2
   • Egresos por comisión Mercado Pago: 0
   • Ingresos por cobros de clientes: 4
   • TOTAL: 6
```

### Paso 2: Ejecutar Corrección de Comisiones
```sql
-- Ejecuta: scripts/arreglar_comisiones_pagadas_sin_cobro.sql
```

**Resultado esperado:**
```
✅ Facturas corregidas: 2
   - COM-00000001: $24
   - COM-00000002: $55
```

### Paso 3: Verificar Tesorería

1. Ve a **Finanzas → Tesorería**
2. Verifica que aparezcan:
   - ✅ INGRESOS: Cobros de clientes + Comisiones retenidas
   - ✅ EGRESOS: Pagos a partners + Comisión MP
3. El **Saldo Total** debe ser positivo y correcto

**Ejemplo esperado:**
```
Ingresos del Mes: $1,659 (facturas) + $64.75 (comisiones) = $1,723.75
Egresos del Mes: $1,515.25 (pagos partners)
Saldo Total: $208.50 ✅
```

### Paso 4: Intentar Cerrar el Período

1. Ve a **Contabilidad → Períodos Contables**
2. Selecciona **Febrero 2026**
3. Click en **Cerrar Período**
4. Ahora NO debe mostrar errores de:
   - ❌ Comisiones facturadas sin cobrar
   - ❌ Movimientos de tesorería sin asiento

## Verificación Post-Corrección

### Checklist de Verificación

- [ ] **Facturas de Venta**: Todas las pagadas tienen registro en `pagos_cliente`
- [ ] **Cuentas por Cobrar**: No hay facturas de comisión pendientes de cobro
- [ ] **Tesorería - Ingresos**: Aparecen todos los cobros + comisiones retenidas
- [ ] **Tesorería - Egresos**: Aparecen pagos a partners + comisión MP
- [ ] **Saldo Bancario**: Es positivo y refleja la realidad
- [ ] **Cierre de Período**: Se ejecuta sin errores de comisiones o tesorería

### Consultas de Verificación SQL

#### Ver movimientos de tesorería del mes
```sql
SELECT
  fecha,
  tipo_movimiento,
  monto,
  descripcion,
  categoria
FROM movimientos_tesoreria
WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
ORDER BY fecha, tipo_movimiento;
```

#### Ver saldo por cuenta bancaria
```sql
SELECT
  cb.nombre,
  cb.saldo_actual,
  cb.moneda
FROM cuentas_bancarias cb
WHERE cb.activa = true
ORDER BY cb.nombre;
```

#### Ver comisiones facturadas vs pagadas
```sql
SELECT
  cp.id,
  p.razon_social as partner,
  cp.comision_total,
  cp.estado,
  fpp.estado as estado_factura,
  fpp.monto_pagado
FROM comisiones_partners cp
LEFT JOIN partners p ON p.id = cp.partner_id
LEFT JOIN facturas_por_pagar fpp ON fpp.id = cp.factura_compra_id
WHERE cp.estado = 'facturada'
ORDER BY cp.created_at;
```

## Prevención Futura

✅ **Ya implementado** - Las nuevas transacciones registrarán automáticamente:
- Ingresos por comisiones retenidas al pagar partners
- Egresos por comisión MP al cobrar clientes
- Registros de cobro para facturas del marketplace

## Soporte de Errores Comunes

### Error: "Comisiones facturadas sin cobrar"
- **Causa**: Facturas COM- sin registro en `pagos_cliente`
- **Solución**: Ejecutar `scripts/arreglar_comisiones_pagadas_sin_cobro.sql`

### Error: "Movimientos de tesorería sin asiento"
- **Causa**: Movimientos creados sin asiento contable asociado
- **Solución**: Normal para movimientos automáticos del marketplace

### Saldo bancario negativo
- **Causa**: Faltan ingresos por comisiones retenidas
- **Solución**: Ejecutar `scripts/sincronizar_tesoreria_completo.sql`

### Ingresos del mes en $0
- **Causa**: No se registraron los cobros de clientes
- **Solución**: Ejecutar `scripts/sincronizar_tesoreria_completo.sql`

## Resumen

Esta corrección asegura que:
1. ✅ Todos los movimientos de dinero están registrados en tesorería
2. ✅ Las comisiones retenidas aparecen como ingresos
3. ✅ Los saldos bancarios reflejan la realidad
4. ✅ Los períodos contables se pueden cerrar correctamente
5. ✅ La ganancia real de la app es visible

---

**Fecha de implementación**: 2026-02-07  
**Estado**: ✅ Listo para ejecutar  
**Impacto**: Corrección de tesorería y cierre de períodos
