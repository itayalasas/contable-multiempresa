import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Building2, User } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { obtenerProveedores, eliminarProveedor, Proveedor } from '../../services/supabase/proveedores';
import ProveedorModal from '../../components/compras/ProveedorModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export default function Proveedores() {
  const { empresaActual } = useSesion();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState<Proveedor | null>(null);

  useEffect(() => {
    if (empresaActual) {
      cargarProveedores();
    }
  }, [empresaActual]);

  useEffect(() => {
    filtrarProveedores();
  }, [searchTerm, proveedores]);

  const cargarProveedores = async () => {
    if (!empresaActual) return;

    try {
      setLoading(true);
      const data = await obtenerProveedores(empresaActual.id);
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarProveedores = () => {
    if (!searchTerm.trim()) {
      setFilteredProveedores(proveedores);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = proveedores.filter(proveedor => {
      const nombre = proveedor.tipo_persona === 'fisica' ? proveedor.nombre_completo : proveedor.razon_social;
      return (
        nombre?.toLowerCase().includes(term) ||
        proveedor.documento_numero.toLowerCase().includes(term) ||
        proveedor.email?.toLowerCase().includes(term)
      );
    });

    setFilteredProveedores(filtered);
  };

  const handleNuevoProveedor = () => {
    setProveedorSeleccionado(null);
    setShowModal(true);
  };

  const handleEditarProveedor = (proveedor: Proveedor) => {
    setProveedorSeleccionado(proveedor);
    setShowModal(true);
  };

  const handleEliminarProveedor = (proveedor: Proveedor) => {
    setProveedorAEliminar(proveedor);
    setShowDeleteModal(true);
  };

  const confirmarEliminacion = async () => {
    if (!proveedorAEliminar) return;

    try {
      await eliminarProveedor(proveedorAEliminar.id);
      await cargarProveedores();
      setShowDeleteModal(false);
      setProveedorAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      alert('Error al eliminar el proveedor');
    }
  };

  const handleModalClose = (guardado: boolean) => {
    setShowModal(false);
    setProveedorSeleccionado(null);
    if (guardado) {
      cargarProveedores();
    }
  };

  const getNombreProveedor = (proveedor: Proveedor) => {
    return proveedor.tipo_persona === 'fisica'
      ? proveedor.nombre_completo
      : proveedor.razon_social;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando proveedores...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
            <p className="text-sm text-gray-500">
              {filteredProveedores.length} proveedor{filteredProveedores.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleNuevoProveedor}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Proveedor</span>
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
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo Proveedor
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
              {filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay proveedores registrados</p>
                    <button
                      onClick={handleNuevoProveedor}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Crear primer proveedor
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {proveedor.tipo_persona === 'fisica' ? (
                          <User className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Building2 className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getNombreProveedor(proveedor)}
                      </div>
                      {proveedor.nombre_comercial && (
                        <div className="text-sm text-gray-500">
                          {proveedor.nombre_comercial}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {proveedor.documento_numero}
                      </div>
                      <div className="text-xs text-gray-500">
                        {proveedor.documento_tipo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{proveedor.email || '-'}</div>
                      <div className="text-sm text-gray-500">{proveedor.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {proveedor.tipo_proveedor}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          proveedor.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditarProveedor(proveedor)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminarProveedor(proveedor)}
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
        <ProveedorModal
          proveedor={proveedorSeleccionado}
          onClose={handleModalClose}
        />
      )}

      {showDeleteModal && proveedorAEliminar && (
        <ConfirmModal
          isOpen={showDeleteModal}
          title="Eliminar Proveedor"
          message={`¿Está seguro que desea eliminar al proveedor "${getNombreProveedor(proveedorAEliminar)}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmarEliminacion}
          onClose={() => {
            setShowDeleteModal(false);
            setProveedorAEliminar(null);
          }}
          type="danger"
        />
      )}
    </div>
  );
}
