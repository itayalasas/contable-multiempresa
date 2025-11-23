import React, { useState } from 'react';
import { useSesion } from '../../context/SesionContext';

interface Moneda {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  tipoCambio: number;
  activa: boolean;
  ultimaActualizacion: string;
}

export default function Multimoneda() {
  const { empresaActual } = useSesion();
  const [monedas] = useState<Moneda[]>([
    {
      id: '1',
      codigo: 'UYU',
      nombre: 'Peso Uruguayo',
      simbolo: '$',
      tipoCambio: 1,
      activa: true,
      ultimaActualizacion: new Date().toISOString(),
    },
    {
      id: '2',
      codigo: 'USD',
      nombre: 'Dólar Estadounidense',
      simbolo: 'US$',
      tipoCambio: 39.5,
      activa: true,
      ultimaActualizacion: new Date().toISOString(),
    },
    {
      id: '3',
      codigo: 'EUR',
      nombre: 'Euro',
      simbolo: '€',
      tipoCambio: 43.2,
      activa: true,
      ultimaActualizacion: new Date().toISOString(),
    },
    {
      id: '4',
      codigo: 'ARS',
      nombre: 'Peso Argentino',
      simbolo: 'AR$',
      tipoCambio: 0.04,
      activa: false,
      ultimaActualizacion: new Date().toISOString(),
    },
  ]);

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
          <h1 className="text-2xl font-bold text-gray-900">Multi-moneda</h1>
          <p className="text-gray-600 mt-1">
            Gestión de monedas y tipos de cambio para operaciones internacionales
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nueva Moneda
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Monedas</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{monedas.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Activas</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {monedas.filter((m) => m.activa).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Moneda Base</div>
          <div className="text-xl font-bold text-blue-600 mt-1">
            {monedas.find((m) => m.tipoCambio === 1)?.codigo}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Última Actualización</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Tipos de Cambio</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Actualizar Todos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Moneda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Símbolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo de Cambio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Última Actualización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monedas.map((moneda) => (
                <tr key={moneda.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{moneda.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700">
                      {moneda.codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moneda.simbolo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {moneda.tipoCambio.toFixed(4)}
                    </div>
                    {moneda.codigo !== 'UYU' && (
                      <div className="text-xs text-gray-500">
                        1 {moneda.codigo} = {moneda.tipoCambio.toFixed(2)} UYU
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(moneda.ultimaActualizacion).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {moneda.activa ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Actualizar
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Conversor de Monedas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {monedas
                .filter((m) => m.activa)
                .map((m) => (
                  <option key={m.id} value={m.codigo}>
                    {m.codigo} - {m.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">A</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {monedas
                .filter((m) => m.activa)
                .map((m) => (
                  <option key={m.id} value={m.codigo}>
                    {m.codigo} - {m.nombre}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Resultado</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">0.00</div>
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
              Los tipos de cambio se pueden actualizar automáticamente desde servicios externos
              o manualmente. La moneda base (UYU) siempre tiene tipo de cambio 1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
