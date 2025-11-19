import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Callback: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAuth();
  const [processingStatus, setProcessingStatus] = useState('Verificando credenciales...');

  useEffect(() => {
    console.log('Callback page - procesando autenticación...');

    const checkAuthAndRedirect = async () => {
      try {
        // Esperar un momento para que AuthContext procese la autenticación
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (isAuthenticated) {
          setProcessingStatus('Autenticación exitosa! Redirigiendo...');
          console.log('✅ Autenticación exitosa, redirigiendo a dashboard');

          // Pequeño delay para que el usuario vea el mensaje de éxito
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        } else if (!isLoading && !isAuthenticated) {
          console.log('❌ Error en autenticación, redirigiendo a login');
          setProcessingStatus('Error en autenticación, redirigiendo...');

          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1500);
        }
      } catch (err) {
        console.error('Error en callback:', err);
        setProcessingStatus('Error procesando autenticación...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }
    };

    if (!isLoading) {
      checkAuthAndRedirect();
    }
  }, [isAuthenticated, isLoading, navigate]);

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
              {error ? `❌ ${error}` : `🔐 ${processingStatus}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
