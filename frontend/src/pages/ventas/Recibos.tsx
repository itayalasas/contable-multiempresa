import React from 'react';
import { useSesion } from '../../context/SesionContext';

export default function Recibos() {
  const { empresaActual } = useSesion();

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recibos de Pago</h1>
          <p className="text-gray-600 mt-1">
            Gestión de recibos oficiales de cobro
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nuevo Recibo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Recibos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Este Mes</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Monto Cobrado</div>
          <div className="text-2xl font-bold text-green-600 mt-1">$0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Anulados</div>
          <div className="text-2xl font-bold text-red-600 mt-1">0</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin recibos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Los recibos documentan formalmente los pagos recibidos de clientes
        </p>
        <div className="mt-6">
          <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Crear primer recibo
          </button>
        </div>
      </div>
    </div>
  );
}
