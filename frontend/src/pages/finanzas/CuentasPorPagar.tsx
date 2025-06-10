import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Mail,
  Phone,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  Receipt,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useCuentasPorPagar } from '../../hooks/useCuentasPorPagar';
import { useNomencladores } from '../../hooks/useNomencladores';
import { FacturaPorPagar, Proveedor, EstadoFactura } from '../../types/cuentasPorPagar';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';
import { FacturaPagarModal } from '../../components/finanzas/FacturaPagarModal';
import { ProveedorModal } from '../../components/finanzas/ProveedorModal';
import { PagoProveedorModal } from '../../components/finanzas/PagoProveedorModal';
import { ResumenCuentasPorPagar } from '../../components/finanzas/ResumenCuentasPorPagar';

function CuentasPorPagar() {
  const { empresaActual, paisActual, formatearMoneda } = useSesion();
  const { usuario } = useAuth();
  
  // Hook personalizado para manejo de cuentas por pagar
  const {
    facturas,
    proveedores,
    resumen,
    loading,
    error,
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    registrarPago,
    crearProveedor,
    recargarDatos
  } = useCuentasPorPagar(empresaActual?.id);

  // Hook para nomencladores
  const {
    tiposDocumentoIdentidad,
    tiposDocumentoFactura,
    tiposImpuesto,
    formasPago,
    loading: loadingNomencladores,
    error: errorNomencladores,
    recargarDatos: recargarNomencladores
  } = useNomencladores(paisActual?.id);

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoFactura | ''>('');
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<FacturaPorPagar | null>(null);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingNomencladores, setIsLoadingNomencladores] = useState(false);

  // Hook para modales
  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError
  } = useModals();

  // Efecto para recargar nomencladores cuando cambia el país
  useEffect(() => {
    if (paisActual?.id) {
      setIsLoadingNomencladores(true);
      recargarNomencladores().finally(() => {
        setIsLoadingNomencladores(false);
      });
    }
  }, [paisActual?.id, recargarNomencladores]);

  // Filtrado de facturas
  const facturasFiltradas = facturas.filter(factura => {
    const matchesSearch = factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         factura.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         factura.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !selectedEstado || factura.estado === selectedEstado;
    const matchesProveedor = !selectedProveedor || factura.proveedorId === selectedProveedor;
    
    let matchesFecha = true;
    if (fechaDesde && fechaHasta) {
      const fechaFactura = new Date(factura.fechaEmision);
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      matchesFecha = fechaFactura >= desde && fechaFactura <= hasta;
    }
    
    return matchesSearch && matchesEstado && matchesProveedor && matchesFecha;
  });

  const handleNuevaFactura = () => {
    setSelectedFactura(null);
    setModalType('create');
    setShowFacturaModal(true);
  };

  const handleEditarFactura = (factura: FacturaPorPagar) => {
    setSelectedFactura(factura);
    setModalType('edit');
    setShowFacturaModal(true);
  };

  const handleVerFactura = (factura: FacturaPorPagar) => {
    setSelectedFactura(factura);
    setModalType('view');
    setShowFacturaModal(true);
  };

  const handleRegistrarPago = (factura: FacturaPorPagar) => {
    setSelectedFactura(factura);
    setShowPagoModal(true);
  };

  const handleEliminarFactura = (factura: FacturaPorPagar) => {
    confirmDelete(factura.numero, async () => {
      try {
        await eliminarFactura(factura.id);
        showSuccess(
          'Factura eliminada',
          `La factura ${factura.numero} ha sido eliminada exitosamente.`
        );
      } catch (error) {
        showError(
          'Error al eliminar factura',
          error instanceof Error ? error.message : 'Error desconocido'
        );
      }
    });
  };

  // Función para actualizar datos sin recargar la página completa
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recargarDatos();
      showSuccess('Datos actualizados', 'Los datos se han actualizado correctamente');
    } catch (error) {
      showError(
        'Error al actualizar datos',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función para guardar factura con manejo de errores mejorado
  const handleSaveFactura = async (facturaData: Omit<FacturaPorPagar, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    try {
      if (modalType === 'create') {
        const facturaId = await crearFactura(facturaData);
        showSuccess(
          'Factura creada',
          `La factura ${facturaData.numero} ha sido creada exitosamente.`
        );
        return facturaId;
      } else if (modalType === 'edit' && selectedFactura) {
        await actualizarFactura(selectedFactura.id, facturaData);
        showSuccess(
          'Factura actualizada',
          `La factura ${facturaData.numero} ha sido actualizada exitosamente.`
        );
        return selectedFactura.id;
      }
      return '';
    } catch (error) {
      showError(
        'Error al guardar factura',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Función para guardar proveedor con manejo de errores mejorado
  const handleSaveProveedor = async (proveedorData: Omit<Proveedor, 'id' | 'fechaCreacion'>) => {
    try {
      const proveedorId = await crearProveedor(proveedorData);
      showSuccess(
        'Proveedor creado',
        `El proveedor ${proveedorData.nombre} ha sido creado exitosamente.`
      );
      return proveedorId;
    } catch (error) {
      showError(
        'Error al crear proveedor',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Función para registrar pago con manejo de errores mejorado
  const handleRegistrarPagoSubmit = async (facturaId: string, pagoData: any) => {
    try {
      await registrarPago(facturaId, pagoData);
      showSuccess(
        'Pago registrado',
        `El pago de ${formatearMoneda(pagoData.monto)} ha sido registrado exitosamente.`
      );
    } catch (error) {
      showError(
        'Error al registrar pago',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  const getEstadoColor = (estado: EstadoFactura) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAGADA':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'VENCIDA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PARCIAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ANULADA':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoIcon = (estado: EstadoFactura) => {
    switch (estado) {
      case 'PENDIENTE':
        return Clock;
      case 'PAGADA':
        return CheckCircle;
      case 'VENCIDA':
        return AlertTriangle;
      case 'PARCIAL':
        return CreditCard;
      case 'ANULADA':
        return Trash2;
      default:
        return FileText;
    }
  };

  const calcularDiasVencimiento = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  // Renderizar contenido principal
  const renderMainContent = () => {
    if (loading || loadingNomencladores || isLoadingNomencladores) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-gray-600">
              {isLoadingNomencladores ? 'Cargando nomencladores...' : 'Cargando cuentas por pagar...'}
            </p>
          </div>
        </div>
      );
    }

    if (error || errorNomencladores) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error || errorNomencladores}</p>
            <button
              onClick={recargarDatos}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Resumen */}
        <ResumenCuentasPorPagar resumen={resumen} />

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-red-600" />
            Filtros de Búsqueda
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Número, proveedor o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value as EstadoFactura | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PARCIAL">Pago Parcial</option>
                <option value="VENCIDA">Vencida</option>
                <option value="PAGADA">Pagada</option>
                <option value="ANULADA">Anulada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Mostrando {facturasFiltradas.length} de {facturas.length} facturas
            </div>
            <div className="flex space-x-2">
              <button className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Facturas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {facturasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Receipt className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay facturas por pagar
                </h3>
                <p className="text-gray-600 mb-6">
                  Comience creando su primera factura para gestionar las cuentas por pagar.
                </p>
                <button
                  onClick={handleNuevaFactura}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Registrar Factura
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Emisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Pendiente
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
                  {facturasFiltradas.map((factura) => {
                    const diasVencimiento = calcularDiasVencimiento(factura.fechaVencimiento);
                    const EstadoIcon = getEstadoIcon(factura.estado);
                    
                    return (
                      <tr key={factura.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {factura.numero}
                              </div>
                              {factura.descripcion && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {factura.descripcion}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {factura.proveedor.nombre}
                              </div>
                              <div className="text-sm text-gray-500">
                                {factura.proveedor.numeroDocumento}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(factura.fechaEmision).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(factura.fechaVencimiento).toLocaleDateString('es-PE')}
                          </div>
                          {factura.estado !== 'PAGADA' && factura.estado !== 'ANULADA' && (
                            <div className={`text-xs ${
                              diasVencimiento < 0 ? 'text-red-600' : 
                              diasVencimiento <= 7 ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              {diasVencimiento < 0 
                                ? `Vencida hace ${Math.abs(diasVencimiento)} días`
                                : diasVencimiento === 0 
                                ? 'Vence hoy'
                                : `Vence en ${diasVencimiento} días`
                              }
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatearMoneda(factura.montoTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={factura.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatearMoneda(factura.saldoPendiente)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(factura.estado)}`}>
                            <EstadoIcon className="h-3 w-3 mr-1" />
                            {factura.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerFactura(factura)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {factura.estado !== 'PAGADA' && factura.estado !== 'ANULADA' && (
                              <button
                                onClick={() => handleRegistrarPago(factura)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Registrar pago"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditarFactura(factura)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEliminarFactura(factura)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Receipt className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cuentas por Pagar</h1>
              <p className="text-red-100">Gestión de facturas y pagos a proveedores</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {facturas.length} facturas
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {proveedores.length} proveedores
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {formatearMoneda(resumen?.totalPorPagar || 0)} por pagar
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowProveedorModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Nuevo Proveedor
            </button>
            <button
              onClick={handleNuevaFactura}
              className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              Registrar Factura
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderMainContent()}

      {/* Modales */}
      {showFacturaModal && (
        <FacturaPagarModal
          isOpen={showFacturaModal}
          onClose={() => setShowFacturaModal(false)}
          factura={selectedFactura}
          proveedores={proveedores}
          mode={modalType}
          onSave={handleSaveFactura}
          tiposDocumento={tiposDocumentoFactura}
        />
      )}

      {showProveedorModal && (
        <ProveedorModal
          isOpen={showProveedorModal}
          onClose={() => setShowProveedorModal(false)}
          onSave={handleSaveProveedor}
          tiposDocumento={tiposDocumentoIdentidad}
        />
      )}

      {showPagoModal && selectedFactura && (
        <PagoProveedorModal
          isOpen={showPagoModal}
          onClose={() => setShowPagoModal(false)}
          factura={selectedFactura}
          onSave={handleRegistrarPagoSubmit}
          formasPago={formasPago}
        />
      )}

      {/* Modales de confirmación y notificación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={confirmModal.loading}
      />

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
}

export { CuentasPorPagar };