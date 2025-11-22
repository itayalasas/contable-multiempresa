# Guía Completa: Sistema de Períodos Contables

## 📋 Resumen

El sistema de períodos contables está completamente implementado e integrado con la contabilidad. Esta guía explica cómo funciona y qué se puede hacer con él.

## 🎯 Funcionalidades Implementadas

### 1. Ejercicios Fiscales

Un **Ejercicio Fiscal** representa un año contable completo.

**Características:**
- Se crea automáticamente con 12 períodos mensuales
- Estados: `abierto`, `cerrado`, `cerrado_definitivo`
- Contiene fechas de inicio y fin
- Permite descripción personalizada

**Crear Ejercicio:**
1. Ir a "Contabilidad > Períodos Contables"
2. Hacer clic en "Nuevo Ejercicio"
3. Completar:
   - Año (ej: 2025)
   - Fecha inicio (ej: 01/01/2025)
   - Fecha fin (ej: 31/12/2025)
   - Descripción (opcional)
4. Al crear, se generan automáticamente 12 períodos mensuales

### 2. Períodos Contables (Mensuales)

Cada ejercicio se divide en **períodos mensuales** que controlan cuándo se pueden registrar asientos.

**Estados:**
- **Abierto**: Se pueden crear y modificar asientos
- **Cerrado**: No se pueden crear ni modificar asientos
- **Cerrado Definitivo**: Cierre permanente (no se puede reabrir)

### 3. Cierre de Períodos

Al cerrar un período:

✅ **Se Valida:**
- Todos los asientos estén confirmados (no hay borradores)
- No haya inconsistencias en los movimientos

✅ **Se Registra:**
- Total de débitos del período
- Total de créditos del período
- Cantidad de asientos
- Quién cerró y cuándo
- Motivo del cierre (opcional)

✅ **Se Bloquea:**
- Creación de nuevos asientos en ese período
- Modificación de asientos existentes

### 4. Reapertura de Períodos

Un período cerrado puede reabrirse, pero:

⚠️ **Requisitos:**
- Motivo de reapertura (OBLIGATORIO)
- No puede estar en estado "cerrado_definitivo"

📝 **Auditoría:**
- Queda registrado quién reabrió
- Se guarda el motivo
- Se puede ver el historial completo

## 🔒 Validaciones Automáticas

### En la Base de Datos (Trigger)

Existe un trigger `validar_periodo_abierto` que:

```sql
-- Valida automáticamente al intentar:
INSERT INTO asientos_contables ...  -- ❌ Error si período cerrado
UPDATE asientos_contables ...       -- ❌ Error si período cerrado
```

### En el Frontend

Validación previa antes de enviar a la base de datos:

```typescript
// Valida que la fecha esté en un período abierto
const periodoAbierto = await periodosContablesService.validarFechaEnPeriodoAbierto(
  empresaId,
  fecha
);

if (!periodoAbierto) {
  throw new Error('No se puede crear asiento en período cerrado');
}
```

## 🔄 Flujo Completo del Sistema

### Inicio de Año
```
1. Crear Ejercicio Fiscal 2025
   ↓
2. Sistema genera automáticamente 12 períodos
   - Enero 2025: 01/01/2025 - 31/01/2025 (Abierto)
   - Febrero 2025: 01/02/2025 - 28/02/2025 (Abierto)
   - ...
   - Diciembre 2025: 01/12/2025 - 31/12/2025 (Abierto)
```

### Durante el Mes
```
Usuario registra asientos
   ↓
Sistema valida fecha
   ↓
Si período abierto → ✅ Permite
Si período cerrado → ❌ Rechaza con mensaje claro
```

### Fin de Mes
```
1. Revisar asientos del período
   ↓
2. Confirmar todos los asientos borrador
   ↓
3. Cerrar período
   ↓
4. Sistema calcula totales y bloquea el período
```

### Si Necesita Corrección
```
1. Reabrir período (con motivo)
   ↓
2. Hacer correcciones
   ↓
3. Volver a cerrar
   ↓
4. Todo queda registrado en el historial
```

## 📊 Dashboard de Períodos

El dashboard muestra:

1. **Período Actual**: Año del ejercicio activo
2. **Estado**: Abierto/Cerrado
3. **Asientos**: Cantidad de asientos en el período actual
4. **Días Restantes**: Días hasta el fin del período actual

## 🔍 Historial de Cierres

Para cada período puedes ver:

- Todas las veces que fue cerrado
- Todas las veces que fue reabierto
- Quién realizó cada acción
- Motivos y observaciones
- Fecha y hora exacta

## 💡 Buenas Prácticas

### ✅ Recomendado

1. **Cierre Mensual Regular**
   - Cerrar cada mes después de revisión
   - Documentar motivos si hay algo especial

2. **Reaperturas Justificadas**
   - Siempre indicar motivo claro
   - Hacer correcciones rápido
   - Volver a cerrar inmediatamente

3. **Revisión Previa**
   - Verificar todos los asientos antes de cerrar
   - Confirmar que no hay borradores
   - Revisar que débitos = créditos

### ❌ Evitar

1. **Reaperturas Frecuentes**
   - Indica falta de revisión previa
   - Genera confusión en auditorías

2. **Períodos Abiertos Antiguos**
   - Cierra períodos pasados lo antes posible
   - No acumules múltiples períodos abiertos

3. **Cerrar sin Revisar**
   - Siempre revisa antes de cerrar
   - Verifica que todo esté correcto

## 🔐 Seguridad y Auditoría

### RLS (Row Level Security)

Todas las tablas tienen políticas de seguridad:
- Solo usuarios autenticados pueden ver datos
- Control de permisos por empresa

### Auditoría Completa

Se registra:
- ✅ Quién creó cada ejercicio
- ✅ Quién cerró cada período
- ✅ Quién reabrió cada período
- ✅ Todos los motivos y observaciones
- ✅ Fechas exactas de cada acción

### Trazabilidad

```
Tabla: cierres_contables
- Registro de CADA cierre y reapertura
- No se puede borrar (historial permanente)
- Disponible para auditorías
```

## 📝 Ejemplo Práctico

### Escenario: Cierre de Enero 2025

```
📅 Fecha: 31 de Enero 2025

1. Contador revisa asientos de enero
   - Total débitos: $150,000
   - Total créditos: $150,000
   - Asientos: 45

2. Confirma asientos borrador (5 pendientes)

3. Va a "Períodos Contables"

4. Encuentra período "Enero 2025"
   Estado: Abierto
   Asientos: 45

5. Click en botón "Cerrar" 🔒

6. Modal de confirmación:
   - Motivo: "Cierre mensual regular"
   - Observaciones: "Todos los asientos revisados y confirmados"

7. Confirmar

8. Sistema:
   ✅ Valida que no hay borradores
   ✅ Calcula totales
   ✅ Marca período como cerrado
   ✅ Registra en historial
   ✅ Bloquea creación de asientos en enero

9. Resultado:
   - Período Enero: CERRADO
   - Ya no se pueden crear asientos con fecha en enero
   - Todos los asientos de enero son definitivos
```

### Si Necesita Corrección

```
📅 Fecha: 5 de Febrero 2025

1. Descubre error en asiento de enero

2. Va a "Períodos Contables"

3. Encuentra período "Enero 2025"
   Estado: Cerrado 🔒

4. Click en botón "Reabrir" 🔓

5. Modal de reapertura:
   - Motivo: "Corrección de asiento #1234 - Error en cuenta contable"
   - Observaciones: "Asiento registrado en cuenta incorrecta"

6. Confirmar

7. Sistema:
   ✅ Registra motivo
   ✅ Reabre período
   ✅ Permite edición

8. Contador hace corrección

9. Vuelve a cerrar período

10. Historial muestra:
    - Cierre: 31/01/2025 - "Cierre mensual regular"
    - Reapertura: 05/02/2025 - "Corrección asiento #1234"
    - Cierre: 05/02/2025 - "Cierre después de corrección"
```

## 🚀 Integración con Otros Módulos

### Facturas de Venta
- Al crear factura, valida que la fecha esté en período abierto
- Si período cerrado, no permite crear

### Facturas de Compra
- Misma validación que ventas
- Asiento contable automático respeta períodos

### Cuentas por Cobrar/Pagar
- Pagos y cobros generan asientos
- Validación automática de períodos

### Tesorería
- Movimientos de caja/banco generan asientos
- Respeta períodos cerrados

## 📈 Reportes Afectados

Los períodos cerrados garantizan que los reportes sean confiables:

- **Balance de Comprobación**: Datos inmutables de períodos cerrados
- **Libro Mayor**: Movimientos definitivos
- **Estados Financieros**: Basados en períodos cerrados
- **Balance General**: Refleja cierres contables

## ⚙️ Configuración Técnica

### Tabla: ejercicios_fiscales
```sql
- id (uuid)
- empresa_id (uuid)
- anio (integer)
- fecha_inicio (date)
- fecha_fin (date)
- estado (text: abierto, cerrado, cerrado_definitivo)
- descripcion (text)
- fecha_cierre (timestamptz)
- cerrado_por (text)
```

### Tabla: periodos_contables
```sql
- id (uuid)
- ejercicio_id (uuid)
- empresa_id (uuid)
- numero_periodo (integer: 1-12)
- nombre (text: "Enero 2025")
- fecha_inicio (date)
- fecha_fin (date)
- estado (text: abierto, cerrado, cerrado_definitivo)
- permite_asientos (boolean)
- total_debitos (numeric)
- total_creditos (numeric)
- cantidad_asientos (integer)
- fecha_cierre (timestamptz)
- cerrado_por (text)
- fecha_reapertura (timestamptz)
- reabierto_por (text)
- motivo_reapertura (text)
```

### Tabla: cierres_contables
```sql
- id (uuid)
- periodo_id (uuid)
- ejercicio_id (uuid)
- empresa_id (uuid)
- tipo_cierre (text: PERIODO, EJERCICIO)
- accion (text: CIERRE, REAPERTURA)
- fecha_accion (timestamptz)
- usuario_id (text)
- motivo (text)
- observaciones (text)
- estado_anterior (text)
- estado_nuevo (text)
- total_debitos (numeric)
- total_creditos (numeric)
- cantidad_asientos (integer)
```

## 🆘 Solución de Problemas

### Error: "No se puede crear asiento en período cerrado"
**Causa**: Intentas crear un asiento con fecha en un período ya cerrado
**Solución**:
1. Reabre el período (con motivo)
2. O cambia la fecha del asiento a un período abierto

### Error: "Hay asientos sin confirmar"
**Causa**: Intentas cerrar un período con asientos borrador
**Solución**: Confirma todos los asientos borrador antes de cerrar

### No aparecen períodos
**Causa**: No hay ejercicio fiscal creado
**Solución**: Crea un ejercicio fiscal (se generan períodos automáticamente)

### Botón "Crear Ejercicio" no funciona
**Verificar en consola del navegador**:
- empresaActual está definido
- Fechas están en formato correcto
- No hay errores de permisos en Supabase

## 🎓 Preguntas Frecuentes

**P: ¿Puedo tener varios ejercicios abiertos?**
R: Sí, pero solo uno es el "actual" (el más reciente).

**P: ¿Qué pasa si cierro un período por error?**
R: Puedes reabrirlo indicando el motivo. Todo queda registrado.

**P: ¿Puedo eliminar un período?**
R: No, los períodos no se eliminan para mantener trazabilidad contable.

**P: ¿Cuándo usar cierre definitivo?**
R: Solo al final del año fiscal, después de auditorías y cuando estés 100% seguro.

**P: ¿Los períodos cerrados afectan reportes?**
R: Los reportes pueden consultar datos de períodos cerrados sin problema.

**P: ¿Necesito cerrar períodos en orden?**
R: Es recomendado, pero no obligatorio. Puedes tener enero cerrado y febrero abierto.

---

## 📞 Soporte

Para más información o problemas:
1. Revisa la consola del navegador (F12)
2. Verifica permisos en Supabase
3. Consulta los logs de auditoría
