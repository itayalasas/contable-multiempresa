import { useEffect, useState } from 'react';
import {
  obtenerNotaCreditoPorId,
  type NotaCredito,
  type NotaCreditoItem,
} from '../../services/supabase/notasCredito';

interface NotaCreditoDetalleModalProps {
  isOpen: boolean;
  notaId: string | null;
  onClose: () => void;
}

const formatMoney = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  if (Number.isNaN(numeric)) return '$0';
  return `$${Math.abs(numeric).toLocaleString()}`;
};

export default function NotaCreditoDetalleModal({ isOpen, notaId, onClose }: NotaCreditoDetalleModalProps) {
  const [loading, setLoading] = useState(false);
  const [nota, setNota] = useState<NotaCredito | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      if (!isOpen || !notaId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await obtenerNotaCreditoPorId(notaId);
        setNota(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error cargando detalle de la nota de crédito';
        setError(message);
        setNota(null);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [isOpen, notaId]);

  if (!isOpen) return null;

  const items: NotaCreditoItem[] = (nota?.items || []) as NotaCreditoItem[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detalle de Nota de Crédito</h2>
              {nota && (
                <p className="text-sm text-gray-600 mt-1">
                  {nota.serie}-{nota.numero_nota}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && nota && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Factura referencia</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {nota.factura_referencia?.serie}-{nota.factura_referencia?.numero_factura}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Cliente</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {nota.cliente?.razon_social || '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{nota.cliente?.numero_documento || ''}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Fecha emisión</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {nota.fecha_emision ? new Date(nota.fecha_emision).toLocaleDateString() : '-'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Tipo</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {nota.tipo_anulacion === 'total' ? 'Anulación Total' : 'Anulación Parcial'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Monto total</div>
                  <div className="text-lg font-semibold text-red-600 mt-1">{formatMoney(nota.total)}</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-600">DGI</div>
                  <div className="text-sm font-medium mt-1">
                    {nota.dgi_enviada ? (
                      <span className="text-green-700">Enviada</span>
                    ) : (
                      <span className="text-gray-600">Pendiente</span>
                    )}
                  </div>
                  {nota.dgi_cae && <div className="text-xs text-gray-500 mt-1">CAE: {nota.dgi_cae}</div>}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-900">Motivo</div>
                <div className="text-sm text-gray-700 mt-2">{nota.motivo || '-'}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Items</div>
                  <div className="text-xs text-gray-500">{items.length} item(s)</div>
                </div>

                {items.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Sin items</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{it.descripcion}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{String(it.cantidad)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatMoney(it.precio_unitario)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatMoney(it.subtotal)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatMoney(it.monto_iva)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatMoney(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
