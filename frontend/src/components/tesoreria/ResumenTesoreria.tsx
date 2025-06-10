import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Calendar, Ban as BankIcon, PiggyBank, CreditCard, DollarSign, BarChart3 } from 'lucide-react';

interface ResumenTesoreriaProps {
  resumen: {
    totalCuentas: number;
    saldoTotal: number;
    saldoDisponible: number;
    ingresosDelMes: number;
    egresosDelMes: number;
    movimientosPendientes: number;
    saldoPorMoneda: {
      moneda: string;
      saldo: number;
    }[];
    saldoPorTipoCuenta: {
      tipo: string;
      saldo: number;
    }[];
  } | null;
  loading?: boolean;
  formatearMoneda: (monto: number) => string;
}

export const ResumenTesoreria: React.FC<ResumenTesoreriaProps> = ({ 
  resumen, 
  loading = false,
  formatearMoneda
}) => {
  if (loading || !resumen) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
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
      title: 'Saldo Total',
      value: formatearMoneda(resumen.saldoTotal),
      subtitle: `${resumen.totalCuentas} cuentas activas`,
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Ingresos del Mes',
      value: formatearMoneda(resumen.ingresosDelMes),
      subtitle: `Flujo positivo`,
      icon: ArrowUpRight,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-200'
    },
    {
      title: 'Egresos del Mes',
      value: formatearMoneda(resumen.egresosDelMes),
      subtitle: `Flujo negativo`,
      icon: ArrowDownRight,
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      borderColor: 'border-red-200'
    },
    {
      title: 'Pendientes',
      value: resumen.movimientosPendientes.toString(),
      subtitle: `Movimientos por conciliar`,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
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

      {/* Distribución por tipo de cuenta */}
      {resumen.saldoPorTipoCuenta.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Distribución por Tipo de Cuenta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {resumen.saldoPorTipoCuenta.map((item, index) => {
              let Icon;
              let bgColor;
              let textColor;
              
              switch (item.tipo) {
                case 'CORRIENTE':
                  Icon = BankIcon;
                  bgColor = 'bg-blue-100';
                  textColor = 'text-blue-800';
                  break;
                case 'AHORRO':
                  Icon = PiggyBank;
                  bgColor = 'bg-green-100';
                  textColor = 'text-green-800';
                  break;
                case 'EFECTIVO':
                  Icon = Wallet;
                  bgColor = 'bg-yellow-100';
                  textColor = 'text-yellow-800';
                  break;
                case 'TARJETA':
                  Icon = CreditCard;
                  bgColor = 'bg-purple-100';
                  textColor = 'text-purple-800';
                  break;
                default:
                  Icon = DollarSign;
                  bgColor = 'bg-gray-100';
                  textColor = 'text-gray-800';
              }
              
              return (
                <div key={index} className={`${bgColor} rounded-lg p-4 border border-${textColor.replace('text-', 'border-')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-medium ${textColor}`}>{item.tipo}</h4>
                    <Icon className={`h-4 w-4 ${textColor}`} />
                  </div>
                  <p className={`text-xl font-bold ${textColor}`}>
                    {formatearMoneda(item.saldo)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribución por moneda */}
      {resumen.saldoPorMoneda.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Moneda</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resumen.saldoPorMoneda.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-800">{item.moneda}</h4>
                  <DollarSign className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatearMoneda(item.saldo)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};