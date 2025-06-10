import React from 'react';
import { Edit, Trash2, Check, X } from 'lucide-react';

interface NomencladorCardProps {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activo: boolean;
  onEdit: () => void;
  onDelete: () => void;
  icon: React.ReactNode;
  badges?: { label: string; color: string }[];
}

export const NomencladorCard: React.FC<NomencladorCardProps> = ({
  id,
  nombre,
  codigo,
  descripcion,
  activo,
  onEdit,
  onDelete,
  icon,
  badges
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">{nombre}</h3>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {activo ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                {activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">
                {codigo}
              </span>
            </div>
            {descripcion && (
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">{descripcion}</p>
            )}
            {badges && badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((badge, index) => (
                  <span 
                    key={index} 
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-1 ml-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};