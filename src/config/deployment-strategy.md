# Estrategia de Despliegue para ContaEmpresa

## Arquitectura de Despliegue

Hemos diseñado una arquitectura de despliegue que separa el frontend del backend para mayor escalabilidad y mantenibilidad:

```
                   +----------------+
                   |   CDN/Hosting  |
                   | (Netlify/Vercel)|
                   +--------+-------+
                            |
                            v
+----------------+  +----------------+  +----------------+
|                |  |                |  |                |
|  React Frontend|  |  Firebase Auth |  |  Auth0 (Opt)   |
|                |  |                |  |                |
+-------+--------+  +--------+-------+  +----------------+
        |                    |
        v                    v
+----------------+  +----------------+
|                |  |                |
| Firebase Cloud |  |   Firestore    |
|   Functions    |  |   Database     |
|                |  |                |
+----------------+  +----------------+
```

## Estrategia de Despliegue

### Frontend (React)

- **Plataforma**: Netlify o Vercel
- **Estrategia**: Despliegue continuo desde GitHub
- **Entornos**:
  - **Desarrollo**: Rama `develop` → `dev.contaempresa.online`
  - **Staging**: Rama `staging` → `staging.contaempresa.online`
  - **Producción**: Rama `main` → `app.contaempresa.online`

### Backend (Firebase)

- **Plataforma**: Firebase
- **Estrategia**: Despliegue manual o automatizado con GitHub Actions
- **Componentes**:
  - **Firestore**: Base de datos
  - **Authentication**: Autenticación de usuarios
  - **Cloud Functions**: API y procesamiento en segundo plano
  - **Storage**: Almacenamiento de archivos

## Configuración Multi-Tenant

Para soportar múltiples empresas y países:

1. **Subdominio por Tenant**: `{tenant}.contaempresa.online`
2. **Configuración Dinámica**: Carga de configuración específica por tenant
3. **Aislamiento de Datos**: Separación lógica en Firestore

## Proceso de Despliegue

### Frontend

```bash
# Construir la aplicación
npm run build

# Desplegar a Netlify
netlify deploy --prod
```

### Backend (Firebase Functions)

```bash
# Navegar al directorio de funciones
cd backend/functions

# Instalar dependencias
npm install

# Desplegar funciones
firebase deploy --only functions
```

## Variables de Entorno

Configuración de variables de entorno por entorno:

- `.env.development`: Entorno local
- `.env.production`: Entorno de producción
- `.env.staging`: Entorno de staging

Ejemplo:
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_AUTH0_DOMAIN=xxx
VITE_AUTH0_CLIENT_ID=xxx
```

## Monitoreo y Logs

- **Frontend**: Sentry para monitoreo de errores
- **Backend**: Logs de Firebase y Cloud Monitoring
- **Rendimiento**: Firebase Performance Monitoring

## Estrategia de Rollback

En caso de problemas:

1. **Frontend**: Revertir a la versión anterior en Netlify/Vercel
2. **Backend**: Revertir a la versión anterior de Functions con `firebase functions:rollback`

## Consideraciones de Seguridad

- **CORS**: Configuración adecuada para permitir solo dominios autorizados
- **CSP**: Content Security Policy para prevenir XSS
- **Firestore Rules**: Reglas de seguridad estrictas para proteger datos
- **API Keys**: Rotación periódica de claves de API