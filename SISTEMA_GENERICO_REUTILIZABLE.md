# Sistema Contable Genérico y Reutilizable

## 🎯 Filosofía del Sistema

Este es un **sistema contable multi-empresa y multi-país** que puede adaptarse a diferentes tipos de negocios sin modificar el código base. La flexibilidad se logra mediante:

1. **Configuración por empresa** - Cada empresa puede activar/desactivar módulos
2. **Nomencladores por país** - Impuestos, tipos de documento, etc. configurables
3. **Integración vía API** - Webhooks y APIs para conectar con cualquier sistema externo
4. **Personalización por metadatos** - Campos adicionales sin modificar esquema

---

## 📋 Estructura Universal del Sistema

### 1. 📊 Dashboard
Vista general configurable según el tipo de negocio.

---

### 2. 📝 Contabilidad (Obligatorio - Core del sistema)
Módulo base presente en todos los tipos de empresa:

- **Plan de Cuentas** - Estructura personalizable por país/empresa
- **Asientos Contables** - Registro contable tradicional
- **Libro Mayor** - Detalle de movimientos
- **Balance de Comprobación** - Verificación de saldos
- **Periodos Contables** - Control de cierres

---

### 3. 🛒 Ventas (Opcional - según tipo de negocio)
Para empresas que **venden productos o servicios**:

#### **Clientes**
- Alta de clientes (persona física o jurídica)
- Datos fiscales (documento, RUT/RUC, razón social)
- Contacto (email, teléfono, dirección)
- Condiciones de pago (contado, crédito 30/60/90 días)
- Límite de crédito
- Campo `external_id` para integración con CRM externo

#### **Facturas**
- Factura de contado / crédito
- Items con productos/servicios
- Aplicación de impuestos (IVA, IEPS, etc.)
- Estados: borrador → aprobada → enviada_dgi → cobrada
- Integración con facturación electrónica (DGI, SAT, SUNAT, etc.)
- Genera asiento contable automático

#### **Notas de Crédito / Débito**
- Anulaciones, descuentos, correcciones
- Vinculadas a factura original
- Envío a DGI/SAT

#### **Recibos**
- Registro de cobros
- Aplicación a facturas
- Conciliación con bancos

**Uso en diferentes negocios**:
- **DogCatiFy**: Recibe webhook del CRM, crea factura automática
- **Tienda Retail**: Crea factura manual por cada venta
- **SaaS**: Facturación recurrente automática mensual
- **Freelancer**: Factura por proyecto terminado

---

### 4. 🛍️ Compras (Opcional - para empresas con gastos recurrentes)
Para empresas que **compran insumos, servicios o productos**:

#### **Proveedores**
- Alta de proveedores
- Datos fiscales
- Condiciones de pago
- Categorías (insumos, servicios, aliados, etc.)
- Campo `tipo_proveedor` (tradicional, aliado, socio)

#### **Facturas de Compra**
- Registro de facturas recibidas
- Items con productos/servicios
- Validación de impuestos
- Estados: recibida → aprobada → pagada
- Genera asiento contable

#### **Notas de Crédito**
- Devoluciones a proveedores
- Correcciones

#### **Órdenes de Compra**
- Control de compras planificadas
- Aprobación de compras
- Seguimiento de entregas

**Uso en diferentes negocios**:
- **DogCatiFy**:
  - Proveedores tradicionales (hosting, marketing)
  - Proveedores tipo "aliado" (veterinarias con split de comisión)
- **Restaurante**: Proveedores de alimentos, bebidas, servicios
- **Manufactura**: Proveedores de materias primas
- **Consultora**: Proveedores de software, subcontratistas

---

### 5. 💳 Finanzas (Obligatorio - Core del sistema)

#### **Cuentas por Cobrar**
- Facturas pendientes de cobro
- Gestión de cobranza
- Recordatorios de pago
- Análisis de antigüedad de saldos

#### **Cuentas por Pagar**
- Facturas pendientes de pago
- Priorización de pagos
- Calendario de vencimientos
- Análisis de antigüedad de saldos

#### **Tesorería**
- Cuentas bancarias (múltiples monedas)
- Cajas chicas
- Movimientos (depósitos, retiros, transferencias)
- Proyección de flujo de caja

#### **Conciliación Bancaria**
- Importación de extractos bancarios
- Conciliación automática por monto/fecha
- Conciliación manual
- Ajustes y diferencias

---

### 6. 📈 Análisis (Opcional - para empresas con análisis avanzado)

#### **Centros de Costo**
Estructura jerárquica configurable por empresa:

**Ejemplo 1: DogCatiFy (Marketplace)**
```
ALIADOS
├─ VETERINARIAS
│  ├─ VET_DR_PEREZ
│  └─ VET_CLINICA_NORTE
├─ PELUQUERIAS
│  └─ PEL_MASCOTA_FELIZ
└─ PASEADORES

GASTOS_OPERATIVOS
├─ MARKETING
├─ TECNOLOGIA
└─ ADMINISTRACION
```

**Ejemplo 2: Restaurante**
```
SUCURSALES
├─ SUCURSAL_CENTRO
│  ├─ COCINA
│  ├─ SALON
│  └─ BAR
└─ SUCURSAL_ZONA_ESTE
   ├─ COCINA
   └─ SALON

ADMINISTRACION
└─ GERENCIA
```

**Ejemplo 3: Agencia de Marketing**
```
CLIENTES
├─ CLIENTE_A
│  ├─ PROYECTO_1
│  └─ PROYECTO_2
└─ CLIENTE_B

INTERNO
├─ DESARROLLO_NEGOCIO
└─ ADMINISTRACION
```

#### **Segmentos de Negocio**
- Por producto/servicio
- Por canal de venta
- Por región geográfica
- Por tipo de cliente

#### **Presupuestos**
- Presupuesto anual/mensual
- Por centro de costo
- Presupuesto vs Real
- Alertas de desviaciones

---

### 7. 📊 Reportes (Obligatorio - Core del sistema)

#### Reportes Básicos (todos los negocios):
- **Balance General** - Situación financiera
- **Estado de Resultados** - Rentabilidad
- **Flujo de Efectivo** - Movimientos de caja

#### Reportes Avanzados (opcional):
- **Por Centro de Costo** - Análisis de rentabilidad
- **Por Segmento** - Análisis por línea de negocio
- **Comparativos** - Mes vs mes, año vs año
- **Presupuesto vs Real** - Control presupuestario

---

### 8. ⚙️ Administración (Obligatorio)

#### **Empresas**
- Multi-empresa en la misma instancia
- Configuración independiente por empresa
- **Módulos activos**: Activar/desactivar Ventas, Compras, Análisis
- Plan de cuentas específico por empresa
- Nomencladores por país

#### **Usuarios**
- Roles: Admin, Contador, Usuario
- Permisos por módulo
- Acceso a una o múltiples empresas

#### **Nomencladores** (configuración por país)
- Tipos de documento fiscal
- Impuestos (IVA, IVA reducido, IEPS, etc.)
- Tipos de pago (efectivo, transferencia, tarjeta)
- Monedas
- Bancos

#### **Mapeo de Archivos**
- Configuración de importación de extractos bancarios
- Mapeo de columnas CSV/Excel
- Por banco y país

#### **Impuestos**
- Configuración de impuestos por país
- Tasas vigentes
- Impuestos incluidos/excluidos
- Cuentas contables asociadas

#### **Integraciones**
- Webhooks entrantes (recibir eventos)
- APIs salientes (enviar datos)
- Facturación electrónica (DGI, SAT, SUNAT, DIAN, etc.)
- Pasarelas de pago
- CRM externos

#### **Auditoría**
- Log de cambios en todos los registros
- Quién, cuándo, qué cambió
- Historial de versiones

#### **Multi-moneda**
- Moneda base por empresa
- Tipos de cambio
- Conversión automática
- Reportes en múltiples monedas

---

## 🔄 Casos de Uso: Adaptación a Diferentes Negocios

### Caso 1: DogCatiFy (Marketplace de Servicios)

#### Configuración:
```json
{
  "empresa": "DogCatiFy",
  "pais": "Uruguay",
  "moneda_base": "UYU",
  "modulos_activos": {
    "ventas": true,         // Facturación automática desde CRM
    "compras": true,        // Gastos operativos + comisiones aliados
    "analisis": true,       // Análisis por aliado
    "inventario": false     // No maneja inventario
  },
  "integraciones": {
    "webhook_crm": "https://api.dogcatify.com/webhooks/orders",
    "dgi_facturacion": true,
    "email_cfe": true
  }
}
```

#### Flujo:
1. CRM envía webhook: `order.paid`
2. Sistema crea factura automática (tabla `documentos_venta`)
3. Se envía a DGI
4. Se genera asiento contable
5. Se calcula comisión para el aliado (tabla `proveedores` con tipo "aliado")
6. Se crea liquidación (tabla `documentos_compra`)
7. Al finalizar periodo, se paga al aliado

#### Uso de Proveedores:
- **Tipo "aliado"**: Veterinarias, peluquerías (reciben comisión por ventas)
  - Campo `metadata`: `{"comision_porcentaje": 20, "tipo_servicio": "veterinaria"}`
- **Tipo "proveedor"**: Hosting, marketing, servicios (gastos operativos)

---

### Caso 2: Tienda de Retail

#### Configuración:
```json
{
  "empresa": "Tienda XYZ",
  "pais": "Uruguay",
  "modulos_activos": {
    "ventas": true,         // Facturas a clientes
    "compras": true,        // Compra de mercadería
    "analisis": true,       // Análisis por sucursal
    "inventario": true      // Control de stock
  }
}
```

#### Flujo Ventas:
1. Cliente compra en tienda
2. Cajero crea factura manual en sistema
3. Se envía a DGI
4. Se registra cobro (efectivo/tarjeta)
5. Asiento contable automático

#### Flujo Compras:
1. Se crea orden de compra a proveedor
2. Llega mercadería → se registra factura de compra
3. Se actualiza inventario
4. Se paga al proveedor
5. Asiento contable automático

---

### Caso 3: Consultora / Freelancer

#### Configuración:
```json
{
  "empresa": "Consultora ABC",
  "pais": "Mexico",
  "modulos_activos": {
    "ventas": true,         // Facturas a clientes
    "compras": true,        // Gastos operativos
    "analisis": true,       // Análisis por proyecto
    "inventario": false
  }
}
```

#### Flujo:
1. Se completa proyecto
2. Se crea factura manual al cliente
3. Se asigna centro de costo = proyecto
4. Se envía a SAT (México)
5. Se registra cobro
6. Análisis de rentabilidad por proyecto

---

### Caso 4: Restaurante Multi-sucursal

#### Configuración:
```json
{
  "empresa": "Restaurante DelMar",
  "pais": "Chile",
  "modulos_activos": {
    "ventas": true,         // Ventas por sucursal
    "compras": true,        // Compra de insumos
    "analisis": true,       // Análisis por sucursal
    "inventario": true      // Control de insumos
  }
}
```

#### Centros de Costo:
```
SUCURSAL_CENTRO
├─ COCINA
├─ BAR
└─ SALON

SUCURSAL_ESTE
├─ COCINA
└─ SALON
```

#### Análisis:
- Ventas por sucursal
- Costos de insumos por sucursal
- Rentabilidad por sucursal
- Comparativa entre sucursales

---

## 🔌 Sistema de Integraciones

### Webhooks Entrantes (Sistema recibe eventos)

#### Ejemplo: CRM envía orden pagada
```http
POST /api/webhooks/orders
Content-Type: application/json

{
  "event": "order.paid",
  "order_id": "ORD-12345",
  "customer": {
    "external_id": "CRM-CUST-789",
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "document": "12345678-9"
  },
  "amount": 1000,
  "currency": "UYU",
  "items": [
    {
      "description": "Consulta veterinaria",
      "quantity": 1,
      "unit_price": 1000,
      "tax_rate": 0.22
    }
  ],
  "metadata": {
    "service_type": "veterinaria",
    "partner_id": "VET-001",
    "commission_rate": 0.20
  }
}
```

#### Sistema procesa:
1. Crea/actualiza cliente (busca por `external_id`)
2. Crea factura en estado "borrador"
3. Usuario revisa y aprueba
4. Envía a DGI
5. Genera asiento contable
6. Si hay `partner_id`, crea liquidación al aliado

---

### APIs Salientes (Sistema envía datos)

#### Ejemplo: Enviar factura a DGI Uruguay
```http
POST https://efactura.dgi.gub.uy/api/v1/cfe
Authorization: Bearer {token}

{
  "tipo_documento": "e-ticket",
  "serie": "A",
  "numero": 12345,
  "fecha": "2025-11-19",
  "cliente": {
    "documento": "12345678-9",
    "nombre": "Juan Pérez"
  },
  "items": [...],
  "total": 1000
}
```

---

## 🎛️ Configuración Flexible por Empresa

Cada empresa configura qué módulos necesita:

```javascript
// Tabla: configuracion_empresas
{
  empresa_id: "EMP-001",
  modulos: {
    ventas: {
      activo: true,
      requiere_clientes: true,           // Si false, facturas sin registrar clientes
      facturacion_automatica: true,      // Desde webhook
      envio_dgi_automatico: true,        // Envío automático vs manual
      notificar_cliente_email: true     // Enviar CFE por email
    },
    compras: {
      activo: true,
      requiere_ordenes_compra: false,    // Proceso con/sin órdenes
      aprobacion_multiple: false         // Workflow de aprobación
    },
    analisis: {
      activo: true,
      centros_costo_obligatorios: true,  // Requiere CC en cada transacción
      presupuestos: true
    }
  },
  integraciones: {
    webhook_url: "https://api.empresa.com/webhooks",
    dgi_activo: true,
    dgi_certificado: "...",
    email_smtp: "smtp.empresa.com"
  }
}
```

---

## ✅ Ventajas del Sistema Genérico

1. **Reutilizable**: Un solo código base sirve para múltiples tipos de negocio
2. **Configurable**: Cada empresa activa solo lo que necesita
3. **Escalable**: Soporta multi-empresa, multi-país, multi-moneda
4. **Integrable**: APIs y webhooks para conectar con cualquier sistema
5. **Compliant**: Adaptable a legislación de cada país
6. **Sin Código Custom**: La personalización se hace por configuración, no modificando código

---

## 🚀 Implementación Progresiva

### Fase 1: Core (Obligatorio)
- ✅ Contabilidad (plan de cuentas, asientos, mayor)
- ✅ Finanzas básica (tesorería, conciliación)
- ✅ Reportes básicos (balance, estado resultados)

### Fase 2: Transaccional (según negocio)
- Ventas (clientes, facturas, cobros)
- Compras (proveedores, facturas, pagos)

### Fase 3: Análisis (opcional)
- Centros de costo
- Presupuestos
- Segmentos

### Fase 4: Integraciones (según necesidad)
- Facturación electrónica por país
- Webhooks CRM
- APIs externas

---

## 💡 Conclusión

El sistema está diseñado como una **plataforma contable universal** que puede adaptarse a:
- 🛒 Marketplace (DogCatiFy)
- 🏪 Retail
- 💼 Consultoras
- 🍔 Restaurantes
- 🏭 Manufactura
- 💻 SaaS
- 👨‍💻 Freelancers

La clave está en:
1. **Módulos opcionales** - Activa solo lo que necesitas
2. **Configuración flexible** - Sin modificar código
3. **Metadatos extensibles** - Campos adicionales por empresa
4. **Integraciones abiertas** - APIs y webhooks estándar

**Para DogCatiFy específicamente**: Usarás el sistema genérico pero con:
- Clientes con `external_id` vinculado al CRM
- Proveedores tipo "aliado" con comisiones
- Webhooks para facturación automática
- Centros de costo por aliado/servicio
