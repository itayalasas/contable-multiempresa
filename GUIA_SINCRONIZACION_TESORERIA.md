# Guía de Sincronización de Tesorería

## Problema Resuelto

Cuando intentas cerrar un período contable y aparece el error "Cuentas Bancarias Descuadradas" con:
- **Saldo Real**: $0.00
- **Saldo Contable**: Negativo (ej: $-7080.82)

Esto significa que hay asientos contables que afectan cuentas bancarias pero no tienen movimientos de tesorería correspondientes.

## Solución Implementada

Se agregaron dos opciones para resolver este problema:

### 1. Sincronizar Sistema (Recomendado)

**Qué hace:**
- Analiza todos los asientos contables que afectan cuentas bancarias
- Crea automáticamente los movimientos de tesorería faltantes
- Recalcula todos los saldos de cuentas bancarias

**Cuándo usar:**
- Primera vez configurando el sistema
- Cuando tienes asientos contables históricos sin movimientos de tesorería
- Para sincronizar completamente el sistema

**Cómo usar desde la UI:**
1. Ve a **Contabilidad → Períodos Contables**
2. Intenta cerrar el período
3. Cuando aparezca el error de cuentas descuadradas
4. Expande la sección "Cuentas Bancarias Descuadradas"
5. Click en el botón verde **"Sincronizar Sistema"**
6. Confirma la acción
7. El sistema creará los movimientos y recalculará saldos

### 2. Cuadrar Simple

**Qué hace:**
- Ajusta solo las cuentas que NO tienen movimientos
- Establece su saldo en $0.00

**Cuándo usar:**
- Cuentas bancarias creadas por error
- Cuentas que realmente no deberían tener saldo

**Cómo usar desde la UI:**
1. Mismo proceso que Sincronizar Sistema
2. Click en el botón azul **"Cuadrar Simple"**

## Ejecución Manual del Script SQL

Si prefieres ejecutar el script manualmente desde la base de datos:

### Paso 1: Vista Previa (Sin Cambios)

```sql
-- Ver qué movimientos se crearían sin ejecutar cambios
SELECT * FROM sincronizar_tesoreria_desde_asientos(
  'TU_EMPRESA_ID',  -- Reemplazar con ID de tu empresa
  'PREVIEW'
);
```

### Paso 2: Ver Diagnóstico de Cuentas

```sql
-- Ver estado actual de las cuentas bancarias
SELECT * FROM diagnostico_cuentas_bancarias_empresa('TU_EMPRESA_ID');
```

### Paso 3: Ejecutar Sincronización Completa

```sql
-- Ejecutar sincronización completa para UNA empresa
SELECT * FROM ejecutar_sincronizacion_completa('TU_EMPRESA_ID');

-- O para TODAS las empresas (PRECAUCIÓN)
SELECT * FROM ejecutar_sincronizacion_completa(NULL);
```

### Paso 4: Verificar Resultados

```sql
-- Ver resumen de cambios
SELECT * FROM recalcular_todos_saldos_cuentas_bancarias('TU_EMPRESA_ID');
```

## Ubicación del Script SQL

El script está en: `/scripts/sincronizar_tesoreria_completo.sql`

Para ejecutarlo en Supabase:
1. Ve al **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido del script
3. Ejecuta el script para crear las funciones
4. Usa las funciones según los pasos anteriores

## Funciones Creadas

1. **sincronizar_tesoreria_desde_asientos**: Crea movimientos desde asientos
2. **recalcular_todos_saldos_cuentas_bancarias**: Recalcula saldos
3. **ejecutar_sincronizacion_completa**: Proceso completo en un solo paso
4. **diagnostico_cuentas_bancarias_empresa**: Diagnóstico detallado

## Notas Importantes

- ✅ **Seguro**: Las funciones están diseñadas para no duplicar movimientos
- ✅ **Idempotente**: Puedes ejecutarlas múltiples veces sin problemas
- ✅ **Auditable**: Todos los movimientos creados quedan registrados
- ⚠️ **Primera vez**: Ejecutar solo UNA VEZ para datos históricos
- 📊 **Vista previa**: Siempre revisa con modo PREVIEW primero

## Resultado Esperado

Después de la sincronización:
- Todas las cuentas bancarias tendrán movimientos de tesorería correspondientes a sus asientos
- Los saldos contables coincidirán con los saldos reales
- Podrás cerrar el período sin errores

## Soporte

Si encuentras algún problema:
1. Revisa el diagnóstico de cuentas
2. Verifica que los asientos contables estén correctos
3. Ejecuta en modo PREVIEW primero
4. Contacta al administrador si persiste el error
