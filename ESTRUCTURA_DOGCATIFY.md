# Estructura del Sistema Contable para DogCatiFy

## 🎯 Filosofía del Sistema

Este sistema contable está diseñado específicamente para el modelo de negocio de **DogCatiFy**, que es un **marketplace de servicios para mascotas** donde:

- Los **clientes finales** (dueños de mascotas) están en la **App de Mascotas / CRM**
- Los **aliados** (veterinarias, peluquerías, paseadores) son los **proveedores de servicios**
- DogCatiFy factura a los clientes y paga comisiones a los aliados

---

## 📋 Estructura del Menú Optimizada

### 1. 📊 Dashboard
Vista general de:
- Ingresos del día/mes
- Comisiones pendientes de pago a aliados
- Facturación pendiente de envío a DGI
- Cuentas por pagar
- Efectivo disponible

---

### 2. 📝 Contabilidad
**Objetivo**: Registros contables tradicionales

- **Plan de Cuentas** - Estructura de cuentas contables
- **Asientos Contables** - Movimientos contables
- **Libro Mayor** - Detalle de movimientos por cuenta
- **Balance de Comprobación** - Verificación de saldos
- **Periodos Contables** - Control de cierres mensuales/anuales

---

### 3. 🧾 Facturación
**Objetivo**: Facturación electrónica a clientes finales (integración DGI)

#### Flujo de Facturación:
```
Orden confirmada en App → Sistema Contable recibe webhook →
Genera factura (borrador) → Usuario aprueba → Envía a DGI →
Factura aprobada → Genera asiento contable → Envía CFE al cliente
```

**Pantallas**:
- **Facturas Emitidas** - Todas las facturas a clientes finales
  - Estados: borrador, pendiente_envio, enviado_dgi, aprobado_dgi, pagado
  - Integración automática con DGI (e-ticket, e-factura)
  - Vinculación con `crm_order_id`
  - Generación de asiento contable automático

- **Notas de Crédito** - Devoluciones/anulaciones
  - NC de facturas con errores
  - NC por cancelaciones de servicio
  - Envío automático a DGI

- **Envío a DGI** - Monitor de envíos
  - Cola de documentos pendientes
  - Reintentos automáticos
  - Logs de errores DGI
  - Estado de CFE

**Datos que NO están aquí**:
- ❌ Clientes (están en la App de Mascotas)
- ❌ Productos/Servicios (están en el CRM)
- ❌ Precios (se manejan en el marketplace)

---

### 4. 🤝 Aliados (Proveedores de Servicios)
**Objetivo**: Gestión de veterinarias, peluquerías, paseadores, etc.

#### Modelo de Negocio:
```
Cliente paga $1000 por servicio →
DogCatiFy retiene comisión 20% ($200) →
Aliado recibe 80% ($800)
```

**Pantallas**:

- **Gestión de Aliados**
  - Alta de veterinarias, peluquerías, etc.
  - Datos fiscales (RUT, razón social, dirección)
  - Tipo de aliado (veterinaria, peluquería, paseador)
  - Porcentaje de comisión por aliado
  - Centro de costo asignado
  - Estado (activo/inactivo)
  - Datos bancarios para pagos

- **Liquidaciones**
  - Liquidación por periodo (semanal/quincenal/mensual)
  - Servicios prestados por el aliado
  - Total servicios: $5,000
  - Comisión DogCatiFy (20%): $1,000
  - A pagar al aliado: $4,000
  - Detalle por servicio/orden
  - Retenciones (si aplica)

- **Pagos a Aliados**
  - Registro de pagos realizados
  - Transferencia bancaria / Efectivo / Cheque
  - Comprobante de pago
  - Generación de asiento contable
  - Conciliación con liquidaciones

- **Comisiones**
  - Análisis de comisiones por aliado
  - Comisiones por tipo de servicio
  - Tendencias de comisiones
  - Comparativa entre aliados

**Tablas Utilizadas**:
- `proveedores` (pero con alias "aliados" en la UI)
- `documentos_compra` (liquidaciones a aliados)
- Se podría agregar `liquidaciones_aliados` específica si se requiere

---

### 5. 💰 Gastos (Proveedores Tradicionales)
**Objetivo**: Gastos operativos de DogCatiFy (NO aliados)

Ejemplos:
- Hosting/Servidores
- Marketing digital
- Servicios contables
- Alquiler de oficina
- Sueldos empleados internos
- Pasarela de pagos (MercadoPago, PayPal)

**Pantallas**:
- **Proveedores** - Proveedores de gastos operativos
- **Facturas de Gastos** - Registro de facturas recibidas
- **Pagos Realizados** - Pagos a proveedores

**Diferencia con Aliados**:
- Aliados = Proveedores de servicios que generan ingresos
- Gastos = Proveedores que generan costos operativos

---

### 6. 💳 Finanzas
**Objetivo**: Control de flujo de efectivo

- **Cuentas por Cobrar** - Facturas pendientes de cobro de clientes
  - (Mayormente gestionado por pasarela de pago automática)

- **Cuentas por Pagar** - Deudas con aliados y proveedores
  - Liquidaciones pendientes a aliados
  - Facturas pendientes a proveedores

- **Tesorería** - Cuentas bancarias y movimientos
  - Saldos de cuentas
  - Transferencias entre cuentas
  - Depósitos y retiros

- **Conciliación Bancaria** - Conciliación con extractos

---

### 7. 📈 Análisis
**Objetivo**: Análisis de rentabilidad por segmento

#### Estructura de Centros de Costo para DogCatiFy:

```
ALIADO_VET_001 - Veterinaria Dr. Pérez
  ├─ SUCURSAL_MVD - Montevideo
  │  ├─ SERVICIO_CONSULTA - Consultas Veterinarias
  │  ├─ SERVICIO_CIRUGIA - Cirugías
  │  └─ SERVICIO_VACUNA - Vacunación
  └─ SUCURSAL_CDE - Ciudad de la Costa
     ├─ SERVICIO_CONSULTA
     └─ SERVICIO_VACUNA

ALIADO_PEL_002 - Peluquería Mascota Feliz
  ├─ SERVICIO_CORTE - Corte de pelo
  ├─ SERVICIO_BANO - Baño
  └─ SERVICIO_ESTETICA - Estética completa

ALIADO_PAS_003 - Paseadores Unidos
  └─ SERVICIO_PASEO - Paseos

GASTOS_OPERATIVOS
  ├─ MARKETING
  ├─ TECNOLOGIA
  └─ ADMINISTRACION
```

**Pantallas**:

- **Centros de Costo**
  - Crear/editar centros de costo
  - Estructura jerárquica
  - Asignar responsable
  - Presupuestos por centro

- **Segmentos de Negocio**
  - Por tipo de servicio (veterinaria, peluquería, paseos)
  - Por ubicación geográfica
  - Por tipo de cliente (VIP, regular)

- **Presupuestos**
  - Presupuesto vs Real por centro de costo
  - Presupuesto anual/mensual
  - Alertas de desviaciones

---

### 8. 📊 Reportes

- **Balance General** - Activos, Pasivos, Patrimonio
- **Estado de Resultados** - Ingresos, Gastos, Utilidad
- **Flujo de Efectivo** - Entradas y salidas de efectivo
- **Por Centro de Costo** - Análisis de rentabilidad
  - Estado de resultados por aliado
  - Comisiones vs gastos por aliado
  - Servicios más rentables

---

### 9. ⚙️ Administración

- **Empresas** - Si DogCatiFy se expande a múltiples países
- **Usuarios** - Usuarios del sistema contable
- **Nomencladores** - Configuración por país
- **Mapeo de Archivos** - Importación de extractos
- **Impuestos** - Configuración de IVA y otros impuestos
- **Integraciones** - APIs y webhooks
  - Integración con App de Mascotas (webhook orders)
  - Integración con DGI (envío CFE)
  - Integración con pasarelas de pago
- **Auditoría** - Trazabilidad de cambios
- **Multi-moneda** - Si expanden a otros países

---

## 🔄 Flujos Principales

### Flujo 1: Cliente paga un servicio

```
1. Cliente reserva servicio de peluquería ($1,000) en App de Mascotas
2. Cliente paga con tarjeta (MercadoPago)
3. App envía webhook al Sistema Contable:
   {
     event: "order.paid",
     order_id: "ORD-12345",
     amount: 1000,
     service_type: "peluqueria",
     partner_id: "ALIADO_PEL_002",
     commission_rate: 0.20
   }
4. Sistema Contable:
   a. Genera factura en estado "borrador" (documentos_venta)
   b. Usuario revisa y aprueba
   c. Envía a DGI → Estado "enviado_dgi"
   d. DGI aprueba → Estado "aprobado_dgi"
   e. Genera asiento contable:
      Debe: Banco $1,000
      Haber: Ingresos por servicios $820
      Haber: IVA $180
   f. Crea liquidación a aliado:
      Debe: Costo de servicios $655
      Debe: IVA $145
      Haber: Cuentas por pagar aliado $800
   g. Envía CFE al cliente por email
```

### Flujo 2: Pago a Aliado

```
1. Fin de quincena → Sistema genera liquidación
2. Liquidación muestra:
   - Total servicios: $5,000
   - Comisión DogCatiFy (20%): $1,000
   - Subtotal aliado: $4,000
   - Retenciones: $0
   - Neto a pagar: $4,000
3. Tesorería aprueba pago
4. Se registra transferencia bancaria
5. Sistema genera asiento:
   Debe: Cuentas por pagar aliado $4,000
   Haber: Banco $4,000
6. Se marca liquidación como "pagada"
7. (Opcional) Aliado recibe notificación de pago
```

### Flujo 3: Gasto Operativo

```
1. Llega factura de proveedor (ej: MercadoPago comisión $100)
2. Usuario registra en Gastos > Facturas de Gastos
3. Asigna centro de costo: GASTOS_OPERATIVOS > TECNOLOGIA
4. Sistema genera asiento:
   Debe: Gastos de pasarela $91
   Debe: IVA compras $9
   Haber: Cuentas por pagar proveedor $100
5. Al pagar:
   Debe: Cuentas por pagar proveedor $100
   Haber: Banco $100
```

---

## 📊 Reportes Clave para DogCatiFy

### 1. Estado de Resultados Mensual

```
INGRESOS
├─ Ingresos por Servicios Veterinarios    $50,000
├─ Ingresos por Servicios Peluquería      $30,000
├─ Ingresos por Servicios Paseos          $20,000
└─ TOTAL INGRESOS                        $100,000

COSTO DE SERVICIOS (Comisiones a Aliados)
├─ Costo Servicios Veterinarios          ($40,000)  80%
├─ Costo Servicios Peluquería            ($24,000)  80%
├─ Costo Servicios Paseos                ($16,000)  80%
└─ TOTAL COSTO DE SERVICIOS              ($80,000)

UTILIDAD BRUTA                            $20,000   20%

GASTOS OPERATIVOS
├─ Marketing                              ($5,000)
├─ Tecnología (hosting, pasarelas)        ($3,000)
├─ Sueldos                                ($7,000)
├─ Administración                         ($2,000)
└─ TOTAL GASTOS OPERATIVOS               ($17,000)

UTILIDAD OPERATIVA                         $3,000    3%
```

### 2. Análisis por Centro de Costo

```
Aliado: Veterinaria Dr. Pérez
├─ Ingresos generados:     $50,000
├─ Comisión a aliado:      $40,000
├─ Comisión DogCatiFy:     $10,000    20%
├─ Cantidad servicios:     150
└─ Ticket promedio:        $333

Ranking de Aliados por Rentabilidad:
1. Veterinaria Dr. Pérez   $10,000 (20%)
2. Peluquería Mascota      $6,000  (20%)
3. Paseadores Unidos       $4,000  (20%)
```

---

## 🎯 Próximos Pasos de Desarrollo

### Prioridad 1: Módulos Críticos
1. ✅ **Dashboard** (ya existe, actualizar con nueva info)
2. **Gestión de Aliados** (alta de veterinarias, peluquerías, etc.)
3. **Liquidaciones a Aliados** (calcular y pagar comisiones)
4. **Facturación DGI** (envío automático de facturas)

### Prioridad 2: Integración
5. **Webhook Handler** (recibir eventos del CRM)
6. **Cliente DGI** (integración con facturación electrónica)
7. **Notificaciones** (emails con CFE a clientes)

### Prioridad 3: Análisis
8. **Centros de Costo** (análisis por aliado)
9. **Reportes** (estado de resultados por centro)
10. **Auditoría** (trazabilidad completa)

---

## 💡 Notas Importantes

### ¿Por qué NO hay módulo de Clientes?
- Los clientes están en la **App de Mascotas**
- El sistema contable recibe webhook con datos mínimos
- Solo necesitamos: nombre, documento, email para la factura
- No duplicamos datos del CRM

### ¿Qué son los "Aliados"?
- Veterinarias, peluquerías, paseadores
- En términos contables son "Proveedores"
- Pero en el negocio son "Aliados/Partners"
- Por eso usamos tabla `proveedores` con UI de "Aliados"

### ¿Cómo se calculan las comisiones?
- Cada aliado tiene un `porcentaje_comision` (ej: 20%)
- Al crear liquidación, se calcula:
  - Total servicios prestados
  - Comisión DogCatiFy (20%)
  - Neto a pagar al aliado (80%)

### ¿Se pueden tener comisiones diferentes por aliado?
- Sí, se puede configurar por aliado
- Ejemplo: Veterinaria premium 15%, peluquería estándar 20%
- Se guarda en campo `metadata` del aliado

---

## ✅ Conclusión

El sistema está diseñado para:
- ✅ Facturar automáticamente a clientes desde el CRM
- ✅ Calcular y pagar comisiones a aliados
- ✅ Controlar gastos operativos
- ✅ Analizar rentabilidad por aliado/servicio
- ✅ Cumplir con DGI Uruguay
- ✅ Escalar a múltiples países

La estructura de menú refleja el modelo de negocio real de DogCatiFy, no un sistema contable genérico.
