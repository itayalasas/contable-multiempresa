import React, { useState, useEffect } from 'react';
import { useSesion } from '../../context/SesionContext';
import {
  obtenerFacturas,
  eliminarFactura,
  marcarFacturaComoPagada,
  enviarFacturaDGI,
  obtenerEstadisticasFacturas,
  type FacturaVenta,
} from '../../services/supabase/facturas';
import FacturaModal from '../../components/ventas/FacturaModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

export default function Facturas() {
  const { empresaActual } = useSesion();
  const [facturas, setFacturas] = useState<FacturaVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [facturaEdit, setFacturaEdit] = useState<FacturaVenta | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (empresaActual) {
      cargarFacturas();
      cargarEstadisticas();
    }
  }, [empresaActual]);

  const cargarFacturas = async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const data = await obtenerFacturas(empresaActual.id);
      setFacturas(data);
    } catch (error: any) {
      mostrarNotificacion('error', 'Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!empresaActual) return;
    try {
      const data = await obtenerEstadisticasFacturas(empresaActual.id);
      setEstadisticas(data);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleNuevaFactura = () => {
    setFacturaEdit(null);
    setShowModal(true);
  };

  const handleEditFactura = (factura: FacturaVenta) => {
    setFacturaEdit(factura);
    setShowModal(true);
  };

  const handleEliminarFactura = (factura: FacturaVenta) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Factura',
      message: `¿Está seguro que desea eliminar la factura ${factura.numero_factura}?`,
      onConfirm: async () => {
        try {
          await eliminarFactura(factura.id);
          mostrarNotificacion('success', 'Éxito', 'Factura eliminada correctamente');
          cargarFacturas();
          cargarEstadisticas();
        } catch (error: any) {
          mostrarNotificacion('error', 'Error', error.message);
        }
      },
    });
  };

  const handleMarcarComoPagada = (factura: FacturaVenta) => {
    setConfirmModal({
      show: true,
      title: 'Marcar como Pagada',
      message: `¿Confirma que la factura ${factura.numero_factura} ha sido pagada?`,
      onConfirm: async () => {
        try {
          await marcarFacturaComoPagada(factura.id);
          mostrarNotificacion('success', 'Éxito', 'Factura marcada como pagada');
          cargarFacturas();
          cargarEstadisticas();
        } catch (error: any) {
          mostrarNotificacion('error', 'Error', error.message);
        }
      },
    });
  };

  const handleEnviarDGI = (factura: FacturaVenta) => {
    setConfirmModal({
      show: true,
      title: 'Enviar a DGI',
      message: `¿Desea enviar la factura ${factura.numero_factura} a DGI?`,
      onConfirm: async () => {
        try {
          await enviarFacturaDGI(factura.id);
          mostrarNotificacion('success', 'Éxito', 'Factura enviada a DGI correctamente');
          cargarFacturas();
        } catch (error: any) {
          mostrarNotificacion('error', 'Error', error.message);
        }
      },
    });
  };

  const mostrarNotificacion = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setNotification({ show: true, type, title, message });
  };

  const facturasFiltradas = facturas.filter((factura) => {
    const cumpleFiltroEstado =
      filtroEstado === 'todos' || factura.estado === filtroEstado;
    const cumpleBusqueda =
      factura.numero_factura.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.cliente?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.cliente?.numero_documento.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltroEstado && cumpleBusqueda;
  });

  const getEstadoBadge = (estado: string) => {
    const badges = {
      borrador: 'bg-gray-100 text-gray-700',
      pagada: 'bg-green-100 text-green-700',
      pendiente: 'bg-yellow-100 text-yellow-700',
      anulada: 'bg-red-100 text-red-700',
      vencida: 'bg-orange-100 text-orange-700',
    };
    return badges[estado as keyof typeof badges] || badges.borrador;
  };

  const getEstadoLabel = (estado: string) => {
    const labels = {
      borrador: 'Borrador',
      pagada: 'Pagada',
      pendiente: 'Pendiente',
      anulada: 'Anulada',
      vencida: 'Vencida',
    };
    return labels[estado as keyof typeof labels] || estado;
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas de Venta</h1>
          <p className="text-gray-600 mt-1">
            Gestión de facturas electrónicas y documentos de venta
          </p>
        </div>
        <button
          onClick={handleNuevaFactura}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nueva Factura
        </button>
      </div>

      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Facturado</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ${estadisticas.total_facturado.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.cantidad_facturas} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Pagado</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              ${estadisticas.total_pagado.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_pagadas} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Pendiente</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              ${estadisticas.total_pendiente.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_pendientes} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Anuladas</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {estadisticas.facturas_anuladas}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_vencidas} vencidas
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por número, cliente o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencida">Vencida</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin facturas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comience creando una nueva factura de venta
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DGI
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {factura.serie}-{factura.numero_factura}
                      </div>
                      <div className="text-xs text-gray-500">{factura.tipo_documento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{factura.cliente?.razon_social}</div>
                      <div className="text-xs text-gray-500">
                        {factura.cliente?.numero_documento}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(factura.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${parseFloat(factura.total).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{factura.moneda}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(
                          factura.estado
                        )}`}
                      >
                        {getEstadoLabel(factura.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {factura.dgi_enviada ? (
                        <div className="flex items-center text-green-600">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs">Enviada</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {factura.estado === 'borrador' && (
                          <>
                            <button
                              onClick={() => handleEditFactura(factura)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEliminarFactura(factura)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                        {factura.estado === 'pendiente' && (
                          <button
                            onClick={() => handleMarcarComoPagada(factura)}
                            className="text-green-600 hover:text-green-900"
                            title="Marcar como pagada"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        )}
                        {!factura.dgi_enviada && factura.estado !== 'anulada' && (
                          <button
                            onClick={() => handleEnviarDGI(factura)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Enviar a DGI"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <FacturaModal
          factura={facturaEdit}
          onClose={() => {
            setShowModal(false);
            setFacturaEdit(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setFacturaEdit(null);
            cargarFacturas();
            cargarEstadisticas();
          }}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal({ ...confirmModal, show: false });
          }}
          onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
        />
      )}

      {notification.show && (
        <NotificationModal
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
}
