import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, Wallet } from 'lucide-react';
import { ResumenFinanciero } from '../../services/firebase/dashboard';

interface FinancialSummaryProps {
  resumen: ResumenFinanciero;
  loading?: boolean;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ resumen, loading = false }) => {
  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(monto);
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return '↗';
    if (value < 0) return '↘';
    return '→';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
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
      title: 'Ingresos Totales',
      value: resumen.totalIngresos,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      change: null // Podríamos calcular cambio vs período anterior
    },
    {
      title: 'Gastos Totales',
      value: resumen.totalGastos,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      change: null
    },
    {
      title: 'Utilidad Neta',
      value: resumen.utilidadNeta,
      icon: DollarSign,
      color: getChangeColor(resumen.utilidadNeta),
      bgColor: resumen.utilidadNeta >= 0 ? 'bg-blue-500' : 'bg-red-500',
      change: null
    },
    {
      title: 'Efectivo Disponible',
      value: resumen.efectivoDisponible,
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      change: null
    },
    {
      title: 'Cuentas por Cobrar',
      value: resumen.cuentasPorCobrar,
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      change: null
    },
    {
      title: 'Cuentas por Pagar',
      value: resumen.cuentasPorPagar,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      change: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color} mb-1`}>
                  {formatMonto(card.value)}
                </p>
                {card.change && (
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      card.change > 0 ? 'bg-green-100 text-green-800' : 
                      card.change < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getChangeIcon(card.change)}
                      {Math.abs(card.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};