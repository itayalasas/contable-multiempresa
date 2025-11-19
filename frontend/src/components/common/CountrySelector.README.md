# CountrySelector - Selector Reutilizable de Países

## Descripción
Componente reutilizable para seleccionar países con búsqueda integrada. Consume automáticamente la API externa de países y devuelve el nombre del país junto con sus códigos ISO2 e ISO3.

## Características
- ✅ Búsqueda en tiempo real de países
- ✅ Carga automática desde API externa
- ✅ Retorna nombre, ISO2 e ISO3
- ✅ Manejo de errores integrado
- ✅ Estados de carga
- ✅ Navegación por teclado
- ✅ Validación de campos requeridos

## Uso Básico

```tsx
import { CountrySelector } from '../components/common/CountrySelector';

function MiComponente() {
  const [paisData, setPaisData] = useState({
    nombre: '',
    iso2: '',
    iso3: ''
  });

  const handleCountryChange = (data) => {
    setPaisData({
      nombre: data.name,
      iso2: data.iso2,
      iso3: data.iso3
    });
  };

  return (
    <CountrySelector
      value={paisData.nombre}
      onChange={handleCountryChange}
      required
    />
  );
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `string` | - | Nombre del país seleccionado |
| `onChange` | `(data: { name: string; iso2: string; iso3: string }) => void` | - | Callback cuando se selecciona un país |
| `label` | `string` | `"País"` | Etiqueta del campo |
| `required` | `boolean` | `false` | Si el campo es requerido |
| `disabled` | `boolean` | `false` | Si el campo está deshabilitado |
| `className` | `string` | `""` | Clases CSS adicionales |
| `error` | `string` | - | Mensaje de error a mostrar |
| `placeholder` | `string` | `"Buscar país..."` | Texto del placeholder |

## Datos Retornados

El callback `onChange` recibe un objeto con:

```typescript
{
  name: string;   // Nombre completo del país (ej: "Uruguay")
  iso2: string;   // Código ISO2 (ej: "UY")
  iso3: string;   // Código ISO3 (ej: "URY")
}
```

## Hook Relacionado: useCountries

Si necesitas más control o acceso directo a los datos de países, puedes usar el hook `useCountries`:

```tsx
import { useCountries } from '../hooks/useCountries';

function MiComponente() {
  const {
    countries,           // Array de todos los países
    countryOptions,      // Opciones formateadas para select
    loading,             // Estado de carga
    error,              // Mensaje de error si existe
    getCitiesByCountry, // Función para obtener ciudades
    getCountryByIso2,   // Obtener país por ISO2
    getCountryByName,   // Obtener país por nombre
    reload              // Recargar datos
  } = useCountries();

  // Obtener ciudades de un país
  const loadCities = async (iso2: string) => {
    const cities = await getCitiesByCountry(iso2);
    console.log('Ciudades:', cities);
  };

  return (
    // ... tu componente
  );
}
```

## Ejemplo Completo con Ciudades

```tsx
import { useState, useEffect } from 'react';
import { CountrySelector } from '../components/common/CountrySelector';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useCountries } from '../hooks/useCountries';

function FormularioEmpresa() {
  const [formData, setFormData] = useState({
    pais_nombre: '',
    pais_iso2: '',
    pais_iso3: '',
    ciudad: ''
  });

  const { getCitiesByCountry } = useCountries();
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Cargar ciudades cuando cambia el país
  useEffect(() => {
    if (formData.pais_iso2) {
      loadCities(formData.pais_iso2);
    } else {
      setCities([]);
    }
  }, [formData.pais_iso2]);

  const loadCities = async (iso2: string) => {
    setLoadingCities(true);
    try {
      const citiesData = await getCitiesByCountry(iso2);
      setCities(citiesData);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCountryChange = (data) => {
    setFormData({
      ...formData,
      pais_nombre: data.name,
      pais_iso2: data.iso2,
      pais_iso3: data.iso3,
      ciudad: '' // Reset ciudad
    });
  };

  const cityOptions = cities.map(city => ({
    value: city,
    label: city
  }));

  return (
    <div>
      <CountrySelector
        value={formData.pais_nombre}
        onChange={handleCountryChange}
        required
      />

      <SearchableSelect
        label="Ciudad"
        options={cityOptions}
        value={formData.ciudad}
        onChange={(value) => setFormData({ ...formData, ciudad: value })}
        placeholder="Buscar ciudad..."
        loading={loadingCities}
        disabled={!formData.pais_iso2}
      />
    </div>
  );
}
```

## Uso en Facturación

Los códigos ISO2 e ISO3 son importantes para la facturación electrónica:

```tsx
// Al crear una factura
const facturaData = {
  cliente: {
    nombre: "Cliente SA",
    pais: formData.pais_nombre,    // "Uruguay"
    pais_iso2: formData.pais_iso2, // "UY" - Para CFE
    pais_iso3: formData.pais_iso3  // "URY" - Para reportes
  }
};
```

## Configuración Requerida

Asegúrate de tener configuradas estas variables en tu archivo `.env`:

```env
VITE_COUNTRIES_API_URL=https://api.flowbridge.site/functions/v1/api-gateway/2e5a5fbe-7b7a-4540-88c4-6552b10ba382
VITE_COUNTRIES_API_KEY=pub_512c40e5c210db29ed5cddb2f983e3c097c0af48ddaad65527eb6862f267c6fc
```

## Estructura de Datos de la API

La API retorna:

```json
{
  "msg": "countries and cities retrieved",
  "data": [
    {
      "iso2": "UY",
      "iso3": "URY",
      "country": "Uruguay",
      "cities": ["Montevideo", "Salto", "Paysandú", ...]
    },
    ...
  ]
}
```

## Lugares donde usar CountrySelector

1. **Formulario de Empresas** ✅ (Ya implementado)
2. **Formulario de Clientes** (Recomendado)
3. **Formulario de Proveedores** (Recomendado)
4. **Configuración de Usuario** (Recomendado)
5. **Facturación** (Recomendado para datos del cliente/exportación)

## Ventajas sobre Select Normal

- ✅ Búsqueda integrada (no necesitas hacer scroll)
- ✅ Datos siempre actualizados desde API externa
- ✅ Códigos ISO automáticos para facturación
- ✅ Soporte para ciudades del país seleccionado
- ✅ Navegación por teclado
- ✅ Mejor UX en móviles
