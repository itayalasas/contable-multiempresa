import React, { useEffect, useState } from 'react';
import { AlertCircle, Waves } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { FlujoEfectivoData, reportesFinancierosService } from '../../services/supabase/reportesFinancieros';

export default function FlujoEfectivo() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<FlujoEfectivoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (!empresaActual?.id) return;
    try {
      setLoading(true);
      setError(null);
      setData(await reportesFinancierosService.obtenerFlujoEfectivo(empresaActual.id, fechaInicio, fechaFin));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar flujo de efectivo');
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
        <h1 className="text-2xl font-bold text-gray-900">Flujo de Efectivo</h1>
        <p className="text-gray-600 mt-1">Resumen de entradas y salidas de tesorería del período.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Ingresos operativos</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{formatearMoneda(data.ingresosOperativos)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Egresos operativos</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{formatearMoneda(data.egresosOperativos)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Transferencias</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{formatearMoneda(data.transferenciasNetas)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Flujo neto</div>
            <div className={`text-2xl font-bold mt-1 ${data.flujoNeto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatearMoneda(data.flujoNeto)}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Waves className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Lectura rápida</h2>
        </div>
        <p className="text-sm text-gray-600">
          Este reporte se construye directamente desde `movimientos_tesoreria`, por lo que refleja el efectivo operativo ya registrado en Supabase.
        </p>
      </div>
    </div>
  );
}
