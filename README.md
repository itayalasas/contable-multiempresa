# ContaEmpresa - Sistema de Gestión Contable

Sistema integral de gestión contable multi-empresa desarrollado con React, TypeScript y Firebase.

## ✨ Características

- 📊 **Plan de Cuentas** - Gestión completa del catálogo contable
- 📝 **Asientos Contables** - Registro de movimientos con validación automática
- 📖 **Libro Mayor** - Consulta de movimientos por cuenta
- 📋 **Balance de Comprobación** - Reportes contables profesionales
- 🏢 **Multi-empresa** - Gestión de múltiples empresas
- 🌍 **Multi-país** - Soporte para diferentes países y monedas
- 📱 **Responsive** - Funciona en móviles, tablets y desktop
- 📄 **Exportación** - PDF y Excel de todos los reportes

## 🚀 Tecnologías

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Firebase (Firestore + Auth)
- **Build**: Vite
- **Icons**: Lucide React
- **Charts**: Recharts
- **Deployment**: Netlify

## 🛠️ Estructura del Proyecto

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

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/contaempresa.git

# Instalar dependencias de todos los paquetes
npm run install:all

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase

# Iniciar servidor de desarrollo (frontend)
npm run dev

# Iniciar servidor de desarrollo (backend)
npm run dev:backend
```

## 📋 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo frontend
npm run dev:backend  # Servidor de desarrollo backend
npm run build        # Construir frontend para producción
npm run build:backend # Construir backend para producción
npm run deploy       # Desplegar frontend
npm run deploy:functions # Desplegar funciones de Firebase
npm run lint         # Verificar código
```

## 🔧 Configuración

1. **Firebase**: Configura tu proyecto en Firebase Console
2. **Variables de entorno**: Copia `.env.example` a `.env`
3. **Reglas de Firestore**: Aplica las reglas del archivo `firestore.rules`

## 🔧 Scripts de Mantenimiento

El proyecto incluye varios scripts SQL para mantenimiento de la base de datos:

### Limpieza de Transacciones

- **`scripts/reset_transacciones_rapido.sql`** - Reset rápido de todas las transacciones
- **`scripts/limpiar_todas_transacciones.sql`** - Limpieza completa con mensajes detallados
- **`scripts/limpiar_una_empresa.sql`** - Limpiar solo una empresa específica

**¿Qué se mantiene?**
- Empresas y configuración
- Usuarios y permisos
- Plan de cuentas
- Clientes y proveedores
- Nomencladores

**¿Qué se elimina?**
- Todas las facturas
- Todos los asientos contables
- Todos los movimientos de tesorería
- Todas las comisiones y pagos

Ver [GUIA_LIMPIEZA_TRANSACCIONES.md](./GUIA_LIMPIEZA_TRANSACCIONES.md) para más detalles.

### Otros Scripts

- **`scripts/sincronizar_tesoreria_completo.sql`** - Sincronizar movimientos de tesorería con registros contables
- **`scripts/actualizar_permisos_usuario.sql`** - Actualizar permisos de usuarios

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Tu Nombre**
- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@ejemplo.com

## 🙏 Agradecimientos

- React Team por el excelente framework
- Firebase por la infraestructura backend
- Tailwind CSS por el sistema de diseño