import React, { useEffect, useState } from 'react';
import { AlertCircle, ClipboardList, Link2 } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';

interface OrdenCompraRow {
  id: string;
  orden_compra_id?: string;
  numero: string;
  fecha: string;
  estado: string;
  total: number;
  proveedor?: { razon_social?: string } | null;
}

export default function OrdenesCompra() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [ordenes, setOrdenes] = useState<OrdenCompraRow[]>([]);
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
            orden_compra_id,
            numero,
            fecha,
            estado,
            total,
            proveedor:proveedores (
              razon_social
            )
          `)
          .eq('empresa_id', empresaActual.id)
          .not('orden_compra_id', 'is', null)
          .order('fecha', { ascending: false });

        if (error) throw error;
        setOrdenes((data || []) as OrdenCompraRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar órdenes vinculadas');
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
        <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
        <p className="text-gray-600 mt-1">Seguimiento de documentos de compra vinculados a una orden.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Órdenes identificadas</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando órdenes de compra...</div>
        ) : ordenes.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Link2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No hay documentos de compra vinculados a órdenes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{orden.orden_compra_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{orden.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{orden.proveedor?.razon_social || 'Sin proveedor'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(orden.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 uppercase">{orden.estado}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatearMoneda(Number(orden.total || 0))}</td>
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
