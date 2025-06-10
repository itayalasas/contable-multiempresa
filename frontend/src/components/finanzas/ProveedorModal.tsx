import React, { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { Proveedor } from '../../types/cuentasPorPagar';
import { useSesion } from '../../context/SesionContext';
import { TipoDocumentoIdentidad } from '../../types/nomencladores';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';

interface ProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor?: Proveedor | null;
  onSave: (proveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>) => Promise<string>;
  tiposDocumento: TipoDocumentoIdentidad[];
}

export const ProveedorModal: React.FC<ProveedorModalProps> = ({
  isOpen,
  onClose,
  proveedor,
  onSave,
  tiposDocumento
}) => {
  const { empresaActual, paisActual } = useSesion();
  const { notificationModal, showError, closeNotification } = useModals();
  
  const [formData, setFormData] = useState({
    nombre: '',
    razonSocial: '',
    tipoDocumento: 'RUC',
    numeroDocumento: '',
    email: '',
    telefono: '',
    direccion: '',
    contacto: '',
    condicionesPago: '',
    diasCredito: 30,
    observaciones: '',
    cuentaBancaria: '',
    banco: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proveedor) {
      setFormData({
        nombre: proveedor.nombre,
        razonSocial: proveedor.razonSocial || '',
        tipoDocumento: proveedor.tipoDocumento,
        numeroDocumento: proveedor.numeroDocumento,
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        direccion: proveedor.direccion || '',
        contacto: proveedor.contacto || '',
        condicionesPago: proveedor.condicionesPago || '',
        diasCredito: proveedor.diasCredito || 30,
        observaciones: proveedor.observaciones || '',
        cuentaBancaria: proveedor.cuentaBancaria || '',
        banco: proveedor.banco || ''
      });
    } else {
      // Establecer tipo de documento por defecto según el país
      const tipoDocPorDefecto = tiposDocumento.length > 0 ? 
        tiposDocumento[0].id : 'RUC';
      
      setFormData({
        nombre: '',
        razonSocial: '',
        tipoDocumento: tipoDocPorDefecto,
        numeroDocumento: '',
        email: '',
        telefono: '',
        direccion: '',
        contacto: '',
        condicionesPago: '',
        diasCredito: 30,
        observaciones: '',
        cuentaBancaria: '',
        banco: ''
      });
    }
  }, [proveedor, tiposDocumento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      
      const proveedorData: Omit<Proveedor, 'id' | 'fechaCreacion'> = {
        ...formData,
        activo: true,
        empresaId: empresaActual?.id || 'dev-empresa-pe'
      };

      await onSave(proveedorData);
      onClose();
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      
      // Usar NotificationModal en lugar de alert
      showError(
        'Error al guardar proveedor',
        error instanceof Error ? error.message : 'Error desconocido al guardar el proveedor'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre/Razón Social *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social Completa
                </label>
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento *
                </label>
                <select
                  value={formData.tipoDocumento}
                  onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                >
                  {tiposDocumento.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  value={formData.numeroDocumento}
                  onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <textarea
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={2}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona de Contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={saving}
              />
            </div>
          </div>

          {/* Información bancaria */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información Bancaria</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta Bancaria
                </label>
                <input
                  type="text"
                  value={formData.cuentaBancaria}
                  onChange={(e) => setFormData({ ...formData, cuentaBancaria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Configuración comercial */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Configuración Comercial</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condiciones de Pago
                </label>
                <input
                  type="text"
                  value={formData.condicionesPago}
                  onChange={(e) => setFormData({ ...formData, condicionesPago: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ej: Crédito 30 días"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de Crédito
                </label>
                <input
                  type="number"
                  value={formData.diasCredito}
                  onChange={(e) => setFormData({ ...formData, diasCredito: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="0"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.nombre.trim() || !formData.numeroDocumento.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {proveedor ? 'Actualizar Proveedor' : 'Crear Proveedor'}
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