import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SesionProvider } from './context/SesionContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FirebaseAuthService } from './config/firebaseAuth';

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

const ManualRouter = React.lazy(() =>
  import('./manuales/ManualRouter')
    .then(mod => ({ default: mod.ManualRouter }))
)

const AppRoutes: React.FC = () => {
  const { usuario, isLoading, isAuthenticated, error } = useAuth();

  // Inicializar autenticación de Firebase al cargar la app
  useEffect(() => {
    console.log('🔄 Inicializando autenticación de Firebase...');
    FirebaseAuthService.initialize().catch(error => {
      console.error('❌ Error inicializando autenticación de Firebase:', error);
    });
  }, []);

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
            🔥 Configurando Firebase...
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

  // En modo desarrollo, siempre mostrar como autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Modo Desarrollo: </strong>
            <span className="block sm:inline">Autenticación deshabilitada</span>
          </div>
          <p className="text-gray-600 mb-4">
            La autenticación está deshabilitada para pruebas locales.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Continuar
          </button>
        </div>
      </div>
    );
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
            <Route path="/contabilidad/plan-cuentas" element={<PlanCuentas />} />
            <Route path="/contabilidad/asientos" element={<AsientosContables />} />
            <Route path="/contabilidad/mayor" element={<LibroMayor />} />
            <Route path="/contabilidad/balance-comprobacion" element={<BalanceComprobacion />} />
            <Route path="/finanzas/cuentas-cobrar" element={<CuentasPorCobrar />} />
            <Route path="/finanzas/cuentas-pagar" element={<CuentasPorPagar />} />
            <Route path="/finanzas/tesoreria" element={<Tesoreria />} />
            <Route path="/finanzas/conciliacion" element={<ConciliacionBancaria />} />
            <Route path="/reportes/balance-general" element={<div className="p-6"><h1 className="text-2xl font-bold">Balance General</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/reportes/estado-resultados" element={<div className="p-6"><h1 className="text-2xl font-bold">Estado de Resultados</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/reportes/flujo-efectivo" element={<div className="p-6"><h1 className="text-2xl font-bold">Flujo de Efectivo</h1><p className="text-gray-600 mt-2">Módulo en desarrollo...</p></div>} />
            <Route path="/admin/empresas" element={<GestionEmpresas />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/configuracion" element={<GestionNomencladores />} />
            <Route path="/admin/configuracion-mapeo" element={<ConfiguracionMapeoArchivos />} />
            
            {/* Rutas para el manual de usuario */}
            <Route path="/manuales/*" element={<ManualRouter />} />
            
            <Route path="*" element={<Navigate to="/\" replace />} />
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
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;