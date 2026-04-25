import { useState, useEffect, useCallback } from 'react';
import { countriesApi, Country } from '../services/api/countriesApi';
import { paisesSupabaseService } from '../services/supabase/paises';

interface CountryOption {
  value: string;
  label: string;
  iso2: string;
  iso3: string;
}

interface UseCountriesReturn {
  countries: Country[];
  countryOptions: CountryOption[];
  loading: boolean;
  error: string | null;
  getCitiesByCountry: (iso2: string) => Promise<string[]>;
  getCountryByIso2: (iso2: string) => Country | undefined;
  getCountryByName: (name: string) => Country | undefined;
  reload: () => Promise<void>;
}

export const useCountries = (): UseCountriesReturn => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCountries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🌍 Cargando países desde API...');
      const data = await countriesApi.getCountriesAndCities();
      console.log('✅ Países cargados:', data.length);
      setCountries(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.warn('⚠️ API de países no disponible, usando catálogo local:', errorMessage);

      try {
        const paises = await paisesSupabaseService.getPaisesActivos();
        const fallbackCountries: Country[] = paises.map((pais) => ({
          iso2: pais.codigo,
          iso3: pais.codigoISO,
          country: pais.nombre,
          cities: [],
        }));

        setCountries(fallbackCountries);
        setError(null);
        console.log('✅ Países cargados desde Supabase:', fallbackCountries.length);
      } catch (fallbackErr) {
        const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Error desconocido';
        console.error('❌ Error cargando países desde fallback Supabase:', fallbackMessage);
        setError(`No se pudieron cargar los países (${fallbackMessage})`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  const countryOptions: CountryOption[] = countries.map(country => ({
    value: country.country,
    label: country.country,
    iso2: country.iso2,
    iso3: country.iso3,
  }));

  const getCitiesByCountry = async (iso2: string): Promise<string[]> => {
    try {
      console.log('🏙️ Cargando ciudades para:', iso2);
      const cities = await countriesApi.getCitiesByCountry(iso2);
      console.log('✅ Ciudades cargadas:', cities.length);
      return cities;
    } catch (err) {
      console.error('❌ Error cargando ciudades:', err);
      return [];
    }
  };

  const getCountryByIso2 = (iso2: string): Country | undefined => {
    return countries.find(c => c.iso2 === iso2);
  };

  const getCountryByName = (name: string): Country | undefined => {
    return countries.find(c => c.country === name);
  };

  return {
    countries,
    countryOptions,
    loading,
    error,
    getCitiesByCountry,
    getCountryByIso2,
    getCountryByName,
    reload: loadCountries,
  };
};
