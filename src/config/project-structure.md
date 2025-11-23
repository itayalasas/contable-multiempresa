# Estructura del Proyecto ContaEmpresa

## Reorganización para Optimizar Rendimiento

Hemos reorganizado el proyecto para separar claramente el frontend del backend y optimizar el rendimiento. Esta estructura ayuda a reducir el tamaño del proyecto en memoria y facilita el mantenimiento.

## Estructura Principal

```
contaempresa/
├── frontend/           # Aplicación React (cliente)
│   ├── src/            # Código fuente del frontend
│   ├── public/         # Archivos estáticos
│   └── package.json    # Dependencias del frontend
│
├── backend/            # Servicios de backend
│   ├── src/            # Código fuente del backend
│   ├── functions/      # Funciones serverless
│   └── package.json    # Dependencias del backend
│
├── shared/             # Código compartido entre frontend y backend
│   ├── types/          # Definiciones de tipos TypeScript
│   └── utils/          # Utilidades comunes
│
├── .env                # Variables de entorno (no incluir en git)
└── README.md           # Documentación del proyecto
```

## Ventajas de esta Estructura

1. **Separación de Responsabilidades**: Frontend y backend claramente separados
2. **Optimización de Rendimiento**: Reduce la carga en memoria durante el desarrollo
3. **Mantenibilidad Mejorada**: Más fácil de mantener y escalar
4. **Despliegue Independiente**: Permite desplegar frontend y backend por separado
5. **Reutilización de Código**: La carpeta shared permite compartir código entre ambas partes

## Implementación Actual

En la implementación actual, estamos utilizando:

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Functions)
- **Autenticación**: Auth0 (opcional) o Firebase Auth

## Próximos Pasos

1. Completar la migración de servicios a la nueva estructura
2. Optimizar las importaciones para reducir el tamaño del bundle
3. Implementar lazy loading para componentes grandes
4. Configurar CI/CD para despliegue automático