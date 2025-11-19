import React from 'react';
import { useSesion } from '../../context/SesionContext';

export default function PeriodosContables() {
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
          <h1 className="text-2xl font-bold text-gray-900">Periodos Contables</h1>
          <p className="text-gray-600 mt-1">
            Gestión de ejercicios fiscales y periodos contables
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nuevo Periodo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Periodo Actual</div>
          <div className="text-xl font-bold text-gray-900 mt-1">2025</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Estado</div>
          <div className="text-xl font-bold text-green-600 mt-1">Abierto</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Asientos</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Días Rest Antes</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">31</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Periodos Fiscales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Año
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Asientos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  01/01/2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  31/12/2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    Abierto
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Ver</button>
                  <button className="text-red-600 hover:text-red-900">Cerrar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-yellow-600 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Al cerrar un periodo contable, no se podrán crear ni modificar asientos en ese
              periodo. Asegúrate de revisar toda la información antes de cerrar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
