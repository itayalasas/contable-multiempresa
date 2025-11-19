import React, { useState, useEffect } from 'react';
import { useSesion } from '../../context/SesionContext';
import {
  obtenerNotasCredito,
  enviarNotaCreditoDGI,
  type NotaCredito,
} from '../../services/supabase/notasCredito';
import { obtenerFacturas, type FacturaVenta } from '../../services/supabase/facturas';
import NotaCreditoModal from '../../components/ventas/NotaCreditoModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

export default function NotasCredito() {
  const { empresaActual } = useSesion();
  const [notas, setNotas] = useState<NotaCredito[]>([]);
  const [facturas, setFacturas] = useState<FacturaVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (empresaActual) {
      cargarDatos();
    }
  }, [empresaActual]);

  const cargarDatos = async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const [notasData, facturasData] = await Promise.all([
        obtenerNotasCredito(empresaActual.id),
        obtenerFacturas(empresaActual.id),
      ]);
      setNotas(notasData);
      setFacturas(facturasData.filter((f) => f.estado === 'pagada' && !f.nota_credito_id));
    } catch (error: any) {
      mostrarNotificacion('error', 'Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaNota = () => {
    setShowModal(true);
  };

  const handleEnviarDGI = (nota: NotaCredito) => {
    setConfirmModal({
      show: true,
      title: 'Enviar a DGI',
      message: `¿Desea enviar la nota de crédito ${nota.numero_nota} a DGI?`,
      onConfirm: async () => {
        try {
          await enviarNotaCreditoDGI(nota.id);
          mostrarNotificacion('success', 'Éxito', 'Nota de crédito enviada a DGI');
          cargarDatos();
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

  const notasFiltradas = notas.filter((nota) => {
    const cumpleBusqueda =
      nota.numero_nota.toLowerCase().includes(busqueda.toLowerCase()) ||
      nota.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      nota.factura_referencia?.numero_factura.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleBusqueda;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Notas de Crédito</h1>
          <p className="text-gray-600 mt-1">
            Gestión de anulaciones y devoluciones de facturas
          </p>
        </div>
        <button
          onClick={handleNuevaNota}
          disabled={facturas.length === 0}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Nueva Nota de Crédito
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Notas</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{notas.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Enviadas a DGI</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {notas.filter((n) => n.dgi_enviada).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Monto Total Anulado</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            ${Math.abs(notas.reduce((sum, n) => sum + parseFloat(n.total), 0)).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Buscar por número, cliente o factura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notasFiltradas.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin notas de crédito</h3>
            <p className="mt-1 text-sm text-gray-500">
              Las notas de crédito se crean para anular facturas
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Factura Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    DGI
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notasFiltradas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {nota.serie}-{nota.numero_nota}
                      </div>
                      <div className="text-xs text-gray-500">
                        {nota.tipo_anulacion === 'total' ? 'Anulación Total' : 'Anulación Parcial'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {nota.factura_referencia?.serie}-{nota.factura_referencia?.numero_factura}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{nota.cliente?.nombre}</div>
                      <div className="text-xs text-gray-500">
                        {nota.cliente?.numero_documento}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(nota.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={nota.motivo}>
                        {nota.motivo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">
                        ${Math.abs(parseFloat(nota.total)).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {nota.dgi_enviada ? (
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
                      {!nota.dgi_enviada && (
                        <button
                          onClick={() => handleEnviarDGI(nota)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NotaCreditoModal
          facturas={facturas}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            cargarDatos();
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
