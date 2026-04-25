import React, { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { reportesFinancierosService, EstadoResultadosData } from '../../services/supabase/reportesFinancieros';

export default function EstadoResultados() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<EstadoResultadosData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (!empresaActual?.id) return;
    try {
      setLoading(true);
      setError(null);
      setData(await reportesFinancierosService.obtenerEstadoResultados(empresaActual.id, fechaInicio, fechaFin));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar estado de resultados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [empresaActual?.id]);

  if (!empresaActual) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Seleccione una empresa para continuar</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados</h1>
        <p className="text-gray-600 mt-1">Ingresos, gastos y resultado neto del período.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <button onClick={cargar} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
          {loading ? 'Generando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Ingresos</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{formatearMoneda(data.totalIngresos)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Gastos</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{formatearMoneda(data.totalGastos)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Resultado neto</div>
              <div className={`text-2xl font-bold mt-1 ${data.resultadoNeto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatearMoneda(data.resultadoNeto)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">Ingresos</div>
              <div className="divide-y divide-gray-200">
                {data.ingresos.map((item) => (
                  <div key={item.codigo} className="px-4 py-3 flex justify-between text-sm">
                    <span>{item.codigo} - {item.nombre}</span>
                    <span className="font-medium">{formatearMoneda(item.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">Gastos</div>
              <div className="divide-y divide-gray-200">
                {data.gastos.map((item) => (
                  <div key={item.codigo} className="px-4 py-3 flex justify-between text-sm">
                    <span>{item.codigo} - {item.nombre}</span>
                    <span className="font-medium">{formatearMoneda(item.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
