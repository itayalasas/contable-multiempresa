import React from 'react';
import { Ban as Bank, FileText, CheckCircle, AlertTriangle, ArrowLeftRight, Clock } from 'lucide-react';

interface ResumenConciliacionProps {
  resumen: {
    totalMovimientosBancarios: number;
    totalMovimientosContables: number;
    movimientosBancariosConciliados: number;
    movimientosContablesConciliados: number;
    movimientosPendientes: number;
    diferenciaTotal: number;
  };
  loading?: boolean;
  formatearMoneda: (monto: number) => string;
}

export const ResumenConciliacion: React.FC<ResumenConciliacionProps> = ({ 
  resumen, 
  loading = false,
  formatearMoneda
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Movimientos Bancarios</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-indigo-600">
                {resumen.totalMovimientosBancarios}
              </p>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                {resumen.movimientosBancariosConciliados} conciliados
              </span>
            </div>
            <div className="flex items-center mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ 
                    width: `${resumen.totalMovimientosBancarios > 0 
                      ? (resumen.movimientosBancariosConciliados / resumen.totalMovimientosBancarios) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {resumen.totalMovimientosBancarios > 0 
                  ? Math.round((resumen.movimientosBancariosConciliados / resumen.totalMovimientosBancarios) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
          <div className="p-3 rounded-full bg-indigo-500">
            <Bank className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Movimientos Contables</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-indigo-600">
                {resumen.totalMovimientosContables}
              </p>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                {resumen.movimientosContablesConciliados} conciliados
              </span>
            </div>
            <div className="flex items-center mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ 
                    width: `${resumen.totalMovimientosContables > 0 
                      ? (resumen.movimientosContablesConciliados / resumen.totalMovimientosContables) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              <span className="ml-2 text-xs text-gray-500">
                {resumen.totalMovimientosContables > 0 
                  ? Math.round((resumen.movimientosContablesConciliados / resumen.totalMovimientosContables) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
          <div className="p-3 rounded-full bg-indigo-500">
            <FileText className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Estado de Conciliación</p>
            <p className={`text-2xl font-bold ${resumen.diferenciaTotal === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {resumen.diferenciaTotal === 0 ? 'Conciliado' : formatearMoneda(Math.abs(resumen.diferenciaTotal))}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-gray-500">
                {resumen.movimientosPendientes} movimientos pendientes
              </p>
            </div>
          </div>
          <div className={`p-3 rounded-full ${resumen.diferenciaTotal === 0 ? 'bg-green-500' : 'bg-red-500'}`}>
            {resumen.diferenciaTotal === 0 ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};