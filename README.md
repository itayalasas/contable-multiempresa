# ContaEmpresa

Sistema integral de gestion contable multiempresa construido con React, TypeScript, Supabase y Auth0.

## Stack actual

- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend de datos: Supabase
- Autenticacion: Auth0
- Reportes y exportacion: Recharts, jsPDF, xlsx
- Build: Vite

## Capacidades principales

- Plan de cuentas, asientos contables y libro mayor
- Facturacion de venta y compra
- Cuentas por cobrar y por pagar
- Tesoreria y conciliacion bancaria
- Cierre de periodos contables con validaciones
- Integracion fiscal con DGI
- Multiempresa, multimoneda y auditoria

## Puesta en marcha

```bash
npm install
npm run dev
```

Para produccion:

```bash
npm run test
npm run build
```

## Configuracion

El proyecto requiere variables de entorno de Supabase y Auth0. La configuracion operativa debe hacerse sobre esos servicios; Firebase ya no forma parte de la arquitectura activa.

## Estado de arquitectura

- Firebase fue retirado del codigo ejecutable.
- La carpeta legacy `src/services/firebase` fue eliminada.
- La auditoria operativa se apoya en Supabase y triggers SQL.

## Notas

- Existen migraciones historicas y documentacion antigua que pueden mencionar Firebase como contexto pasado del proyecto.
- Las edge functions y el esquema de Supabase viven en `supabase/`.
