import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import { FacturaPorCobrar, PagoFactura, TipoPago } from '../../types/cuentasPorCobrar';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';

interface PagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: FacturaPorCobrar;
  onSave: (facturaId: string, pago: Omit<PagoFactura, 'id' | 'facturaId' | 'fechaCreacion'>) => Promise<void>;
  generarAsientoAutomatico?: boolean;
}

export const PagoModal: React.FC<PagoModalProps> = ({
  isOpen,
  onClose,
  factura,
  onSave,
  generarAsientoAutomatico = true // Por defecto, generar asiento automático
}) => {
  const { notificationModal, showError, showSuccess, closeNotification } = useModals();
  
  const [formData, setFormData] = useState({
    fechaPago: new Date().toISOString().split('T')[0],
    monto: factura.saldoPendiente,
    tipoPago: 'TRANSFERENCIA' as TipoPago,
    referencia: '',
    observaciones: '',
    generarAsiento: generarAsientoAutomatico
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Actualizar monto cuando cambia la factura
    setFormData(prev => ({
      ...prev,
      monto: factura.saldoPendiente
    }));
  }, [factura]);

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(cantidad);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.monto <= 0 || formData.monto > factura.saldoPendiente) {
      showError(
        'Monto inválido',
        'El monto del pago debe ser mayor a 0 y no puede exceder el saldo pendiente'
      );
      return;
    }

    try {
      setSaving(true);
      
      const pagoData: Omit<PagoFactura, 'id' | 'facturaId' | 'fechaCreacion'> = {
        fechaPago: formData.fechaPago,
        monto: formData.monto,
        tipoPago: formData.tipoPago,
        referencia: formData.referencia,
        observaciones: formData.observaciones,
        creadoPor: 'dev-user-123' // Esto debería venir del contexto
      };

      await onSave(factura.id, pagoData);
      
      // Mostrar mensaje de éxito
      setSuccess(true);
      showSuccess(
        'Pago registrado exitosamente',
        formData.generarAsiento 
          ? 'El pago ha sido registrado y se ha generado el asiento contable automáticamente.'
          : 'El pago ha sido registrado correctamente.'
      );
      
      // Cerrar modal después de un breve retraso
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error registrando pago:', error);
      
      // Usar NotificationModal en lugar de alert
      showError(
        'Error al registrar pago',
        error instanceof Error ? error.message : 'Error desconocido al registrar el pago'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMontoChange = (valor: string) => {
    const monto = parseFloat(valor) || 0;
    setFormData({ ...formData, monto });
  };

  const setPagoCompleto = () => {
    setFormData({ ...formData, monto: factura.saldoPendiente });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
                <p className="text-sm text-gray-600">Factura {factura.numero}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Información de la factura */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Cliente:</span>
              <p className="text-gray-900">{factura.cliente.nombre}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Fecha Vencimiento:</span>
              <p className="text-gray-900">{new Date(factura.fechaVencimiento).toLocaleDateString('es-PE')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Monto Total:</span>
              <p className="text-gray-900 font-semibold">{formatearMoneda(factura.montoTotal)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Saldo Pendiente:</span>
              <p className="text-red-600 font-semibold">{formatearMoneda(factura.saldoPendiente)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago *
            </label>
            <input
              type="date"
              value={formData.fechaPago}
              onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={saving || success}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto del Pago *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S/</span>
              <input
                type="number"
                value={formData.monto}
                onChange={(e) => handleMontoChange(e.target.value)}
                className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                min="0.01"
                max={factura.saldoPendiente}
                step="0.01"
                required
                disabled={saving || success}
              />
              <button
                type="button"
                onClick={setPagoCompleto}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                disabled={saving || success}
              >
                Total
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Máximo: {formatearMoneda(factura.saldoPendiente)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Pago *
            </label>
            <select
              value={formData.tipoPago}
              onChange={(e) => setFormData({ ...formData, tipoPago: e.target.value as TipoPago })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={saving || success}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TARJETA">Tarjeta de Crédito/Débito</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Número de operación, cheque, etc."
              disabled={saving || success}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              disabled={saving || success}
            />
          </div>

          {/* Opción para generar asiento automático */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="generarAsiento"
              checked={formData.generarAsiento}
              onChange={(e) => setFormData({ ...formData, generarAsiento: e.target.checked })}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              disabled={saving || success}
            />
            <label htmlFor="generarAsiento" className="ml-2 block text-sm text-gray-900">
              Generar asiento contable automáticamente
            </label>
          </div>

          {/* Resumen del pago */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">Resumen del Pago</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Monto a pagar:</span>
                <span className="font-semibold text-green-800">{formatearMoneda(formData.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Saldo restante:</span>
                <span className="font-semibold text-green-800">
                  {formatearMoneda(factura.saldoPendiente - formData.monto)}
                </span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-1">
                <span className="text-green-700">Estado resultante:</span>
                <span className="font-semibold text-green-800">
                  {factura.saldoPendiente - formData.monto <= 0 ? 'PAGADA' : 'PAGO PARCIAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || success}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success || formData.monto <= 0 || formData.monto > factura.saldoPendiente}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registrando...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  ¡Pago Registrado!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Modal de notificación para errores */}
        <NotificationModal
          isOpen={notificationModal.isOpen}
          onClose={closeNotification}
          title={notificationModal.title}
          message={notificationModal.message}
          type={notificationModal.type}
          autoClose={notificationModal.autoClose}
        />
      </div>
    </div>
  );
};