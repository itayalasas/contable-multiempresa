# Limpieza del Sistema - Resumen

## Fecha de Limpieza
5 de febrero de 2026

## Objetivo
Limpiar todos los datos transaccionales del sistema manteniendo la configuración y datos maestros para poder realizar pruebas desde cero con el nuevo sistema de comisiones de Mercado Pago.

## Datos Eliminados

Se eliminaron exitosamente todos los registros transaccionales:

### Facturas y Documentos
- ✅ Facturas de venta (0 registros)
- ✅ Facturas de compra (0 registros)
- ✅ Notas de crédito (0 registros)
- ✅ Items de facturas de venta
- ✅ Items de facturas de compra
- ✅ Items de notas de crédito
- ✅ Facturas por pagar

### Comisiones y Partners
- ✅ Comisiones de partners (0 registros)
- ✅ Lotes de facturación de partners
- ✅ Lotes de pago bancario
- ✅ Pagos en lote

### Pagos y Cobros
- ✅ Pagos de clientes (0 registros)
- ✅ Pagos a proveedores (0 registros)

### Tesorería
- ✅ Movimientos de tesorería (0 registros)
- ✅ Saldos bancarios restablecidos a 0

### Contabilidad
- ✅ Asientos contables (0 registros)
- ✅ Movimientos contables (0 registros)
- ✅ Periodos contables reabiertos (todos en estado "abierto")

### Sistema
- ✅ Eventos externos (webhooks procesados) (0 registros)
- ✅ Solicitudes de autorización (0 registros)

## Datos Mantenidos

Se preservaron todos los datos maestros y configuraciones:

### Empresas y Usuarios
- ✅ 1 empresa
- ✅ 7 usuarios

### Catálogos
- ✅ 29 clientes
- ✅ 10 proveedores
- ✅ 8 partners/aliados

### Contabilidad
- ✅ 89 cuentas del plan de cuentas
- ✅ 26 periodos contables (ahora abiertos)

### Finanzas
- ✅ 6 cuentas bancarias (saldo en 0)

### Configuraciones
- ✅ 8 configuraciones de impuestos (incluye las nuevas comisiones de Mercado Pago)

## Configuraciones de Mercado Pago Disponibles

El sistema ahora cuenta con las siguientes configuraciones de comisiones:

1. **COMISION_COBRANZA_ELECTRONICA** (5.99%)
   - Comisión base por procesamiento de pagos

2. **COMISION_ACREDITACION_INSTANTANEA** (5.99%)
   - Para acreditación al instante (0 días)

3. **COMISION_ACREDITACION_21_DIAS** (4.99%)
   - Para acreditación a 21 días

4. **COMISION_FINANCIAMIENTO_CUOTAS** (2.49%)
   - Para financiamiento en cuotas sin interés

## Estado Actual del Sistema

El sistema está completamente limpio y listo para:

- ✅ Probar flujos de facturación desde cero
- ✅ Probar sistema de comisiones de Mercado Pago
- ✅ Probar webhooks de marketplace
- ✅ Probar generación de asientos contables
- ✅ Probar cálculo de comisiones en cascada
- ✅ Probar movimientos de tesorería
- ✅ Probar cuentas por cobrar y pagar

## Cómo Volver a Limpiar

Para realizar una nueva limpieza en el futuro, ejecute la siguiente migración que se guardó en el sistema:

```sql
-- Ver archivo: supabase/migrations/20260205XXXXXX_limpiar_datos_transaccionales_correcto.sql
```

O ejecute el script SQL directamente desde la consola de Supabase.

## Recomendaciones

1. **Antes de probar**: Verifique que los partners tengan configuradas sus comisiones de Mercado Pago
2. **Durante pruebas**: Monitoree los asientos contables automáticos
3. **Después de pruebas**: Puede volver a limpiar usando el mismo script

## Notas Importantes

- La limpieza es **IRREVERSIBLE**
- Siempre haga un backup antes de limpiar en producción
- Este script está diseñado para ambientes de desarrollo/prueba
- Los saldos bancarios se resetean a 0
- Todos los periodos contables se reabren automáticamente

## Próximos Pasos

1. Configurar partners con opciones de Mercado Pago
2. Enviar webhooks de prueba
3. Verificar generación de facturas
4. Verificar cálculo de comisiones
5. Verificar asientos contables automáticos
6. Verificar movimientos de tesorería
