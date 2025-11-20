# Webhook API v2 - Sistema de Comisiones y Facturación Partners

## 📋 Cambios Principales

### Mejoras Implementadas:
1. ✅ Soporte multi-item (productos + servicios)
2. ✅ Descuentos (monto y porcentaje)
3. ✅ Comisiones detalladas (monto y porcentaje)
4. ✅ Impuesto de gateway de pago (ej: Mercado Pago)
5. ✅ Sistema de facturación a partners/aliados
6. ✅ Control de comisiones pagadas
7. ✅ Dashboard de ganancias por partner

---

## 🔥 Nuevo Formato JSON

### Evento: order.paid (VERSIÓN 2)

```json
{
  "event": "order.paid",
  "version": "2.0",
  "order_id": "ORD-123474",
  "empresa_id": "a2fb84eb-c91c-4f3e-88c3-4a9c3420009e",
  "crm_customer_id": "CRM-CUST-789",

  "customer": {
    "nombre": "Juan Pérez",
    "documento": "12345678-9",
    "tipo_documento": "CI",
    "email": "juan@email.com",
    "telefono": "+598 99 123 456",
    "direccion": "Av. Principal 123, Montevideo"
  },

  "items": [
    {
      "tipo": "servicio",
      "codigo": "SERV-001",
      "descripcion": "Consulta veterinaria general",
      "cantidad": 1,
      "precio_unitario": 800,
      "descuento_porcentaje": 10,
      "descuento_monto": 80,
      "subtotal": 720,
      "tasa_iva": 0.22,
      "monto_iva": 158.40,
      "total": 878.40,

      "partner": {
        "id": "VET-001",
        "nombre": "Veterinaria Dr. Pérez",
        "documento": "217654321-0",
        "email": "facturacion@vetperez.com",
        "comision_porcentaje": 80,
        "comision_monto": 576
      }
    },
    {
      "tipo": "producto",
      "codigo": "PROD-045",
      "descripcion": "Alimento para perros Royal Canin 15kg",
      "cantidad": 2,
      "precio_unitario": 1500,
      "descuento_porcentaje": 5,
      "descuento_monto": 150,
      "subtotal": 2850,
      "tasa_iva": 0.22,
      "monto_iva": 627,
      "total": 3477,

      "partner": {
        "id": "TIENDA-002",
        "nombre": "Pet Shop Central",
        "documento": "218765432-1",
        "email": "ventas@petshopcentral.com",
        "comision_porcentaje": 70,
        "comision_monto": 1995
      }
    }
  ],

  "totales": {
    "subtotal": 3570,
    "descuento_total": 230,
    "subtotal_con_descuento": 3340,
    "iva_total": 785.40,
    "total_factura": 4355.40,
    "comision_partners_total": 2571,
    "ganancia_plataforma": 999,
    "impuesto_gateway": 130.66
  },

  "payment": {
    "method": "mercadopago",
    "gateway": "mercadopago",
    "transaction_id": "MP-98765",
    "paid_at": "2025-11-19T15:30:00Z",
    "impuesto_gateway_porcentaje": 3,
    "impuesto_gateway_monto": 130.66,
    "neto_recibido": 4224.74
  },

  "metadata": {
    "plataforma": "dogcatify",
    "app_version": "2.1.0",
    "origen_venta": "app_movil",
    "notas": "Cliente frecuente"
  }
}
```

---

## 📊 Estructura de Base de Datos

### Nuevas Tablas Requeridas:

#### 1. `partners_aliados`
```sql
CREATE TABLE partners_aliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  partner_id_externo TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  documento TEXT NOT NULL,
  tipo_documento TEXT DEFAULT 'RUT',
  email TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,

  -- Configuración de comisiones
  comision_porcentaje_default DECIMAL(5,2),

  -- Configuración de facturación
  facturacion_frecuencia TEXT DEFAULT 'quincenal',
  dia_facturacion INTEGER DEFAULT 15,

  -- Datos bancarios
  banco TEXT,
  cuenta_bancaria TEXT,
  tipo_cuenta TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partners_empresa ON partners_aliados(empresa_id);
CREATE INDEX idx_partners_externo ON partners_aliados(partner_id_externo);
```

#### 2. `comisiones_partners`
```sql
CREATE TABLE comisiones_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  partner_id UUID NOT NULL REFERENCES partners_aliados(id),
  factura_venta_id UUID NOT NULL REFERENCES facturas_venta(id),

  order_id TEXT NOT NULL,
  fecha DATE NOT NULL,

  -- Montos
  subtotal_venta DECIMAL(18,2) NOT NULL,
  comision_porcentaje DECIMAL(5,2) NOT NULL,
  comision_monto DECIMAL(18,2) NOT NULL,

  -- Estados
  estado_comision TEXT DEFAULT 'pendiente',
  fecha_facturada TIMESTAMPTZ,
  factura_partner_id UUID REFERENCES facturas_compra(id),

  estado_pago TEXT DEFAULT 'pendiente',
  fecha_pagada TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comisiones_empresa ON comisiones_partners(empresa_id);
CREATE INDEX idx_comisiones_partner ON comisiones_partners(partner_id);
CREATE INDEX idx_comisiones_factura ON comisiones_partners(factura_venta_id);
CREATE INDEX idx_comisiones_estado ON comisiones_partners(estado_comision, estado_pago);
```

#### 3. `lotes_facturacion_partners`
```sql
CREATE TABLE lotes_facturacion_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  partner_id UUID NOT NULL REFERENCES partners_aliados(id),

  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,

  cantidad_ordenes INTEGER DEFAULT 0,
  total_comisiones DECIMAL(18,2) DEFAULT 0,

  factura_compra_id UUID REFERENCES facturas_compra(id),

  estado TEXT DEFAULT 'pendiente',
  fecha_generada TIMESTAMPTZ,
  fecha_pagada TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lotes_empresa ON lotes_facturacion_partners(empresa_id);
CREATE INDEX idx_lotes_partner ON lotes_facturacion_partners(partner_id);
CREATE INDEX idx_lotes_periodo ON lotes_facturacion_partners(periodo_inicio, periodo_fin);
```

---

## 🔄 Flujo Completo del Sistema

### 1. Recepción de Orden Pagada

```
DogCatify → Webhook → Sistema Contable
                         ↓
                    Procesa Items
                         ↓
            ┌────────────┴────────────┐
            ↓                         ↓
    Crea Factura Venta        Registra Comisiones
    (Al cliente final)        (Por cada partner)
            ↓                         ↓
    Genera Asiento            Marca como "pendiente"
    Contable Venta
```

### 2. Registro de Comisiones (Automático)

Por cada item en la orden:
```javascript
{
  partner_id: "VET-001",
  factura_venta_id: "uuid-factura",
  order_id: "ORD-123474",
  fecha: "2025-11-19",
  subtotal_venta: 720,
  comision_porcentaje: 80,
  comision_monto: 576,
  estado_comision: "pendiente",  // ← No facturado
  estado_pago: "pendiente"        // ← No pagado
}
```

### 3. Generación de Facturas a Partners (Cada 15 días)

**Job Programado:**
```sql
-- Busca comisiones pendientes de facturar
SELECT
  partner_id,
  SUM(comision_monto) as total,
  COUNT(*) as cantidad,
  MIN(fecha) as desde,
  MAX(fecha) as hasta
FROM comisiones_partners
WHERE estado_comision = 'pendiente'
  AND fecha <= CURRENT_DATE - INTERVAL '15 days'
GROUP BY partner_id
```

**Acción:**
```
Por cada Partner con comisiones pendientes:
  1. Crear Lote de Facturación
  2. Crear Factura de Compra (proveedor = partner)
  3. Actualizar comisiones:
     - estado_comision = 'facturada'
     - fecha_facturada = NOW()
     - factura_partner_id = nueva_factura_id
```

### 4. Dashboard de Comisiones

**Vista para Administrador:**
```
┌─────────────────────────────────────────────────┐
│ COMISIONES POR PARTNER                          │
├─────────────────────────────────────────────────┤
│ Partner            │ Pendiente │ Facturado │ ... │
├────────────────────┼───────────┼───────────┼─────┤
│ Vet Dr. Pérez      │ $5,760    │ $12,300   │ Ver │
│ Pet Shop Central   │ $8,450    │ $23,100   │ Ver │
│ Grooming Deluxe    │ $2,100    │ $6,800    │ Ver │
└─────────────────────────────────────────────────┘

Acciones:
- [Generar Facturas Pendientes]
- [Exportar Reporte]
```

**Vista Detalle Partner:**
```
┌─────────────────────────────────────────────────┐
│ VETERINARIA DR. PÉREZ                           │
├─────────────────────────────────────────────────┤
│ Total Ganado (mes actual): $8,450               │
│ Pendiente de Facturar: $5,760                   │
│ Facturado sin Pagar: $2,690                     │
│ Pagado: $12,300                                 │
├─────────────────────────────────────────────────┤
│ ÓRDENES                                         │
├──────────┬──────────┬──────────┬───────────────┤
│ Orden    │ Fecha    │ Comisión │ Estado        │
├──────────┼──────────┼──────────┼───────────────┤
│ ORD-123  │ 15/11/25 │ $576     │ ✓ Facturado   │
│ ORD-124  │ 16/11/25 │ $640     │ ⏳ Pendiente  │
│ ORD-125  │ 17/11/25 │ $890     │ ⏳ Pendiente  │
└──────────┴──────────┴──────────┴───────────────┘
```

---

## 💰 Asientos Contables Generados

### Al recibir orden pagada:

#### Asiento 1: Venta al Cliente
```
DEBE:  Cuentas por Cobrar - Clientes     $4,355.40
HABER: Ventas                             $3,570.00
HABER: IVA por Pagar                      $  785.40
```

#### Asiento 2: Comisión Partners (Gasto)
```
DEBE:  Gastos - Comisiones Partners      $2,571.00
HABER: Cuentas por Pagar - Partners      $2,571.00
```

#### Asiento 3: Impuesto Gateway
```
DEBE:  Gastos - Comisiones Financieras   $  130.66
HABER: Bancos                             $  130.66
```

### Al cobrar (marcar como pagada):
```
DEBE:  Bancos                             $4,224.74
HABER: Cuentas por Cobrar - Clientes     $4,355.40
```

### Al generar factura a Partner (quincenal):
```
DEBE:  Cuentas por Pagar - Partners      $2,571.00
HABER: Bancos (cuando se pague)          $2,571.00
```

---

## 🔧 Configuración de Partners

### Frecuencias de Facturación:
- `semanal`: Cada 7 días
- `quincenal`: Cada 15 días (default)
- `mensual`: Último día del mes
- `bimensual`: Cada 2 meses

### Estados de Comisión:
- `pendiente`: No facturada
- `facturada`: Incluida en factura a partner
- `pagada`: Partner recibió el pago
- `anulada`: Orden cancelada, comisión anulada

---

## 📱 Endpoints para DogCatify

### Consultar Comisiones de un Partner
```
GET /api/partners/{partner_id}/comisiones
  ?desde=2025-11-01
  &hasta=2025-11-30
  &estado=pendiente
```

### Consultar Factura de Partner
```
GET /api/partners/{partner_id}/facturas/{factura_id}
```

---

## ✅ Checklist de Implementación

- [ ] Crear migraciones de BD
- [ ] Crear tabla `partners_aliados`
- [ ] Crear tabla `comisiones_partners`
- [ ] Crear tabla `lotes_facturacion_partners`
- [ ] Actualizar webhook para procesar items[]
- [ ] Implementar registro de comisiones
- [ ] Implementar job de facturación quincenal
- [ ] Crear página de Partners
- [ ] Crear dashboard de comisiones
- [ ] Generar asientos contables de comisiones
- [ ] Implementar marcado de comisión cobrada
- [ ] Crear reportes para partners

---

**Versión**: 2.0
**Fecha**: 2025-11-20
