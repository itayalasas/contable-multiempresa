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
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'X-Integration-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching countries: ${response.statusText}`);
      }

      const result: CountriesApiResponse = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching countries and cities:', error);
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
