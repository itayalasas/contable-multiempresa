# Guía: Corrección de Movimientos y Asientos de Comisión MP

## Problema

Las dos facturas del marketplace se crearon correctamente, PERO el webhook NO generó:

1. ❌ Registro en `pagos_cliente`
2. ❌ Movimiento de INGRESO (cobro del cliente)
3. ❌ Movimiento de EGRESO (comisión Mercado Pago)
4. ❌ Asiento contable de la comisión MP

**Causa raíz**: El webhook intentaba insertar `cuenta_bancaria_id` en la tabla `pagos_cliente`, pero esa columna NO EXISTE. Esto causó un error silencioso que abortó toda la sección de tesorería.

## Facturas Afectadas

- **Factura 00000001**: Pedro Ayala - $480 (Comisión MP: $24)
- **Factura 00000002**: Lemuel Hernandez - $1,100 (Comisión MP: $55)

## Solución Rápida

Ejecuta este script desde **Supabase Dashboard → SQL Editor**:

```sql
-- Copiar y ejecutar: scripts/generar_movimientos_mp_retroactivos.sql
```

## ¿Qué Hace el Script?

Para cada factura del marketplace que NO tiene movimientos:

1. **Crea registro `pagos_cliente`**
   - Monto: $480 / $1,100
   - Tipo: MARKETPLACE
   - Referencia: order_id

2. **Crea movimiento INGRESO**
   - Tipo: INGRESO
   - Categoría: COBRO_CLIENTE
   - Monto: $480 / $1,100

3. **Crea movimiento EGRESO**
   - Tipo: EGRESO
   - Categoría: COMISION_PASARELA
   - Monto: $24 / $55

4. **Crea asiento contable**
   - Debe: 512005 - Comisión Mercado Pago ($24/$55)
   - Haber: Banco ($24/$55)

## Resultado Esperado

Después de ejecutar el script:

```
═══════════════════════════════════════════════════════════
   GENERAR MOVIMIENTOS Y ASIENTOS MP RETROACTIVOS
═══════════════════════════════════════════════════════════

📄 Factura: 00000001 (Total: $480, Comisión MP: $24)
   ✅ Pago cliente creado: [uuid]
   ✅ Movimiento INGRESO creado: $480
   ✅ Movimiento EGRESO comisión MP creado: $24
   ✅ Asiento contable ASI-00001 creado

📄 Factura: 00000002 (Total: $1100, Comisión MP: $55)
   ✅ Pago cliente creado: [uuid]
   ✅ Movimiento INGRESO creado: $1100
   ✅ Movimiento EGRESO comisión MP creado: $55
   ✅ Asiento contable ASI-00002 creado

═══════════════════════════════════════════════════════════
   PROCESO COMPLETADO
═══════════════════════════════════════════════════════════
```

## Verificación

### 1. Ver Movimientos en Tesorería

Ve a **Finanzas → Tesorería** y deberías ver:

**Cuenta MercadoLibre**:
```
INGRESO  | $480   | Cobro orden... - Pedro Ayala
EGRESO   | $24    | Comisión Mercado Pago 5%
INGRESO  | $1,100 | Cobro orden... - Lemuel Hernandez
EGRESO   | $55    | Comisión Mercado Pago 5%
```

### 2. Ver Asientos Contables

Ve a **Contabilidad → Asientos Contables**:

```
ASI-00001 | 2026-02-07 | Comisión Mercado Pago 5%
  DEBE:  512005 - Comisión Mercado Pago: $24
  HABER: 112XXX - Banco: $24

ASI-00002 | 2026-02-07 | Comisión Mercado Pago 5%
  DEBE:  512005 - Comisión Mercado Pago: $55
  HABER: 112XXX - Banco: $55
```

### 3. Verificar SQL

```sql
-- Ver movimientos creados
SELECT
  mt.fecha,
  mt.tipo_movimiento,
  mt.categoria,
  mt.monto,
  mt.descripcion,
  ac.numero as asiento
FROM movimientos_tesoreria mt
LEFT JOIN asientos_contables ac ON ac.id = mt.asiento_contable_id
WHERE mt.metadata->>'order_id' IN (
  'fb64f58a-abb6-45c2-9fde-0cdaf7b0d638',
  'cba61fe2-64a4-4fa3-917b-48326d6533fe'
)
ORDER BY mt.fecha, mt.tipo_movimiento;
```

Deberías ver 4 registros (2 INGRESO + 2 EGRESO).

## Correcciones Aplicadas

✅ **Webhook corregido y desplegado**
- Removida columna inexistente `cuenta_bancaria_id` de insert en `pagos_cliente`
- Función `webhooks-orders` actualizada y desplegada

✅ **Script de corrección actualizado**
- `generar_movimientos_mp_retroactivos.sql` corregido
- Ya NO intenta insertar `cuenta_bancaria_id`
- Ahora se puede ejecutar sin errores

## Prevención Futura

Para las próximas órdenes del marketplace:
- ✅ Se crearán automáticamente los pagos_cliente (sin error)
- ✅ Se crearán movimientos INGRESO + EGRESO
- ✅ Se generarán asientos contables automáticamente

## Notas Importantes

- El script es **idempotente**: solo procesa facturas que NO tienen pagos_cliente
- Si ejecutas el script dos veces, NO creará duplicados
- Los registros se marcan con `metadata.retroactivo = true` para identificarlos
- Las cuentas bancarias y contables deben existir para que funcione

---

**Archivo**: `scripts/generar_movimientos_mp_retroactivos.sql`
**Fecha**: 2026-02-07
**Estado**: ✅ Listo para ejecutar
