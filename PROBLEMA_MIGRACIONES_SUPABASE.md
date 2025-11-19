# Problema: Migraciones de Supabase no Aplicadas

## Errores Detectados

Los logs muestran múltiples errores:

1. **Nomencladores cargan 0 resultados**
   ```
   ✅ Datos cargados desde Supabase: 0 tipos de documento, 0 tipos de factura
   ✅ Datos de tesorería: 0 tipos de movimiento, 0 monedas, 0 bancos
   ```

2. **Error al insertar plan de cuentas**
   ```
   Failed to load resource: the server responded with a status of 400 ()
   Error insertando lote: Object
   ```

3. **Errores de Firebase (legacy)**
   ```
   Error obteniendo estadísticas de asientos: FirebaseError
   Error obteniendo estadísticas de cuentas: FirebaseError
   ```

## Causa Raíz

Las **migraciones de Supabase no están aplicadas** en la base de datos. Los archivos SQL existen en:
- `/supabase/migrations/20251119011025_create_base_schema.sql`
- `/supabase/migrations/20251119011054_create_contabilidad_schema.sql`
- `/supabase/migrations/20251119011122_create_cuentas_por_cobrar_schema.sql`
- `/supabase/migrations/20251119011148_create_cuentas_por_pagar_schema.sql`
- `/supabase/migrations/20251119011221_create_tesoreria_schema.sql`
- Y otras migraciones...

Pero las tablas **NO existen en Supabase**.

## Soluciones

### Opción 1: Aplicar Migraciones desde Supabase Dashboard (Recomendada)

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **SQL Editor**
4. Copiar y pegar el contenido de cada archivo de migración **en orden**:
   - `20251119011025_create_base_schema.sql`
   - `20251119011054_create_contabilidad_schema.sql`
   - `20251119011122_create_cuentas_por_cobrar_schema.sql`
   - `20251119011148_create_cuentas_por_pagar_schema.sql`
   - `20251119011221_create_tesoreria_schema.sql`
   - `20251119024548_add_usuarios_insert_policy.sql`
   - `20251119024756_fix_usuarios_insert_policy_external_auth.sql`
   - `20251119024825_allow_anon_access_for_external_auth.sql`
   - `20251119024839_allow_anon_access_nomencladores.sql`
   - `20251119025211_insert_datos_demo.sql`
   - `20251119030543_create_nomencladores_uruguay_empresas.sql`
   - `20251119030616_create_configuracion_empresas_extendida.sql`
   - `20251119030701_insert_datos_uruguay_nomencladores.sql`
   - `20251119044504_add_anon_access_plan_cuentas.sql`
5. Ejecutar cada script

### Opción 2: Usar Supabase CLI

Si tienes Supabase CLI instalado:

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Vincular tu proyecto (necesitarás el ID del proyecto)
supabase link --project-ref TU_PROJECT_REF

# Aplicar todas las migraciones
supabase db push
```

### Opción 3: Usar API de Supabase (programático)

El sistema podría usar la herramienta MCP `mcp__supabase__apply_migration` para aplicar cada migración, pero esto requiere:
- Leer cada archivo SQL
- Aplicarlo uno por uno en orden
- Manejar errores si ya existen algunas tablas

## Problemas Adicionales Detectados

### 1. Código Firebase Legacy

Algunos servicios todavía usan Firebase:
- `/frontend/src/services/firebase/dashboard.ts`
- `/frontend/src/services/firebase/seedDataNomencladores.ts`

Estos archivos intentan conectar a Firebase y causan errores. Deberían:
- Eliminarse completamente, o
- Actualizarse para usar Supabase

### 2. Nomencladores por País vs Por Empresa

Como identificamos anteriormente, los nomencladores están diseñados por país pero deberían ser por empresa. Esto requiere:
- Agregar columna `empresa_id` a tablas de nomencladores
- Actualizar servicios y hooks
- Ver documento `NOMENCLADORES_POR_EMPRESA.md`

## Próximos Pasos

1. **URGENTE**: Aplicar migraciones en Supabase (Opción 1 o 2)
2. Verificar que las tablas se crearon correctamente
3. Insertar datos de prueba
4. Eliminar o actualizar código Firebase legacy
5. Implementar nomencladores por empresa (si se requiere)

## Verificación

Después de aplicar las migraciones, verificar en Supabase que existen estas tablas:
- `paises`
- `usuarios`
- `empresas`
- `plan_cuentas`
- `tipo_documento_identidad`
- `tipo_documento_factura`
- `tipo_impuesto`
- `tipo_moneda`
- `forma_pago`
- `tipo_movimiento_tesoreria`
- `bancos`
- Y otras tablas del esquema
