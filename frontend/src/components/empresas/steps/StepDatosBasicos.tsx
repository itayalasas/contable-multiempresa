import React, { useEffect, useState } from 'react';
import { nomencladoresUruguayService, TipoContribuyente } from '../../../services/supabase/nomencladoresUruguay';
import { SearchableSelect } from '../../common/SearchableSelect';
import { CountrySelector } from '../../common/CountrySelector';
import { useCountries } from '../../../hooks/useCountries';

interface StepDatosBasicosProps {
  data: any;
  onChange: (data: any) => void;
  paisId?: string;
}

export const StepDatosBasicos: React.FC<StepDatosBasicosProps> = ({ data, onChange, paisId }) => {
  const { getCitiesByCountry } = useCountries();
  const [cities, setCities] = useState<string[]>([]);
  const [tiposContribuyente, setTiposContribuyente] = useState<TipoContribuyente[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingTiposContribuyente, setLoadingTiposContribuyente] = useState(false);

  useEffect(() => {
    if (data.pais_iso2) {
      loadCities(data.pais_iso2);
      loadTiposContribuyente(data.pais_iso2);
    } else {
      setCities([]);
      setTiposContribuyente([]);
    }
  }, [data.pais_iso2]);

  const loadCities = async (countryIso2: string) => {
    try {
      setLoadingCities(true);
      const citiesData = await getCitiesByCountry(countryIso2);
      setCities(citiesData);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadTiposContribuyente = async (countryIso2: string) => {
    try {
      setLoadingTiposContribuyente(true);
      const tipos = await nomencladoresUruguayService.getTiposContribuyente(countryIso2);
      setTiposContribuyente(tipos);
    } catch (error) {
      console.error('Error cargando tipos de contribuyente:', error);
      setTiposContribuyente([]);
    } finally {
      setLoadingTiposContribuyente(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleCountryChange = (countryData: { name: string; iso2: string; iso3: string }) => {
    onChange({
      ...data,
      pais_nombre: countryData.name,
      pais_iso2: countryData.iso2,
      pais_iso3: countryData.iso3,
      ciudad: '',
      tipo_contribuyente_id: ''
    });
  };

  const cityOptions = cities.map(city => ({
    value: city,
    label: city,
  }));

  const tipoContribuyenteOptions = tiposContribuyente.map(tipo => ({
    value: tipo.id,
    label: tipo.nombre,
  }));


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre de la Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.nombre || ''}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre comercial"
              required
            />
          </div>

          {/* Razón Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón Social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.razon_social || ''}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Razón social legal"
              required
            />
          </div>

          {/* Nombre Fantasía */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Fantasía
            </label>
            <input
              type="text"
              value={data.nombre_fantasia || ''}
              onChange={(e) => handleChange('nombre_fantasia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre fantasía (opcional)"
            />
          </div>

          {/* País - CountrySelector */}
          <CountrySelector
            value={data.pais_nombre || ''}
            onChange={handleCountryChange}
            required
          />

          {/* Número de Identificación (RUT) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RUT / Número de Identificación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.numero_identificacion || ''}
              onChange={(e) => handleChange('numero_identificacion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 211234567890"
              required
            />
          </div>

          {/* Tipo de Contribuyente - Searchable Select */}
          <SearchableSelect
            label="Tipo de Contribuyente"
            required
            options={tipoContribuyenteOptions}
            value={data.tipo_contribuyente_id || ''}
            onChange={(value) => handleChange('tipo_contribuyente_id', value)}
            placeholder="Buscar tipo..."
            loading={loadingTiposContribuyente}
            disabled={!data.pais_iso2}
          />

          {/* Fecha de Inicio de Actividades */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio de Actividades <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.fecha_inicio_actividades || ''}
              onChange={(e) => handleChange('fecha_inicio_actividades', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Estado Tributario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Tributario
            </label>
            <select
              value={data.estado_tributario || 'activa'}
              onChange={(e) => handleChange('estado_tributario', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="activa">Activa</option>
              <option value="baja_temporal">Baja Temporal</option>
              <option value="baja_definitiva">Baja Definitiva</option>
            </select>
          </div>
        </div>
      </div>

      {/* Datos de Contacto */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="contacto@empresa.com"
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={data.telefono || ''}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+598 2 xxx xxxx"
            />
          </div>
        </div>
      </div>

      {/* Domicilios */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Domicilios</h3>
        <div className="space-y-4">
          {/* Domicilio Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domicilio Fiscal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.domicilio_fiscal || ''}
              onChange={(e) => handleChange('domicilio_fiscal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dirección fiscal declarada"
              required
            />
          </div>

          {/* Domicilio Comercial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domicilio Comercial
            </label>
            <input
              type="text"
              value={data.domicilio_comercial || ''}
              onChange={(e) => handleChange('domicilio_comercial', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dirección donde opera la empresa"
            />
          </div>

          {/* Ciudad - Searchable Select */}
          <SearchableSelect
            label="Ciudad"
            options={cityOptions}
            value={data.ciudad || ''}
            onChange={(value) => handleChange('ciudad', value)}
            placeholder="Buscar ciudad..."
            loading={loadingCities}
            disabled={!data.pais_iso2}
          />
        </div>
      </div>

      {/* Representante Legal */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Representante Legal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo
            </label>
            <input
              type="text"
              value={data.representante_legal || ''}
              onChange={(e) => handleChange('representante_legal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre y apellido"
            />
          </div>

          {/* CI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cédula de Identidad / Documento
            </label>
            <input
              type="text"
              value={data.ci_representante || ''}
              onChange={(e) => handleChange('ci_representante', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1.234.567-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
