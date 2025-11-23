import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  RefreshCw, 
  FileText, 
  Ban as Bank, 
  CheckCircle, 
  X, 
  Eye, 
  Plus, 
  Loader2, 
  AlertTriangle,
  Upload,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../hooks/useModals';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { ResumenConciliacion } from '../../components/conciliacion/ResumenConciliacion';
import { ConciliacionModal } from '../../components/conciliacion/ConciliacionModal';
import { ImportarExtractoModal } from '../../components/conciliacion/ImportarExtractoModal';
import { useConciliacionFirebase } from '../../hooks/useConciliacionFirebase';
import { TesoreriaFirebaseService } from '../../services/firebase/tesoreriaFirebase';

function ConciliacionBancaria() {
  const { empresaActual, formatearMoneda } = useSesion();
  const { usuario } = useAuth();
  
  // Hook personalizado para manejo de conciliación con Firebase
  const {
    movimientosBancarios,
    movimientosContables,
    resumen,
    loading,
    error,
    isLoadingMockData,
    cuentaSeleccionada,
    fechaInicio,
    fechaFin,
    setCuentaSeleccionada,
    setFechaInicio,
    setFechaFin,
    conciliarMovimientos,
    revertirConciliacion,
    importarExtractoBancario,
    cargarDatosMockEnFirebase,
    recargarDatos
  } = useConciliacionFirebase(empresaActual?.id);
  
  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [showConciliacionModal, setShowConciliacionModal] = useState(false);
  const [showImportarModal, setShowImportarModal] = useState(false);
  const [selectedMovimientoBancario, setSelectedMovimientoBancario] = useState<any | null>(null);
  const [selectedMovimientoContable, setSelectedMovimientoContable] = useState<any | null>(null);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  
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

  // Cargar cuentas bancarias
  useEffect(() => {
    const cargarCuentas = async () => {
      if (!empresaActual?.id) return;
      
      try {
        setLoadingCuentas(true);
        const cuentasData = await TesoreriaFirebaseService.getCuentasBancarias(empresaActual.id);
        setCuentas(cuentasData);
      } catch (error) {
        console.error('Error cargando cuentas bancarias:', error);
      } finally {
        setLoadingCuentas(false);
      }
    };
    
    cargarCuentas();
  }, [empresaActual?.id]);

  // Filtrado de movimientos bancarios
  const movimientosBancariosFiltrados = movimientosBancarios.filter(movimiento => {
    const matchesSearch = movimiento.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movimiento.referencia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuenta = !cuentaSeleccionada || movimiento.cuentaId === cuentaSeleccionada;
    
    let matchesFecha = true;
    if (fechaInicio && fechaFin) {
      const fechaMovimiento = new Date(movimiento.fecha);
      const desde = new Date(fechaInicio);
      const hasta = new Date(fechaFin);
      matchesFecha = fechaMovimiento >= desde && fechaMovimiento <= hasta;
    }
    
    return matchesSearch && matchesCuenta && matchesFecha;
  });

  // Filtrado de movimientos contables
  const movimientosContablesFiltrados = movimientosContables.filter(movimiento => {
    const matchesSearch = movimiento.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movimiento.referencia && movimiento.referencia.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         movimiento.asientoNumero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuenta = !cuentaSeleccionada || movimiento.cuentaId === cuentaSeleccionada;
    
    let matchesFecha = true;
    if (fechaInicio && fechaFin) {
      const fechaMovimiento = new Date(movimiento.fecha);
      const desde = new Date(fechaInicio);
      const hasta = new Date(fechaFin);
      matchesFecha = fechaMovimiento >= desde && fechaMovimiento <= hasta;
    }
    
    return matchesSearch && matchesCuenta && matchesFecha;
  });

  // Abrir modal de conciliación para movimiento bancario
  const handleConciliarMovimientoBancario = (movimiento: any) => {
    if (movimiento.conciliado) {
      showError(
        'Movimiento ya conciliado',
        'Este movimiento bancario ya está conciliado con un movimiento contable.'
      );
      return;
    }
    
    setSelectedMovimientoBancario(movimiento);
    setSelectedMovimientoContable(null);
    setShowConciliacionModal(true);
  };

  // Abrir modal de conciliación para movimiento contable
  const handleConciliarMovimientoContable = (movimiento: any) => {
    if (movimiento.conciliado) {
      showError(
        'Movimiento ya conciliado',
        'Este movimiento contable ya está conciliado con un movimiento bancario.'
      );
      return;
    }
    
    setSelectedMovimientoContable(movimiento);
    setSelectedMovimientoBancario(null);
    setShowConciliacionModal(true);
  };

  // Revertir conciliación
  const handleRevertirConciliacion = (movimientoBancario: any, movimientoContable: any) => {
    confirmDelete(
      'esta conciliación',
      async () => {
        try {
          await revertirConciliacion(movimientoBancario.id, movimientoContable.id);
          
          showSuccess(
            'Conciliación revertida',
            'La conciliación ha sido revertida exitosamente'
          );
        } catch (error) {
          showError(
            'Error al revertir conciliación',
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
      }
    );
  };

  // Manejar conciliación desde el modal
  const handleConciliar = async (movimientoBancario: any, movimientoContable: any) => {
    try {
      await conciliarMovimientos(movimientoBancario, movimientoContable);
      
      showSuccess(
        'Conciliación exitosa',
        'Los movimientos han sido conciliados correctamente'
      );
    } catch (error) {
      showError(
        'Error al conciliar',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }
  };

  // Manejar importación de extracto
  const handleImportarExtracto = async (file: File, cuentaId: string, formato: string) => {
    try {
      const cantidadImportada = await importarExtractoBancario(file, cuentaId, formato);
      
      showSuccess(
        'Extracto importado',
        `Se han importado ${cantidadImportada} movimientos bancarios correctamente`
      );
    } catch (error) {
      showError(
        'Error al importar extracto',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Cargar datos mock en Firebase
  const handleCargarDatosMock = async () => {
    try {
      const resultado = await cargarDatosMockEnFirebase();
      if (resultado) {
        // Limpiar selecciones para evitar IDs obsoletos
        setSelectedMovimientoBancario(null);
        setSelectedMovimientoContable(null);
        setShowConciliacionModal(false);
        
        showSuccess(
          'Datos cargados',
          'Los datos de prueba han sido cargados exitosamente en Firebase.'
        );
      }
    } catch (error) {
      showError(
        'Error al cargar datos',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }
  };

  // Obtener el nombre de la cuenta
  const getCuentaNombre = (cuentaId: string): string => {
    const cuenta = cuentas.find(c => c.id === cuentaId);
    return cuenta ? cuenta.nombre : 'Cuenta desconocida';
  };

  // Renderizar contenido principal
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Cargando datos de conciliación...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={recargarDatos}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Resumen de Conciliación */}
        {resumen && (
          <ResumenConciliacion 
            resumen={resumen} 
            formatearMoneda={formatearMoneda} 
          />
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-600" />
              Filtros de Conciliación
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowImportarModal(true)}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
              >
                <Upload className="h-4 w-4" />
                Importar Extracto
              </button>
              <button
                onClick={handleCargarDatosMock}
                disabled={isLoadingMockData}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
              >
                {isLoadingMockData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Cargar Datos en Firebase</span>
                  </>
                )}
              </button>
              <Link
                to="/manuales/finanzas/conciliacion"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Ver Manual</span>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuenta Bancaria
              </label>
              <select
                value={cuentaSeleccionada || ''}
                onChange={(e) => setCuentaSeleccionada(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loadingCuentas}
              >
                <option value="">Todas las cuentas</option>
                {cuentas.map(cuenta => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre} ({cuenta.banco || cuenta.tipo})
                  </option>
                ))}
              </select>
              {loadingCuentas && (
                <p className="text-xs text-indigo-600 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Cargando cuentas...
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaInicio || ''}
                onChange={(e) => setFechaInicio(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaFin || ''}
                onChange={(e) => setFechaFin(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Descripción, referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="mr-4">Bancarios: {movimientosBancariosFiltrados.length} movimientos</span>
              <span>Contables: {movimientosContablesFiltrados.length} movimientos</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={recargarDatos}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Exportar Reporte
              </button>
            </div>
          </div>
        </div>

        {/* Movimientos Bancarios */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bank className="h-5 w-5 text-indigo-600" />
                Movimientos Bancarios
              </h3>
              <span className="text-sm text-gray-500">
                {movimientosBancarios.filter(m => m.conciliado).length} de {movimientosBancarios.length} conciliados
              </span>
            </div>
          </div>
          
          {movimientosBancariosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <Bank className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay movimientos bancarios
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || cuentaSeleccionada || fechaInicio || fechaFin
                    ? 'No se encontraron movimientos con los filtros aplicados.'
                    : 'Importe un extracto bancario para comenzar la conciliación.'}
                </p>
                {movimientosBancarios.length === 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleCargarDatosMock}
                      disabled={isLoadingMockData}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingMockData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          <span>Cargar Datos de Prueba</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowImportarModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Importar Extracto</span>
                    </button>
                    <Link
                      to="/manuales/finanzas/conciliacion"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Ver Manual</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuenta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientosBancariosFiltrados.map((movimiento) => {
                    // Buscar movimiento contable conciliado
                    const movimientoContableConciliado = movimiento.conciliado && movimiento.movimientoContableId
                      ? movimientosContables.find(m => m.id === movimiento.movimientoContableId)
                      : null;
                    
                    return (
                      <tr key={movimiento.id} className={`hover:bg-gray-50 ${movimiento.conciliado ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {movimiento.descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movimiento.referencia}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCuentaNombre(movimiento.cuentaId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={movimiento.tipo === 'ABONO' ? 'text-green-600' : 'text-red-600'}>
                            {movimiento.tipo === 'ABONO' ? '+' : '-'} {formatearMoneda(movimiento.monto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {movimiento.conciliado ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Conciliado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {movimiento.conciliado && movimientoContableConciliado ? (
                              <button
                                onClick={() => handleRevertirConciliacion(movimiento, movimientoContableConciliado)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Revertir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConciliarMovimientoBancario(movimiento)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <ArrowLeftRight className="h-3 w-3 mr-1" />
                                Conciliar
                              </button>
                            )}
                            <Link
                              to="/manuales/finanzas/conciliacion"
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Ver manual"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Link>
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

        {/* Movimientos Contables */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Movimientos Contables
              </h3>
              <span className="text-sm text-gray-500">
                {movimientosContables.filter(m => m.conciliado).length} de {movimientosContables.length} conciliados
              </span>
            </div>
          </div>
          
          {movimientosContablesFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay movimientos contables
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || cuentaSeleccionada || fechaInicio || fechaFin
                    ? 'No se encontraron movimientos con los filtros aplicados.'
                    : 'Registre asientos contables para comenzar la conciliación.'}
                </p>
                {movimientosContables.length === 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleCargarDatosMock}
                      disabled={isLoadingMockData}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mx-auto"
                    >
                      {isLoadingMockData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          <span>Cargar Datos de Prueba</span>
                        </>
                      )}
                    </button>
                    <Link
                      to="/manuales/finanzas/conciliacion"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Ver Manual</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuenta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientosContablesFiltrados.map((movimiento) => {
                    // Buscar movimiento bancario conciliado
                    const movimientoBancarioConciliado = movimiento.conciliado && movimiento.movimientoBancarioId
                      ? movimientosBancarios.find(m => m.id === movimiento.movimientoBancarioId)
                      : null;
                    
                    return (
                      <tr key={movimiento.id} className={`hover:bg-gray-50 ${movimiento.conciliado ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movimiento.asientoNumero}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {movimiento.descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCuentaNombre(movimiento.cuentaId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={
                            movimiento.tipo === 'INGRESO' ? 'text-green-600' : 
                            movimiento.tipo === 'EGRESO' ? 'text-red-600' : 
                            'text-blue-600'
                          }>
                            {movimiento.tipo === 'INGRESO' ? '+' : 
                             movimiento.tipo === 'EGRESO' ? '-' : 
                             '↔'} {formatearMoneda(movimiento.monto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {movimiento.conciliado ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Conciliado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {movimiento.conciliado && movimientoBancarioConciliado ? (
                              <button
                                onClick={() => handleRevertirConciliacion(movimientoBancarioConciliado, movimiento)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Revertir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConciliarMovimientoContable(movimiento)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <ArrowLeftRight className="h-3 w-3 mr-1" />
                                Conciliar
                              </button>
                            )}
                            <Link
                              to="/manuales/finanzas/conciliacion"
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Ver manual"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Link>
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
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <ArrowLeftRight className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Conciliación Bancaria</h1>
              <p className="text-indigo-100">Conciliación de movimientos bancarios y contables</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {movimientosBancarios.length} movimientos bancarios
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {movimientosContables.length} movimientos contables
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {resumen?.movimientosBancariosConciliados || 0} conciliados
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/manuales/finanzas/conciliacion"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <BookOpen className="h-5 w-5" />
              <span>Manual</span>
            </Link>
            <button
              onClick={() => setShowImportarModal(true)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 font-medium"
            >
              <Upload className="h-5 w-5" />
              Importar Extracto
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderMainContent()}

      {/* Modales */}
      {showConciliacionModal && (
        <ConciliacionModal
          isOpen={showConciliacionModal}
          onClose={() => setShowConciliacionModal(false)}
          movimientoBancario={selectedMovimientoBancario}
          movimientoContable={selectedMovimientoContable}
          movimientosParaConciliar={
            selectedMovimientoBancario 
              ? movimientosContables.filter(m => !m.conciliado) 
              : movimientosBancarios.filter(m => !m.conciliado)
          }
          onConciliar={handleConciliar}
        />
      )}

      {showImportarModal && (
        <ImportarExtractoModal
          isOpen={showImportarModal}
          onClose={() => setShowImportarModal(false)}
          onImport={handleImportarExtracto}
          cuentas={cuentas}
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

// Componente Database para el icono
const Database = (props: any) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
};

export { ConciliacionBancaria };