import React from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, TrendingUp, TrendingDown, AlertCircle, User, Calendar } from 'lucide-react';
import { MovimientoReciente } from '../../services/firebase/dashboard';

interface ActivityFeedProps {
  movimientos: MovimientoReciente[];
  loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ movimientos, loading = false }) => {
  const getIcon = (tipo: MovimientoReciente['tipo']) => {
    switch (tipo) {
      case 'ingreso': return TrendingUp;
      case 'gasto': return TrendingDown;
      case 'asiento': return FileText;
      default: return FileText;
    }
  };

  const getIconColor = (tipo: MovimientoReciente['tipo']) => {
    switch (tipo) {
      case 'ingreso': return 'text-green-600 bg-green-100';
      case 'gasto': return 'text-red-600 bg-red-100';
      case 'asiento': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(monto);
  };

  const getRelativeTime = (fecha: string) => {
    try {
      return formatDistance(new Date(fecha), new Date(), { 
        addSuffix: true,
        locale: es 
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          <span className="text-sm text-gray-500">
            {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {movimientos.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No hay actividad reciente
            </h4>
            <p className="text-gray-600">
              Los movimientos contables aparecerán aquí cuando se registren asientos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {movimientos.map((movimiento) => {
              const Icon = getIcon(movimiento.tipo);
              return (
                <div key={movimiento.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-full ${getIconColor(movimiento.tipo)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {movimiento.descripcion}
                      </p>
                      <p className={`text-sm font-semibold ml-2 ${
                        movimiento.tipo === 'ingreso' ? 'text-green-600' : 
                        movimiento.tipo === 'gasto' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {formatMonto(movimiento.monto)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{movimiento.asientoNumero}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{movimiento.usuario}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{getRelativeTime(movimiento.fecha)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {movimientos.length > 0 && (
          <div className="mt-6 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Ver toda la actividad
            </button>
          </div>
        )}
      </div>
    </div>
  );
};