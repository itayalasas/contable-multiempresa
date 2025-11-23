# Validación de Cuadratura al Cerrar Período Contable

## 🎯 Objetivo

Garantizar que al cerrar un período contable, **todos los registros estén contabilizados** y **los totales cuadren correctamente**, evitando descuadres entre facturas y asientos contables.

---

## 🔴 Problema Detectado (Antes)

### **Escenario Real:**
```
✅ Total Facturado: $16,461.86 (15 facturas)
❌ Total Asientos: $4,117.86 (5 asientos)
❌ Faltante: $12,344.00

El sistema permitía cerrar el período ❌
```

### **Causa Raíz:**
La validación anterior solo buscaba facturas con `estado = 'emitida'`:
```typescript
.eq('estado', 'emitida')  // ❌ Ignoraba facturas 'pagada', 'pendiente', etc.
```

**Resultado:** 10 facturas pagadas NO tenían asiento contable, pero el cierre se ejecutaba igual.

---

## ✅ Solución Implementada

### **1. Validación Mejorada de Facturas Sin Asiento**

**Cambio Principal:**
```typescript
// ANTES ❌
.eq('estado', 'emitida')

// AHORA ✅
.neq('estado', 'anulada')  // Valida TODAS las facturas excepto anuladas
```

**Nueva Validación:**
```typescript
const { data: facturasVentaSinAsiento } = await supabase
  .from('facturas_venta')
  .select('id, numero_factura, fecha_emision, estado, total')
  .eq('empresa_id', periodo.empresa_id)
  .gte('fecha_emision', periodo.fecha_inicio)
  .lte('fecha_emision', periodo.fecha_fin)
  .neq('estado', 'anulada')  // ✅ Todas menos anuladas
  .or('asiento_generado.is.null,asiento_generado.eq.false');

if (facturasVentaSinAsiento && facturasVentaSinAsiento.length > 0) {
  const totalSinContabilizar = facturasVentaSinAsiento.reduce(
    (sum, f) => sum + parseFloat(f.total || '0'), 0
  );

  throw new Error(
    `Hay ${facturasVentaSinAsiento.length} factura(s) sin contabilizar ` +
    `por un total de $${totalSinContabilizar.toFixed(2)}. ` +
    `Facturas: ${numeros}`
  );
}
```

---

### **2. Validación de Cuadratura de Asientos**

**Nueva Validación:** Verifica que débitos = créditos

```typescript
// Obtener movimientos del período
const { data: movimientos } = await supabase
  .from('movimientos_contables')
  .select('debito, credito')
  .in('asiento_id', asientosConfirmados?.map(a => a.id) || []);

const totalDebitos = movimientos?.reduce(
  (sum, m) => sum + parseFloat(m.debito || '0'), 0
) || 0;

const totalCreditos = movimientos?.reduce(
  (sum, m) => sum + parseFloat(m.credito || '0'), 0
) || 0;

// Verificar cuadratura (tolerancia 1 centavo)
const diferencia = Math.abs(totalDebitos - totalCreditos);

if (diferencia > 0.01) {
  throw new Error(
    `Los asientos contables no cuadran. ` +
    `Débitos: $${totalDebitos.toFixed(2)}, ` +
    `Créditos: $${totalCreditos.toFixed(2)}. ` +
    `Diferencia: $${diferencia.toFixed(2)}`
  );
}
```

---

### **3. Mensajes de Error Mejorados**

#### **Antes:**
```
❌ "Hay 10 factura(s) de venta sin contabilizar"
```

#### **Ahora:**
```
✅ "Hay 10 factura(s) de venta sin contabilizar por un total de $12,344.00:
   A-00000012 (pagada), A-00000011 (pagada), A-00000010 (pagada), ..."
```

**Beneficios:**
- ✅ Muestra el monto total sin contabilizar
- ✅ Lista las facturas específicas
- ✅ Incluye el estado de cada factura
- ✅ Permite identificar rápidamente qué falta

---

## 🔄 Flujo de Validación Completo

Al intentar cerrar un período, el sistema valida en orden:

### **1. Facturas de Venta Sin Asiento**
```
❌ Bloquea cierre si hay facturas sin contabilizar
✅ Muestra: cantidad, monto total, números de factura
```

### **2. Facturas de Venta con Errores**
```
❌ Bloquea cierre si hay errores en asientos
✅ Muestra: números de factura y descripción del error
```

### **3. Facturas de Compra Sin Asiento**
```
❌ Bloquea cierre si hay facturas de compra sin contabilizar
✅ Muestra: cantidad y números de factura
```

### **4. Cuadratura de Asientos**
```
❌ Bloquea cierre si débitos ≠ créditos
✅ Muestra: totales de débitos, créditos y diferencia
📊 Log en consola: facturas_venta, asientos_debitos, asientos_creditos
```

### **5. Comisiones Pendientes**
```
❌ Bloquea cierre si hay comisiones sin procesar
✅ Muestra: pendientes, facturadas sin pagar, sin asiento
```

### **6. Asientos Sin Confirmar**
```
❌ Bloquea cierre si hay asientos en borrador
✅ Muestra: cantidad y números de asiento
```

---

## 📊 Ejemplo Práctico

### **Escenario: Intentar Cerrar Noviembre 2025**

#### **Estado Actual:**
```
Facturas de Venta: 15 facturas ($16,461.86)
  - 5 facturas con asiento ✅
  - 10 facturas SIN asiento ❌

Asientos Contables: 5 asientos
  - Débitos: $4,117.86
  - Créditos: $4,117.86
  - Cuadratura: ✅ OK
```

#### **Al Intentar Cerrar:**
```
❌ ERROR:
"Hay 10 factura(s) de venta sin contabilizar por un total de $12,344.00:
 A-00000012 (pagada), A-00000011 (pagada), A-00000010 (pagada),
 A-00000009 (pagada), A-00000006 (pagada), A-00000005 (pagada),
 A-00000004 (pagada), A-00000003 (pagada), A-00000002 (pagada),
 A-00000001 (pagada).

 Todas las facturas deben tener su asiento contable generado
 antes de cerrar el período."
```

---

## 🔧 Acciones Correctivas

### **Si el Error es: "Facturas sin contabilizar"**

**Opción A: Generar Asientos Manualmente**
1. Ir a **Contabilidad > Asientos Contables**
2. Crear asientos para cada factura
3. Vincular con la factura usando `referencia: FACT-[numero]`

**Opción B: Usar Función de Generación Automática** (si existe)
1. Ir a **Ventas > Facturas**
2. Seleccionar facturas sin asiento
3. Ejecutar "Generar Asientos Contables"

**Opción C: Re-procesar con Edge Function**
```sql
-- Marcar facturas para re-procesar
UPDATE facturas_venta
SET asiento_generado = false,
    asiento_error = null
WHERE id IN ('uuid1', 'uuid2', ...);
```

---

### **Si el Error es: "Asientos no cuadran"**

```
❌ "Débitos: $5,000.00, Créditos: $4,950.00. Diferencia: $50.00"
```

**Acciones:**
1. Revisar asientos del período en **Contabilidad > Asientos**
2. Identificar asientos con diferencia (débito ≠ crédito)
3. Corregir movimientos manualmente
4. Volver a intentar cerrar

---

## 📝 Logs de Depuración

El sistema ahora registra información detallada en consola:

```javascript
console.log('Validando facturas de venta...')
console.log('Validando facturas con errores...')
console.log('Validando facturas de compra...')
console.log('Todas las facturas están contabilizadas correctamente')

console.log('Validando cuadratura de totales...')
console.log('📊 Cuadratura:', {
  facturas_venta: '16461.86',
  asientos_debitos: '16461.86',
  asientos_creditos: '16461.86',
})
console.log('✅ Cuadratura de asientos correcta (débitos = créditos)')

console.log('Validando comisiones pendientes...')
console.log('✅ Todas las comisiones están procesadas correctamente')
```

**Para ver logs:**
1. Abrir DevTools (F12)
2. Pestaña "Console"
3. Intentar cerrar período
4. Revisar logs detallados

---

## ⚡ Optimizaciones

### **1. Reutilización de Consultas**

**Antes:**
```typescript
// Se consultaba asientos 2 veces ❌
const asientosParaValidacion = await ...
const asientosParaTotales = await ...
```

**Ahora:**
```typescript
// Se consulta UNA vez y se reutiliza ✅
const asientosConfirmados = await ...
const movimientos = await ...
// Usar las mismas variables en múltiples validaciones
```

---

### **2. Mensajes Informativos**

Ahora incluye:
- ✅ Cantidad de registros afectados
- ✅ Monto total involucrado
- ✅ Números/referencias específicas
- ✅ Estado actual de cada registro
- ✅ Sugerencias de acción

---

## 🎯 Beneficios de las Mejoras

### **1. Integridad Contable**
- ✅ NO se puede cerrar un período con facturas sin contabilizar
- ✅ NO se puede cerrar con asientos descuadrados
- ✅ Garantiza que todos los registros estén procesados

### **2. Trazabilidad**
- ✅ Logs detallados en consola
- ✅ Identificación clara de problemas
- ✅ Facilita auditorías

### **3. Experiencia de Usuario**
- ✅ Mensajes claros y accionables
- ✅ Indica exactamente qué falta
- ✅ Sugiere cómo resolver

### **4. Prevención de Errores**
- ✅ Detecta inconsistencias antes del cierre
- ✅ Evita períodos cerrados con datos incorrectos
- ✅ Reduce trabajo de corrección posterior

---

## 🧪 Casos de Prueba

### **Test 1: Facturas Sin Asiento**
```
Setup:
- Crear 10 facturas pagadas
- NO generar asientos para ellas

Ejecutar: Intentar cerrar período

Esperado:
❌ Error detallado con lista de facturas y monto total
```

### **Test 2: Asientos Descuadrados**
```
Setup:
- Crear asiento con Débito: $1000, Crédito: $950

Ejecutar: Intentar cerrar período

Esperado:
❌ Error indicando diferencia de $50
```

### **Test 3: Todo Correcto**
```
Setup:
- Todas las facturas tienen asiento
- Todos los asientos cuadran
- No hay comisiones pendientes

Ejecutar: Intentar cerrar período

Esperado:
✅ Cierre exitoso con totales correctos
```

---

## 📌 Resumen

| Validación | Antes | Ahora |
|------------|-------|-------|
| **Facturas sin asiento** | Solo 'emitida' | Todas menos 'anulada' ✅ |
| **Monto sin contabilizar** | No se mostraba | Se muestra total ✅ |
| **Cuadratura débito/crédito** | No se validaba | Se valida ✅ |
| **Detalle de errores** | Básico | Completo con números ✅ |
| **Logs de depuración** | Mínimos | Detallados ✅ |
| **Mensajes accionables** | Genéricos | Específicos ✅ |

---

## ✅ Conclusión

Ahora el sistema garantiza que:

1. ✅ **Todas las facturas estén contabilizadas** (sin importar estado)
2. ✅ **Los asientos cuadren correctamente** (débitos = créditos)
3. ✅ **Los mensajes sean claros** y permitan identificar problemas
4. ✅ **No se puedan cerrar períodos** con datos inconsistentes

**El usuario ahora recibe información precisa** sobre qué falta antes de poder cerrar el período, evitando descuadres contables.
