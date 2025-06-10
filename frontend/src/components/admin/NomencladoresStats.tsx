import React from 'react';
import { Globe, FileText, CreditCard, Percent, Database, DollarSign, Ban as BankIcon, Wallet } from 'lucide-react';

interface NomencladoresStatsProps {
  estadisticas: {
    totalPaises: number;
    totalNomencladores: number;
    porTipo: Record<string, number>;
    porPais: Record<string, number>;
  } | null;
  loading?: boolean;
}

export const NomencladoresStats: React.FC<NomencladoresStatsProps> = ({ 
  estadisticas, 
  loading = false 
}) => {
  if (loading || !estadisticas) {
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
      title: 'Total Nomencladores',
      value: estadisticas.totalNomencladores.toString(),
      subtitle: `En ${estadisticas.totalPaises} países`,
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500'
    },
    {
      title: 'Documentos de Identidad',
      value: (estadisticas.porTipo.tiposDocumentoIdentidad || 0).toString(),
      subtitle: 'DNI, RUC, etc.',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-500'
    },
    {
      title: 'Documentos de Factura',
      value: (estadisticas.porTipo.tiposDocumentoFactura || 0).toString(),
      subtitle: 'Facturas, Boletas, etc.',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500'
    },
    {
      title: 'Tipos de Impuesto',
      value: (estadisticas.porTipo.tiposImpuesto || 0).toString(),
      subtitle: 'IGV, IVA, etc.',
      icon: Percent,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500'
    },
    {
      title: 'Formas de Pago',
      value: (estadisticas.porTipo.formasPago || 0).toString(),
      subtitle: 'Efectivo, Transferencia, etc.',
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500'
    },
    {
      title: 'Tipos de Moneda',
      value: (estadisticas.porTipo.tiposMoneda || 0).toString(),
      subtitle: 'PEN, USD, etc.',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500'
    },
    {
      title: 'Bancos',
      value: (estadisticas.porTipo.bancos || 0).toString(),
      subtitle: 'Entidades financieras',
      icon: BankIcon,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-500'
    },
    {
      title: 'Movimientos Tesorería',
      value: (estadisticas.porTipo.tiposMovimientoTesoreria || 0).toString(),
      subtitle: 'Ingresos, Egresos, etc.',
      icon: Wallet,
      color: 'text-teal-600',
      bgColor: 'bg-teal-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
  );
};