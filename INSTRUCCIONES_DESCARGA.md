# 📥 Cómo Descargar y Guardar tu Proyecto ContaEmpresa

## 🔽 **Opción 1: Descargar desde Bolt.new**

### **Paso 1: Usar el botón de descarga**
1. En la esquina superior derecha de Bolt.new
2. Busca el ícono de **descarga** (⬇️) o **"Download"**
3. Click para descargar todo el proyecto como ZIP

### **Paso 2: Extraer y usar**
1. Descomprime el archivo ZIP
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta: `npm install` (instala dependencias)
4. Ejecuta: `npm run dev` (inicia el servidor)

## 🌐 **Opción 2: Subir a GitHub**

### **Crear repositorio:**
```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "Proyecto ContaEmpresa inicial"
git branch -M main
git remote add origin https://github.com/tu-usuario/contaempresa.git
git push -u origin main
```

### **Ventajas de GitHub:**
- ✅ Backup en la nube
- ✅ Control de versiones
- ✅ Acceso desde cualquier lugar
- ✅ Colaboración con otros
- ✅ Historial completo de cambios

## 🚀 **Opción 3: Desplegar en Netlify**

### **Desde Bolt.new:**
1. Click en **"Deploy"** en la parte superior
2. Selecciona **Netlify**
3. Conecta tu cuenta de GitHub
4. Tu proyecto estará disponible 24/7 en internet

### **URL permanente:**
- Obtienes una URL como: `https://contaempresa-abc123.netlify.app`
- Accesible desde cualquier dispositivo
- Actualizaciones automáticas cuando cambies código

## 💻 **Opción 4: Desarrollo Local**

### **Requisitos:**
- Node.js 18+ instalado
- Editor de código (VS Code recomendado)
- Git (opcional pero recomendado)

### **Pasos:**
1. Descarga el proyecto (Opción 1)
2. Abre terminal en la carpeta
3. `npm install` - Instala dependencias
4. `npm run dev` - Inicia servidor local
5. Abre `http://localhost:5173` en tu navegador

## 🔐 **Configuración de Variables de Entorno**

### **Archivo .env necesario:**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCtiXH57wYLZokGTq6CB6ai-bqh97HE_6M
VITE_FIREBASE_AUTH_DOMAIN=contaempresa-2f7bc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=contaempresa-2f7bc
VITE_FIREBASE_STORAGE_BUCKET=contaempresa-2f7bc.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=234828676039
VITE_FIREBASE_APP_ID=1:234828676039:web:b137221d553876b06777e2

# App Configuration
VITE_APP_BASE_URL=http://localhost:5173
VITE_NODE_ENV=development
```

## 📱 **Acceso Móvil/Tablet**

### **Si desplegaste en Netlify:**
- Accede desde cualquier dispositivo
- Responsive design incluido
- Funciona en móviles y tablets

## 🔄 **Sincronización Continua**

### **Workflow recomendado:**
1. **Desarrolla en Bolt.new** (rápido y fácil)
2. **Descarga periódicamente** (backup local)
3. **Sube a GitHub** (control de versiones)
4. **Despliega en Netlify** (acceso público)

## 🆘 **Recuperación de Proyecto**

### **Si pierdes el proyecto:**
1. **Desde GitHub**: `git clone https://github.com/tu-usuario/contaempresa.git`
2. **Desde backup local**: Usa tu copia descargada
3. **Desde Netlify**: Reconecta con GitHub
4. **Desde Bolt.new**: Usa la URL guardada en favoritos

## 📞 **Soporte y Ayuda**

### **Recursos útiles:**
- **Documentación React**: https://react.dev
- **Documentación Tailwind**: https://tailwindcss.com
- **Documentación Firebase**: https://firebase.google.com/docs
- **Documentación Vite**: https://vitejs.dev

### **Comandos útiles:**
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run preview      # Vista previa de producción
npm run lint         # Verificar código
```

---

## 🎯 **Recomendación:**

**Para máxima seguridad y flexibilidad:**

1. 🔖 **Guarda la URL de Bolt.new** en favoritos
2. ⬇️ **Descarga el proyecto** como backup
3. 🐙 **Sube a GitHub** para control de versiones
4. 🌐 **Despliega en Netlify** para acceso público

¡Así tendrás tu proyecto seguro y accesible desde cualquier lugar! 🚀