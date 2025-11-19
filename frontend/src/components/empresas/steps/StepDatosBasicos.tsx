import React, { useEffect, useState } from 'react';
import { nomencladoresUruguayService, TipoContribuyente, DepartamentoUY, LocalidadUY } from '../../../services/supabase/nomencladoresUruguay';
import { paisesSupabaseService } from '../../../services/supabase/paises';

interface StepDatosBasicosProps {
  data: any;
  onChange: (data: any) => void;
  paisId?: string;
}

export const StepDatosBasicos: React.FC<StepDatosBasicosProps> = ({ data, onChange, paisId }) => {
  const [paises, setPaises] = useState<any[]>([]);
  const [tiposContribuyente, setTiposContribuyente] = useState<TipoContribuyente[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartamentoUY[]>([]);
  const [localidades, setLocalidades] = useState<LocalidadUY[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [paisId]);

  useEffect(() => {
    if (data.departamento_id) {
      loadLocalidades(data.departamento_id);
    }
  }, [data.departamento_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paisesData, tiposData, deptosData] = await Promise.all([
        paisesSupabaseService.getPaisesActivos(),
        paisId ? nomencladoresUruguayService.getTiposContribuyente(paisId) : Promise.resolve([]),
        nomencladoresUruguayService.getDepartamentos()
      ]);

      setPaises(paisesData);
      setTiposContribuyente(tiposData);
      setDepartamentos(deptosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalidades = async (departamentoId: string) => {
    try {
      const localidadesData = await nomencladoresUruguayService.getLocalidades(departamentoId);
      setLocalidades(localidadesData);
    } catch (error) {
      console.error('Error cargando localidades:', error);
    }
  };

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

          {/* País */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País <span className="text-red-500">*</span>
            </label>
            <select
              value={data.pais_id || ''}
              onChange={(e) => handleChange('pais_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar país...</option>
              {paises.map((pais) => (
                <option key={pais.id} value={pais.id}>
                  {pais.nombre}
                </option>
              ))}
            </select>
          </div>

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

          {/* Tipo de Contribuyente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Contribuyente <span className="text-red-500">*</span>
            </label>
            <select
              value={data.tipo_contribuyente_id || ''}
              onChange={(e) => handleChange('tipo_contribuyente_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar tipo...</option>
              {tiposContribuyente.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Dirección fiscal declarada en DGI"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento
              </label>
              <select
                value={data.departamento_id || ''}
                onChange={(e) => {
                  handleChange('departamento_id', e.target.value);
                  handleChange('localidad_id', ''); // Reset localidad
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar departamento...</option>
                {departamentos.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Localidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localidad
              </label>
              <select
                value={data.localidad_id || ''}
                onChange={(e) => handleChange('localidad_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!data.departamento_id}
              >
                <option value="">Seleccionar localidad...</option>
                {localidades.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
              Cédula de Identidad
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
