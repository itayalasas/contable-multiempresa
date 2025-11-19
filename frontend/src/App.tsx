import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SesionProvider } from './context/SesionContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Callback } from './pages/Callback';
import { Dashboard } from './pages/Dashboard';

// Lazy load components to improve performance
const PlanCuentas = React.lazy(() =>
  import('./pages/contabilidad/PlanCuentas')
    .then(mod => ({ default: mod.PlanCuentas }))
)

const AsientosContables = React.lazy(() =>
  import('./pages/contabilidad/AsientosContables')
    .then(mod => ({ default: mod.AsientosContables }))
)

const LibroMayor = React.lazy(() =>
  import('./pages/contabilidad/LibroMayor')
    .then(mod => ({ default: mod.LibroMayor }))
)

const BalanceComprobacion = React.lazy(() =>
  import('./pages/contabilidad/BalanceComprobacion')
    .then(mod => ({ default: mod.BalanceComprobacion }))
)

const CuentasPorCobrar = React.lazy(() =>
  import('./pages/finanzas/CuentasPorCobrar')
    .then(mod => ({ default: mod.CuentasPorCobrar }))
)

const CuentasPorPagar = React.lazy(() =>
  import('./pages/finanzas/CuentasPorPagar')
    .then(mod => ({ default: mod.CuentasPorPagar }))
)

const Tesoreria = React.lazy(() =>
  import('./pages/finanzas/Tesoreria')
    .then(mod => ({ default: mod.Tesoreria }))
)

const ConciliacionBancaria = React.lazy(() =>
  import('./pages/finanzas/ConciliacionBancaria')
    .then(mod => ({ default: mod.ConciliacionBancaria }))
)

const GestionUsuarios = React.lazy(() =>
  import('./pages/admin/GestionUsuarios')
    .then(mod => ({ default: mod.GestionUsuarios }))
)

const GestionEmpresas = React.lazy(() =>
  import('./pages/admin/GestionEmpresas')
    .then(mod => ({ default: mod.GestionEmpresas }))
)
const GestionNomencladores = React.lazy(() =>
  import('./pages/admin/GestionNomencladores')
    .then(mod => ({ default: mod.GestionNomencladores }))
)

const ConfiguracionMapeoArchivos = React.lazy(() =>
  import('./pages/admin/ConfiguracionMapeoArchivos')
    .then(mod => ({ default: mod.ConfiguracionMapeoArchivos }))
)

const Clientes = React.lazy(() =>
  import('./pages/ventas/Clientes')
)

const Facturas = React.lazy(() =>
  import('./pages/ventas/Facturas')
)

const NotasCredito = React.lazy(() =>
  import('./pages/ventas/NotasCredito')
)

const Proveedores = React.lazy(() =>
  import('./pages/compras/Proveedores')
)

const ManualRouter = React.lazy(() =>
  import('./manuales/ManualRouter')
    .then(mod => ({ default: mod.ManualRouter }))
)

const AppRoutes: React.FC = () => {
  const { usuario, isLoading, isAuthenticated, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando aplicación...</p>
          <p className="mt-2 text-xs text-green-600 font-medium">
            🔓 Modo desarrollo - Autenticación deshabilitada
          </p>
          <p className="mt-1 text-xs text-blue-600">
            🗄️ Conectando con Supabase...
          </p>
        </div>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <SesionProvider>
      <Layout>
        <React.Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando módulo...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* Contabilidad */}
            <Route path="/contabilidad/plan-cuentas" element={<PlanCuentas />} />
            <Route path="/contabilidad/asientos" element={<AsientosContables />} />
            <Route path="/contabilidad/mayor" element={<LibroMayor />} />
            <Route path="/contabilidad/balance-comprobacion" element={<BalanceComprobacion />} />
            <Route path="/contabilidad/periodos" element={<div className="p-6"><h1 className="text-2xl font-bold">Periodos Contables</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Ventas */}
            <Route path="/ventas/clientes" element={<Clientes />} />
            <Route path="/ventas/facturas" element={<Facturas />} />
            <Route path="/ventas/notas-credito" element={<NotasCredito />} />
            <Route path="/ventas/notas-debito" element={<div className="p-6"><h1 className="text-2xl font-bold">Notas de Débito</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/ventas/recibos" element={<div className="p-6"><h1 className="text-2xl font-bold">Recibos</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Compras */}
            <Route path="/compras/proveedores" element={<Proveedores />} />
            <Route path="/compras/facturas" element={<div className="p-6"><h1 className="text-2xl font-bold">Facturas de Compra</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/compras/notas-credito" element={<div className="p-6"><h1 className="text-2xl font-bold">Notas de Crédito (Compras)</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/compras/ordenes" element={<div className="p-6"><h1 className="text-2xl font-bold">Órdenes de Compra</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Finanzas */}
            <Route path="/finanzas/cuentas-cobrar" element={<CuentasPorCobrar />} />
            <Route path="/finanzas/cuentas-pagar" element={<CuentasPorPagar />} />
            <Route path="/finanzas/tesoreria" element={<Tesoreria />} />
            <Route path="/finanzas/conciliacion" element={<ConciliacionBancaria />} />

            {/* Análisis */}
            <Route path="/analisis/centros-costo" element={<div className="p-6"><h1 className="text-2xl font-bold">Centros de Costo</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/analisis/segmentos" element={<div className="p-6"><h1 className="text-2xl font-bold">Segmentos de Negocio</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/analisis/presupuestos" element={<div className="p-6"><h1 className="text-2xl font-bold">Presupuestos</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Reportes */}
            <Route path="/reportes/balance-general" element={<div className="p-6"><h1 className="text-2xl font-bold">Balance General</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/reportes/estado-resultados" element={<div className="p-6"><h1 className="text-2xl font-bold">Estado de Resultados</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/reportes/flujo-efectivo" element={<div className="p-6"><h1 className="text-2xl font-bold">Flujo de Efectivo</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/reportes/centros-costo" element={<div className="p-6"><h1 className="text-2xl font-bold">Reportes por Centro de Costo</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Administración */}
            <Route path="/admin/empresas" element={<GestionEmpresas />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/configuracion" element={<GestionNomencladores />} />
            <Route path="/admin/configuracion-mapeo" element={<ConfiguracionMapeoArchivos />} />
            <Route path="/admin/impuestos" element={<div className="p-6"><h1 className="text-2xl font-bold">Gestión de Impuestos</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/admin/integraciones" element={<div className="p-6"><h1 className="text-2xl font-bold">Integraciones</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/admin/auditoria" element={<div className="p-6"><h1 className="text-2xl font-bold">Auditoría</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/admin/multimoneda" element={<div className="p-6"><h1 className="text-2xl font-bold">Multi-moneda</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />

            {/* Rutas para el manual de usuario */}
            <Route path="/manuales/*" element={<ManualRouter />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Layout>
    </SesionProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<AppRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;