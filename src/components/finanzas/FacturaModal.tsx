import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, Calculator, Search, Loader2 } from 'lucide-react';
import { FacturaPorCobrar, Cliente, ItemFactura, TipoDocumento } from '../../types/cuentasPorCobrar';
import { useSesion } from '../../context/SesionContext';
import { TipoDocumentoIdentidad, TipoDocumentoFactura } from '../../types/nomencladores';
import { SearchableClientSelector } from './SearchableClientSelector';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';

interface FacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura?: FacturaPorCobrar | null;
  clientes: Cliente[];
  mode: 'create' | 'edit' | 'view';
  onSave: (factura: Omit<FacturaPorCobrar, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => Promise<string>;
  tiposDocumento: TipoDocumentoFactura[];
}

export const FacturaModal: React.FC<FacturaModalProps> = ({
  isOpen,
  onClose,
  factura,
  clientes,
  mode,
  onSave,
  tiposDocumento
}) => {
  const { empresaActual, paisActual, formatearMoneda } = useSesion();
  const { notificationModal, showError, showSuccess, closeNotification } = useModals();
  
  const [formData, setFormData] = useState({
    numero: '',
    tipoDocumento: 'FACTURA' as TipoDocumento,
    clienteId: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    descripcion: '',
    observaciones: '',
    referencia: '',
    condicionesPago: '',
    moneda: paisActual?.monedaPrincipal || 'PEN'
  });

  const [items, setItems] = useState<ItemFactura[]>([
    { id: '1', descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, impuesto: 18, total: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Asegurar que no hay duplicados en los tipos de documento
  const tiposDocumentoUnicos = useMemo(() => {
    const uniqueMap = new Map<string, TipoDocumentoFactura>();
    tiposDocumento.forEach(tipo => {
      if (!uniqueMap.has(tipo.id)) {
        uniqueMap.set(tipo.id, tipo);
      }
    });
    return Array.from(uniqueMap.values());
  }, [tiposDocumento]);

  useEffect(() => {
    if (factura && (mode === 'edit' || mode === 'view')) {
      setFormData({
        numero: factura.numero,
        tipoDocumento: factura.tipoDocumento,
        clienteId: factura.clienteId,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        descripcion: factura.descripcion || '',
        observaciones: factura.observaciones || '',
        referencia: factura.referencia || '',
        condicionesPago: factura.condicionesPago || '',
        moneda: factura.moneda
      });
      setItems(factura.items);
    } else if (mode === 'create') {
      // Generar número automático
      const nextNumber = `F001-${String(Date.now()).slice(-5)}`;
      setFormData(prev => ({ 
        ...prev, 
        numero: nextNumber,
        moneda: paisActual?.monedaPrincipal || 'PEN'
      }));
      
      // Calcular fecha de vencimiento (30 días por defecto)
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      setFormData(prev => ({ ...prev, fechaVencimiento: fechaVencimiento.toISOString().split('T')[0] }));
    }
  }, [factura, mode, paisActual]);

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.cantidad * item.precioUnitario;
      const descuento = (itemSubtotal * (item.descuento || 0)) / 100;
      return sum + (itemSubtotal - descuento);
    }, 0);

    const impuestos = items.reduce((sum, item) => {
      const itemSubtotal = item.cantidad * item.precioUnitario;
      const descuento = (itemSubtotal * (item.descuento || 0)) / 100;
      const baseImponible = itemSubtotal - descuento;
      const impuesto = (baseImponible * (item.impuesto || 0)) / 100;
      return sum + impuesto;
    }, 0);

    const total = subtotal + impuestos;

    return { subtotal, impuestos, total };
  };

  const updateItem = (index: number, field: keyof ItemFactura, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular total del item
    const item = newItems[index];
    const itemSubtotal = item.cantidad * item.precioUnitario;
    const descuento = (itemSubtotal * (item.descuento || 0)) / 100;
    const baseImponible = itemSubtotal - descuento;
    const impuesto = (baseImponible * (item.impuesto || 0)) / 100;
    newItems[index].total = baseImponible + impuesto;
    
    setItems(newItems);
  };

  const addItem = () => {
    const newItem: ItemFactura = {
      id: String(items.length + 1),
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      impuesto: 18,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    try {
      setSaving(true);
      
      const { subtotal, impuestos, total } = calcularTotales();
      
      // Buscar cliente con validación mejorada
      const cliente = clientes.find(c => c.id === formData.clienteId);
      
      if (!cliente) {
        console.error('Cliente no encontrado:', {
          clienteId: formData.clienteId,
          clientesDisponibles: clientes.map(c => ({ id: c.id, nombre: c.nombre }))
        });
        
        // Mostrar error con NotificationModal en lugar de alert
        showError(
          'Cliente no encontrado',
          `No se pudo encontrar el cliente con ID: ${formData.clienteId}. Por favor, seleccione un cliente válido.`
        );
        
        return;
      }

      const facturaData: Omit<FacturaPorCobrar, 'id' | 'fechaCreacion' | 'fechaModificacion'> = {
        ...formData,
        cliente,
        items: items.filter(item => item.descripcion.trim() !== ''),
        montoSubtotal: subtotal,
        montoImpuestos: impuestos,
        montoTotal: total,
        montoPagado: factura?.montoPagado || 0,
        saldoPendiente: total - (factura?.montoPagado || 0),
        estado: factura?.estado || 'PENDIENTE',
        empresaId: empresaActual?.id || 'dev-empresa-pe',
        creadoPor: 'dev-user-123'
      };

      await onSave(facturaData);
      onClose();
    } catch (error) {
      console.error('Error guardando factura:', error);
      
      // Mostrar error con NotificationModal en lugar de alert
      showError(
        'Error al guardar factura',
        error instanceof Error ? error.message : 'Error desconocido al guardar la factura'
      );
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, impuestos, total } = calcularTotales();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Nueva Factura' : 
               mode === 'edit' ? 'Editar Factura' : 'Ver Factura'}
            </h2>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Factura *
              </label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={mode === 'view' || saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={formData.tipoDocumento}
                onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value as TipoDocumento })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={mode === 'view' || saving}
              >
                {tiposDocumentoUnicos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <SearchableClientSelector
                clientes={clientes}
                value={formData.clienteId}
                onChange={(clienteId) => setFormData({ ...formData, clienteId })}
                placeholder="Buscar cliente..."
                disabled={mode === 'view' || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Emisión *
              </label>
              <input
                type="date"
                value={formData.fechaEmision}
                onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={mode === 'view' || saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={mode === 'view' || saving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={mode === 'view' || saving}
            />
          </div>

          {/* Items de la factura */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de la Factura</h3>
              {mode !== 'view' && (
                <button
                  type="button"
                  onClick={addItem}
                  disabled={saving}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Desc. %</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">IGV %</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    {mode !== 'view' && (
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                          placeholder="Descripción del producto/servicio"
                          disabled={mode === 'view' || saving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          disabled={mode === 'view' || saving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.precioUnitario}
                          onChange={(e) => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          disabled={mode === 'view' || saving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.descuento || 0}
                          onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={mode === 'view' || saving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.impuesto || 18}
                          onChange={(e) => updateItem(index, 'impuesto', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={mode === 'view' || saving}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatearMoneda(item.total)}
                      </td>
                      {mode !== 'view' && (
                        <td className="px-4 py-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatearMoneda(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGV:</span>
                  <span>{formatearMoneda(impuestos)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatearMoneda(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia
              </label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={mode === 'view' || saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condiciones de Pago
              </label>
              <input
                type="text"
                value={formData.condicionesPago}
                onChange={(e) => setFormData({ ...formData, condicionesPago: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 30 días"
                disabled={mode === 'view' || saving}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={mode === 'view' || saving}
            />
          </div>

          {/* Botones */}
          <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {mode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                disabled={saving || !formData.clienteId || items.every(item => !item.descripcion.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{mode === 'create' ? 'Crear Factura' : 'Actualizar Factura'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
      
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
  );
};