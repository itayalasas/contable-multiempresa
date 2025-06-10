import React from 'react';
import { 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users,
  Calendar,
  CreditCard
} from 'lucide-react';
import { ResumenCuentasPorCobrar as ResumenCuentasPorCobrarType } from '../../types/cuentasPorCobrar';

interface ResumenCuentasPorCobrarProps {
  resumen: ResumenCuentasPorCobrarType | null;
  loading?: boolean;
}

export const ResumenCuentasPorCobrar: React.FC<ResumenCuentasPorCobrarProps> = ({ 
  resumen, 
  loading = false 
}) => {
  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(cantidad);
  };

  if (loading || !resumen) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
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

  const cards = [
    {
      title: 'Total por Cobrar',
      value: formatearMoneda(resumen.totalPorCobrar),
      subtitle: `${resumen.totalFacturas} facturas`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Facturas Vencidas',
      value: formatearMoneda(resumen.totalVencido),
      subtitle: `${resumen.facturasVencidas} facturas`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      borderColor: 'border-red-200'
    },
    {
      title: 'Por Vencer',
      value: formatearMoneda(resumen.totalPorVencer),
      subtitle: `${resumen.facturasPendientes} pendientes`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Facturas del Mes',
      value: resumen.facturasDelMes.toString(),
      subtitle: 'Nuevas facturas',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-200'
    },
    {
      title: 'Promedio Cobranza',
      value: `${resumen.promedioCobranza} días`,
      subtitle: 'Tiempo promedio',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Clientes con Deuda',
      value: resumen.clientesConDeuda.toString(),
      subtitle: 'Clientes activos',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Vencido 0-30 días',
      value: formatearMoneda(resumen.vencimiento0a30),
      subtitle: 'Reciente',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Vencido +90 días',
      value: formatearMoneda(resumen.vencimientoMas90),
      subtitle: 'Crítico',
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-600',
      borderColor: 'border-red-300'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.slice(0, 4).map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`bg-white rounded-lg shadow-sm border-2 ${card.borderColor} p-6 hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color} mb-1`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.slice(4).map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index + 4} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-xl font-bold ${card.color} mb-1`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Análisis de antigüedad de saldos */}
      {(resumen.vencimiento0a30 > 0 || resumen.vencimiento31a60 > 0 || resumen.vencimiento61a90 > 0 || resumen.vencimientoMas90 > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Antigüedad de Saldos</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">0-30 días</p>
              <p className="text-xl font-bold text-green-600">{formatearMoneda(resumen.vencimiento0a30)}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">31-60 días</p>
              <p className="text-xl font-bold text-yellow-600">{formatearMoneda(resumen.vencimiento31a60)}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-orange-800">61-90 días</p>
              <p className="text-xl font-bold text-orange-600">{formatearMoneda(resumen.vencimiento61a90)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800">+90 días</p>
              <p className="text-xl font-bold text-red-600">{formatearMoneda(resumen.vencimientoMas90)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clientes con mayor deuda */}
      {resumen.clientesMayorDeuda.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes con Mayor Deuda</h3>
          <div className="space-y-3">
            {resumen.clientesMayorDeuda.slice(0, 5).map((cliente, index) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{cliente.numeroDocumento}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Deuda pendiente</p>
                  <p className="text-xs text-gray-500">Ver detalle →</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};