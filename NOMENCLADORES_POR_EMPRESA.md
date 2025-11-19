# Análisis: Nomencladores por Empresa

## Problema Identificado

Actualmente los nomencladores están vinculados a `pais_id`:
- tipo_documento_identidad
- tipo_documento_factura
- tipo_impuesto
- tipo_moneda
- forma_pago
- tipo_movimiento_tesoreria
- bancos
- unidad_medida
- categoria_producto

**Esto significa que:**
- Todas las empresas de un mismo país comparten los mismos nomencladores
- No es posible personalizar nomencladores por empresa
- Los cambios afectan a todas las empresas del país

## Solución Propuesta

### Opción 1: Nomencladores Jerárquicos (Recomendada)

Agregar `empresa_id` nullable a las tablas de nomencladores:

```sql
ALTER TABLE tipo_documento_identidad ADD COLUMN empresa_id uuid REFERENCES empresas(id);
```

**Lógica:**
- Si `empresa_id IS NULL` → Nomenclador global del país (todas las empresas lo ven)
- Si `empresa_id` tiene valor → Nomenclador específico de esa empresa (solo esa empresa lo ve)

**Ventajas:**
- Mantiene nomencladores globales por país
- Permite nomencladores específicos por empresa
- Backward compatible
- Flexibilidad máxima

**Query para cargar nomencladores:**
```sql
SELECT * FROM tipo_documento_identidad
WHERE pais_id = $paisId
  AND (empresa_id IS NULL OR empresa_id = $empresaId)
  AND activo = true
ORDER BY empresa_id NULLS FIRST, nombre;
```

### Opción 2: Solo por Empresa

Cambiar `pais_id` por `empresa_id` en todas las tablas.

**Ventajas:**
- Estructura más simple
- Cada empresa tiene control total de sus nomencladores

**Desventajas:**
- Pérdida de nomencladores base por país
- Más trabajo de setup inicial por empresa
- Duplicación de datos

## Cambios Necesarios

### 1. Esquema de Base de Datos

Para cada tabla de nomencladores:
```sql
-- Agregar columna empresa_id
ALTER TABLE tabla_nomenclador ADD COLUMN empresa_id uuid REFERENCES empresas(id);

-- Modificar constraint unique
ALTER TABLE tabla_nomenclador DROP CONSTRAINT unique_codigo_pais;
ALTER TABLE tabla_nomenclador ADD CONSTRAINT unique_codigo_empresa
  UNIQUE NULLS NOT DISTINCT (codigo, pais_id, empresa_id);

-- Crear índice
CREATE INDEX idx_tabla_nomenclador_empresa ON tabla_nomenclador(empresa_id);

-- Actualizar RLS
CREATE POLICY "Usuarios pueden leer nomencladores"
  ON tabla_nomenclador FOR SELECT
  TO authenticated
  USING (
    activo = true AND (
      empresa_id IS NULL OR
      EXISTS (
        SELECT 1 FROM empresas
        WHERE empresas.id = tabla_nomenclador.empresa_id
        AND auth.uid()::text = ANY(empresas.usuarios_asignados)
      )
    )
  );
```

### 2. Servicios Frontend

Actualizar `/frontend/src/services/supabase/nomencladores.ts`:

```typescript
async getTiposDocumentoIdentidad(paisId: string, empresaId?: string): Promise<TipoDocumentoIdentidad[]> {
  let query = supabase
    .from('tipo_documento_identidad')
    .select('*')
    .eq('pais_id', paisId)
    .eq('activo', true);

  if (empresaId) {
    // Cargar nomencladores globales + específicos de la empresa
    query = query.or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);
  } else {
    // Solo nomencladores globales
    query = query.is('empresa_id', null);
  }

  const { data, error } = await query.order('empresa_id nulls first, nombre');

  if (error) throw error;
  return data.map(/* ... */);
}
```

### 3. Hooks

Actualizar `/frontend/src/hooks/useNomencladores.ts`:

```typescript
export const useNomencladores = (paisId: string | undefined, empresaId?: string) => {
  // ...
  const cargarDatos = useCallback(async () => {
    if (!paisId) return;

    // Pasar empresaId a los servicios
    const tiposDocIdentidad = await nomencladoresSupabaseService
      .getTiposDocumentoIdentidad(paisId, empresaId);
    // ...
  }, [paisId, empresaId]);
  // ...
}
```

### 4. Uso en Componentes

Actualizar componentes para pasar `empresaId`:

```typescript
const {
  tiposDocumentoIdentidad,
  // ...
} = useNomencladores(paisActual?.id, empresaActual?.id);
```

## Plan de Migración

1. **Aplicar migración de esquema** - Agregar columnas `empresa_id` a tablas
2. **Actualizar servicios** - Modificar queries para incluir empresa_id
3. **Actualizar hooks** - Agregar parámetro empresaId
4. **Actualizar componentes** - Pasar empresaId al hook
5. **Migrar datos existentes** (opcional) - Copiar nomencladores globales para empresas específicas
6. **Testing** - Verificar que cada empresa vea sus nomencladores correctos

## Impacto

### Archivos a Modificar:
- `/supabase/migrations/` - Nueva migración
- `/frontend/src/services/supabase/nomencladores.ts`
- `/frontend/src/hooks/useNomencladores.ts`
- Todos los componentes que usan `useNomencladores`:
  - `/frontend/src/pages/finanzas/CuentasPorCobrar.tsx`
  - `/frontend/src/pages/finanzas/CuentasPorPagar.tsx`
  - `/frontend/src/components/finanzas/ClienteModal.tsx`
  - `/frontend/src/components/finanzas/ProveedorModal.tsx`
  - `/frontend/src/components/tesoreria/CuentaBancariaModal.tsx`
  - `/frontend/src/components/tesoreria/MovimientoTesoreriaModal.tsx`
  - Y otros componentes relacionados

## Recomendación

**Implementar Opción 1 (Nomencladores Jerárquicos)** porque:
- Ofrece la mejor flexibilidad
- Mantiene nomencladores base por país
- Permite personalización por empresa
- Es escalable y mantiene la estructura actual
