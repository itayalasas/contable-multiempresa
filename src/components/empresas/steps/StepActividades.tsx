import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Actividad {
  codigo: string;
  descripcion: string;
  principal: boolean;
}

interface StepActividadesProps {
  data: any;
  onChange: (data: any) => void;
  paisId?: string;
}

export const StepActividades: React.FC<StepActividadesProps> = ({ data, onChange }) => {
  const [actividades, setActividades] = useState<Actividad[]>(data.actividades_economicas || []);
  const [nuevaActividad, setNuevaActividad] = useState<Actividad>({
    codigo: '',
    descripcion: '',
    principal: false
  });

  useEffect(() => {
    onChange({ ...data, actividades_economicas: actividades });
  }, [actividades]);

  const handleAgregarActividad = () => {
    if (nuevaActividad.codigo && nuevaActividad.descripcion) {
      const actividadesActualizadas = [...actividades, { ...nuevaActividad }];
      setActividades(actividadesActualizadas);
      setNuevaActividad({ codigo: '', descripcion: '', principal: false });
    }
  };

  const handleEliminarActividad = (index: number) => {
    const actividadesActualizadas = actividades.filter((_, i) => i !== index);
    setActividades(actividadesActualizadas);
  };

  const handleMarcarPrincipal = (index: number) => {
    const actividadesActualizadas = actividades.map((act, i) => ({
      ...act,
      principal: i === index
    }));
    setActividades(actividadesActualizadas);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividades Económicas</h3>
        <p className="text-sm text-gray-600 mb-6">
          Registre las actividades económicas de la empresa según la clasificación CIIU (Clasificación Industrial Internacional Uniforme).
        </p>

        {/* Lista de Actividades */}
        {actividades.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Actividades Registradas</h4>
            <div className="space-y-2">
              {actividades.map((actividad, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-semibold text-gray-700">
                        {actividad.codigo}
                      </span>
                      {actividad.principal && (
                        <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{actividad.descripcion}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!actividad.principal && (
                      <button
                        onClick={() => handleMarcarPrincipal(index)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                      >
                        Marcar Principal
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminarActividad(index)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario Nueva Actividad */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Agregar Nueva Actividad</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código CIIU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código CIIU
              </label>
              <input
                type="text"
                value={nuevaActividad.codigo}
                onChange={(e) => setNuevaActividad({ ...nuevaActividad, codigo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 6201"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la Actividad
              </label>
              <input
                type="text"
                value={nuevaActividad.descripcion}
                onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Desarrollo de software"
              />
            </div>
          </div>

          {/* Actividad Principal */}
          <div className="mt-4 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={nuevaActividad.principal}
              onChange={(e) => setNuevaActividad({ ...nuevaActividad, principal: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              id="nueva_actividad_principal"
            />
            <label htmlFor="nueva_actividad_principal" className="text-sm font-medium text-gray-700">
              Esta es la actividad económica principal
            </label>
          </div>

          {/* Botón Agregar */}
          <div className="mt-4">
            <button
              onClick={handleAgregarActividad}
              disabled={!nuevaActividad.codigo || !nuevaActividad.descripcion}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Actividad</span>
            </button>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Información sobre CIIU</h4>
          <p className="text-xs text-blue-800 mb-2">
            La Clasificación Industrial Internacional Uniforme (CIIU) es un sistema de clasificación de actividades económicas.
          </p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Debe registrar al menos una actividad económica</li>
            <li>• Una de las actividades debe estar marcada como principal</li>
            <li>• Los códigos CIIU deben corresponder a la clasificación vigente</li>
            <li>• Puede agregar múltiples actividades si la empresa tiene varios giros</li>
          </ul>
        </div>

        {/* Ejemplos Comunes */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Ejemplos de Códigos CIIU Comunes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
            <div><strong>6201:</strong> Desarrollo de software</div>
            <div><strong>4711:</strong> Comercio al por menor</div>
            <div><strong>6920:</strong> Servicios de contabilidad</div>
            <div><strong>7010:</strong> Actividades de oficinas principales</div>
            <div><strong>5610:</strong> Restaurantes y servicios móviles de comida</div>
            <div><strong>8559:</strong> Enseñanza y formación</div>
          </div>
        </div>
      </div>
    </div>
  );
};
