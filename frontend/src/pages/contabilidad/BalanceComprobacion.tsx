import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  Building2, 
  BarChart3,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { balanceComprobacionService, BalanceComprobacionData } from '../../services/firebase/balanceComprobacion';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';

function BalanceComprobacion() {
  const { empresaActual } = useSesion();
  
  // Estados principales
  const [balanceData, setBalanceData] = useState<BalanceComprobacionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [nivelCuenta, setNivelCuenta] = useState<number | undefined>(undefined);
  
  // Estados de exportación
  const [exporting, setExporting] = useState(false);
  
  // Hook para modales
  const {
    notificationModal,
    closeNotification,
    showSuccess,
    showError
  } = useModals();

  // Generar balance de comprobación
  const handleGenerarBalance = async () => {
    if (!empresaActual?.id) {
      showError('Empresa requerida', 'Debe seleccionar una empresa para generar el balance');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await balanceComprobacionService.generateBalanceComprobacion(
        empresaActual.id,
        fechaInicio || undefined,
        fechaFin || undefined,
        nivelCuenta
      );
      
      setBalanceData(data);
      
      if (data.items.length === 0) {
        showSuccess(
          'Balance generado',
          'No se encontraron cuentas con movimientos en el período seleccionado'
        );
      } else {
        showSuccess(
          'Balance generado exitosamente',
          `Se procesaron ${data.items.length} cuentas con movimientos`
        );
      }
    } catch (err) {
      console.error('Error generando balance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      showError('Error al generar balance', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!balanceData || !empresaActual) return;
    
    setExporting(true);
    try {
      balanceComprobacionService.exportarPDF(balanceData, empresaActual.nombre);
      showSuccess('Exportación exitosa', 'El PDF se está generando para impresión');
    } catch (error) {
      showError('Error en exportación', 'No se pudo generar el archivo PDF');
    } finally {
      setExporting(false);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!balanceData || !empresaActual) return;
    
    setExporting(true);
    try {
      balanceComprobacionService.exportarExcel(balanceData, empresaActual.nombre);
      showSuccess('Exportación exitosa', 'El archivo Excel ha sido descargado');
    } catch (error) {
      showError('Error en exportación', 'No se pudo exportar el archivo Excel');
    } finally {
      setExporting(false);
    }
  };

  // Formatear moneda
  const formatearMoneda = (cantidad: number) => {
    if (cantidad === 0) return '-';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(cantidad);
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setNivelCuenta(undefined);
    setBalanceData(null);
    setError(null);
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona una empresa para ver el balance de comprobación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header moderno */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Balance de Comprobación</h1>
              <p className="text-indigo-100">Resumen de saldos por cuenta contable</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {empresaActual.nombre}
                </span>
                {balanceData && (
                  <span className="bg-white/20 px-3 py-1 rounded">
                    {balanceData.items.length} cuentas
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={limpiarFiltros}
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
          <Search className="h-5 w-5 text-indigo-600" />
          Filtros de Consulta
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fecha inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          {/* Fecha fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          {/* Nivel de cuenta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Nivel de Cuenta
            </label>
            <select
              value={nivelCuenta || ''}
              onChange={(e) => setNivelCuenta(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Todos los niveles</option>
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
              <option value="4">Nivel 4</option>
              <option value="5">Nivel 5</option>
            </select>
          </div>
          
          {/* Botón generar */}
          <div className="flex items-end">
            <button
              onClick={handleGenerarBalance}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Generar Balance
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Período:</strong> {fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} - {fechaFin ? new Date(fechaFin).toLocaleDateString('es-PE') : 'Hasta la fecha'}
            {nivelCuenta && <span> | <strong>Nivel:</strong> {nivelCuenta}</span>}
          </p>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Generando balance de comprobación...</p>
              <p className="text-sm text-gray-500 mt-2">Procesando cuentas y movimientos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al generar balance</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleGenerarBalance}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : !balanceData ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generar Balance de Comprobación
              </h3>
              <p className="text-gray-600">
                Configure los filtros y haga clic en "Generar Balance" para obtener el reporte
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
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Balance de Comprobación
                  </h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Empresa:</span> {empresaActual.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Período:</span> 
                      {balanceData.fechaInicio ? new Date(balanceData.fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} - 
                      {balanceData.fechaFin ? new Date(balanceData.fechaFin).toLocaleDateString('es-PE') : 'Hasta la fecha'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Generado:</span> {balanceData.fechaGeneracion.toLocaleString('es-PE')}
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
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de totales */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Inicial</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatearMoneda(balanceData.totales.saldoInicialDebe + balanceData.totales.saldoInicialHaber)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Movimientos Debe</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatearMoneda(balanceData.totales.movimientosDebe)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Movimientos Haber</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatearMoneda(balanceData.totales.movimientosHaber)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saldo Final</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {formatearMoneda(balanceData.totales.saldoFinalDebe + balanceData.totales.saldoFinalHaber)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-indigo-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de balance */}
            {balanceData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre de la Cuenta
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>
                        Saldo Inicial
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>
                        Movimientos
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>
                        Saldo Final
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th></th>
                      <th></th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Debe</th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Haber</th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Debe</th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Haber</th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Debe</th>
                      <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {balanceData.items.map((item, index) => (
                      <tr key={item.cuenta.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.cuenta.codigo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span>{item.cuenta.nombre}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.cuenta.tipo === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                              item.cuenta.tipo === 'PASIVO' ? 'bg-red-100 text-red-800' :
                              item.cuenta.tipo === 'PATRIMONIO' ? 'bg-blue-100 text-blue-800' :
                              item.cuenta.tipo === 'INGRESO' ? 'bg-purple-100 text-purple-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {item.cuenta.tipo}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.saldoInicialDebe)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.saldoInicialHaber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.movimientosDebe)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.movimientosHaber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.saldoFinalDebe)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatearMoneda(item.saldoFinalHaber)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fila de totales */}
                    <tr className="bg-indigo-50 font-semibold border-t-2 border-indigo-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>
                        TOTALES
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.saldoInicialDebe)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.saldoInicialHaber)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.movimientosDebe)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.movimientosHaber)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.saldoFinalDebe)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-900">
                        {formatearMoneda(balanceData.totales.saldoFinalHaber)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay datos para mostrar
                </h3>
                <p className="text-gray-600">
                  No se encontraron cuentas con movimientos en el período seleccionado
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

export { BalanceComprobacion };