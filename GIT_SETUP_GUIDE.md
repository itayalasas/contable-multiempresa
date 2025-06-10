# 🐙 Guía Completa: Subir ContaEmpresa a Git

## 🚀 **Opción 1: Desde Bolt.new (Más Fácil)**

### **Paso 1: Descargar el proyecto**
1. Click en **"Download"** en Bolt.new (esquina superior derecha)
2. Descomprime el archivo ZIP en tu computadora
3. Abre una terminal en la carpeta del proyecto

### **Paso 2: Inicializar Git**
```bash
# Navegar a la carpeta del proyecto
cd contaempresa

# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "🎉 Proyecto ContaEmpresa inicial - Sistema contable completo"
```

### **Paso 3: Crear repositorio en GitHub**
1. Ve a [GitHub.com](https://github.com)
2. Click en **"New repository"** (botón verde)
3. Nombre: `contaempresa` o `sistema-contable`
4. Descripción: `Sistema de gestión contable multi-empresa con React + Firebase`
5. **NO** marques "Initialize with README" (ya tienes archivos)
6. Click **"Create repository"**

### **Paso 4: Conectar y subir**
```bash
# Conectar con tu repositorio (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/contaempresa.git

# Cambiar a rama main
git branch -M main

# Subir todo a GitHub
git push -u origin main
```

## 🔄 **Opción 2: Desde Bolt.new con Deploy**

### **Conectar directamente:**
1. En Bolt.new, click **"Deploy"**
2. Selecciona **"Netlify"**
3. Conecta tu cuenta de GitHub
4. Netlify creará automáticamente el repositorio
5. ¡Tu proyecto estará en GitHub Y desplegado!

## 📁 **Estructura que se subirá a Git:**

```
contaempresa/
├── 📄 README.md
├── 📄 package.json
├── 📄 vite.config.ts
├── 📄 tailwind.config.js
├── 📄 tsconfig.json
├── 📁 src/
│   ├── 📁 components/
│   ├── 📁 pages/
│   ├── 📁 services/
│   ├── 📁 hooks/
│   ├── 📁 types/
│   └── 📄 main.tsx
├── 📁 public/
└── 📄 .gitignore
```

## 🔐 **Configurar .gitignore (Importante)**

```bash
# Crear archivo .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Firebase
.firebase/
firebase-debug.log
EOF
```

## 🌟 **Crear README.md profesional**

```bash
cat > README.md << 'EOF'
# 💼 ContaEmpresa - Sistema de Gestión Contable

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

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/TU-USUARIO/contaempresa.git

# Instalar dependencias
cd contaempresa
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Firebase

# Iniciar servidor de desarrollo
npm run dev
```

## 📋 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run preview      # Vista previa de producción
npm run lint         # Verificar código
```

## 🔧 Configuración

1. **Firebase**: Configura tu proyecto en Firebase Console
2. **Variables de entorno**: Copia `.env.example` a `.env`
3. **Reglas de Firestore**: Aplica las reglas del archivo `firestore.rules`

## 📸 Screenshots

[Agregar capturas de pantalla aquí]

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
EOF
```

## 🔄 **Workflow de desarrollo recomendado:**

### **Desarrollo diario:**
```bash
# Antes de empezar a trabajar
git pull origin main

# Crear nueva rama para feature
git checkout -b feature/nueva-funcionalidad

# Hacer cambios y commits
git add .
git commit -m "✨ Agregar nueva funcionalidad"

# Subir rama
git push origin feature/nueva-funcionalidad

# Crear Pull Request en GitHub
# Merge a main cuando esté listo
```

### **Comandos útiles:**
```bash
# Ver estado
git status

# Ver historial
git log --oneline

# Cambiar de rama
git checkout main

# Crear nueva rama
git checkout -b nombre-rama

# Eliminar rama
git branch -d nombre-rama

# Actualizar desde remoto
git pull origin main
```

## 🌐 **Despliegue automático:**

### **Con Netlify + GitHub:**
1. Conecta tu repositorio de GitHub con Netlify
2. Cada `git push` a `main` desplegará automáticamente
3. URL permanente para tu aplicación

### **Configuración de Netlify:**
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🔒 **Seguridad:**

### **Variables de entorno:**
- ✅ **NUNCA** subas el archivo `.env` a Git
- ✅ Usa `.env.example` como plantilla
- ✅ Configura variables en Netlify para producción

### **Firebase Security Rules:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📊 **Monitoreo:**

### **GitHub Actions (opcional):**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
```

## 🎯 **Próximos pasos:**

1. ✅ **Subir a GitHub** (seguir esta guía)
2. 🌐 **Conectar con Netlify** para despliegue
3. 📱 **Probar en diferentes dispositivos**
4. 🔧 **Personalizar según necesidades**
5. 📈 **Agregar más funcionalidades**

---

## 🆘 **¿Problemas?**

### **Error de autenticación:**
```bash
# Configurar credenciales de Git
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### **Error de permisos:**
```bash
# Usar token personal en lugar de contraseña
# Generar en: GitHub → Settings → Developer settings → Personal access tokens
```

### **Repositorio ya existe:**
```bash
# Eliminar origin y volver a agregar
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/nuevo-nombre.git
```

---

¡Con esto tendrás tu proyecto profesionalmente organizado en Git! 🚀