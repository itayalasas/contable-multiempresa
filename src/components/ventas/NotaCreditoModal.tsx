import React, { useState } from 'react';
import { useSesion } from '../../context/SesionContext';
import { crearNotaCredito, type CrearNotaCreditoInput } from '../../services/supabase/notasCredito';
import { type FacturaVenta } from '../../services/supabase/facturas';

interface NotaCreditoModalProps {
  facturas: FacturaVenta[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function NotaCreditoModal({ facturas, onClose, onSuccess }: NotaCreditoModalProps) {
  const { empresaActual } = useSesion();
  const [loading, setLoading] = useState(false);
  const [facturaId, setFacturaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoAnulacion, setTipoAnulacion] = useState<'total' | 'parcial'>('total');
  const [observaciones, setObservaciones] = useState('');

  const facturaSeleccionada = facturas.find((f) => f.id === facturaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaActual || !facturaId || !motivo) {
      alert('Complete todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const input: CrearNotaCreditoInput = {
        empresa_id: empresaActual.id,
        factura_referencia_id: facturaId,
        motivo,
        tipo_anulacion: tipoAnulacion,
        observaciones,
      };

      await crearNotaCredito(input);
      onSuccess();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Nueva Nota de Crédito</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Una nota de crédito anula total o parcialmente una factura. Esta acción no se
                  puede deshacer y debe ser enviada a DGI.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factura a Anular *
            </label>
            <select
              value={facturaId}
              onChange={(e) => setFacturaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione una factura</option>
              {facturas.map((factura) => (
                <option key={factura.id} value={factura.id}>
                  {factura.serie}-{factura.numero_factura} - {factura.cliente?.nombre} - $
                  {parseFloat(factura.total).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {facturaSeleccionada && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Datos de la Factura</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <p className="font-medium">{facturaSeleccionada.cliente?.nombre}</p>
                </div>
                <div>
                  <span className="text-gray-600">Documento:</span>
                  <p className="font-medium">{facturaSeleccionada.cliente?.numero_documento}</p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha:</span>
                  <p className="font-medium">
                    {new Date(facturaSeleccionada.fecha_emision).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Total:</span>
                  <p className="font-medium text-lg">
                    ${parseFloat(facturaSeleccionada.total).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Anulación *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="total"
                  checked={tipoAnulacion === 'total'}
                  onChange={(e) => setTipoAnulacion(e.target.value as 'total' | 'parcial')}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Anulación Total</strong> - Anula completamente la factura
                </span>
              </label>
              <label className="flex items-center opacity-50 cursor-not-allowed">
                <input type="radio" value="parcial" disabled className="mr-2" />
                <span className="text-sm">
                  <strong>Anulación Parcial</strong> - Anula solo algunos items (próximamente)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione un motivo</option>
              <option value="cliente_solicita_reembolso">Cliente solicita reembolso</option>
              <option value="servicio_no_prestado">Servicio no prestado</option>
              <option value="error_en_cobro">Error en el cobro</option>
              <option value="producto_defectuoso">Producto defectuoso</option>
              <option value="cancelacion_pedido">Cancelación del pedido</option>
              <option value="error_facturacion">Error en facturación</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalles adicionales sobre la anulación..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !facturaId}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Nota de Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
