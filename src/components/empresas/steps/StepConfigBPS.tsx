import React from 'react';

interface StepConfigBPSProps {
  data: any;
  onChange: (data: any) => void;
}

export const StepConfigBPS: React.FC<StepConfigBPSProps> = ({ data, onChange }) => {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Nómina (BPS)</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure los parámetros para la gestión de nómina y seguridad social (BPS).
        </p>

        {/* Activación BPS */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.bps_habilitado || false}
              onChange={(e) => handleChange('bps_habilitado', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id="bps_habilitado"
            />
            <label htmlFor="bps_habilitado" className="text-sm font-medium text-gray-700">
              Habilitar gestión de nómina y BPS
            </label>
          </div>
        </div>

        {data.bps_habilitado && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número BPS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Patrono BPS
                </label>
                <input
                  type="text"
                  value={data.bps_numero_patrono || data.numero_bps || ''}
                  onChange={(e) => handleChange('bps_numero_patrono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 123456"
                />
              </div>

              {/* Código Organismo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Organismo
                </label>
                <input
                  type="text"
                  value={data.bps_codigo_organismo || ''}
                  onChange={(e) => handleChange('bps_codigo_organismo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Código del organismo BPS"
                />
              </div>

              {/* Sucursal BPS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sucursal BPS
                </label>
                <input
                  type="text"
                  value={data.bps_sucursal || ''}
                  onChange={(e) => handleChange('bps_sucursal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sucursal de BPS"
                />
              </div>

              {/* Actividad Principal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actividad Principal (Código)
                </label>
                <input
                  type="text"
                  value={data.bps_actividad_principal || ''}
                  onChange={(e) => handleChange('bps_actividad_principal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Código de actividad"
                />
              </div>
            </div>

            {/* Representante Legal */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Representante Legal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre Representante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={data.bps_representante_nombre || data.representante_legal || ''}
                    onChange={(e) => handleChange('bps_representante_nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del representante"
                  />
                </div>

                {/* CI Representante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cédula de Identidad
                  </label>
                  <input
                    type="text"
                    value={data.bps_representante_ci || data.ci_representante || ''}
                    onChange={(e) => handleChange('bps_representante_ci', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 1.234.567-8"
                  />
                </div>

                {/* Cargo Representante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={data.bps_representante_cargo || ''}
                    onChange={(e) => handleChange('bps_representante_cargo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Director, Gerente General"
                  />
                </div>

                {/* Email Representante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={data.bps_representante_email || ''}
                    onChange={(e) => handleChange('bps_representante_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Parámetros de Nómina */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Parámetros de Nómina</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Día de Pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Día de Pago de Sueldos
                  </label>
                  <input
                    type="number"
                    value={data.bps_dia_pago || 1}
                    onChange={(e) => handleChange('bps_dia_pago', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="31"
                  />
                </div>

                {/* Periodicidad Pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodicidad de Pago
                  </label>
                  <select
                    value={data.bps_periodicidad_pago || 'mensual'}
                    onChange={(e) => handleChange('bps_periodicidad_pago', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>

                {/* Tipo de Aporte */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Aporte BPS
                  </label>
                  <select
                    value={data.bps_tipo_aporte || 'dependiente'}
                    onChange={(e) => handleChange('bps_tipo_aporte', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dependiente">Trabajador Dependiente</option>
                    <option value="independiente">Trabajador Independiente</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Información Importante</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• El número de patrono BPS debe estar registrado en BPS</li>
                <li>• El representante legal debe tener poderes suficientes</li>
                <li>• Los aportes se calcularán automáticamente según la normativa vigente</li>
                <li>• Mantenga actualizados los datos de contacto para notificaciones</li>
              </ul>
            </div>
          </>
        )}

        {!data.bps_habilitado && (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              La gestión de nómina no está habilitada. Active la opción de arriba para configurarla.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
