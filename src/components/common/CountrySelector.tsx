import React from 'react';
import { SearchableSelect } from './SearchableSelect';
import { useCountries } from '../../hooks/useCountries';

interface CountrySelectorProps {
  value: string;
  onChange: (data: { name: string; iso2: string; iso3: string }) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  placeholder?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  label = 'País',
  required = false,
  disabled = false,
  className = '',
  error,
  placeholder = 'Buscar país...',
}) => {
  const { countryOptions, loading, error: apiError, getCountryByName } = useCountries();

  const handleChange = (countryName: string) => {
    const country = getCountryByName(countryName);
    if (country) {
      onChange({
        name: country.country,
        iso2: country.iso2,
        iso3: country.iso3,
      });
    }
  };

  if (apiError) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="px-3 py-2 border border-red-300 rounded-lg bg-red-50">
          <p className="text-sm text-red-600">Error cargando países</p>
        </div>
      </div>
    );
  }

  return (
    <SearchableSelect
      label={label}
      required={required}
      options={countryOptions}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
      className={className}
      error={error}
    />
  );
};
