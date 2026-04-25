import React, { useEffect, useState } from 'react';
import { AlertCircle, FileText, RotateCcw } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';

interface NotaCompraRow {
  id: string;
  numero: string;
  serie?: string;
  fecha: string;
  estado: string;
  total: number;
  proveedor?: { razon_social?: string } | null;
  tipo_documento?: { nombre?: string; codigo?: string } | null;
}

export default function NotasCreditoCompra() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [notas, setNotas] = useState<NotaCompraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!empresaActual?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('documentos_compra')
          .select(`
            id,
            numero,
            serie,
            fecha,
            estado,
            total,
            proveedor:proveedores (
              razon_social
            ),
            tipo_documento:tipos_documento_dgi (
              nombre,
              codigo
            )
          `)
          .eq('empresa_id', empresaActual.id)
          .order('fecha', { ascending: false });

        if (error) throw error;

        const filtradas = (data || []).filter((item: any) => {
          const nombre = (item.tipo_documento?.nombre || '').toLowerCase();
          const codigo = (item.tipo_documento?.codigo || '').toLowerCase();
          return nombre.includes('crédito') || nombre.includes('credito') || codigo.includes('nc');
        });

        setNotas(filtradas as NotaCompraRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar notas de crédito');
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
        <h1 className="text-2xl font-bold text-gray-900">Notas de Crédito de Compras</h1>
        <p className="text-gray-600 mt-1">Control de documentos de ajuste emitidos por proveedores.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Notas registradas</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando notas de crédito...</div>
        ) : notas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No hay notas de crédito de compras registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {notas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{nota.serie ? `${nota.serie}-${nota.numero}` : nota.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{nota.proveedor?.razon_social || 'Sin proveedor'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{nota.tipo_documento?.nombre || nota.tipo_documento?.codigo || 'NC'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(nota.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 uppercase">{nota.estado}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatearMoneda(Number(nota.total || 0))}</td>
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
