import React from 'react';
import { useSesion } from '../../context/SesionContext';

export default function BalanceGeneral() {
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
          <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
          <p className="text-gray-600 mt-1">Estado de situación financiera</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Exportar PDF
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900">{empresaActual.nombre}</h2>
          <p className="text-gray-600">Balance General</p>
          <p className="text-sm text-gray-500">Al 31 de Diciembre de 2025</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">ACTIVO</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Activo Corriente</span>
                <span className="font-semibold">$0</span>
              </div>
              <div className="flex justify-between pl-4 text-sm">
                <span className="text-gray-600">Caja y Bancos</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between pl-4 text-sm">
                <span className="text-gray-600">Cuentas por Cobrar</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold text-gray-900">TOTAL ACTIVO</span>
                <span className="font-bold">$0</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              PASIVO Y PATRIMONIO
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Pasivo Corriente</span>
                <span className="font-semibold">$0</span>
              </div>
              <div className="flex justify-between pl-4 text-sm">
                <span className="text-gray-600">Cuentas por Pagar</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-gray-700">Patrimonio</span>
                <span className="font-semibold">$0</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold text-gray-900">TOTAL PASIVO + PATRIMONIO</span>
                <span className="font-bold">$0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
