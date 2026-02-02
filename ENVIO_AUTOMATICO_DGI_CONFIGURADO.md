# Sistema de Envío Automático a DGI

## Estado: ✅ CONFIGURADO Y ACTIVO

El sistema de envío automático a DGI está completamente configurado y funcionando para tu empresa.

## Cómo Funciona

### 1. Automático por Defecto
Cuando una nueva factura se crea a través del webhook de Dogcatify:
- ✅ Se crea la factura en el sistema con `dgi_enviada = false`
- ✅ Un trigger de base de datos detecta la nueva factura
- ✅ Llama automáticamente a la edge function `auto-send-dgi`
- ✅ La factura se envía a DGI sin intervención manual
- ✅ Se actualiza el estado `dgi_enviada = true` y se guarda el CAE

### 2. Solo Manual en Caso de Error
Si el envío automático falla por alguna razón:
- ⚠️ La factura quedará con estado DGI "Pendiente"
- 👆 Aparecerá el botón "Enviar DGI" en la interfaz
- ✋ El usuario puede hacer clic para reintentar manualmente

### 3. Control por Empresa
Cada empresa puede habilitar/deshabilitar el envío automático:

```sql
-- Ver estado actual
SELECT
  e.razon_social,
  easd.auto_send_enabled
FROM empresas e
LEFT JOIN empresas_auto_send_dgi easd ON easd.empresa_id = e.id;

-- Habilitar para una empresa
INSERT INTO empresas_auto_send_dgi (empresa_id, auto_send_enabled)
VALUES ('ID_DE_TU_EMPRESA', true)
ON CONFLICT (empresa_id)
DO UPDATE SET auto_send_enabled = true;

-- Deshabilitar para una empresa
UPDATE empresas_auto_send_dgi
SET auto_send_enabled = false
WHERE empresa_id = 'ID_DE_TU_EMPRESA';
```

## Estado Actual

### Tu Empresa: Ayala IT S.A.S
- ✅ **Auto-envío:** HABILITADO
- ✅ **Trigger:** ACTIVO
- ✅ **URL Supabase:** Configurada correctamente
- ✅ **Edge Function:** Desplegada

## Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. WEBHOOK RECIBE ORDEN DE DOGCATIFY                       │
│     POST /functions/v1/webhooks-orders                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SE CREA FACTURA EN BD                                   │
│     INSERT INTO facturas_venta                              │
│     SET dgi_enviada = false                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. TRIGGER SE ACTIVA AUTOMÁTICAMENTE                       │
│     trg_auto_send_dgi                                       │
│     ✓ Verifica auto_send_enabled = true                     │
│     ✓ Verifica dgi_enviada = false                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. TRIGGER LLAMA A EDGE FUNCTION                           │
│     POST /functions/v1/auto-send-dgi                        │
│     body: { facturaId: "xxx" }                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. EDGE FUNCTION PROCESA                                   │
│     ✓ Obtiene datos de factura                              │
│     ✓ Obtiene datos de partner (si existe)                  │
│     ✓ Genera JSON CFE para DGI                              │
│     ✓ Envía a API de DGI                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ACTUALIZA FACTURA CON RESPUESTA DGI                     │
│     UPDATE facturas_venta                                   │
│     SET dgi_enviada = true                                  │
│         dgi_cae = "CAE-177...",                             │
│         dgi_serie = "MA",                                   │
│         dgi_numero = 52                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. ENVÍA PDF POR EMAIL AL CLIENTE                          │
│     ✓ Usa datos del partner como emisor                     │
│     ✓ Incluye precio unitario                               │
│     ✓ Forma de pago legible (Contado/Crédito)             │
│     ✓ Serie correcta de DGI                                 │
│     ✓ QR Code de validación                                │
└─────────────────────────────────────────────────────────────┘
```

## Verificación

### ¿Cómo saber si está funcionando?

1. **Crear una orden de prueba en Dogcatify**
2. **Esperar 2-3 segundos**
3. **Verificar en la página de Facturas**:
   - Estado DGI debe mostrar "✅ Enviada"
   - Debe tener CAE asignado
   - Cliente debe recibir email con PDF

### Logs del Sistema

Para ver los logs del trigger y edge function:
```bash
# Ver logs de la edge function
supabase functions logs auto-send-dgi --tail

# Ver logs del trigger en PostgreSQL
SELECT * FROM pg_stat_statements WHERE query LIKE '%trigger_auto_send_dgi%';
```

## Casos Especiales

### ¿Qué pasa si falla?
1. El trigger **NO bloquea** la creación de la factura
2. La factura se crea correctamente con `dgi_enviada = false`
3. El usuario puede:
   - Hacer clic en "Enviar DGI" manualmente
   - Verificar el error en logs
   - Corregir y reintentar

### ¿Puedo desactivar el auto-envío?
Sí, solo necesitas:
```sql
UPDATE empresas_auto_send_dgi
SET auto_send_enabled = false
WHERE empresa_id = 'TU_EMPRESA_ID';
```

### ¿Puedo activarlo para todas las empresas?
Sí:
```sql
INSERT INTO empresas_auto_send_dgi (empresa_id, auto_send_enabled)
SELECT id, true
FROM empresas
ON CONFLICT (empresa_id)
DO UPDATE SET auto_send_enabled = true;
```

## Configuración Técnica

### Base de Datos
- **Tabla:** `empresas_auto_send_dgi`
- **Trigger:** `trg_auto_send_dgi`
- **Función:** `trigger_auto_send_dgi()`
- **Extensión:** `pg_net` v0.19.5

### Edge Functions
- **Auto-send:** `/functions/v1/auto-send-dgi`
- **Webhook:** `/functions/v1/webhooks-orders`

### URLs
- **Supabase URL:** Configurada en `sistema_configuracion`
- **DGI API:** Configurada en `empresas_config_cfe`

## Soporte

Si tienes problemas:
1. Verifica que `auto_send_enabled = true`
2. Revisa logs de edge function
3. Verifica que la empresa tenga configuración CFE activa
4. Contacta soporte con el ID de la factura

---

**Última actualización:** 2026-02-02
**Estado:** ✅ ACTIVO Y FUNCIONANDO
