import React from 'react';

interface StepConfigCFEProps {
  data: any;
  onChange: (data: any) => void;
  paisId?: string;
}

export const StepConfigCFE: React.FC<StepConfigCFEProps> = ({ data, onChange }) => {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Facturación Electrónica (CFE)</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure los parámetros para la emisión de Comprobantes Fiscales Electrónicos según la normativa de DGI.
        </p>

        {/* Activación CFE */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.cfe_habilitado || false}
              onChange={(e) => handleChange('cfe_habilitado', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id="cfe_habilitado"
            />
            <label htmlFor="cfe_habilitado" className="text-sm font-medium text-gray-700">
              Habilitar Facturación Electrónica (CFE)
            </label>
          </div>
        </div>

        {data.cfe_habilitado && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RUC Emisor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUC del Emisor
                </label>
                <input
                  type="text"
                  value={data.cfe_ruc_emisor || data.numero_identificacion || ''}
                  onChange={(e) => handleChange('cfe_ruc_emisor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="211234567890"
                />
              </div>

              {/* Código de Sucursal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Sucursal
                </label>
                <input
                  type="text"
                  value={data.cfe_codigo_sucursal || '1'}
                  onChange={(e) => handleChange('cfe_codigo_sucursal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>

              {/* Punto de Venta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Punto de Venta
                </label>
                <input
                  type="text"
                  value={data.cfe_punto_venta || '1'}
                  onChange={(e) => handleChange('cfe_punto_venta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>

              {/* Serie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serie
                </label>
                <input
                  type="text"
                  value={data.cfe_serie || 'A'}
                  onChange={(e) => handleChange('cfe_serie', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="A"
                />
              </div>
            </div>

            {/* Certificado Digital */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Certificado Digital</h4>
              <div className="grid grid-cols-1 gap-4">
                {/* Ruta del Certificado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificado (.p12 / .pfx)
                  </label>
                  <input
                    type="text"
                    value={data.cfe_certificado_path || ''}
                    onChange={(e) => handleChange('cfe_certificado_path', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ruta del certificado digital"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El certificado debe estar en formato .p12 o .pfx
                  </p>
                </div>

                {/* Contraseña del Certificado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña del Certificado
                  </label>
                  <input
                    type="password"
                    value={data.cfe_certificado_password || ''}
                    onChange={(e) => handleChange('cfe_certificado_password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Ambiente */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Configuración de Ambiente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ambiente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ambiente
                  </label>
                  <select
                    value={data.cfe_ambiente || 'desarrollo'}
                    onChange={(e) => handleChange('cfe_ambiente', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="desarrollo">Desarrollo (Testing)</option>
                    <option value="produccion">Producción</option>
                  </select>
                </div>

                {/* URL Web Service */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL del Web Service
                  </label>
                  <input
                    type="text"
                    value={data.cfe_ws_url || ''}
                    onChange={(e) => handleChange('cfe_ws_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://efactura.dgi.gub.uy/..."
                  />
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Información Importante</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• El certificado digital debe estar autorizado por DGI Uruguay</li>
                <li>• Use el ambiente de Desarrollo para realizar pruebas</li>
                <li>• Solo cambie a Producción cuando haya validado todos los comprobantes</li>
                <li>• Guarde de forma segura la contraseña del certificado</li>
              </ul>
            </div>
          </>
        )}

        {!data.cfe_habilitado && (
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              La facturación electrónica no está habilitada. Active la opción de arriba para configurarla.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
