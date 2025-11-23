import React from 'react';
import { 
  FileText,
  AlertTriangle,
  Users,
  Building2,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useSesion } from '../context/SesionContext';
import { useDashboard } from '../hooks/useDashboard';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { FinancialSummary } from '../components/dashboard/FinancialSummary';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

export const Dashboard: React.FC = () => {
  const { empresaActual, paisActual } = useSesion();
  const { stats, loading, error, recargarStats } = useDashboard(empresaActual?.id);

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* KPIs skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error al cargar el dashboard
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={recargarStats}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay empresa seleccionada
  if (!empresaActual) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Building2 className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Selecciona una empresa
          </h3>
          <p className="text-yellow-700">
            Para ver el dashboard, primero selecciona una empresa desde el menú superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Dashboard - {empresaActual.nombre}
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <span>Resumen financiero y contable</span>
            {paisActual && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  🌍 {paisActual.nombre} ({paisActual.simboloMoneda})
                </span>
              </>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={recargarStats}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Nuevo Asiento
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Asientos</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalAsientos || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.asientosConfirmados || 0} confirmados
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Asientos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.asientosPendientes || 0}</p>
              {(stats?.asientosPendientes || 0) > 0 && (
                <p className="text-xs text-orange-600 mt-1">Requieren atención</p>
              )}
            </div>
            <div className="p-3 rounded-full bg-yellow-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Cuentas</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCuentas || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.cuentasActivas || 0} activas
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Última Actividad</p>
              <p className="text-sm font-bold text-gray-900">
                {stats?.ultimaActividad 
                  ? stats.ultimaActividad.toLocaleDateString('es-PE')
                  : 'Sin actividad'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.movimientosRecientes.length || 0} movimientos recientes
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      {stats?.resumenFinanciero && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h2>
          <FinancialSummary resumen={stats.resumenFinanciero} />
        </div>
      )}

      {/* Alertas importantes */}
      {(stats?.asientosPendientes || 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Atención Requerida
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>{stats.asientosPendientes} asiento{stats.asientosPendientes !== 1 ? 's' : ''} pendiente{stats.asientosPendientes !== 1 ? 's' : ''} de confirmación</li>
                  {stats.ultimaActividad && (
                    <li>Última actividad: {stats.ultimaActividad.toLocaleDateString('es-PE')}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos y Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialChart 
          type="line" 
          title="Tendencia de Ingresos vs Gastos" 
        />
        <ActivityFeed 
          movimientos={stats?.movimientosRecientes || []} 
        />
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Accesos Rápidos</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Nuevo Asiento</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Plan de Cuentas</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Reportes</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Gestionar Usuarios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};