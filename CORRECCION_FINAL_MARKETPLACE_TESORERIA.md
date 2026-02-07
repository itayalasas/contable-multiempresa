# Corrección Final: Marketplace y Tesorería

## Problemas Identificados y Corregidos

### Problema 1: Facturas de Marketplace en Cuentas por Cobrar ❌
**Descripción**: Las facturas del marketplace que llegan pagadas automáticamente (vía webhook) estaban apareciendo en Cuentas por Cobrar en estado "pagada", pero NO deberían estar ahí porque:
- Ya están pagadas por el cliente
- Ya tienen registro de pago en `pagos_cliente`
- Solo las facturas de COMISIONES (serie COM-) deben aparecer en CxC

**Solución Aplicada**: ✅
- Modificada la vista `v_cuentas_por_cobrar` para EXCLUIR facturas de marketplace pagadas automáticamente
- Las facturas COM- (comisiones partners) SIEMPRE se muestran para visibilidad
- Ahora solo aparecen facturas que realmente necesitan gestión de cobro

### Problema 2: Comisiones de Mercado Pago sin Asientos ❌
**Descripción**: Cuando se cobra con Mercado Pago:
- Se registra el movimiento de tesorería (EGRESO por comisión)
- PERO NO se genera el asiento contable correspondiente
- Esto descuadra la contabilidad

**Solución Aplicada**: ✅
- Agregada la categoría `COMISION_PASARELA` a la función de generar asientos
- Creada la cuenta contable `512005 - Comisión Mercado Pago`
- Ahora los asientos se generan automáticamente

## Cambios Realizados

### 1. Migración: Vista de Cuentas por Cobrar
**Archivo**: `fix_cuentas_por_cobrar_excluir_marketplace`

**Qué hace**:
- Recrea la vista `v_cuentas_por_cobrar`
- EXCLUYE: Facturas con `origen_marketplace = true` y estado pagado
- INCLUYE: Facturas COM- (comisiones) siempre
- INCLUYE: Facturas pendientes o con saldo

**Resultado**: Las facturas del marketplace ya NO aparecen en Cuentas por Cobrar

### 2. Migración: Cuenta Contable Comisión MP
**Archivo**: `agregar_cuenta_comision_mercado_pago`

**Qué hace**:
- Agrega la cuenta `512005 - Comisión Mercado Pago` a todas las empresas
- Si no existe la cuenta padre `512 - Comisiones`, la crea también
- Cuenta de tipo GASTO nivel 4

**Resultado**: Ahora existe la cuenta para registrar gastos de comisión MP

### 3. Edge Function: Generar Asiento Tesorería
**Archivo**: `generar-asiento-tesoreria/index.ts`

**Qué hace**:
- Agregado el caso `COMISION_PASARELA` en el switch
- Usa la cuenta `512005` para registrar el gasto
- Genera asiento: Debe 512005, Haber Banco

**Resultado**: Los nuevos movimientos de comisión MP generan asientos automáticamente

### 4. Script: Generar Asientos Retroactivos
**Archivo**: `scripts/generar_asientos_comision_mp.sql`

**Qué hace**:
- Busca movimientos de tesorería con categoría COMISION_PASARELA sin asiento
- Genera los asientos contables faltantes
- Vincula el asiento al movimiento

**Resultado**: Corrige los datos históricos

## Pasos a Ejecutar

### Paso 1: Verificar Cuentas por Cobrar (VISUAL)
1. Ve a **Finanzas → Cuentas por Cobrar**
2. Verifica que:
   - ✅ NO aparecen facturas de clientes pagadas del marketplace (Pedro Ayala, Lemuel Hernandez)
   - ✅ SÍ aparecen facturas COM- de comisiones (pendientes o pagadas)

**Antes**:
```
00000001 - Pedro Ayala - $480 - PAGADA ❌ (no debería aparecer)
00000002 - Lemuel Hernandez - $1,100 - PAGADA ❌ (no debería aparecer)
00000001 - Veterinaria San Martin - $24 - PENDIENTE ✅
00000002 - Paseo Frilz - $55 - PENDIENTE ✅
```

**Después**:
```
00000001 - Veterinaria San Martin - $24 - PENDIENTE ✅
00000002 - Paseo Frilz - $55 - PENDIENTE ✅
```

### Paso 2: Generar Asientos de Comisión MP (SQL)
```sql
-- Ejecuta desde Supabase Dashboard → SQL Editor:
-- scripts/generar_asientos_comision_mp.sql
```

**Resultado esperado**:
```
✅ Asientos de comisión MP creados: X
```

### Paso 3: Verificar Tesorería (VISUAL)
1. Ve a **Finanzas → Tesorería**
2. Haz click en un movimiento de tipo "Comisión Mercado Pago"
3. Verifica que tiene **Asiento Contable** asociado

### Paso 4: Verificar Asientos Contables (VISUAL)
1. Ve a **Contabilidad → Asientos Contables**
2. Busca asientos con descripción "Comisión Mercado Pago"
3. Abre uno y verifica la estructura:

```
DEBE:
  512005 - Comisión Mercado Pago: $X
HABER:
  112XXX - Banco XXX: $X
```

## Flujo Completo Correcto

### Venta Marketplace con Mercado Pago ($1,100)

**1. Cliente paga $1,100 vía Mercado Pago**
- Mercado Pago cobra 5% = $55
- App recibe neto = $1,045

**2. Webhook procesa la orden**
- ✅ Crea factura A-00000002 por $1,100
- ✅ Crea registro en `pagos_cliente` (monto: $1,100)
- ✅ Crea movimiento INGRESO tesorería: $1,100
- ✅ Crea movimiento EGRESO comisión MP: $55
- ✅ Genera asiento comisión MP automáticamente

**3. Sistema genera comisiones partners**
- ✅ Crea comisión partner (si aplica)
- ✅ Crea factura COM-00000001 por $55 (para cobrar al partner)

**4. Contabilidad registra**:
```
Asiento 1: Cobro Cliente
  DEBE: Banco $1,100
  HABER: Ingreso Venta $1,100

Asiento 2: Comisión MP (AUTOMÁTICO)
  DEBE: Gasto Comisión MP (512005) $55
  HABER: Banco $55

Asiento 3: Comisión Partner (cuando se genere factura)
  DEBE: Ingreso Comisión Marketplace $55
  HABER: Cuenta por Cobrar $55
```

**5. Cuentas por Cobrar muestra**:
- ❌ NO muestra: Factura A-00000002 (ya está pagada, del marketplace)
- ✅ SÍ muestra: Factura COM-00000001 (comisión pendiente de cobrar)

## Verificación SQL

### Ver movimientos de comisión MP con/sin asiento
```sql
SELECT
  mt.fecha,
  mt.monto,
  mt.descripcion,
  mt.categoria,
  CASE
    WHEN mt.asiento_contable_id IS NOT NULL THEN '✅ Con asiento'
    ELSE '❌ Sin asiento'
  END as estado_asiento,
  ac.numero as numero_asiento
FROM movimientos_tesoreria mt
LEFT JOIN asientos_contables ac ON ac.id = mt.asiento_contable_id
WHERE mt.categoria = 'COMISION_PASARELA'
ORDER BY mt.fecha DESC;
```

### Ver facturas en Cuentas por Cobrar
```sql
SELECT
  numero_documento,
  cliente_nombre,
  monto_total,
  saldo_pendiente,
  estado_cxc,
  es_factura_comision,
  es_marketplace_automatico
FROM v_cuentas_por_cobrar
ORDER BY fecha_emision DESC;
```

### Ver asientos de comisión MP
```sql
SELECT
  ac.numero,
  ac.fecha,
  ac.descripcion,
  pc.nombre as cuenta,
  mc.debito,
  mc.credito
FROM asientos_contables ac
INNER JOIN movimientos_contables mc ON mc.asiento_id = ac.id
INNER JOIN plan_cuentas pc ON pc.id = mc.cuenta_id
WHERE ac.descripcion LIKE '%Mercado Pago%'
ORDER BY ac.fecha DESC, ac.numero;
```

## Resumen de Cambios

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Vista CxC | ✅ Corregido | Excluye facturas marketplace pagadas |
| Cuenta 512005 | ✅ Creado | Cuenta para comisión MP |
| Edge Function | ✅ Actualizado | Genera asientos de comisión MP |
| Script Retroactivo | ✅ Creado | Corrige datos históricos |

## Prevención Futura

✅ **Nuevas órdenes del marketplace**:
- Las facturas pagadas NO aparecerán en Cuentas por Cobrar
- Los asientos de comisión MP se generarán automáticamente

✅ **Facturas de comisión**:
- Siempre visibles en Cuentas por Cobrar
- Permiten hacer seguimiento del cobro a partners

---

**Fecha**: 2026-02-07
**Estado**: ✅ Implementado y listo
**Requiere acción del usuario**: Ejecutar `scripts/generar_asientos_comision_mp.sql`
