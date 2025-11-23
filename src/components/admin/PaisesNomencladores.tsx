import React from 'react';
import { Globe, Check, X, Plus, Edit, Trash2 } from 'lucide-react';

interface PaisesNomencladoresProps {
  paises: {
    id: string;
    nombre: string;
    codigo: string;
    totalNomencladores: number;
    tieneDocumentoIdentidad: boolean;
    tieneDocumentoFactura: boolean;
    tieneImpuestos: boolean;
    tieneFormasPago: boolean;
  }[];
  onSelectPais: (paisId: string) => void;
  paisSeleccionado: string | null;
  onEditPais?: (paisId: string) => void;
  onDeletePais?: (paisId: string) => void;
}

export const PaisesNomencladores: React.FC<PaisesNomencladoresProps> = ({
  paises,
  onSelectPais,
  paisSeleccionado,
  onEditPais,
  onDeletePais
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">País</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Doc. Identidad</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Doc. Factura</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Impuestos</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Formas Pago</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            {(onEditPais || onDeletePais) && (
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paises.map((pais) => (
            <tr 
              key={pais.id} 
              className={`hover:bg-gray-50 cursor-pointer ${paisSeleccionado === pais.id ? 'bg-purple-50' : ''}`}
              onClick={() => onSelectPais(pais.id)}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Globe className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{pais.nombre}</div>
                    <div className="text-xs text-gray-500">{pais.codigo}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                {pais.tieneDocumentoIdentidad ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <X className="h-5 w-5 text-red-600 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                {pais.tieneDocumentoFactura ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <X className="h-5 w-5 text-red-600 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                {pais.tieneImpuestos ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <X className="h-5 w-5 text-red-600 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                {pais.tieneFormasPago ? (
                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                ) : (
                  <X className="h-5 w-5 text-red-600 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center">
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                  {pais.totalNomencladores}
                </span>
              </td>
              {(onEditPais || onDeletePais) && (
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {onEditPais && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPais(pais.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                        title="Editar país"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {onDeletePais && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePais(pais.id);
                        }}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Eliminar país"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};