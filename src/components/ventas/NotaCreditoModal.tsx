import React, { useState, useEffect } from 'react';
import { NotificationModal } from '../common/NotificationModal';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { SearchableSelect } from '../common/SearchableSelect';
import { useSesion } from '../../context/SesionContext';
import {
  actualizarNotaCreditoCompleta,
  crearNotaCredito,
  obtenerNotaCreditoPorId,
  type CrearNotaCreditoInput,
  type NotaCredito,
} from '../../services/supabase/notasCredito';
import { obtenerFacturaPorId, type FacturaVenta } from '../../services/supabase/facturas';

interface NotaCreditoModalProps {
  facturas: FacturaVenta[];
  notaId?: string | null;
  requiereAprobacionEdicion?: boolean;
  onSolicitarAprobacionEdicion?: (input: CrearNotaCreditoInput, motivoAprobacion: string) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NotaCreditoModal({
  facturas,
  notaId,
  requiereAprobacionEdicion = false,
  onSolicitarAprobacionEdicion,
  onClose,
  onSuccess,
}: NotaCreditoModalProps) {
  const { empresaActual } = useSesion();
  const isEdit = !!notaId;
  const [loading, setLoading] = useState(false);
  const [loadingNota, setLoadingNota] = useState(false);
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>(
    { open: false, message: '' }
  );
  const [notaEdit, setNotaEdit] = useState<NotaCredito | null>(null);
  const [facturaId, setFacturaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoAnulacion, setTipoAnulacion] = useState<'total' | 'parcial'>('total');
  const [observaciones, setObservaciones] = useState('');
  const [simulacion, setSimulacion] = useState(true);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaVenta | null>(null);
  const [cantidadAnularPorItem, setCantidadAnularPorItem] = useState<Record<string, number>>({});
  const [motivoAprobacion, setMotivoAprobacion] = useState('');

  const facturaSeleccionada = facturas.find((f) => f.id === facturaId);

  useEffect(() => {
    const cargarNota = async () => {
      if (!isEdit || !notaId) return;
      setLoadingNota(true);
      try {
        const nota = await obtenerNotaCreditoPorId(notaId);
        setNotaEdit(nota);
        setFacturaId(nota.factura_referencia_id);
        setMotivo(nota.motivo || '');
        setTipoAnulacion(nota.tipo_anulacion);
        setObservaciones(nota.observaciones || '');
        // En edición, por seguridad, no permitimos simulación.
        setSimulacion(false);
      } catch (error: any) {
        setErrorModal({
          open: true,
          message: error?.message || 'Error cargando nota de crédito para edición',
        });
      } finally {
        setLoadingNota(false);
      }
    };

    cargarNota();
  }, [isEdit, notaId]);

  useEffect(() => {
    const cargarDetalle = async () => {
      if (!facturaId) {
        setFacturaDetalle(null);
        setCantidadAnularPorItem({});
        return;
      }

      try {
        const detalle = await obtenerFacturaPorId(facturaId);
        setFacturaDetalle(detalle);

        const cantidadesIniciales: Record<string, number> = {};
        const itemsNotaMap = new Map(
          (notaEdit?.items || [])
            .filter((it) => it.factura_item_id)
            .map((it) => [it.factura_item_id as string, Math.abs(Number(it.cantidad))])
        );

        (detalle.items || []).forEach((item) => {
          const precargada = isEdit && notaEdit?.tipo_anulacion === 'parcial' ? itemsNotaMap.get(item.id) : undefined;
          cantidadesIniciales[item.id] = precargada ?? 0;
        });

        setCantidadAnularPorItem(cantidadesIniciales);
      } catch (error) {
        console.error('Error cargando detalle de factura:', error);
        setFacturaDetalle(null);
      }
    };

    cargarDetalle();
  }, [facturaId, isEdit, notaEdit?.id, notaEdit?.tipo_anulacion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaActual || !facturaId || !motivo) {
      setErrorModal({ open: true, message: 'Complete todos los campos requeridos' });
      return;
    }

    if (isEdit && notaEdit?.dgi_enviada) {
      setErrorModal({ open: true, message: 'No se puede modificar una nota enviada a DGI' });
      return;
    }

    if (isEdit && requiereAprobacionEdicion && !motivoAprobacion.trim()) {
      setErrorModal({ open: true, message: 'Debe indicar el motivo de la solicitud de aprobación' });
      return;
    }

    if (tipoAnulacion === 'parcial') {
      const itemsSeleccionados = Object.values(cantidadAnularPorItem).some((cantidad) => cantidad > 0);
      if (!itemsSeleccionados) {
        setErrorModal({ open: true, message: 'Seleccione al menos un item y una cantidad a anular' });
        return;
      }
    }

    setLoading(true);
    try {
      const input: CrearNotaCreditoInput = {
        empresa_id: empresaActual.id,
        factura_referencia_id: facturaId,
        motivo,
        tipo_anulacion: tipoAnulacion,
        observaciones,
        simulacion: isEdit ? false : simulacion,
      };

      if (tipoAnulacion === 'parcial' && facturaDetalle?.items) {
        input.items = facturaDetalle.items
          .map((item) => ({
            factura_item_id: item.id,
            cantidad_anular: cantidadAnularPorItem[item.id] || 0,
          }))
          .filter((item) => item.cantidad_anular > 0);
      }

      if (isEdit && notaId) {
        if (requiereAprobacionEdicion && onSolicitarAprobacionEdicion) {
          await onSolicitarAprobacionEdicion(input, motivoAprobacion.trim());
        } else {
          await actualizarNotaCreditoCompleta(notaId, input);
        }
      } else {
        await crearNotaCredito(input);
      }
      onSuccess();
    } catch (error: any) {
      setErrorModal({ open: true, message: error?.message || 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <NotificationModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false, message: '' })}
        title="Error al crear nota de crédito"
        message={errorModal.message}
        type="error"
        autoClose={false}
      />
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Editar Nota de Crédito' : 'Nueva Nota de Crédito'}
            </h2>
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

          {isEdit && requiereAprobacionEdicion && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-amber-600 mt-0.5"
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
                  <h3 className="text-sm font-medium text-amber-800">Esta edición requiere aprobación</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Los cambios no se aplicarán inmediatamente. Se enviará una solicitud a un supervisor o administrador
                    y todo quedará registrado en auditoría.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <SearchableSelect
              label="Factura a Anular *"
              value={facturaId}
              onChange={setFacturaId}
              required
              disabled={isEdit || loadingNota}
              options={facturas.map(factura => ({
                value: factura.id,
                label: `${factura.serie}-${factura.numero_factura} - ${factura.cliente?.razon_social || ''} - $${parseFloat(factura.total).toLocaleString()}`
              }))}
              placeholder="Buscar factura por número, cliente..."
              className="mb-2"
              loading={false}
            />
          </div>

          {facturaSeleccionada && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Datos de la Factura</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <p className="font-medium">{facturaSeleccionada.cliente?.razon_social}</p>
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
              <label className="flex items-center">
                <input
                  type="radio"
                  value="parcial"
                  checked={tipoAnulacion === 'parcial'}
                  onChange={(e) => setTipoAnulacion(e.target.value as 'total' | 'parcial')}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Anulación Parcial</strong> - Anula solo algunos items
                </span>
              </label>
            </div>
          </div>

          {tipoAnulacion === 'parcial' && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Items a Anular</h3>
              {!facturaDetalle?.items?.length ? (
                <p className="text-sm text-gray-500">No hay items disponibles para anular.</p>
              ) : (
                <div className="space-y-3">
                  {facturaDetalle.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-6">
                        <div className="font-medium text-gray-900">{item.descripcion}</div>
                        <div className="text-xs text-gray-500">
                          Cantidad facturada: {item.cantidad}
                        </div>
                      </div>
                      <div className="col-span-3 text-right text-gray-700">
                        ${parseFloat(item.total).toLocaleString()}
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          max={item.cantidad}
                          step="0.01"
                          value={cantidadAnularPorItem[item.id] ?? 0}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            const boundedValue = Math.max(0, Math.min(value, Number(item.cantidad)));
                            setCantidadAnularPorItem((prev) => ({
                              ...prev,
                              [item.id]: Number.isNaN(boundedValue) ? 0 : boundedValue,
                            }));
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <AutocompleteInput
              label="Motivo *"
              value={motivo}
              onChange={setMotivo}
              suggestions={[
                'Cliente solicita reembolso',
                'Servicio no prestado',
                'Error en el cobro',
                'Producto defectuoso',
                'Cancelación del pedido',
                'Error en facturación',
                'Otro',
              ]}
              placeholder="Escriba o seleccione un motivo"
              required
            />
          </div>

          {isEdit && requiereAprobacionEdicion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la solicitud de aprobación *
              </label>
              <textarea
                value={motivoAprobacion}
                onChange={(e) => setMotivoAprobacion(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Explique por qué necesita modificar esta nota de crédito..."
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="simulacion-nota-credito"
              type="checkbox"
              checked={simulacion}
              onChange={(e) => setSimulacion(e.target.checked)}
              className="h-4 w-4"
              disabled={isEdit}
            />
            <label htmlFor="simulacion-nota-credito" className="text-sm text-gray-700">
              Simulación (no afecta la factura ni genera asientos)
            </label>
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
              disabled={loading || loadingNota || !facturaId}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isEdit
                  ? 'Guardando...'
                  : 'Creando...'
                : isEdit
                  ? requiereAprobacionEdicion
                    ? 'Enviar a aprobación'
                    : 'Guardar cambios'
                  : 'Crear Nota de Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
