import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Globe, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { Empresa } from '../../types';

export const SelectorEmpresa: React.FC = () => {
  const { 
    empresaActual, 
    empresasDisponibles, 
    paisActual,
    seleccionarEmpresa,
    formatearMoneda 
  } = useSesion();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSeleccionarEmpresa = async (empresa: Empresa) => {
    if (empresa.id === empresaActual?.id) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await seleccionarEmpresa(empresa);
      setIsOpen(false);
    } catch (error) {
      console.error('Error seleccionando empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!empresaActual) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-yellow-600" />
          <span className="text-sm text-yellow-800">No hay empresas asignadas</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center space-x-3 w-full p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 text-left">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {empresaActual.nombre}
            </h3>
            {paisActual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                <Globe className="h-3 w-3 mr-1" />
                {paisActual.codigo}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {empresaActual.numeroIdentificacion}
          </p>
        </div>
        
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-900">
              Seleccionar Empresa ({empresasDisponibles.length})
            </h4>
          </div>
          
          <div className="py-2">
            {empresasDisponibles.map((empresa) => (
              <button
                key={empresa.id}
                onClick={() => handleSeleccionarEmpresa(empresa)}
                disabled={loading}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {empresa.nombre}
                      </h5>
                      {empresa.id === empresaActual.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-gray-500">
                        {empresa.numeroIdentificacion}
                      </p>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>{empresa.paisId}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{empresa.usuariosAsignados.length}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {empresasDisponibles.length === 0 && (
            <div className="p-6 text-center">
              <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay empresas disponibles</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente para mostrar información detallada de la empresa actual
const InfoEmpresaActual: React.FC = () => {
  const { empresaActual, paisActual, formatearMoneda } = useSesion();

  if (!empresaActual || !paisActual) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              {empresaActual.nombre}
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <Globe className="h-4 w-4 mr-1" />
              {paisActual.nombre}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4">{empresaActual.razonSocial}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-gray-700">Identificación:</span>
                <span className="text-gray-600">{empresaActual.numeroIdentificacion}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{empresaActual.direccion}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{empresaActual.telefono}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{empresaActual.email}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-gray-700">Moneda:</span>
                <span className="text-gray-600">
                  {empresaActual.monedaPrincipal} ({paisActual.simboloMoneda})
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Ejercicio {empresaActual.configuracionContable.ejercicioFiscal}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};