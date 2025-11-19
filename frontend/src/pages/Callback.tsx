import React, { useEffect } from 'react';
import { Building2 } from 'lucide-react';

export const Callback: React.FC = () => {
  useEffect(() => {
    console.log('Callback page - procesando autenticación...');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-4 rounded-full">
            <Building2 className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Procesando autenticación
          </h2>
          <p className="text-gray-600 mb-4">
            Por favor espera mientras validamos tu sesión...
          </p>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              🔐 Verificando credenciales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
