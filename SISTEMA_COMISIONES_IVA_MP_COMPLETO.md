# Sistema de Comisiones con IVA y Mercado Pago - Implementación Completa

## Resumen Ejecutivo

Se ha implementado un sistema contable completo que maneja correctamente:

1. **Comisiones de Partners con IVA incluido** - El porcentaje acordado incluye el IVA
2. **Comisiones de Mercado Pago** - Se registran como gasto operativo
3. **Trazabilidad completa** - Todos los flujos de dinero están correctamente contabilizados

---

## 1. Comisiones de Partners (IVA Incluido)

### Cálculo

Cuando se acuerda una comisión del **5%**, ese 5% INCLUYE el IVA:

```
Venta sin IVA: $5,016.39
Comisión acordada: 5% = $250.82 (CON IVA INCLUIDO)

Desglose:
- Comisión sin IVA: $250.82 / 1.22 = $205.59
- IVA (22%): $45.23
- Total a pagar al partner: $250.82
```

### Campos en Base de Datos

**Tabla: `comisiones_partners`**
- `comision_monto`: **$250.82** (total con IVA - lo que se le paga al partner)
- `comision_sin_iva`: **$205.59** (comisión neta)
- `iva_monto`: **$45.23** (IVA que el partner debe declarar)

### Asiento Contable (Factura de Compra al Partner)

Cuando el partner factura sus comisiones:

```
DEBE  6402 Comisiones Partners          $205.59
DEBE  2111 IVA Crédito Fiscal           $45.23
    HABER  2211 Proveedores              $250.82
```

---

## 2. Comisiones de Mercado Pago

### Problema Contable

Si Mercado Pago cobra 5% de comisión:
- Factura al cliente: **$6,120**
- Comisión MP (5%): **-$306**
- Ingreso real a cuenta: **$5,814**

Sin registrar la comisión MP, el sistema no cuadra con el banco.

### Solución Implementada

**Tabla: `facturas_venta`**
- `total`: $6,120 (lo que facturamos al cliente)
- `comision_mp_porcentaje`: 5.00
- `comision_mp_monto`: $306
- `ingreso_neto`: $5,814 (lo que realmente ingresa)

**Nueva Cuenta Contable:**
- `630501` - Gastos Comisiones Mercado Pago

### Asiento Contable (Cobro con Comisión MP)

Cuando se cobra una factura con comisión de Mercado Pago:

```
DEBE  1121 Banco MercadoPago             $5,814  (ingreso real)
DEBE  6305 Gastos Comisión MP            $306    (gasto por comisión)
    HABER  1212 Cuentas por Cobrar       $6,120  (total facturado)
```

**Resultado:** El sistema cuadra perfectamente con el saldo bancario real.

---

## 3. Configuración por Empresa

### Activar Comisión MP Automática

**Tabla: `empresas_comision_mp`**

```sql
INSERT INTO empresas_comision_mp (empresa_id, activo, porcentaje, descripcion)
VALUES (
  'id-de-tu-empresa',
  true,  -- Activar cálculo automático
  5.00,  -- 5% de comisión
  'Comisión estándar de Mercado Pago'
);
```

Cuando `activo = true`, el webhook calculará automáticamente:
- `comision_mp_monto` en cada factura
- `ingreso_neto` real

---

## 4. Flujo Completo de una Venta

### Ejemplo: Venta con Partner y Mercado Pago

**Datos de la venta:**
- Producto: Alimento para perros - $5,016.39 (sin IVA)
- IVA 22%: $1,103.61
- **Total factura:** $6,120.00
- Partner: Animales Felices (5% de comisión)
- Pasarela: Mercado Pago (5% de comisión)

### 1. Se crea la factura (Webhook)

```
Factura A-00000001
- Subtotal: $5,016.39
- IVA: $1,103.61
- Total: $6,120.00
- Comisión MP: 5% = $306.00
- Ingreso neto: $5,814.00
```

### 2. Se registra comisión del partner

```
Comisión Partner "Animales Felices"
- Subtotal venta: $5,016.39
- Porcentaje: 5%
- Comisión total (con IVA): $250.82
  * Sin IVA: $205.59
  * IVA: $45.23
- Estado: Pendiente de facturación
```

### 3. Asiento contable de la venta

```
ASI-00001 - Factura de Venta A-00000001
DEBE  1212 Cuentas por Cobrar            $6,120.00
    HABER  7011 Ventas                    $5,016.39
    HABER  2113 IVA por Pagar             $1,103.61

DEBE  1213 Comisiones por Cobrar         $250.82
    HABER  7012 Ingresos Comisión App    $250.82
```

### 4. Cliente paga vía Mercado Pago

```
Movimiento bancario:
- Ingreso en cuenta Banco MP: $5,814.00 ✅

Asiento de cobro:
DEBE  1121 Banco MercadoPago              $5,814.00  (lo que ingresa)
DEBE  6305 Gastos Comisión MP             $306.00    (gasto MP)
    HABER  1212 Cuentas por Cobrar        $6,120.00  (total factura)
```

### 5. Partner emite factura de comisión

Cuando el partner factura sus $250.82:

```
Factura de Compra COM-00000001
- Proveedor: Animales Felices
- Subtotal: $205.59
- IVA: $45.23
- Total: $250.82

Asiento:
DEBE  6402 Comisiones Partners            $205.59
DEBE  2111 IVA Crédito Fiscal             $45.23
    HABER  2211 Cuentas por Pagar         $250.82
```

---

## 5. Cuadratura Contable

### Saldos Finales

**Activos:**
- Banco MercadoPago: +$5,814.00 ✅

**Pasivos:**
- Cuentas por Pagar (Partner): +$250.82 ✅
- IVA por Pagar: +$1,103.61 ✅

**Ingresos:**
- Ventas: +$5,016.39 ✅
- Comisiones App: +$250.82 ✅

**Gastos:**
- Comisión MP: +$306.00 ✅
- Comisión Partner: +$205.59 ✅

**IVA:**
- IVA por Pagar: +$1,103.61
- IVA Crédito Fiscal: +$45.23
- **IVA Neto a pagar a DGI:** $1,058.38 ✅

### Resultado Económico

```
Ingresos:
  Ventas:                 $5,016.39
  Comisiones App:         $250.82
  TOTAL INGRESOS:         $5,267.21

Gastos:
  Comisión MP:            $306.00
  Comisión Partner:       $205.59
  TOTAL GASTOS:           $511.59

UTILIDAD BRUTA:           $4,755.62 ✅
```

---

## 6. Ventajas del Sistema

1. **Trazabilidad Total:** Cada peso está contabilizado
2. **Cuadratura Bancaria:** El saldo del banco coincide con contabilidad
3. **IVA Correcto:** El partner paga IVA sobre su comisión
4. **Gasto MP Visible:** Se ve claramente el costo de usar MP
5. **Reportes Precisos:** Los estados financieros son exactos

---

## 7. Configuración Inicial

### Paso 1: Activar Comisión MP para tu empresa

```sql
-- Verificar si la cuenta de gasto ya existe
SELECT * FROM plan_cuentas WHERE codigo = '630501';

-- Activar comisión MP automática (5%)
INSERT INTO empresas_comision_mp (empresa_id, activo, porcentaje)
VALUES ('TU-EMPRESA-ID', true, 5.00)
ON CONFLICT (empresa_id) DO UPDATE
SET activo = true, porcentaje = 5.00;
```

### Paso 2: Configurar cuenta bancaria de Mercado Pago

```sql
-- Debe existir una cuenta bancaria para MP
SELECT * FROM cuentas_bancarias
WHERE nombre ILIKE '%mercado%pago%';
```

### Paso 3: Probar con una orden de prueba

Enviar webhook con:
- `payment_status: "paid"` o `"approved"`
- La comisión MP se calculará automáticamente
- El ingreso neto se registrará correctamente

---

## 8. Reportes Disponibles

### Reporte de Comisiones Pagadas

```sql
SELECT
  p.razon_social as partner,
  COUNT(*) as cantidad_ventas,
  SUM(c.subtotal_venta) as total_ventas,
  SUM(c.comision_sin_iva) as comisiones_sin_iva,
  SUM(c.iva_monto) as iva_comisiones,
  SUM(c.comision_monto) as total_a_pagar
FROM comisiones_partners c
JOIN partners_aliados p ON c.partner_id = p.id
WHERE c.estado_pago = 'pagada'
GROUP BY p.id, p.razon_social;
```

### Reporte de Gastos MP

```sql
SELECT
  DATE_TRUNC('month', fecha_emision) as mes,
  COUNT(*) as facturas,
  SUM(total) as total_facturado,
  SUM(comision_mp_monto) as comisiones_mp,
  SUM(ingreso_neto) as ingreso_neto_real,
  ROUND(SUM(comision_mp_monto) / SUM(total) * 100, 2) as porcentaje_promedio
FROM facturas_venta
WHERE comision_mp_monto > 0
GROUP BY DATE_TRUNC('month', fecha_emision)
ORDER BY mes DESC;
```

---

## 9. Preguntas Frecuentes

**Q: ¿Por qué la comisión del partner incluye IVA?**
A: Porque es un servicio que presta el partner y debe facturar con IVA como cualquier proveedor.

**Q: ¿Se puede desactivar el cálculo automático de comisión MP?**
A: Sí, poniendo `activo = false` en `empresas_comision_mp`.

**Q: ¿Qué pasa si MP cambia su comisión?**
A: Actualizar el porcentaje en `empresas_comision_mp` y afectará solo las nuevas ventas.

**Q: ¿Cómo registro comisiones MP de ventas pasadas?**
A: Puedes actualizar manualmente los campos `comision_mp_porcentaje` y `comision_mp_monto` en facturas existentes.

---

## Estado de Implementación

✅ Base de datos actualizada con nuevos campos
✅ Webhook calcula comisión MP automáticamente
✅ Comisiones de partners incluyen IVA correctamente
✅ Asientos contables ajustados para MP
✅ Cuenta contable 630501 creada
✅ Tabla de configuración por empresa
✅ Edge functions desplegadas

**Sistema 100% operativo y listo para producción.**
