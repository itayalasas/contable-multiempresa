# Flujo Completo: Mercado Pago en Tesorería

## Cómo Funciona Mercado Pago en el Sistema

### Escenario Completo

Ejemplo de venta con Mercado Pago:

**Cliente compra por $100 y paga con Mercado Pago**

1. **Cliente paga $100** → Mercado Pago procesa el pago
2. **Mercado Pago cobra 5%** ($5) → Comisión de la pasarela
3. **App recibe $95** → Lo que realmente entra a la cuenta bancaria

### Registro en Tesorería

#### Opción 1: Registro Detallado (2 movimientos)
```
✅ INGRESO: $100 (lo que pagó el cliente)
❌ EGRESO: $5 (comisión de Mercado Pago)
= Saldo neto: $95 (lo que realmente tienes)
```

#### Opción 2: Registro Neto (1 movimiento)
```
✅ INGRESO: $95 (ingreso neto después de comisión)
= Saldo neto: $95
```

**El sistema usa la Opción 1** porque:
- ✅ Mejor trazabilidad
- ✅ Visibilidad de costos de pasarela
- ✅ Facilita auditorías y reportes

## Flujos del Sistema

### A. Webhook del Marketplace (Automático)

Cuando llega una orden pagada con Mercado Pago:

```javascript
// 1. Se crea la factura con comisión MP
factura.comision_mp_porcentaje = 5.0
factura.comision_mp_monto = 5.00
factura.ingreso_neto = 95.00

// 2. Se crea el registro de cobro
pago_cliente.tipo_pago = 'MARKETPLACE'
pago_cliente.monto = 100.00

// 3. Se crean 2 movimientos de tesorería
movimientos_tesoreria[0]:
  tipo: INGRESO
  monto: 100.00
  categoria: COBRO_CLIENTE
  descripcion: "Cobro orden XXX - Cliente"

movimientos_tesoreria[1]:
  tipo: EGRESO
  monto: 5.00
  categoria: COMISION_PASARELA
  descripcion: "Comisión Mercado Pago 5% - Factura XXX"
```

### B. Cobro Manual (Desde la UI)

Cuando registras un cobro manualmente de una factura que tiene comisión MP:

```javascript
// Usuario ingresa el cobro en Finanzas → Cuentas por Cobrar
// Sistema detecta: factura.comision_mp_monto > 0

// Se crean automáticamente 2 movimientos:
movimientos[0]: INGRESO de $100 (del cliente)
movimientos[1]: EGRESO de $5 (comisión MP)
```

### C. Script de Corrección (Para datos históricos)

El script `sincronizar_tesoreria_completo.sql` agrega los movimientos faltantes:

```sql
-- Busca pagos que tienen comisión MP pero no tienen el movimiento de egreso
-- Condiciones que verifica:
1. factura.comision_mp_monto > 0
2. O tipo_pago = 'MARKETPLACE'
3. Y NO existe movimiento de tipo EGRESO con categoria COMISION_PASARELA
```

## Verificación de Comisiones MP

### Consulta SQL para ver todas las comisiones MP

```sql
SELECT
  fv.numero_factura,
  fv.fecha_emision,
  fv.total,
  fv.comision_mp_porcentaje,
  fv.comision_mp_monto,
  fv.ingreso_neto,
  pc.fecha_pago,
  pc.tipo_pago,
  -- Verificar si existe movimiento de ingreso
  EXISTS (
    SELECT 1 FROM movimientos_tesoreria mt
    WHERE mt.documento_origen_tipo = 'pago_cliente'
      AND mt.documento_origen_id = pc.id
      AND mt.tipo_movimiento = 'INGRESO'
  ) as tiene_mov_ingreso,
  -- Verificar si existe movimiento de egreso por comisión MP
  EXISTS (
    SELECT 1 FROM movimientos_tesoreria mt
    WHERE mt.documento_origen_tipo = 'comision_mercadopago'
      AND mt.documento_origen_id = fv.id
      AND mt.metadata->>'pago_cliente_id' = pc.id::text
      AND mt.tipo_movimiento = 'EGRESO'
  ) as tiene_mov_egreso_mp
FROM facturas_venta fv
INNER JOIN pagos_cliente pc ON pc.factura_id = fv.id
WHERE fv.comision_mp_monto > 0
ORDER BY fv.fecha_emision DESC;
```

### Ver movimientos de tesorería con comisión MP

```sql
SELECT
  fecha,
  tipo_movimiento,
  monto,
  descripcion,
  categoria,
  referencia,
  beneficiario
FROM movimientos_tesoreria
WHERE categoria IN ('COBRO_CLIENTE', 'COMISION_PASARELA')
  AND fecha >= '2026-02-01'
ORDER BY fecha, tipo_movimiento;
```

## Ejemplo Real

### Caso: Factura A-00000001 por $1,100

**Datos de la factura:**
- Total facturado: $1,100
- Comisión MP: 5% = $55
- Ingreso neto: $1,045

**Movimientos en Tesorería:**

| Fecha | Tipo | Monto | Descripción | Categoría |
|-------|------|-------|-------------|-----------|
| 2/6/2026 | INGRESO | $1,100 | Cobro factura A-00000001 - Pedro Ayala | COBRO_CLIENTE |
| 2/6/2026 | EGRESO | $55 | Comisión Mercado Pago 5% - Factura A-00000001 | COMISION_PASARELA |

**Impacto en Saldo Bancario:**
```
Saldo anterior: $0
+ INGRESO: $1,100
- EGRESO: $55
= Saldo nuevo: $1,045 ✅
```

## Caso Especial: Marketplace con Partners

### Ejemplo: Venta $100 con Partner

**Flujo completo:**
1. Cliente paga $100 vía Mercado Pago
2. Mercado Pago cobra 5% ($5)
3. App recibe $95
4. Partner tiene derecho a $80
5. App retiene $15 de comisión

**Movimientos en Tesorería:**

| Momento | Tipo | Monto | Descripción | Saldo Acumulado |
|---------|------|-------|-------------|-----------------|
| Cliente paga | INGRESO | $100 | Cobro cliente | +$100 |
| MP cobra | EGRESO | $5 | Comisión MP | +$95 |
| Pagas partner | EGRESO | $80 | Pago partner | +$15 |
| Comisión retenida | INGRESO | $15 | Comisión marketplace | +$30 |

**Nota**: La comisión retenida ($15) se registra como INGRESO cuando pagas al partner, porque ese dinero YA estaba en la cuenta y NO sale.

## Solución de Problemas

### Problema 1: Falta movimiento de comisión MP

**Síntoma**: Saldo bancario más alto de lo real

**Causa**: Se registró el INGRESO pero no el EGRESO de comisión MP

**Solución**: Ejecutar `scripts/sincronizar_tesoreria_completo.sql`

### Problema 2: Comisión MP duplicada

**Síntoma**: Saldo bancario más bajo de lo real

**Causa**: Se registró dos veces el EGRESO de comisión MP

**Solución**:
```sql
-- Identificar duplicados
SELECT
  documento_origen_id as factura_id,
  COUNT(*) as cantidad
FROM movimientos_tesoreria
WHERE documento_origen_tipo = 'comision_mercadopago'
  AND tipo_movimiento = 'EGRESO'
  AND categoria = 'COMISION_PASARELA'
GROUP BY documento_origen_id
HAVING COUNT(*) > 1;

-- Eliminar duplicados (mantener el más reciente)
-- CUIDADO: Verificar antes de ejecutar
DELETE FROM movimientos_tesoreria
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY documento_origen_id, metadata->>'pago_cliente_id'
             ORDER BY created_at DESC
           ) as rn
    FROM movimientos_tesoreria
    WHERE documento_origen_tipo = 'comision_mercadopago'
      AND tipo_movimiento = 'EGRESO'
      AND categoria = 'COMISION_PASARELA'
  ) t
  WHERE t.rn > 1
);
```

### Problema 3: Comisión MP en metadata pero no en campo

**Síntoma**: Script no detecta la comisión MP

**Solución**: El script ahora busca en ambos lugares:
- `fv.comision_mp_monto` (campo directo)
- `fv.metadata->>'comision_mp_monto'` (en metadata)

## Resumen de Campos Importantes

### Tabla: facturas_venta
```sql
comision_mp_porcentaje NUMERIC -- Ej: 5.00
comision_mp_monto NUMERIC      -- Ej: 55.00
ingreso_neto NUMERIC           -- Ej: 1045.00
metadata JSONB                 -- Contiene también comision_mp_*
```

### Tabla: pagos_cliente
```sql
tipo_pago VARCHAR              -- 'MARKETPLACE', 'TRANSFERENCIA', etc
cuenta_bancaria_id UUID        -- Cuenta donde se deposita
```

### Tabla: movimientos_tesoreria
```sql
tipo_movimiento VARCHAR        -- 'INGRESO' o 'EGRESO'
categoria VARCHAR              -- 'COBRO_CLIENTE', 'COMISION_PASARELA', etc
documento_origen_tipo VARCHAR  -- 'pago_cliente', 'comision_mercadopago', etc
```

---

**Fecha**: 2026-02-07
**Estado**: ✅ Documentado y funcionando
**Nota**: Todos los flujos nuevos ya registran correctamente las comisiones MP
