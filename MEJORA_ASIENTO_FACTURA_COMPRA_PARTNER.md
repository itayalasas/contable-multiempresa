# Mejora Implementada: Asiento Contable en Factura de Compra a Partners

**Fecha:** 03 de febrero de 2026
**Estado:** ✅ IMPLEMENTADO Y DESPLEGADO

---

## 📋 Resumen de la Mejora

Se agregó la generación automática del asiento contable cuando se crea una factura de compra al partner. Anteriormente, este asiento no se generaba y el pasivo no se reflejaba inmediatamente en la contabilidad.

---

## 🔧 Cambios Realizados

### Archivo Modificado
`supabase/functions/generar-facturas-compra-partners/index.ts`

### Funciones Agregadas

1. **`generarAsientoContableFacturaCompra()`**
   - Genera el asiento contable para la factura de compra al partner
   - Registra el gasto por servicios del partner
   - Registra el IVA compras
   - Registra el pasivo (cuenta por pagar)

2. **`generarNumeroAsiento()`**
   - Genera el número correlativo del asiento contable
   - Formato: ASI-XXXXX

3. **`obtenerCuentaId()`**
   - Busca el ID de una cuenta contable por su código
   - Valida que la cuenta exista antes de usarla

---

## 📊 Asiento Contable Generado

Cuando se crea una factura de compra a un partner, ahora se genera automáticamente:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASIENTO: Factura Compra PART-00000001 - Partner ABC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEBE:  612001 - Comisiones a Partners        $71.50
DEBE:  2113   - IVA Compras                  $15.73
  HABER: 213002 - Cuentas por Pagar Partners         $87.23

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTALES: Débitos = $87.23 | Créditos = $87.23 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Interpretación

- **Débito 612001:** Reconoce el gasto por los servicios del partner
- **Débito 2113:** Registra el IVA que se puede descontar
- **Crédito 213002:** Registra la obligación de pago al partner

---

## 🔍 Cuentas Contables Utilizadas

| Código | Nombre | Tipo | Propósito |
|--------|--------|------|-----------|
| **612001** | Comisiones a Partners | GASTO | Registra el gasto por servicios del partner |
| **2113** | IVA por Pagar | PASIVO | Registra el IVA compras (crédito fiscal) |
| **213002** | Cuentas por Pagar - Partners | PASIVO | Registra la obligación de pago al partner |

---

## 🎯 Flujo Completo Actualizado

### Antes (Sin Asiento)
```
1. Se crea factura de compra
2. Se crea cuenta por pagar
3. Se actualizan comisiones
❌ NO se registra en contabilidad
```

### Después (Con Asiento)
```
1. Se crea factura de compra
2. Se crea cuenta por pagar
3. ✅ Se genera asiento contable
4. Se actualizan comisiones
```

---

## 💡 Beneficios

1. **Contabilidad Completa:** El pasivo se refleja inmediatamente en el balance
2. **Trazabilidad:** Cada factura de compra tiene su asiento contable vinculado
3. **Cuadratura Automática:** Los débitos y créditos cuadran automáticamente
4. **Reportes Precisos:** El estado de resultados y balance reflejan la realidad
5. **Auditoría:** Historial completo de movimientos contables

---

## 📈 Ejemplo Práctico

### Escenario
Una venta de $100 genera:
- Comisión app: $25
- Comisión MP total: $7
- Comisión MP aliado: $3.50
- Total a pagar al partner: $71.50
- IVA (22%): $15.73
- **Total a pagar: $87.23**

### Impacto en la Contabilidad

#### Estado de Resultados
```
INGRESOS:
  Ventas                         $100.00
  Comisiones Marketplace          $25.00
  Comisiones Procesamiento         $7.00
                                ─────────
  Total Ingresos                 $132.00

GASTOS:
  Comisiones a Partners           $71.50  ← ✅ NUEVO
                                ─────────
  Total Gastos                    $71.50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UTILIDAD NETA                     $60.50
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Balance General
```
PASIVOS:
  IVA por Pagar                   $22.00 (IVA venta)
  IVA por Pagar                  -$15.73 (IVA compra - crédito) ← ✅ NUEVO
  Cuentas por Pagar Partners      $87.23  ← ✅ NUEVO
                                ─────────
  Total Pasivos                   $93.50
```

---

## 🧪 Validación

### Validación Automática

La función valida automáticamente:

1. ✅ Existencia de las cuentas contables necesarias
2. ✅ Cuadratura del asiento (débitos = créditos)
3. ✅ Vinculación con la factura de compra
4. ✅ Registro de tracking en la factura

### En Caso de Error

Si falta alguna cuenta contable:
- Se registra el error en la factura de compra
- Se continúa con el proceso (no bloqueante)
- Se notifica en los logs para corrección posterior

---

## 🔄 Integración con el Sistema

### Tablas Afectadas

1. **`asientos_contables`:** Se crea el asiento
2. **`movimientos_contables`:** Se crean los movimientos (débitos/créditos)
3. **`facturas_compra`:** Se actualiza con:
   - `asiento_generado = true`
   - `asiento_contable_id = [id del asiento]`
   - `asiento_error = null` (si todo OK)

### Campos Agregados

Ya existían en la estructura de `facturas_compra`:
- `asiento_generado` (boolean)
- `asiento_contable_id` (uuid)
- `asiento_error` (text)

---

## 📝 Notas Técnicas

### Manejo de Errores

- Si falta una cuenta contable, no falla la creación de la factura
- El error se registra para revisión posterior
- Se puede regenerar el asiento manualmente si es necesario

### Usuario Sistema

Los asientos se crean con:
```typescript
const SISTEMA_USER_ID = '00000000-0000-0000-0000-000000000000';
```

Esto indica que fueron generados automáticamente por el sistema.

### Estado del Asiento

Todos los asientos se crean con `estado = 'confirmado'` ya que:
- Son generados automáticamente
- Responden a documentos reales (facturas)
- No requieren aprobación manual

---

## 🚀 Despliegue

✅ La función se desplegó automáticamente usando:
```
mcp__supabase__deploy_edge_function
```

✅ No requiere configuración adicional

✅ Las cuentas contables ya existen en el plan de cuentas

---

## ✅ Conclusión

La mejora implementada completa el ciclo contable del marketplace, asegurando que:

1. **Todas las operaciones se registren contablemente**
2. **Los pasivos se reflejen inmediatamente**
3. **Los reportes sean precisos y completos**
4. **La trazabilidad sea completa**

El sistema ahora tiene una contabilidad 100% integrada y automática desde la orden inicial hasta el pago al partner.

---

**Implementado por:** Sistema de desarrollo
**Validado:** Build exitoso
**Desplegado:** Edge Function actualizada
**Estado:** ✅ PRODUCCIÓN
