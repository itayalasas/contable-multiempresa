import React from 'react';

interface StepConfigFiscalProps {
  data: any;
  onChange: (data: any) => void;
  paisId?: string;
}

export const StepConfigFiscal: React.FC<StepConfigFiscalProps> = ({ data, onChange }) => {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración Fiscal</h3>
        <p className="text-sm text-gray-600 mb-6">
          Configure los parámetros fiscales de la empresa. Estos datos son importantes para el cumplimiento tributario.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Responsabilidad IVA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsabilidad IVA
            </label>
            <select
              value={data.responsabilidad_iva || 'responsable_inscripto'}
              onChange={(e) => handleChange('responsabilidad_iva', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
              <option value="no_responsable">No Responsable</option>
            </select>
          </div>

          {/* Número BPS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número BPS
            </label>
            <input
              type="text"
              value={data.numero_bps || ''}
              onChange={(e) => handleChange('numero_bps', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 123456"
            />
          </div>

          {/* Número MTSS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número MTSS
            </label>
            <input
              type="text"
              value={data.numero_mtss || ''}
              onChange={(e) => handleChange('numero_mtss', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 78910"
            />
          </div>

          {/* Régimen Tributario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Régimen Tributario
            </label>
            <select
              value={data.regimen_tributario || 'general'}
              onChange={(e) => handleChange('regimen_tributario', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">Régimen General</option>
              <option value="simplificado">Régimen Simplificado</option>
              <option value="monotributo">Monotributo</option>
              <option value="especial">Régimen Especial</option>
            </select>
          </div>

          {/* Ejercicio Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Año del Ejercicio Fiscal
            </label>
            <input
              type="number"
              value={data.ejercicio_fiscal || new Date().getFullYear()}
              onChange={(e) => handleChange('ejercicio_fiscal', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="2000"
              max="2099"
            />
          </div>

          {/* Fecha Inicio Ejercicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio del Ejercicio
            </label>
            <input
              type="text"
              value={data.fecha_inicio_ejercicio || ''}
              onChange={(e) => {
                let value = e.target.value.replace(/[^\d]/g, '');
                if (value.length >= 2) {
                  value = value.slice(0, 2) + '/' + value.slice(2);
                }
                if (value.length >= 5) {
                  value = value.slice(0, 5) + '/' + value.slice(5, 9);
                }
                handleChange('fecha_inicio_ejercicio', value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="dd/mm/aaaa"
              maxLength={10}
            />
          </div>

          {/* Fecha Fin Ejercicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin del Ejercicio
            </label>
            <input
              type="text"
              value={data.fecha_fin_ejercicio || ''}
              onChange={(e) => {
                let value = e.target.value.replace(/[^\d]/g, '');
                if (value.length >= 2) {
                  value = value.slice(0, 2) + '/' + value.slice(2);
                }
                if (value.length >= 5) {
                  value = value.slice(0, 5) + '/' + value.slice(5, 9);
                }
                handleChange('fecha_fin_ejercicio', value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="dd/mm/aaaa"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      {/* Configuración Contable */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración Contable</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Método de Costeo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Costeo
            </label>
            <select
              value={data.metodo_costeo || 'promedio'}
              onChange={(e) => handleChange('metodo_costeo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="promedio">Costo Promedio</option>
              <option value="fifo">FIFO (Primero en Entrar, Primero en Salir)</option>
              <option value="lifo">LIFO (Último en Entrar, Primero en Salir)</option>
            </select>
          </div>

          {/* Tipo de Inventario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Inventario
            </label>
            <select
              value={data.tipo_inventario || 'perpetuo'}
              onChange={(e) => handleChange('tipo_inventario', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="perpetuo">Inventario Perpetuo</option>
              <option value="periodico">Inventario Periódico</option>
            </select>
          </div>

          {/* Maneja Inventario */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.maneja_inventario || false}
              onChange={(e) => handleChange('maneja_inventario', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id="maneja_inventario"
            />
            <label htmlFor="maneja_inventario" className="text-sm font-medium text-gray-700">
              La empresa maneja inventario
            </label>
          </div>

          {/* Decimales Moneda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimales para Moneda
            </label>
            <input
              type="number"
              value={data.decimales_moneda || 2}
              onChange={(e) => handleChange('decimales_moneda', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="4"
            />
          </div>

          {/* Decimales Cantidades */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimales para Cantidades
            </label>
            <input
              type="number"
              value={data.decimales_cantidades || 2}
              onChange={(e) => handleChange('decimales_cantidades', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="4"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
