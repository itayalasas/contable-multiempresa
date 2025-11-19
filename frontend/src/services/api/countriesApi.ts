const API_URL = import.meta.env.VITE_COUNTRIES_API_URL;
const API_KEY = import.meta.env.VITE_COUNTRIES_API_KEY;

export interface Country {
  iso2: string;
  iso3: string;
  country: string;
  cities: string[];
}

export interface CountriesApiResponse {
  msg: string;
  data: Country[];
}

export const countriesApi = {
  async getCountriesAndCities(): Promise<Country[]> {
    console.log('🌍 API URL:', API_URL);
    console.log('🔑 API Key exists:', !!API_KEY);

    if (!API_URL || !API_KEY) {
      throw new Error('Faltan configuraciones de API. Verifica VITE_COUNTRIES_API_URL y VITE_COUNTRIES_API_KEY en .env');
    }

    try {
      console.log('📡 Haciendo petición a la API de países...');
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'X-Integration-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Respuesta recibida:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result: CountriesApiResponse = await response.json();
      console.log('✅ Datos procesados:', result.data?.length || 0, 'países');
      return result.data || [];
    } catch (error) {
      console.error('❌ Error completo:', error);
      throw error;
    }
  },

  async getCountries(): Promise<Array<{ iso2: string; iso3: string; name: string }>> {
    const data = await this.getCountriesAndCities();
    return data.map(country => ({
      iso2: country.iso2,
      iso3: country.iso3,
      name: country.country,
    }));
  },

  async getCitiesByCountry(countryIso2: string): Promise<string[]> {
    const data = await this.getCountriesAndCities();
    const country = data.find(c => c.iso2 === countryIso2);
    return country?.cities || [];
  },
};
