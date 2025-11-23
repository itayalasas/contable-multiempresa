import React from 'react';
import { X, Calendar, User, FileText, Package, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';

interface FacturaDetalleModalProps {
  factura: any;
  onClose: () => void;
}

export const FacturaDetalleModal: React.FC<FacturaDetalleModalProps> = ({ factura, onClose }) => {
  if (!factura) return null;

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      borrador: { color: 'bg-gray-100 text-gray-800', text: 'Borrador', icon: FileText },
      pendiente: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente', icon: Clock },
      pagada: { color: 'bg-green-100 text-green-800', text: 'Pagada', icon: CheckCircle },
      vencida: { color: 'bg-red-100 text-red-800', text: 'Vencida', icon: XCircle },
      anulada: { color: 'bg-gray-100 text-gray-500', text: 'Anulada', icon: XCircle },
    };
    const badge = badges[estado] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Factura {factura.numero_factura}</h2>
              <p className="text-blue-100 text-sm">{factura.tipo_documento || 'e-ticket'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Estado y Fecha */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">Fecha de emisión:</span>
              <span className="font-semibold">{new Date(factura.fecha_emision).toLocaleDateString()}</span>
            </div>
            {getEstadoBadge(factura.estado)}
          </div>

          {/* Cliente */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Razón Social:</span>
                <span className="font-medium">{factura.cliente?.razon_social || 'Cliente no encontrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Documento:</span>
                <span className="font-medium">{factura.cliente?.numero_documento || 'N/A'}</span>
              </div>
              {factura.cliente?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{factura.cliente.email}</span>
                </div>
              )}
              {factura.cliente?.telefono && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Teléfono:</span>
                  <span className="font-medium">{factura.cliente.telefono}</span>
                </div>
              )}
            </div>
          </div>

          {/* Estado DGI */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Comprobante Fiscal Electrónico (CFE)</h3>
            </div>
            {factura.dgi_enviada ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Enviado a DGI</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600">CAE:</span>
                    <p className="font-mono font-medium">{factura.dgi_cae_numero || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Serie:</span>
                    <p className="font-mono font-medium">{factura.dgi_serie || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Número:</span>
                    <p className="font-mono font-medium">{factura.dgi_numero || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Vencimiento CAE:</span>
                    <p className="font-medium">
                      {factura.dgi_cae_vencimiento
                        ? new Date(factura.dgi_cae_vencimiento).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Pendiente de envío a DGI</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  Esta factura aún no ha sido enviada al sistema de facturación electrónica.
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Detalle de Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P. Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {factura.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm">{item.descripcion}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        ${parseFloat(item.precio_unitario).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        ${parseFloat(item.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {(item.tasa_iva * 100).toFixed(0)}%
                        </span>
                        <div className="font-mono">${parseFloat(item.monto_iva || 0).toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                        ${parseFloat(item.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Sin items registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Totales</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">${parseFloat(factura.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>IVA:</span>
                <span className="font-mono font-medium">${parseFloat(factura.total_iva).toFixed(2)}</span>
              </div>
              <div className="h-px bg-blue-300"></div>
              <div className="flex justify-between text-xl font-bold text-blue-900">
                <span>TOTAL:</span>
                <span className="font-mono">
                  ${parseFloat(factura.total).toFixed(2)} {factura.moneda}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {factura.observaciones && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Observaciones</h4>
              <p className="text-gray-700 text-sm">{factura.observaciones}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
