import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  Ban as Bank,
  CheckCircle,
  X,
  AlertTriangle,
  Upload,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useModals } from '../../hooks/useModals';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { ResumenConciliacion } from '../../components/conciliacion/ResumenConciliacion';
import { ConciliacionModal } from '../../components/conciliacion/ConciliacionModal';
import { ImportarExtractoModal } from '../../components/conciliacion/ImportarExtractoModal';
import { useConciliacion } from '../../hooks/useConciliacion';
import { tesoreriaSupabaseService } from '../../services/supabase/tesoreria';

function ConciliacionBancaria() {
  const { empresaActual, formatearMoneda } = useSesion();
  const {
    movimientosBancarios,
    movimientosContables,
    resumen,
    loading,
    error,
    cuentaSeleccionada,
    fechaInicio,
    fechaFin,
    setCuentaSeleccionada,
    setFechaInicio,
    setFechaFin,
    conciliarMovimientos,
    revertirConciliacion,
    importarExtractoBancario,
    recargarDatos,
  } = useConciliacion(empresaActual?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [showConciliacionModal, setShowConciliacionModal] = useState(false);
  const [showImportarModal, setShowImportarModal] = useState(false);
  const [selectedMovimientoBancario, setSelectedMovimientoBancario] = useState<any | null>(null);
  const [selectedMovimientoContable, setSelectedMovimientoContable] = useState<any | null>(null);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError,
  } = useModals();

  useEffect(() => {
    const cargarCuentas = async () => {
      if (!empresaActual?.id) return;
      try {
        setLoadingCuentas(true);
        setCuentas(await tesoreriaSupabaseService.getCuentasBancarias(empresaActual.id));
      } catch (loadError) {
        console.error('Error cargando cuentas bancarias:', loadError);
      } finally {
        setLoadingCuentas(false);
      }
    };

    cargarCuentas();
  }, [empresaActual?.id]);

  const movimientosBancariosFiltrados = movimientosBancarios.filter((movimiento) => {
    const matchesSearch = movimiento.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      || movimiento.referencia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuenta = !cuentaSeleccionada || movimiento.cuentaId === cuentaSeleccionada;

    let matchesFecha = true;
    if (fechaInicio && fechaFin) {
      const fechaMovimiento = new Date(movimiento.fecha);
      matchesFecha = fechaMovimiento >= new Date(fechaInicio) && fechaMovimiento <= new Date(fechaFin);
    }

    return matchesSearch && matchesCuenta && matchesFecha;
  });

  const movimientosContablesFiltrados = movimientosContables.filter((movimiento) => {
    const matchesSearch = movimiento.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      || (movimiento.referencia && movimiento.referencia.toLowerCase().includes(searchTerm.toLowerCase()))
      || movimiento.asientoNumero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuenta = !cuentaSeleccionada || movimiento.cuentaId === cuentaSeleccionada;

    let matchesFecha = true;
    if (fechaInicio && fechaFin) {
      const fechaMovimiento = new Date(movimiento.fecha);
      matchesFecha = fechaMovimiento >= new Date(fechaInicio) && fechaMovimiento <= new Date(fechaFin);
    }

    return matchesSearch && matchesCuenta && matchesFecha;
  });

  const handleConciliarMovimientoBancario = (movimiento: any) => {
    if (movimiento.conciliado) {
      showError('Movimiento ya conciliado', 'Este movimiento bancario ya está conciliado con un movimiento contable.');
      return;
    }

    setSelectedMovimientoBancario(movimiento);
    setSelectedMovimientoContable(null);
    setShowConciliacionModal(true);
  };

  const handleConciliarMovimientoContable = (movimiento: any) => {
    if (movimiento.conciliado) {
      showError('Movimiento ya conciliado', 'Este movimiento contable ya está conciliado con un movimiento bancario.');
      return;
    }

    setSelectedMovimientoContable(movimiento);
    setSelectedMovimientoBancario(null);
    setShowConciliacionModal(true);
  };

  const handleRevertirConciliacion = (movimientoBancario: any, movimientoContable: any) => {
    confirmDelete(
      'Confirmar reversión',
      '¿Está seguro de que desea revertir esta conciliación?',
      async () => {
        try {
          await revertirConciliacion(movimientoBancario.id, movimientoContable.id);
          showSuccess('Conciliación revertida', 'La conciliación se revirtió correctamente.');
        } catch (revertError) {
          showError('Error al revertir', revertError instanceof Error ? revertError.message : 'Error desconocido');
        }
      },
    );
  };

  const handleConciliar = async (movimientoBancario: any, movimientoContable: any) => {
    try {
      await conciliarMovimientos(movimientoBancario, movimientoContable);
      showSuccess('Conciliación exitosa', 'Los movimientos fueron conciliados correctamente.');
    } catch (conciliarError) {
      showError('Error al conciliar', conciliarError instanceof Error ? conciliarError.message : 'Error desconocido');
    }
  };

  const handleImportarExtracto = async (file: File, cuentaId: string, formato: string, configuracionId?: string) => {
    try {
      const cantidadImportada = await importarExtractoBancario(file, cuentaId, formato, configuracionId);
      showSuccess('Extracto importado', `Se importaron ${cantidadImportada} movimientos bancarios.`);
    } catch (importError) {
      showError('Error al importar extracto', importError instanceof Error ? importError.message : 'Error desconocido');
      throw importError;
    }
  };

  const getCuentaNombre = (cuentaId: string) => {
    const cuenta = cuentas.find((item) => item.id === cuentaId);
    return cuenta ? cuenta.nombre : 'Cuenta desconocida';
  };

  if (!empresaActual) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Seleccione una empresa para continuar</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <ArrowLeftRight className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Conciliación Bancaria</h1>
              <p className="text-indigo-100">Conciliación de extractos importados contra tesorería contabilizada en Supabase</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/manuales/finanzas/conciliacion"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <BookOpen className="h-5 w-5" />
              Manual
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

      {resumen && <ResumenConciliacion resumen={resumen} formatearMoneda={formatearMoneda} />}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5 text-indigo-600" />
            Filtros
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={recargarDatos}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              <Download className="h-4 w-4" />
              Exportar Reporte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Bancaria</label>
            <select
              value={cuentaSeleccionada || ''}
              onChange={(e) => setCuentaSeleccionada(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loadingCuentas}
            >
              <option value="">Todas las cuentas</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} ({cuenta.banco || cuenta.tipoCuenta})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input type="date" value={fechaInicio || ''} onChange={(e) => setFechaInicio(e.target.value || undefined)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input type="date" value={fechaFin || ''} onChange={(e) => setFechaFin(e.target.value || undefined)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Descripción, referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bank className="h-5 w-5 text-indigo-600" />
            Movimientos Bancarios Importados
          </h3>
          <span className="text-sm text-gray-500">{movimientosBancariosFiltrados.length} movimientos</span>
        </div>
        {movimientosBancariosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay movimientos bancarios importados para los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientosBancariosFiltrados.map((movimiento) => {
                  const movimientoContableConciliado = movimiento.movimientoContableId
                    ? movimientosContables.find((item) => item.id === movimiento.movimientoContableId)
                    : null;

                  return (
                    <tr key={movimiento.id} className={`hover:bg-gray-50 ${movimiento.conciliado ? 'bg-green-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(movimiento.fecha).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{movimiento.descripcion}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{movimiento.referencia || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getCuentaNombre(movimiento.cuentaId)}</td>
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
                        {movimiento.conciliado && movimientoContableConciliado ? (
                          <button
                            onClick={() => handleRevertirConciliacion(movimiento, movimientoContableConciliado)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Revertir
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConciliarMovimientoBancario(movimiento)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                            Conciliar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Movimientos de Tesorería
          </h3>
          <span className="text-sm text-gray-500">{movimientosContablesFiltrados.length} movimientos</span>
        </div>
        {movimientosContablesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay movimientos de tesorería para los filtros actuales.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientosContablesFiltrados.map((movimiento) => {
                  const movimientoBancarioConciliado = movimientosBancarios.find((item) => item.movimientoContableId === movimiento.id);

                  return (
                    <tr key={movimiento.id} className={`hover:bg-gray-50 ${movimiento.conciliado ? 'bg-green-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(movimiento.fecha).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{movimiento.asientoNumero}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{movimiento.descripcion}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getCuentaNombre(movimiento.cuentaId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={movimiento.tipo === 'INGRESO' ? 'text-green-600' : movimiento.tipo === 'EGRESO' ? 'text-red-600' : 'text-blue-600'}>
                          {movimiento.tipo === 'INGRESO' ? '+' : movimiento.tipo === 'EGRESO' ? '-' : '↔'} {formatearMoneda(movimiento.monto)}
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
                        {movimiento.conciliado && movimientoBancarioConciliado ? (
                          <button
                            onClick={() => handleRevertirConciliacion(movimientoBancarioConciliado, movimiento)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Revertir
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConciliarMovimientoContable(movimiento)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                            Conciliar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConciliacionModal && (
        <ConciliacionModal
          isOpen={showConciliacionModal}
          onClose={() => setShowConciliacionModal(false)}
          movimientoBancario={selectedMovimientoBancario}
          movimientoContable={selectedMovimientoContable}
          movimientosParaConciliar={
            selectedMovimientoBancario
              ? movimientosContables.filter((item) => !item.conciliado)
              : movimientosBancarios.filter((item) => !item.conciliado)
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

export { ConciliacionBancaria };
