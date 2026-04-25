import React, { useEffect, useState } from 'react';
import { FileText, Receipt, AlertCircle } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';

interface FacturaCompraRow {
  id: string;
  numero_factura: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado: string;
  total: number;
  moneda: string;
  proveedor?: {
    razon_social?: string;
  } | null;
}

export default function FacturasCompra() {
  const { empresaActual, formatearMoneda } = useSesion();
  const [facturas, setFacturas] = useState<FacturaCompraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!empresaActual?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('facturas_compra')
          .select(`
            id,
            numero_factura,
            fecha_emision,
            fecha_vencimiento,
            estado,
            total,
            moneda,
            proveedor:proveedores (
              razon_social
            )
          `)
          .eq('empresa_id', empresaActual.id)
          .order('fecha_emision', { ascending: false });

        if (error) throw error;
        setFacturas((data || []) as FacturaCompraRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar facturas de compra');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [empresaActual?.id]);

  const totalFacturado = facturas.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const pendientes = facturas.filter((item) => item.estado === 'pendiente').length;

  if (!empresaActual) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Seleccione una empresa para continuar</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturas de Compra</h1>
        <p className="text-gray-600 mt-1">Visión operativa de comprobantes de proveedores ya registrados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total facturas</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{facturas.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Pendientes</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendientes}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total facturado</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatearMoneda(totalFacturado)}</div>
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
          <Receipt className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Comprobantes registrados</h2>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Cargando facturas de compra...</div>
        ) : facturas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No hay facturas de compra registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emisión</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{factura.numero_factura}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{factura.proveedor?.razon_social || 'Sin proveedor'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(factura.fecha_emision).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                        {factura.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatearMoneda(Number(factura.total || 0))}
                    </td>
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
