import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const monthlyData = [
  { mes: 'Ene', ingresos: 45000, gastos: 32000 },
  { mes: 'Feb', ingresos: 52000, gastos: 38000 },
  { mes: 'Mar', ingresos: 48000, gastos: 35000 },
  { mes: 'Abr', ingresos: 61000, gastos: 42000 },
  { mes: 'May', ingresos: 55000, gastos: 39000 },
  { mes: 'Jun', ingresos: 67000, gastos: 45000 }
];

interface FinancialChartProps {
  type: 'line' | 'bar';
  title: string;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({ type, title }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line' ? (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#059669" 
                  strokeWidth={3}
                  name="Ingresos"
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  name="Gastos"
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem'
                  }}
                />
                <Bar dataKey="ingresos" fill="#059669" name="Ingresos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" fill="#dc2626" name="Gastos" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};