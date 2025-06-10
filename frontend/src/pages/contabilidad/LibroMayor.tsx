import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  Calendar, 
  Download, 
  FileText, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { usePlanCuentas } from '../../hooks/usePlanCuentas';
import { libroMayorService, LibroMayorData } from '../../services/firebase/libroMayor';
import { SearchableAccountSelector } from '../../components/common/SearchableAccountSelector';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';

function LibroMayor() {
  const { empresaActual } = useSesion();
  const { cuentas, loading: cuentasLoading } = usePlanCuentas(empresaActual?.id);
  
  // Estados principales
  const [libroMayorData, setLibroMayorData] = useState<LibroMayorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [selectedCuentaId, setSelectedCuentaId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Estados de exportación
  const [exporting, setExporting] = useState(false);
  
  // Hook para modales
  const {
    notificationModal,
    closeNotification,
    showSuccess,
    showError
  } = useModals();

  // Consultar libro mayor
  const handleConsultar = async () => {
    if (!empresaActual?.id || !selectedCuentaId) {
      showError('Datos requeridos', 'Debe seleccionar una cuenta para consultar');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await libroMayorService.getLibroMayorCuenta(
        empresaActual.id,
        selectedCuentaId,
        fechaInicio || undefined,
        fechaFin || undefined
      );
      
      setLibroMayorData(data);
      
      if (data && data.movimientos.length === 0) {
        showSuccess(
          'Consulta completada',
          'No se encontraron movimientos para la cuenta en el período seleccionado'
        );
      } else if (data) {
        showSuccess(
          'Consulta completada',
          `Se encontraron ${data.movimientos.length} movimientos para la cuenta`
        );
      }
    } catch (err) {
      console.error('Error consultando libro mayor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      showError('Error en consulta', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Exportar a CSV
  const handleExportCSV = async () => {
    if (!libroMayorData) return;
    
    setExporting(true);
    try {
      libroMayorService.exportarCSV(libroMayorData, fechaInicio, fechaFin);
      showSuccess('Exportación exitosa', 'El archivo CSV ha sido descargado');
    } catch (error) {
      showError('Error en exportación', 'No se pudo exportar el archivo CSV');
    } finally {
      setExporting(false);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!libroMayorData) return;
    
    setExporting(true);
    try {
      libroMayorService.exportarExcel(libroMayorData, fechaInicio, fechaFin);
      showSuccess('Exportación exitosa', 'El archivo Excel ha sido descargado');
    } catch (error) {
      showError('Error en exportación', 'No se pudo exportar el archivo Excel');
    } finally {
      setExporting(false);
    }
  };

  // Formatear moneda
  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(cantidad);
  };

  // Obtener color del saldo según el tipo de cuenta
  const getColorSaldo = (saldo: number, tipoCuenta: string) => {
    if (saldo === 0) return 'text-gray-600';
    
    if (['ACTIVO', 'GASTO'].includes(tipoCuenta)) {
      return saldo > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return saldo > 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona una empresa para ver el libro mayor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Book className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Libro Mayor</h1>
              <p className="text-purple-100">Consulta y análisis de movimientos por cuenta</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {cuentas.length} cuentas disponibles
                </span>
                {libroMayorData && (
                  <span className="bg-white/20 px-3 py-1 rounded">
                    {libroMayorData.movimientos.length} movimientos
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedCuentaId('')}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-purple-600" />
          Filtros de Consulta
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Selector de cuenta con búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cuenta Contable *
            </label>
            <SearchableAccountSelector
              cuentas={cuentas}
              value={selectedCuentaId}
              onChange={(cuentaId) => setSelectedCuentaId(cuentaId)}
              placeholder="Buscar cuenta por código o nombre..."
              disabled={loading || cuentasLoading}
              error={!selectedCuentaId && error !== null}
            />
            {cuentasLoading && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando cuentas desde Firebase...
              </p>
            )}
          </div>
          
          {/* Fecha desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          {/* Fecha hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedCuentaId ? (
              <span className="text-green-600 font-medium">✓ Cuenta seleccionada</span>
            ) : (
              <span className="text-orange-600">⚠ Seleccione una cuenta para consultar</span>
            )}
          </div>
          <button
            onClick={handleConsultar}
            disabled={!selectedCuentaId || loading || cuentasLoading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Consultar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Consultando movimientos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error en la consulta</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleConsultar}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : !libroMayorData ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Book className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona una cuenta para consultar
              </h3>
              <p className="text-gray-600">
                Utiliza los filtros para consultar los movimientos del libro mayor
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Header de resultados */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Movimientos de la Cuenta
                  </h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Cuenta:</span> {libroMayorData.cuenta.codigo} - {libroMayorData.cuenta.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tipo:</span> 
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        libroMayorData.cuenta.tipo === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                        libroMayorData.cuenta.tipo === 'PASIVO' ? 'bg-red-100 text-red-800' :
                        libroMayorData.cuenta.tipo === 'PATRIMONIO' ? 'bg-blue-100 text-blue-800' :
                        libroMayorData.cuenta.tipo === 'INGRESO' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {libroMayorData.cuenta.tipo}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Período:</span> 
                      {fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} - 
                      {fechaFin ? new Date(fechaFin).toLocaleDateString('es-PE') : 'Hasta la fecha'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleExportCSV}
                    disabled={exporting}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de saldos */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Inicial</p>
                      <p className={`text-lg font-bold ${getColorSaldo(libroMayorData.saldoInicial, libroMayorData.cuenta.tipo)}`}>
                        {formatearMoneda(libroMayorData.saldoInicial)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Debe</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatearMoneda(libroMayorData.totalDebe)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Haber</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatearMoneda(libroMayorData.totalHaber)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Final</p>
                      <p className={`text-lg font-bold ${getColorSaldo(libroMayorData.saldoFinal, libroMayorData.cuenta.tipo)}`}>
                        {formatearMoneda(libroMayorData.saldoFinal)}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de movimientos */}
            {libroMayorData.movimientos.length > 0 ? (
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
                        Referencia
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debe
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Haber
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Fila de saldo inicial si existe */}
                    {libroMayorData.saldoInicial !== 0 && (
                      <tr className="bg-blue-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">
                          SALDO INICIAL
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Saldo inicial del período
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          -
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getColorSaldo(libroMayorData.saldoInicial, libroMayorData.cuenta.tipo)}`}>
                          {formatearMoneda(libroMayorData.saldoInicial)}
                        </td>
                      </tr>
                    )}
                    
                    {/* Movimientos */}
                    {libroMayorData.movimientos.map((movimiento, index) => (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {movimiento.asientoNumero}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {movimiento.descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movimiento.referencia || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                          {movimiento.debe > 0 ? formatearMoneda(movimiento.debe) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                          {movimiento.haber > 0 ? formatearMoneda(movimiento.haber) : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getColorSaldo(movimiento.saldo, libroMayorData.cuenta.tipo)}`}>
                          {formatearMoneda(movimiento.saldo)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fila de totales */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={4}>
                        TOTALES
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatearMoneda(libroMayorData.totalDebe)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatearMoneda(libroMayorData.totalHaber)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getColorSaldo(libroMayorData.saldoFinal, libroMayorData.cuenta.tipo)}`}>
                        {formatearMoneda(libroMayorData.saldoFinal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay movimientos
                </h3>
                <p className="text-gray-600">
                  No se encontraron movimientos para la cuenta en el período seleccionado
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de notificaciones */}
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

export { LibroMayor };