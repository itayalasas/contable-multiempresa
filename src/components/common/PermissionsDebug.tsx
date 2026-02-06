import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield } from 'lucide-react';

export const PermissionsDebug: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { role, permissions } = usePermissions();
  const { usuario } = useAuth();

  if (!usuario) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        title={isOpen ? 'Ocultar permisos' : 'Ver permisos'}
      >
        <Shield className="h-4 w-4" />
        {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="text-sm">Permisos</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-96 max-h-96 overflow-y-auto">
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Usuario Actual</h3>
            <p className="text-xs text-gray-600">{usuario.nombre}</p>
            <p className="text-xs text-gray-500">{usuario.email}</p>
          </div>

          <div className="mb-3 pb-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Rol</h3>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {role || 'Sin rol'}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Permisos por Módulo</h3>
            {permissions && Object.keys(permissions).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(permissions).map(([module, perms]) => (
                  <div key={module} className="text-xs">
                    <div className="font-medium text-gray-700 mb-1">{module}:</div>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {Array.isArray(perms) && perms.map((perm) => (
                        <span
                          key={perm}
                          className={`inline-flex px-2 py-0.5 text-xs rounded ${
                            perm === 'create'
                              ? 'bg-green-100 text-green-700'
                              : perm === 'read'
                              ? 'bg-blue-100 text-blue-700'
                              : perm === 'update'
                              ? 'bg-yellow-100 text-yellow-700'
                              : perm === 'delete'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No hay permisos configurados</p>
            )}
          </div>

          {(!role || !permissions || Object.keys(permissions).length === 0) && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ No se detectaron permisos. Verifica que el token incluya "role" y "permissions".
            </div>
          )}
        </div>
      )}
    </div>
  );
};
