import React, { useEffect, useState } from 'react';
import { AlertCircle, PieChart } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { centrosCostoService, AnalisisRentabilidad } from '../../services/supabase/centrosCosto';

export default function ReporteCentrosCosto() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<AnalisisRentabilidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (!empresaActual?.id) return;
    try {
      setLoading(true);
      setError(null);
      setData(await centrosCostoService.obtenerAnalisisRentabilidad(empresaActual.id, fechaInicio, fechaFin));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar rentabilidad por centro de costo');
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
        <h1 className="text-2xl font-bold text-gray-900">Reporte por Centro de Costo</h1>
        <p className="text-gray-600 mt-1">Rentabilidad y ejecución comparada por centro.</p>
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

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Rentabilidad</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando análisis...</div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No hay datos de rentabilidad para el período seleccionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Egresos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Resultado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((item) => (
                  <tr key={item.centro_costo_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.centro_nombre}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatearMoneda(Number(item.total_ingresos || 0))}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatearMoneda(Number(item.total_egresos || 0))}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${item.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatearMoneda(Number(item.resultado || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{Number(item.porcentaje_ejecucion || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
