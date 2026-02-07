# Solución: Facturas de Comisión Sin Registro de Cobro

## Problema Identificado

Las facturas de comisión (serie COM-) están marcadas como **"pagadas"** pero:
- ❌ No tienen registro en `pagos_cliente`
- ❌ No tienen movimientos de tesorería
- ❌ El sistema de validación de cierre las detecta como error

Esto impide cerrar los períodos contables correctamente.

## Causa Raíz

El webhook `webhooks-orders` marcaba las facturas como pagadas pero **no creaba el registro de cobro** en `pagos_cliente` ni los movimientos de tesorería necesarios.

## Solución Implementada

### 1. ✅ Webhook Corregido (Ya aplicado)

El webhook `webhooks-orders` ahora:
- Crea el registro en `pagos_cliente` cuando la orden llega pagada
- Registra los movimientos de tesorería (ingreso + comisión MP si aplica)
- Las nuevas órdenes ya funcionarán correctamente

### 2. 🔧 Corregir Facturas Existentes

Para arreglar las facturas que ya están en el sistema, ejecuta este script SQL:

```bash
# Desde Supabase Dashboard → SQL Editor
# O usando el CLI de Supabase
```

**Archivo**: `scripts/arreglar_comisiones_pagadas_sin_cobro.sql`

#### ¿Qué hace el script?

1. **Identifica** todas las facturas de comisión pagadas sin registro de cobro
2. **Crea** el registro en `pagos_cliente` para cada factura
3. **Registra** el movimiento de ingreso en tesorería
4. **Registra** el egreso de comisión MP (si aplica)
5. **Actualiza** los saldos bancarios automáticamente

#### Seguridad del Script

- ✅ Es seguro ejecutarlo múltiples veces (tiene validaciones)
- ✅ Solo afecta facturas sin registro de cobro
- ✅ No modifica facturas que ya tienen cobros registrados
- ✅ Muestra logs detallados de cada operación

## Cómo Ejecutar

### Opción 1: Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en Supabase Dashboard
2. Click en **SQL Editor** (menú izquierdo)
3. Click en **New Query**
4. Copia y pega el contenido de `scripts/arreglar_comisiones_pagadas_sin_cobro.sql`
5. Click en **Run** o presiona `Ctrl+Enter`
6. Revisa los logs en la consola

### Opción 2: Línea de comandos

```bash
# Si tienes el CLI de Supabase instalado
supabase db execute < scripts/arreglar_comisiones_pagadas_sin_cobro.sql
```

## Verificación Post-Ejecución

Después de ejecutar el script:

1. **Ve a Facturas de Venta**
   - Las facturas COM-00000001 y COM-00000002 deben seguir como "Pagada"
   - Ahora deberían tener registros de cobro

2. **Ve a Finanzas → Cuentas por Cobrar**
   - Las comisiones deben aparecer como cobradas

3. **Ve a Finanzas → Tesorería**
   - Deben aparecer los movimientos de ingreso de las comisiones
   - Si hay comisión MP, deben aparecer los egresos correspondientes

4. **Intenta Cerrar el Período**
   - Ve a Contabilidad → Períodos Contables
   - Intenta cerrar Febrero 2026
   - Ya NO debe mostrar el error de comisiones sin cobrar

## Resultado Esperado

```
✅ Facturas corregidas: 2
   - COM-00000001: $24 → Cobro registrado
   - COM-00000002: $55 → Cobro registrado

✅ Movimientos de tesorería creados: 4
   - INGRESO: $24 (Veterinaria San Martin)
   - INGRESO: $55 (Paseo Frlz)
   - EGRESO: Comisión MP (si aplica)
   - EGRESO: Comisión MP (si aplica)

✅ Período Febrero 2026 listo para cerrar
```

## Prevención Futura

✅ El webhook ya está corregido para que esto no vuelva a pasar
✅ Todas las nuevas órdenes del marketplace crearán automáticamente:
- Registro en `pagos_cliente`
- Movimientos de tesorería
- Asientos contables (si está configurado el plan de cuentas)

## Notas Importantes

- Este script **solo afecta** facturas de comisión (serie COM-) que están pagadas
- **No modifica** facturas normales ni facturas pendientes
- Los saldos bancarios se actualizan automáticamente vía triggers
- Si no existe una cuenta bancaria de Mercado Libre, usa la primera cuenta activa de la empresa

---

**Fecha de corrección**: 2026-02-07
**Afecta a**: Facturas de comisión del marketplace sin registro de cobro
**Estado**: ✅ Solucionado y desplegado
