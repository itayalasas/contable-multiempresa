import React, { useEffect, useState } from 'react';
import { useSesion } from '../../context/SesionContext';
import {
  actualizarFacturaConItems,
  crearFactura,
  obtenerFacturaPorId,
  type CrearFacturaInput,
  type FacturaVenta,
} from '../../services/supabase/facturas';
import { obtenerClientes, type Cliente } from '../../services/supabase/clientes';
import { SearchableSelect } from '../common/SearchableSelect';

interface FacturaModalProps {
  factura: FacturaVenta | null;
  onClose: () => void;
  onSuccess: () => void;
  requiereAprobacionEdicion?: boolean;
  onSolicitarAprobacionEdicion?: (input: CrearFacturaInput, motivo: string) => Promise<void>;
}

interface ItemFactura {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  tasa_iva: number;
}

function crearItemVacio(): ItemFactura {
  return {
    id: Math.random().toString(),
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    descuento_porcentaje: 0,
    tasa_iva: 0.22,
  };
}

export default function FacturaModal({
  factura,
  onClose,
  onSuccess,
  requiereAprobacionEdicion = false,
  onSolicitarAprobacionEdicion,
}: FacturaModalProps) {
  const { empresaActual } = useSesion();
  const [loading, setLoading] = useState(false);
  const [cargandoFactura, setCargandoFactura] = useState(false);
  const esBorrador = !factura || factura.estado === 'borrador';
  const necesitaAprobacion = Boolean(factura?.id && !esBorrador && requiereAprobacionEdicion);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('e-ticket');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [moneda, setMoneda] = useState('UYU');
  const [observaciones, setObservaciones] = useState('');
  const [motivoAprobacion, setMotivoAprobacion] = useState('');
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [items, setItems] = useState<ItemFactura[]>([crearItemVacio()]);

  useEffect(() => {
    if (empresaActual) {
      cargarClientes();
    }
  }, [empresaActual]);

  useEffect(() => {
    const cargarFactura = async () => {
      if (!factura?.id) return;
      setCargandoFactura(true);
      try {
        const detalle = await obtenerFacturaPorId(factura.id);
        setClienteId(detalle.cliente_id);
        setTipoDocumento(detalle.tipo_documento || 'e-ticket');
        setFechaEmision(detalle.fecha_emision || new Date().toISOString().split('T')[0]);
        setFechaVencimiento(detalle.fecha_vencimiento || '');
        setMoneda(detalle.moneda || 'UYU');
        setObservaciones(detalle.observaciones || '');

        const itemsDetalle = (detalle.items || []).map((item) => ({
          id: item.id,
          descripcion: item.descripcion,
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          descuento_porcentaje: Number(item.descuento_porcentaje || 0),
          tasa_iva: Number(item.tasa_iva ?? 0.22),
        }));

        setItems(itemsDetalle.length > 0 ? itemsDetalle : [crearItemVacio()]);
      } catch (error) {
        console.error('Error cargando factura:', error);
      } finally {
        setCargandoFactura(false);
      }
    };

    cargarFactura();
  }, [factura?.id]);

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
    setItems([...items, crearItemVacio()]);
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const actualizarItem = (id: string, campo: keyof ItemFactura, valor: string | number) => {
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

  const construirInput = (): CrearFacturaInput => ({
    empresa_id: empresaActual!.id,
    cliente_id: clienteId,
    tipo_documento: tipoDocumento,
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento || undefined,
    moneda,
    observaciones,
    estado: 'borrador',
    items: items.map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento_porcentaje: item.descuento_porcentaje,
      tasa_iva: item.tasa_iva,
    })),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaActual || !clienteId) {
      setErrorFormulario('Debe seleccionar un cliente');
      return;
    }

    if (items.length === 0) {
      setErrorFormulario('Debe agregar al menos un item');
      return;
    }

    if (items.some((item) => !item.descripcion || item.cantidad <= 0 || item.precio_unitario <= 0)) {
      setErrorFormulario('Todos los items deben tener descripcion, cantidad y precio validos');
      return;
    }

    if (necesitaAprobacion && !motivoAprobacion.trim()) {
      setErrorFormulario('Debe ingresar el motivo de la modificacion para enviar la solicitud');
      return;
    }

    setLoading(true);
    setErrorFormulario(null);

    try {
      const input = construirInput();

      if (factura?.id && necesitaAprobacion) {
        if (!onSolicitarAprobacionEdicion) {
          throw new Error('No se configuro el flujo de aprobacion para esta factura');
        }

        await onSolicitarAprobacionEdicion(input, motivoAprobacion.trim());
      } else if (factura?.id) {
        await actualizarFacturaConItems(factura.id, input);
      } else {
        await crearFactura(input);
      }

      onSuccess();
    } catch (error: any) {
      setErrorFormulario(error.message || 'No se pudo guardar la factura');
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
              {factura ? (esBorrador ? 'Editar Prefactura' : 'Editar Factura') : 'Nueva Prefactura'}
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
          {cargandoFactura && (
            <div className="text-sm text-gray-500">Cargando datos de la prefactura...</div>
          )}

          {errorFormulario && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorFormulario}
            </div>
          )}

          {necesitaAprobacion && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta factura ya fue emitida. Los cambios se enviaran a aprobacion y solo se aplicaran cuando un
              supervisor o administrador los apruebe. La auditoria y los asientos se regeneraran con esa aprobacion.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Cliente"
              required
              options={clientes.map((cliente) => ({
                value: cliente.id,
                label: `${cliente.razon_social} - ${cliente.numero_documento}`,
              }))}
              value={clienteId}
              onChange={setClienteId}
              placeholder="Buscar cliente..."
            />

            <SearchableSelect
              label="Tipo de Documento"
              required
              options={[
                { value: 'e-ticket', label: 'e-Ticket' },
                { value: 'e-factura', label: 'e-Factura' },
                { value: 'factura_exportacion', label: 'Factura Exportacion' },
              ]}
              value={tipoDocumento}
              onChange={setTipoDocumento}
              placeholder="Buscar tipo de documento..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Emision *
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

            <SearchableSelect
              label="Moneda"
              required
              options={[
                { value: 'UYU', label: 'Pesos Uruguayos (UYU)' },
                { value: 'USD', label: 'Dolares (USD)' },
                { value: 'EUR', label: 'Euros (EUR)' },
              ]}
              value={moneda}
              onChange={setMoneda}
              placeholder="Buscar moneda..."
            />
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

          {necesitaAprobacion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la modificacion *
              </label>
              <textarea
                value={motivoAprobacion}
                onChange={(e) => setMotivoAprobacion(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explique que cambio y por que requiere aprobacion..."
                required={necesitaAprobacion}
              />
            </div>
          )}

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
                        Descripcion *
                      </label>
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => actualizarItem(item.id, 'descripcion', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Descripcion del producto/servicio"
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
                        onChange={(e) => actualizarItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
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
                          actualizarItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)
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
                          actualizarItem(item.id, 'descuento_porcentaje', parseFloat(e.target.value) || 0)
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
                        onChange={(e) => actualizarItem(item.id, 'tasa_iva', parseFloat(e.target.value))}
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
                <span className="text-blue-600">
                  ${(calcularSubtotalFactura() + calcularIVAFactura()).toFixed(2)}
                </span>
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
              disabled={loading || cargandoFactura}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (necesitaAprobacion ? 'Enviando solicitud...' : 'Guardando...')
                : factura
                  ? (necesitaAprobacion ? 'Enviar a aprobacion' : 'Guardar cambios')
                  : 'Guardar Prefactura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
