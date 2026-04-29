import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { aprobacionesService } from '../../services/supabase/aprobaciones';
import { FacturaVenta } from '../../services/supabase/facturas';

interface SolicitudAprobacionModalProps {
  factura: FacturaVenta;
  tipo: 'modificar' | 'eliminar';
  usuarioId: string;
  empresaId: string;
  datosModificados?: Record<string, unknown> | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SolicitudAprobacionModal: React.FC<SolicitudAprobacionModalProps> = ({
  factura,
  tipo,
  usuarioId,
  empresaId,
  datosModificados,
  onClose,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim()) {
      setError('Debe ingresar un motivo para la solicitud');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (tipo === 'modificar') {
        if (!datosModificados) {
          throw new Error('La solicitud no incluye cambios a aprobar');
        }

        await aprobacionesService.solicitarModificacion(
          empresaId,
          factura.id,
          datosModificados,
          motivo,
          usuarioId
        );
      } else {
        await aprobacionesService.solicitarEliminacion(
          empresaId,
          factura.id,
          motivo,
          usuarioId
        );
      }
      setMotivo('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Solicitar {tipo === 'modificar' ? 'Modificación' : 'Eliminación'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Factura: {factura.serie}-{factura.numero_factura}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Esta acción requiere aprobación</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      La solicitud será enviada a un supervisor o administrador
                    </li>
                    {tipo === 'modificar' && (
                      <>
                        <li>Al aprobar, se regenerarán automáticamente todos los asientos contables</li>
                        <li>Se actualizarán los movimientos de tesorería y pagos asociados</li>
                      </>
                    )}
                    {tipo === 'eliminar' && (
                      <>
                        <li>Al aprobar, se eliminarán todos los registros asociados</li>
                        <li>Esta acción no se puede deshacer</li>
                      </>
                    )}
                    <li>Todos los cambios quedarán registrados en auditoría</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la {tipo === 'modificar' ? 'modificación' : 'eliminación'} *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Explique claramente el motivo de esta solicitud..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este motivo será visible para el aprobador
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t rounded-b-lg">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
