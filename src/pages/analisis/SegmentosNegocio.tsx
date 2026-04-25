import React, { useEffect, useState } from 'react';
import { AlertCircle, Layers3 } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';

interface SegmentoRow {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_segmento: string;
  activo: boolean;
}

export default function SegmentosNegocio() {
  const { empresaActual } = useSesion();
  const [segmentos, setSegmentos] = useState<SegmentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!empresaActual?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('segmentos_negocio')
          .select('id, codigo, nombre, descripcion, tipo_segmento, activo')
          .eq('empresa_id', empresaActual.id)
          .order('codigo');

        if (error) throw error;
        setSegmentos((data || []) as SegmentoRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar segmentos');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [empresaActual?.id]);

  if (!empresaActual) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Seleccione una empresa para continuar</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Segmentos de Negocio</h1>
        <p className="text-gray-600 mt-1">Catálogo operativo para clasificación analítica por línea de negocio.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Layers3 className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Segmentos registrados</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando segmentos...</div>
        ) : segmentos.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No hay segmentos de negocio configurados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {segmentos.map((segmento) => (
                  <tr key={segmento.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{segmento.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{segmento.nombre}</div>
                      {segmento.descripcion && <div className="text-xs text-gray-500">{segmento.descripcion}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 uppercase">{segmento.tipo_segmento}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{segmento.activo ? 'Activo' : 'Inactivo'}</td>
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
