import React from 'react';
import { useSesion } from '../../context/SesionContext';

export default function NotasDebito() {
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
          <h1 className="text-2xl font-bold text-gray-900">Notas de Débito</h1>
          <p className="text-gray-600 mt-1">
            Gestión de notas de débito para ajustes y cargos adicionales
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nueva Nota de Débito
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Notas</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Enviadas a DGI</div>
          <div className="text-2xl font-bold text-green-600 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Monto Total</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">$0</div>
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin notas de débito</h3>
        <p className="mt-1 text-sm text-gray-500">
          Las notas de débito se usan para aumentar el monto de una factura
        </p>
        <div className="mt-6">
          <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Crear primera nota de débito
          </button>
        </div>
      </div>
    </div>
  );
}
