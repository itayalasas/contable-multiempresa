# Optimización de Firebase en ContaEmpresa

## Problemas Identificados con Firebase

1. **Importaciones pesadas**: Importar todo el SDK de Firebase aumenta significativamente el tamaño del bundle
2. **Múltiples instancias**: Inicializar Firebase en múltiples lugares causa problemas de rendimiento
3. **Consultas ineficientes**: Consultas mal estructuradas que recuperan más datos de los necesarios
4. **Suscripciones sin limpiar**: Listeners que no se desuscriben correctamente causando memory leaks

## Soluciones Implementadas

### 1. Importaciones Optimizadas

Hemos cambiado de importaciones completas a importaciones específicas:

```javascript
// ANTES - Importación pesada
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

// AHORA - Importaciones optimizadas
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
```

### 2. Singleton para Firebase

Implementado un patrón singleton para asegurar una sola instancia de Firebase:

```javascript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...resto de la configuración
};

// Inicializar una sola vez
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 3. Consultas Optimizadas

Mejoramos las consultas para reducir la cantidad de datos transferidos:

```javascript
// ANTES - Consulta ineficiente
const snapshot = await getDocs(collection(db, 'empresas'));

// AHORA - Consulta optimizada con filtros y límites
const q = query(
  collection(db, 'empresas'),
  where('activa', '==', true),
  orderBy('nombre'),
  limit(20)
);
const snapshot = await getDocs(q);
```

### 4. Limpieza Adecuada de Suscripciones

Implementamos limpieza correcta de listeners en componentes React:

```javascript
useEffect(() => {
  const q = query(collection(db, 'empresas'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Procesar datos
  });
  
  // Limpieza al desmontar el componente
  return () => unsubscribe();
}, []);
```

### 5. Caché Local

Implementamos caché local para reducir consultas repetidas:

```javascript
const useCachedData = (collectionName, queryFn) => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Verificar caché local
    const cachedData = localStorage.getItem(`cache_${collectionName}`);
    if (cachedData) {
      setData(JSON.parse(cachedData));
    }
    
    // Obtener datos frescos
    queryFn().then(freshData => {
      setData(freshData);
      localStorage.setItem(`cache_${collectionName}`, JSON.stringify(freshData));
    });
  }, [collectionName, queryFn]);
  
  return data;
};
```

## Mejores Prácticas para el Futuro

1. **Lazy Loading de Firebase**: Cargar Firebase solo cuando sea necesario
2. **Batch Operations**: Usar operaciones por lotes para múltiples escrituras
3. **Offline Persistence**: Configurar persistencia offline para mejorar la experiencia del usuario
4. **Security Rules**: Mantener reglas de seguridad eficientes que no impacten el rendimiento
5. **Monitoreo**: Implementar monitoreo de uso de Firebase para identificar cuellos de botella

## Recursos Adicionales

- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [Optimizing Firebase for Production](https://firebase.google.com/docs/web/modular-upgrade)
- [Firestore Usage and Limits](https://firebase.google.com/docs/firestore/quotas)