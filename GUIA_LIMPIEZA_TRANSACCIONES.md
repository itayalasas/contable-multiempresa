# Guía de Limpieza de Transacciones

Esta guía explica cómo limpiar todas las transacciones de la base de datos manteniendo la configuración base.

## 📋 Scripts Disponibles

### 1. `limpiar_todas_transacciones.sql` (Completo)
Script detallado con:
- Mensajes informativos
- Resumen final
- Verificaciones
- Documentación completa

**Uso:** Ideal para entender qué se está eliminando paso a paso.

### 2. `reset_transacciones_rapido.sql` (Rápido)
Script compacto para ejecución directa en Supabase.

**Uso:** Ideal para limpiezas rápidas durante desarrollo.

## 🎯 ¿Qué se Mantiene?

✅ **Se CONSERVA:**
- Empresas y toda su configuración
- Usuarios y sus permisos
- Plan de cuentas completo
- Clientes (se limpia metadata de transacciones)
- Proveedores (se limpia metadata de transacciones)
- Partners
- Nomencladores (impuestos, tipos de documento, etc.)
- Períodos contables (se reabren si están cerrados)
- Cuentas bancarias (saldo resetea al inicial)
- Centros de costo
- Configuración de CFE/DGI
- Configuración de aprobaciones
- Mapeo de archivos bancarios

## 🗑️ ¿Qué se Elimina?

❌ **Se BORRA:**
- Todas las facturas de venta
- Todas las facturas de compra
- Todas las notas de crédito
- Todos los asientos contables
- Todos los movimientos de tesorería
- Todas las comisiones de partners
- Todos los pagos (clientes y proveedores)
- Todas las cuentas por cobrar/pagar
- Todas las solicitudes de aprobación
- Todos los eventos externos (webhooks)
- Todos los snapshots de períodos

## 📖 Cómo Usar

### Opción 1: Script Completo (Recomendado primera vez)

1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia el contenido de `limpiar_todas_transacciones.sql`
5. Ejecuta
6. Lee el resumen en la consola

### Opción 2: Script Rápido

1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia el contenido de `reset_transacciones_rapido.sql`
4. Ejecuta
5. Verifica el resultado en la tabla que muestra

## ⚠️ Advertencias Importantes

1. **No es reversible**: Una vez ejecutado, NO puedes recuperar los datos
2. **Usar en desarrollo**: Ideal para resetear el sistema durante pruebas
3. **Backup primero**: Si hay datos importantes, haz backup antes
4. **Cierra sesiones**: Asegúrate de que nadie esté usando el sistema
5. **Verificar empresa**: Si tienes múltiples empresas, considera si quieres limpiar todas

## 🔍 Verificación Post-Limpieza

Después de ejecutar, verifica:

```sql
-- Ver conteo de registros
SELECT
  'facturas_venta' as tabla, COUNT(*) as registros
FROM facturas_venta
UNION ALL
SELECT 'asientos_contables', COUNT(*) FROM asientos_contables
UNION ALL
SELECT 'movimientos_tesoreria', COUNT(*) FROM movimientos_tesoreria
UNION ALL
SELECT 'comisiones_partners', COUNT(*) FROM comisiones_partners;
```

Todos deben mostrar **0 registros**.

```sql
-- Ver saldos bancarios (deben ser = saldo inicial)
SELECT
  nombre,
  saldo_inicial,
  saldo_actual,
  CASE
    WHEN saldo_inicial = saldo_actual THEN '✅ OK'
    ELSE '❌ Descuadrado'
  END as estado
FROM cuentas_bancarias;
```

```sql
-- Ver períodos (todos deben estar abiertos)
SELECT
  nombre,
  estado,
  CASE
    WHEN estado = 'abierto' THEN '✅ OK'
    ELSE '⚠️ Cerrado'
  END as estado_check
FROM periodos_contables
ORDER BY fecha_inicio;
```

## 🎯 Casos de Uso

### 1. Reset Completo de Desarrollo
Cuando quieres empezar de cero pero mantener la configuración:
```bash
# Ejecutar reset_transacciones_rapido.sql
```

### 2. Antes de Demo/Presentación
Limpiar datos de prueba antes de mostrar el sistema:
```bash
# Ejecutar limpiar_todas_transacciones.sql
# Ver el resumen para confirmar
```

### 3. Después de Testing
Limpiar datos de pruebas automatizadas:
```bash
# Ejecutar reset_transacciones_rapido.sql
```

### 4. Migración de Datos
Antes de importar datos reales:
```bash
# 1. Ejecutar limpiar_todas_transacciones.sql
# 2. Verificar limpieza
# 3. Importar datos reales
```

## 🔄 Qué Pasa Después de Limpiar

1. **Numeración de facturas**: Empieza desde 1
2. **Saldos bancarios**: Vuelven al saldo inicial configurado
3. **Períodos**: Todos reabiertos y listos para usar
4. **Plan de cuentas**: Sin movimientos, listo para nuevas transacciones
5. **Usuarios**: Pueden iniciar sesión normalmente
6. **Empresas**: Configuración intacta, listas para operar

## 📞 Soporte

Si tienes dudas sobre:
- ¿Qué script usar? → `reset_transacciones_rapido.sql` para pruebas rápidas
- ¿Cómo verificar? → Ejecuta las queries de verificación
- ¿Algo salió mal? → Revisa los mensajes de error en Supabase SQL Editor

## 🎓 Tips

1. **Crea un snapshot antes**: En Supabase, puedes hacer un backup
2. **Prueba primero en desarrollo**: No ejecutes en producción sin probar
3. **Documenta por qué limpias**: Mantén un log de cuándo y por qué reseteaste
4. **Avisa al equipo**: Si trabajan varios, coordinen la limpieza
5. **Considera selectivo**: Si solo quieres limpiar ciertas transacciones, modifica el script

## 🚀 Empezar de Nuevo

Después de limpiar:

1. ✅ Verifica que todo esté en 0
2. ✅ Revisa saldos bancarios
3. ✅ Confirma períodos abiertos
4. ✅ Prueba crear una factura
5. ✅ Verifica que se genere el asiento
6. ✅ Confirma que tesorería funcione

¡Listo para operar! 🎉
