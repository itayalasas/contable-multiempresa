# ✅ Solución Completa: Autenticación y Permisos

## 🔍 Problemas Identificados y Resueltos

### Problema 1: Ciclo de Redirección en Login

**Síntomas:**
- Usuario se autentica en sistema externo
- Redirige a la app con código
- La app redirige inmediatamente de vuelta al login
- Ciclo infinito

**Causa Raíz:**
El código de autenticación nunca se intercambiaba por tokens. El flujo era:
1. Sistema externo redirige con `?code=XXX&state=authenticated`
2. AuthContext detectaba el código
3. **Limpiaba la URL pero NUNCA llamaba a `exchangeCodeForToken`**
4. Verificaba `isAuthenticated()` → retornaba `false`
5. Callback redirigía al login

**Solución Aplicada:**

**Archivo**: `/src/context/AuthContext.tsx`

Agregada lógica para intercambiar código por token:

```typescript
if (code && state === 'authenticated') {
  console.log('🔐 Código de autenticación detectado, intercambiando por token...');

  try {
    const authResponse = await AuthService.exchangeCodeForToken(code);
    console.log('✅ Token obtenido exitosamente');

    AuthService.saveSession(authResponse.data);
    console.log('✅ Sesión guardada');

    window.history.replaceState({}, document.title, window.location.pathname);

    const authUser = authResponse.data.user;
    await syncUserWithDatabase(authUser);

    return; // ← Importante: Retornar aquí para no continuar con el flujo
  } catch (exchangeError) {
    console.error('❌ Error intercambiando código por token:', exchangeError);
    setError('Error al validar la autenticación');
    setIsLoading(false);
    return;
  }
}
```

**Archivo**: `/src/pages/Callback.tsx`

Mejorado para esperar más tiempo y solo redirigir al login si hay error:

```typescript
// Esperar 2 segundos en lugar de 1
await new Promise(resolve => setTimeout(resolve, 2000));

// Solo redirigir al login si hay error explícito
if (error) {
  console.log('❌ Error en autenticación:', error);
  setTimeout(() => {
    navigate('/login', { replace: true });
  }, 1500);
} else {
  // Si no hay error pero tampoco está autenticado, seguir esperando
  console.log('⏳ Esperando autenticación...');
}
```

### Problema 2: Edge Function Faltante

**Síntomas:**
- Error al intercambiar código: "Failed to fetch"
- 404 Not Found en el endpoint

**Causa Raíz:**
El edge function `auth-exchange-code` no existía en el proyecto.

**Solución Aplicada:**

**Archivo**: `/supabase/functions/auth-exchange-code/index.ts`

Creado edge function que:
1. Recibe `code` y `application_id`
2. Llama al servidor de autenticación externo
3. Intercambia el código por tokens
4. Retorna los tokens y datos del usuario

### Problema 3: Permisos No Reconocidos

**Síntomas:**
- Sidebar solo mostraba Dashboard
- Usuario tenía permisos en metadata pero no se aplicaban

**Causa Raíz:**
Los permisos estaban configurados por **categorías principales** (`contabilidad`, `finanzas`, etc.) pero el código buscaba permisos de **módulos específicos** (`plan-cuentas`, `asientos`, etc.).

**Solución Aplicada:**

**Archivo**: `/src/hooks/usePermissions.ts`

Agregada **herencia de permisos**: cuando busca un submódulo, verifica automáticamente la categoría padre:

```typescript
const moduleToParent: Partial<Record<ModuleSlug, ModuleSlug>> = {
  'plan-cuentas': 'contabilidad',      // ← plan-cuentas hereda de contabilidad
  'asientos': 'contabilidad',
  'mayor': 'contabilidad',
  'clientes': 'ventas',
  'facturas': 'ventas',
  'tesoreria': 'finanzas',
  'cuentas-cobrar': 'finanzas',
  // ... etc
};

const parentModule = moduleToParent[module];
if (parentModule) {
  const parentPermissions = permissions[parentModule] || [];
  return parentPermissions.length > 0;
}
```

## 🚀 Pasos para Aplicar la Solución

### Paso 1: Código Frontend (✅ Ya Aplicado)

Los cambios en el código ya están compilados y listos:
- `/src/context/AuthContext.tsx` - Intercambio de código por token
- `/src/pages/Callback.tsx` - Mejor manejo de redirecciones
- `/src/hooks/usePermissions.ts` - Herencia de permisos

### Paso 2: Desplegar Edge Function

**CRÍTICO**: Debes desplegar el edge function `auth-exchange-code` a Supabase.

**Opción A: Desde la terminal (si tienes Supabase CLI)**

```bash
supabase functions deploy auth-exchange-code
```

**Opción B: Desde el panel de Supabase**

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a "Edge Functions" en el menú lateral
3. Haz clic en "New function"
4. Nombre: `auth-exchange-code`
5. Copia el contenido de `/supabase/functions/auth-exchange-code/index.ts`
6. Haz clic en "Deploy"

### Paso 3: Configurar Variables de Entorno

Asegúrate de que estas variables estén configuradas en tu `.env`:

```env
VITE_AUTH_URL=https://auth-contaempresa.netlify.app
VITE_AUTH_APP_ID=app_b9b5f22b-cda
VITE_AUTH_API_KEY=ak_production_f3307c60cd281c8e8ff629d7ab3059e5
VITE_AUTH_CALLBACK_URL=https://tu-dominio.com/callback
VITE_AUTH_EXCHANGE_URL=https://tu-proyecto.supabase.co/functions/v1/auth-exchange-code
```

**Importante**: Reemplaza `tu-proyecto.supabase.co` con tu URL real de Supabase.

### Paso 4: Limpiar Caché del Navegador

1. Abre DevTools (F12)
2. Ve a "Application" → "Storage"
3. Haz clic en "Clear site data"
4. Recarga la página (F5)

### Paso 5: Probar el Login

1. Ve a `/login`
2. Haz clic en "Iniciar Sesión"
3. Deberías ser redirigido al sistema de autenticación externo
4. Después de autenticarte, deberías volver a la app
5. Deberías ver todos los menús en el sidebar

## 🔍 Cómo Verificar que Funciona

### En la Consola del Navegador (F12)

Deberías ver esta secuencia de mensajes:

```
🔐 Código de autenticación detectado, intercambiando por token...
✅ Token obtenido exitosamente
✅ Sesión guardada
👤 Creando nuevo usuario en base de datos... (solo primera vez)
✅ Usuario creado en base de datos (solo primera vez)
👤 Usuario enriquecido con permisos: {...}
Callback page - procesando autenticación...
isLoading: false isAuthenticated: true
✅ Autenticación exitosa, redirigiendo al inicio
```

### En el Sidebar

Deberías ver **todos los menús** (no solo Dashboard):
- Dashboard
- Contabilidad (con 5 submódulos)
- Ventas (con 5 submódulos)
- Compras (con 3 submódulos)
- Finanzas (con 4 submódulos)
- Análisis (con 1 submódulo)
- Reportes (con 1 submódulo)
- Administración (con 9 submódulos)

### En el Footer del Sidebar

Deberías ver:
```
ContaEmpresa
v2.0.0
```

## 🐛 Troubleshooting

### Error: "Failed to fetch" al intercambiar código

**Causa**: El edge function no está desplegado o la URL es incorrecta.

**Solución**:
1. Verifica que `VITE_AUTH_EXCHANGE_URL` tenga la URL correcta
2. Despliega el edge function: `supabase functions deploy auth-exchange-code`
3. Verifica en Supabase Dashboard → Edge Functions que aparezca

### Error: "Código o application_id faltante"

**Causa**: El sistema de autenticación externo no está enviando el código correctamente.

**Solución**:
1. Verifica que `VITE_AUTH_CALLBACK_URL` coincida con la URL registrada en el sistema externo
2. Verifica que `VITE_AUTH_APP_ID` sea correcto

### Error: "Error del servidor de autenticación"

**Causa**: El servidor de autenticación externo no reconoce el código o application_id.

**Solución**:
1. Verifica que `VITE_AUTH_API_KEY` sea correcta
2. Contacta al administrador del sistema de autenticación
3. Verifica los logs del edge function en Supabase Dashboard

### Todavía solo veo el Dashboard

**Causa**: Los permisos no están configurados o el caché no se limpió.

**Solución**:
1. Limpia el caché del navegador completamente
2. Verifica en consola que `metadata.permissions` tenga las categorías
3. Si está vacío, ejecuta el script SQL de `/ACTUALIZAR_PERMISOS_RAPIDO.sql`

### Ciclo infinito de redirección

**Causa**: El código no se está guardando correctamente o hay un error en el intercambio.

**Solución**:
1. Abre la consola y busca mensajes de error en rojo
2. Verifica que el edge function esté desplegado
3. Verifica que todas las variables de entorno estén configuradas
4. Limpia localStorage: `localStorage.clear()` en consola

## 📊 Flujo Completo de Autenticación

```
1. Usuario hace clic en "Iniciar Sesión"
   ↓
2. Redirige a: https://auth-contaempresa.netlify.app/login?...
   ↓
3. Usuario se autentica en sistema externo
   ↓
4. Sistema externo redirige a: https://tu-app.com/callback?code=XXX&state=authenticated
   ↓
5. AuthContext detecta el código
   ↓
6. AuthContext llama al edge function con el código
   ↓
7. Edge function intercambia código por tokens con sistema externo
   ↓
8. Edge function retorna access_token, refresh_token, user, tenant
   ↓
9. AuthContext guarda los tokens en localStorage
   ↓
10. AuthContext sincroniza el usuario con la BD de Supabase
   ↓
11. AuthContext enriquece el usuario con permisos de metadata
   ↓
12. Callback detecta que está autenticado
   ↓
13. Callback redirige al Dashboard
   ↓
14. Usuario ve todos los menús según sus permisos
```

## 📚 Archivos Modificados/Creados

1. `/src/context/AuthContext.tsx` - Intercambio de código
2. `/src/pages/Callback.tsx` - Mejor manejo de redirecciones
3. `/src/hooks/usePermissions.ts` - Herencia de permisos
4. `/supabase/functions/auth-exchange-code/index.ts` - Edge function nuevo
5. `/ACTUALIZAR_PERMISOS_RAPIDO.sql` - Script simplificado
6. `/SOLUCION_COMPLETA_PERMISOS.md` - Documentación de permisos

---

**¡Listo! Despliega el edge function y prueba el login!** 🎉
