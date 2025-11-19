import React, { useState, useEffect } from 'react';
import { useSesion } from '../../context/SesionContext';
import { crearFactura, enviarFacturaDGI, type CrearFacturaInput, type FacturaVenta } from '../../services/supabase/facturas';
import { obtenerClientes, type Cliente } from '../../services/supabase/clientes';

interface FacturaModalProps {
  factura: FacturaVenta | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemFactura {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  tasa_iva: number;
}

export default function FacturaModal({ factura, onClose, onSuccess }: FacturaModalProps) {
  const { empresaActual } = useSesion();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('e-ticket');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [moneda, setMoneda] = useState('UYU');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<ItemFactura[]>([
    {
      id: Math.random().toString(),
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento_porcentaje: 0,
      tasa_iva: 0.22,
    },
  ]);

  useEffect(() => {
    if (empresaActual) {
      cargarClientes();
    }
  }, [empresaActual]);

  const cargarClientes = async () => {
    if (!empresaActual) return;
    try {
      const data = await obtenerClientes(empresaActual.id);
      setClientes(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const agregarItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        descuento_porcentaje: 0,
        tasa_iva: 0.22,
      },
    ]);
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const actualizarItem = (id: string, campo: keyof ItemFactura, valor: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item
      )
    );
  };

  const calcularSubtotalItem = (item: ItemFactura) => {
    const subtotal = item.cantidad * item.precio_unitario;
    const descuento = subtotal * (item.descuento_porcentaje / 100);
    return subtotal - descuento;
  };

  const calcularIVAItem = (item: ItemFactura) => {
    const subtotal = calcularSubtotalItem(item);
    return subtotal * item.tasa_iva;
  };

  const calcularTotalItem = (item: ItemFactura) => {
    return calcularSubtotalItem(item) + calcularIVAItem(item);
  };

  const calcularSubtotalFactura = () => {
    return items.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
  };

  const calcularIVAFactura = () => {
    return items.reduce((sum, item) => sum + calcularIVAItem(item), 0);
  };

  const calcularTotalFactura = () => {
    return calcularSubtotalFactura() + calcularIVAFactura();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaActual || !clienteId) {
      alert('Debe seleccionar un cliente');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un item');
      return;
    }

    if (items.some((item) => !item.descripcion || item.cantidad <= 0 || item.precio_unitario <= 0)) {
      alert('Todos los items deben tener descripción, cantidad y precio válidos');
      return;
    }

    setLoading(true);
    try {
      const input: CrearFacturaInput = {
        empresa_id: empresaActual.id,
        cliente_id: clienteId,
        tipo_documento: tipoDocumento,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento || undefined,
        moneda,
        observaciones,
        items: items.map((item) => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento_porcentaje: item.descuento_porcentaje,
          tasa_iva: item.tasa_iva,
        })),
      };

      const nuevaFactura = await crearFactura(input);

      try {
        console.log('Enviando factura automáticamente a DGI...');
        await enviarFacturaDGI(nuevaFactura.id);
        console.log('Factura enviada a DGI exitosamente');
        alert('Factura creada y enviada a DGI exitosamente');
      } catch (errorDGI: any) {
        console.error('Error enviando a DGI:', errorDGI);
        alert(`Factura creada, pero hubo un error al enviar a DGI: ${errorDGI.message}`);
      }

      onSuccess();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {factura ? 'Editar Factura' : 'Nueva Factura'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razon_social} - {cliente.numero_documento}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="e-ticket">e-Ticket</option>
                <option value="e-factura">e-Factura</option>
                <option value="factura_exportacion">Factura Exportación</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Emisión *
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="UYU">Pesos Uruguayos (UYU)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Items de la Factura</h3>
              <button
                type="button"
                onClick={agregarItem}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Agregar Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(item.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descripción *
                      </label>
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) =>
                          actualizarItem(item.id, 'descripcion', e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Descripción del producto/servicio"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Precio Unit. *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          actualizarItem(
                            item.id,
                            'precio_unitario',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Desc. %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.descuento_porcentaje}
                        onChange={(e) =>
                          actualizarItem(
                            item.id,
                            'descuento_porcentaje',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        IVA %
                      </label>
                      <select
                        value={item.tasa_iva}
                        onChange={(e) =>
                          actualizarItem(item.id, 'tasa_iva', parseFloat(e.target.value))
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="0">0%</option>
                        <option value="0.10">10%</option>
                        <option value="0.22">22%</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 text-right text-sm text-gray-600">
                    <span>Subtotal: ${calcularSubtotalItem(item).toFixed(2)}</span>
                    <span className="ml-4">IVA: ${calcularIVAItem(item).toFixed(2)}</span>
                    <span className="ml-4 font-semibold text-gray-900">
                      Total: ${calcularTotalItem(item).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${calcularSubtotalFactura().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span className="font-medium">${calcularIVAFactura().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span className="text-blue-600">${calcularTotalFactura().toFixed(2)}</span>
              </div>
            </div>
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
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Crear Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
