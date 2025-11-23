# Control de Estado de Pago de Comisiones

## 📋 Descripción General

Sistema automático para actualizar el estado de pago de las comisiones cuando se paga la factura de comisión asociada, y validaciones para impedir el cierre de períodos con comisiones pendientes.

---

## 🔄 Flujo Automático de Actualización

### 1. **Trigger Automático al Pagar Factura**

Cuando una factura de venta se marca como **"pagada"**, el sistema:

```
facturas_venta.estado = 'pagada'
    ↓
🔄 TRIGGER: actualizar_estado_pago_comisiones_on_pago()
    ↓
UPDATE comisiones_partners
SET estado_pago = 'pagada',
    fecha_pagada = NOW()
WHERE factura_venta_comision_id = [factura_id]
  AND estado_pago = 'pendiente'
```

### 2. **Campos Involucrados**

#### En `comisiones_partners`:
- `estado_comision`: Control del proceso de facturación
  - `'pendiente'` → Comisión registrada, esperando facturación
  - `'facturada'` → Factura generada al partner
  - `'pagada'` → Factura pagada al partner
  - `'anulada'` → Comisión cancelada

- `estado_pago`: Control del pago de la factura
  - `'pendiente'` → Factura no pagada
  - `'pagada'` → Factura pagada ✅
  - `'anulada'` → Pago cancelado

- `factura_venta_comision_id`: UUID de la factura de venta generada para pagar al partner
- `fecha_pagada`: Timestamp cuando se realizó el pago

---

## 🚫 Validaciones para Cierre de Período

### Función de Validación: `tiene_comisiones_pendientes_en_periodo()`

Antes de cerrar un período contable, el sistema valida:

#### ✅ **1. Comisiones Pendientes de Facturar**
```sql
estado_comision = 'pendiente'
```
**Error:** "X comisión(es) pendiente(s) de facturar"

**Acción Requerida:**
- Ir a **Compras > Comisiones Partners**
- Generar facturas para las comisiones pendientes

---

#### ✅ **2. Comisiones Facturadas pero NO Pagadas**
```sql
estado_comision = 'facturada'
AND estado_pago = 'pendiente'
```
**Error:** "X comisión(es) facturada(s) sin pagar"

**Acción Requerida:**
- Ir a **Ventas > Facturas**
- Buscar las facturas de comisión (tipo COM-XXXXXXXX)
- Marcar como pagadas las facturas correspondientes

---

#### ✅ **3. Facturas de Comisión sin Asiento Contable**
```sql
WHERE c.estado_comision IN ('facturada', 'pagada')
  AND fv.asiento_contable_id IS NULL
```
**Error:** "X factura(s) de comisión sin asiento contable"

**Acción Requerida:**
- Verificar que todas las facturas generadas tengan su asiento
- Regenerar asientos si es necesario

---

## 📊 Ejemplo de Flujo Completo

### **Escenario: Venta con Comisión a Partner**

#### 1. **Venta Inicial** (11/22/2025)
```
Orden: DOG-2025-TEST-011
Cliente: Usuario Final
Monto: $10.00
Partner: Veterinaria Centro (15% comisión)
```

**Se crea automáticamente:**
```sql
INSERT INTO comisiones_partners (
  partner_id,
  factura_venta_id,  -- factura al cliente final
  subtotal_venta: 10.00,
  comision_porcentaje: 15,
  comision_monto: 1.50,
  estado_comision: 'pendiente',
  estado_pago: 'pendiente'
)
```

---

#### 2. **Generar Factura a Partner** (Quincenal/Mensual)
```
🔄 Acción: "Generar Facturas Partners"
```

**Se crea:**
```sql
INSERT INTO facturas_venta (
  numero_factura: 'COM-00000001',
  cliente_id: [partner como cliente],
  total: 1.50,
  estado: 'emitida'
)

UPDATE comisiones_partners
SET estado_comision = 'facturada',
    factura_venta_comision_id = [nueva_factura_id],
    fecha_facturada = NOW()
```

**Estado actual:**
- ✅ `estado_comision`: 'facturada'
- ⏳ `estado_pago`: 'pendiente'
- 📄 `factura_venta_comision_id`: COM-00000001

---

#### 3. **Pagar Factura al Partner**
```
🔄 Acción: Usuario marca factura COM-00000001 como "pagada"
```

**Trigger automático actualiza:**
```sql
-- ✅ AUTOMÁTICO via trigger
UPDATE comisiones_partners
SET estado_pago = 'pagada',
    fecha_pagada = NOW()
WHERE factura_venta_comision_id = 'COM-00000001'
  AND estado_pago = 'pendiente'
```

**Estado final:**
- ✅ `estado_comision`: 'facturada'
- ✅ `estado_pago`: 'pagada' ✅
- ✅ `fecha_pagada`: 2025-11-23 12:34:56

---

#### 4. **Intentar Cerrar Período**
```
🔄 Acción: Usuario intenta cerrar período noviembre 2025
```

**Validación automática:**
```sql
SELECT * FROM tiene_comisiones_pendientes_en_periodo(
  empresa_id,
  '2025-11-01',
  '2025-11-30'
)
```

**Resultados posibles:**

✅ **Todas OK:**
```
hay_pendientes: false
mensaje: "No hay comisiones pendientes"
cantidad_pendientes: 0
cantidad_facturadas_sin_pagar: 0
cantidad_sin_asiento: 0
```
→ **Se permite cerrar el período** ✅

---

❌ **Hay pendientes:**
```
hay_pendientes: true
mensaje: "ADVERTENCIA: 4 comisiones pendientes de facturar. 2 comisiones facturadas sin pagar."
cantidad_pendientes: 4
cantidad_facturadas_sin_pagar: 2
cantidad_sin_asiento: 0
```
→ **NO se permite cerrar el período** ❌

---

## 🎯 Beneficios del Sistema

### 1. **Automatización**
- ✅ No requiere actualización manual de estados
- ✅ Trigger ejecuta actualizaciones automáticamente
- ✅ Reduce errores humanos

### 2. **Integridad de Datos**
- ✅ Estado de pago siempre sincronizado con factura
- ✅ Validaciones previenen cierre de períodos inconsistentes
- ✅ Trazabilidad completa del flujo

### 3. **Control Contable**
- ✅ No se puede cerrar un período con comisiones pendientes
- ✅ Garantiza que todas las operaciones estén contabilizadas
- ✅ Auditoría completa del proceso

---

## 🔧 Implementación Técnica

### **Migración Aplicada:**
```
20251123020000_actualizar_estado_pago_comisiones.sql
```

### **Funciones Creadas:**

#### 1. `actualizar_estado_pago_comisiones_on_pago()`
- **Tipo:** Trigger Function
- **Ejecuta:** AFTER UPDATE OF estado ON facturas_venta
- **Condición:** WHEN (NEW.estado = 'pagada')

#### 2. `tiene_comisiones_pendientes_en_periodo()`
- **Tipo:** Validation Function
- **Retorna:** Table con contadores y mensajes
- **Usada:** Antes de cerrar período contable

### **Servicios Actualizados:**

#### `periodosContables.ts`:
- ✅ Integración con función de validación
- ✅ Mensajes detallados de error
- ✅ Prevención de cierre con pendientes

---

## 📝 Casos de Uso

### **Caso 1: Pago Inmediato**
```
1. Se genera factura COM-00000001
2. Usuario marca como pagada inmediatamente
3. ✅ Comisiones actualizadas a 'pagada' automáticamente
```

### **Caso 2: Pago Parcial**
```
1. Se genera factura COM-00000001 con 10 comisiones
2. Usuario marca como pagada
3. ✅ Las 10 comisiones se actualizan a 'pagada'
```

### **Caso 3: Intento de Cierre con Pendientes**
```
1. Hay 5 comisiones pendientes de facturar
2. Usuario intenta cerrar período
3. ❌ Error: "5 comisión(es) pendiente(s) de facturar"
4. Usuario genera facturas
5. Usuario paga facturas
6. ✅ Ahora puede cerrar el período
```

---

## ⚠️ Notas Importantes

1. **El trigger solo actualiza comisiones con `estado_pago = 'pendiente'`**
   - Si una comisión ya está marcada como 'pagada', no se modifica

2. **La validación es estricta:**
   - NO permite cerrar con comisiones pendientes
   - NO permite cerrar con facturas sin asiento
   - NO permite cerrar con pagos pendientes

3. **Los campos `ocultar_en_listados` y `periodo_contable_id`:**
   - Se actualizan al cerrar el período
   - Permiten filtrar comisiones de períodos cerrados
   - No eliminan datos, solo los ocultan en vistas

---

## 🧪 Pruebas Recomendadas

### Test 1: Pago de Factura Actualiza Comisiones
1. Crear comisión con estado_comision='facturada', estado_pago='pendiente'
2. Marcar factura asociada como 'pagada'
3. ✅ Verificar que estado_pago cambió a 'pagada'

### Test 2: Validación Impide Cierre
1. Dejar comisiones con estado='pendiente'
2. Intentar cerrar período
3. ✅ Verificar que muestra error y no permite cerrar

### Test 3: Cierre Exitoso
1. Procesar todas las comisiones (facturar y pagar)
2. Intentar cerrar período
3. ✅ Verificar que el cierre se ejecuta sin errores

---

## 📞 Soporte

Para preguntas sobre el sistema de comisiones:
- Revisar documentación en `COMISIONES_PARTNERS.md`
- Ver ejemplos en `test-orden-multiples-partners.json`
