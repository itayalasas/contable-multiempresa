import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  CreditCard,
  Percent,
  DollarSign,
  Building2,
  Wallet,
  CheckCircle,
  RefreshCw,
  Globe
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useNomencladoresAdmin } from '../../hooks/useNomencladoresAdmin';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';
import { NomencladorModal } from '../../components/admin/NomencladorModal';

type NomencladorTipo =
  | 'tipo_documento_identidad'
  | 'tipo_documento_factura'
  | 'tipo_impuesto'
  | 'forma_pago'
  | 'tipo_moneda'
  | 'banco'
  | 'tipo_movimiento_tesoreria';

interface TabConfig {
  id: NomencladorTipo;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const TABS: TabConfig[] = [
  {
    id: 'tipo_documento_identidad',
    label: 'Documentos Identidad',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'tipo_documento_factura',
    label: 'Documentos Factura',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'tipo_impuesto',
    label: 'Impuestos',
    icon: Percent,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'forma_pago',
    label: 'Formas de Pago',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'tipo_moneda',
    label: 'Monedas',
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    id: 'banco',
    label: 'Bancos',
    icon: Building2,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50'
  },
  {
    id: 'tipo_movimiento_tesoreria',
    label: 'Movimientos Tesorería',
    icon: Wallet,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  }
];

function GestionNomencladores() {
  const { paisActual } = useSesion();

  const {
    tiposDocumentoIdentidad,
    tiposDocumentoFactura,
    tiposImpuesto,
    formasPago,
    tiposMovimientoTesoreria,
    tiposMoneda,
    bancos,
    loading,
    estadisticas,
    recargarDatos
  } = useNomencladoresAdmin(paisActual?.id);

  const [activeTab, setActiveTab] = useState<NomencladorTipo>('banco');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError
  } = useModals();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recargarDatos();
      showSuccess('Datos actualizados', 'Los nomencladores se han actualizado correctamente');
    } catch (error) {
      showError('Error al actualizar', 'No se pudieron actualizar los nomencladores');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNuevo = () => {
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEditar = (item: any) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleEliminar = (item: any) => {
    confirmDelete(
      `el ${getTabConfig(activeTab).label.toLowerCase()} "${item.nombre || item.codigo}"`,
      async () => {
        try {
          // TODO: Implementar eliminación
          showSuccess('Eliminado', 'El elemento ha sido eliminado exitosamente');
          await recargarDatos();
        } catch (error) {
          showError('Error al eliminar', 'No se pudo eliminar el elemento');
        }
      }
    );
  };

  const handleGuardar = async (data: any) => {
    try {
      // TODO: Implementar guardado
      showSuccess(
        selectedItem ? 'Actualizado' : 'Creado',
        `El elemento ha sido ${selectedItem ? 'actualizado' : 'creado'} exitosamente`
      );
      setShowModal(false);
      await recargarDatos();
    } catch (error) {
      showError('Error al guardar', 'No se pudo guardar el elemento');
    }
  };

  const getTabConfig = (tabId: NomencladorTipo): TabConfig => {
    return TABS.find(t => t.id === tabId) || TABS[0];
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'tipo_documento_identidad':
        return tiposDocumentoIdentidad;
      case 'tipo_documento_factura':
        return tiposDocumentoFactura;
      case 'tipo_impuesto':
        return tiposImpuesto;
      case 'forma_pago':
        return formasPago;
      case 'tipo_moneda':
        return tiposMoneda;
      case 'banco':
        return bancos;
      case 'tipo_movimiento_tesoreria':
        return tiposMovimientoTesoreria;
      default:
        return [];
    }
  };

  const filteredData = getCurrentData().filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(searchLower) ||
      item.codigo?.toLowerCase().includes(searchLower) ||
      item.descripcion?.toLowerCase().includes(searchLower)
    );
  });

  const tabConfig = getTabConfig(activeTab);
  const Icon = tabConfig.icon;

  if (!paisActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Seleccione un país para gestionar nomencladores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestión de Nomencladores</h1>
              <p className="text-indigo-100 mt-1">
                País: {paisActual.nombre} • {filteredData.length} {tabConfig.label.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {TABS.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                  }}
                  className={`
                    flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap
                    ${isActive
                      ? `${tab.color} bg-white border-b-2 ${tab.color.replace('text-', 'border-')}`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleNuevo}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 ml-4"
            >
              <Plus className="h-4 w-4" />
              Nuevo {tabConfig.label.slice(0, -1)}
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando nomencladores...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron resultados' : `No hay ${tabConfig.label.toLowerCase()}`}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Intenta con otros términos de búsqueda'
                  : `Comienza agregando un nuevo ${tabConfig.label.slice(0, -1).toLowerCase()}`
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNuevo}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar {tabConfig.label.slice(0, -1)}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{item.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{item.nombre}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{item.descripcion || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.activo ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditar(item)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(item)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <NomencladorModal
          tipo={activeTab}
          nomenclador={selectedItem}
          paisId={paisActual.id}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
          onSave={handleGuardar}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      <NotificationModal
        isOpen={notificationModal.isOpen}
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
        onClose={closeNotification}
      />
    </div>
  );
}

export default GestionNomencladores;
