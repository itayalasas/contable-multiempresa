import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Building2, User } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { obtenerClientes, eliminarCliente, Cliente } from '../../services/supabase/clientes';
import ClienteModal from '../../components/ventas/ClienteModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export default function Clientes() {
  const { empresaActual } = useSesion();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);

  useEffect(() => {
    if (empresaActual) {
      cargarClientes();
    }
  }, [empresaActual]);

  useEffect(() => {
    filtrarClientes();
  }, [searchTerm, clientes]);

  const cargarClientes = async () => {
    if (!empresaActual) return;

    try {
      setLoading(true);
      const data = await obtenerClientes(empresaActual.id);
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarClientes = () => {
    if (!searchTerm.trim()) {
      setFilteredClientes(clientes);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = clientes.filter(cliente => {
      return (
        cliente.razon_social?.toLowerCase().includes(term) ||
        cliente.numero_documento?.toLowerCase().includes(term) ||
        cliente.email?.toLowerCase().includes(term)
      );
    });

    setFilteredClientes(filtered);
  };

  const handleNuevoCliente = () => {
    setClienteSeleccionado(null);
    setShowModal(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setShowModal(true);
  };

  const handleEliminarCliente = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setShowDeleteModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;

    try {
      await eliminarCliente(clienteAEliminar.id);
      await cargarClientes();
      setShowDeleteModal(false);
      setClienteAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleModalClose = (guardado: boolean) => {
    setShowModal(false);
    setClienteSeleccionado(null);
    if (guardado) {
      cargarClientes();
    }
  };

  const getNombreCliente = (cliente: Cliente) => {
    return cliente.razon_social || 'Sin nombre';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500">
              {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleNuevoCliente}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condición Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay clientes registrados</p>
                    <button
                      onClick={handleNuevoCliente}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Crear primer cliente
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getNombreCliente(cliente)}
                      </div>
                      {cliente.nombre_comercial && (
                        <div className="text-sm text-gray-500">
                          {cliente.nombre_comercial}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cliente.numero_documento || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{cliente.email || '-'}</div>
                      <div className="text-sm text-gray-500">{cliente.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cliente.dias_credito ? `${cliente.dias_credito} días` : 'Contado'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          cliente.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditarCliente(cliente)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminarCliente(cliente)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ClienteModal
          cliente={clienteSeleccionado}
          onClose={handleModalClose}
        />
      )}

      {showDeleteModal && clienteAEliminar && (
        <ConfirmModal
          isOpen={showDeleteModal}
          title="Eliminar Cliente"
          message={`¿Está seguro que desea eliminar al cliente "${getNombreCliente(clienteAEliminar)}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmarEliminacion}
          onClose={() => {
            setShowDeleteModal(false);
            setClienteAEliminar(null);
          }}
          type="danger"
        />
      )}
    </div>
  );
}
