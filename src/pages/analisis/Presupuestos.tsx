import React, { useEffect, useState } from 'react';
import { AlertCircle, Target } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';

interface PresupuestoRow {
  id: string;
  monto_presupuestado: number;
  monto_ejecutado: number;
  monto_comprometido: number;
  monto_disponible: number;
  porcentaje_ejecucion: number;
  centro?: { codigo?: string; nombre?: string } | null;
}

export default function Presupuestos() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [presupuestos, setPresupuestos] = useState<PresupuestoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!empresaActual?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('presupuesto_centro_costo')
          .select(`
            id,
            monto_presupuestado,
            monto_ejecutado,
            monto_comprometido,
            monto_disponible,
            porcentaje_ejecucion,
            centro:centros_costo (
              codigo,
              nombre
            )
          `)
          .eq('empresa_id', empresaActual.id)
          .order('id', { ascending: false });

        if (error) throw error;
        setPresupuestos((data || []) as PresupuestoRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar presupuestos');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [empresaActual?.id]);

  const totalPresupuestado = presupuestos.reduce((sum, item) => sum + Number(item.monto_presupuestado || 0), 0);
  const totalEjecutado = presupuestos.reduce((sum, item) => sum + Number(item.monto_ejecutado || 0), 0);

  if (!empresaActual) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Seleccione una empresa para continuar</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="text-gray-600 mt-1">Seguimiento presupuestario por centro de costo y período.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Presupuestado</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatearMoneda(totalPresupuestado)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Ejecutado</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatearMoneda(totalEjecutado)}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Asignaciones presupuestarias</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando presupuestos...</div>
        ) : presupuestos.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No hay presupuestos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centro</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuestado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ejecutado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponible</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {presupuestos.map((presupuesto) => (
                  <tr key={presupuesto.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{presupuesto.centro?.codigo || 'CC'} - {presupuesto.centro?.nombre || 'Centro no identificado'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatearMoneda(Number(presupuesto.monto_presupuestado || 0))}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatearMoneda(Number(presupuesto.monto_ejecutado || 0))}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatearMoneda(Number(presupuesto.monto_disponible || 0))}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{Number(presupuesto.porcentaje_ejecucion || 0).toFixed(1)}%</td>
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
