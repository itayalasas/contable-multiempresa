import React from 'react';
import { useSesion } from '../../context/SesionContext';

export default function CentrosCosto() {
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
          <h1 className="text-2xl font-bold text-gray-900">Centros de Costo</h1>
          <p className="text-gray-600 mt-1">
            Gestión de centros de costo para análisis de rentabilidad
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nuevo Centro de Costo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Centros</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600 mt-1">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Asignado</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">$0</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Presupuesto</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">$0</div>
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin centros de costo</h3>
        <p className="mt-1 text-sm text-gray-500">
          Los centros de costo permiten analizar ingresos y gastos por departamento o proyecto
        </p>
        <div className="mt-6">
          <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Crear primer centro de costo
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Información</h3>
            <p className="mt-1 text-sm text-blue-700">
              Ejemplos de centros de costo: Departamento de Ventas, Departamento de Marketing,
              Proyecto X, Sucursal A, etc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
