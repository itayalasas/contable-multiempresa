import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SesionProvider } from './context/SesionContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Callback } from './pages/Callback';
import { Dashboard } from './pages/Dashboard';

const PlanCuentas = React.lazy(() => import('./pages/contabilidad/PlanCuentas').then((mod) => ({ default: mod.PlanCuentas })));
const AsientosContables = React.lazy(() => import('./pages/contabilidad/AsientosContables').then((mod) => ({ default: mod.AsientosContables })));
const LibroMayor = React.lazy(() => import('./pages/contabilidad/LibroMayor').then((mod) => ({ default: mod.LibroMayor })));
const BalanceComprobacion = React.lazy(() => import('./pages/contabilidad/BalanceComprobacion').then((mod) => ({ default: mod.BalanceComprobacion })));
const CuentasPorCobrar = React.lazy(() => import('./pages/finanzas/CuentasPorCobrar').then((mod) => ({ default: mod.CuentasPorCobrar })));
const CuentasPorPagar = React.lazy(() => import('./pages/finanzas/CuentasPorPagar').then((mod) => ({ default: mod.CuentasPorPagar })));
const Tesoreria = React.lazy(() => import('./pages/finanzas/Tesoreria').then((mod) => ({ default: mod.Tesoreria })));
const ConciliacionBancaria = React.lazy(() => import('./pages/finanzas/ConciliacionBancaria').then((mod) => ({ default: mod.ConciliacionBancaria })));
const GestionUsuarios = React.lazy(() => import('./pages/admin/GestionUsuarios').then((mod) => ({ default: mod.GestionUsuarios })));
const GestionEmpresas = React.lazy(() => import('./pages/admin/GestionEmpresas').then((mod) => ({ default: mod.GestionEmpresas })));
const GestionNomencladores = React.lazy(() => import('./pages/admin/GestionNomencladores'));
const ConfiguracionMapeoArchivos = React.lazy(() => import('./pages/admin/ConfiguracionMapeoArchivos').then((mod) => ({ default: mod.ConfiguracionMapeoArchivos })));
const Clientes = React.lazy(() => import('./pages/ventas/Clientes'));
const Facturas = React.lazy(() => import('./pages/ventas/Facturas'));
const NotasCredito = React.lazy(() => import('./pages/ventas/NotasCredito'));
const NotasDebito = React.lazy(() => import('./pages/ventas/NotasDebito'));
const Recibos = React.lazy(() => import('./pages/ventas/Recibos'));
const Proveedores = React.lazy(() => import('./pages/compras/Proveedores'));
const Partners = React.lazy(() => import('./pages/compras/Partners').then((mod) => ({ default: mod.default })));
const ComisionesPartners = React.lazy(() => import('./pages/compras/ComisionesPartners').then((mod) => ({ default: mod.default })));
const FacturasCompra = React.lazy(() => import('./pages/compras/FacturasCompra'));
const NotasCreditoCompra = React.lazy(() => import('./pages/compras/NotasCreditoCompra'));
const OrdenesCompra = React.lazy(() => import('./pages/compras/OrdenesCompra'));
const PeriodosContables = React.lazy(() => import('./pages/contabilidad/PeriodosContables'));
const CentrosCosto = React.lazy(() => import('./pages/analisis/CentrosCosto'));
const SegmentosNegocio = React.lazy(() => import('./pages/analisis/SegmentosNegocio'));
const Presupuestos = React.lazy(() => import('./pages/analisis/Presupuestos'));
const BalanceGeneral = React.lazy(() => import('./pages/reportes/BalanceGeneral'));
const EstadoResultados = React.lazy(() => import('./pages/reportes/EstadoResultados'));
const FlujoEfectivo = React.lazy(() => import('./pages/reportes/FlujoEfectivo'));
const ReporteCentrosCosto = React.lazy(() => import('./pages/reportes/ReporteCentrosCosto'));
const GestionImpuestos = React.lazy(() => import('./pages/admin/GestionImpuestos'));
const Integraciones = React.lazy(() => import('./pages/admin/Integraciones'));
const Auditoria = React.lazy(() => import('./pages/admin/Auditoria'));
const Multimoneda = React.lazy(() => import('./pages/admin/Multimoneda'));
const BandejaAutorizaciones = React.lazy(() => import('./pages/admin/BandejaAutorizaciones'));
const ConfiguracionAprobaciones = React.lazy(() => import('./pages/admin/ConfiguracionAprobaciones'));
const ManualRouter = React.lazy(() => import('./manuales/ManualRouter').then((mod) => ({ default: mod.ManualRouter })));

const AppRoutes: React.FC = () => {
  const { isLoading, isAuthenticated, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
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
        <React.Suspense
          fallback={(
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Cargando módulo...</p>
              </div>
            </div>
          )}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/contabilidad/plan-cuentas" element={<PlanCuentas />} />
            <Route path="/contabilidad/asientos" element={<AsientosContables />} />
            <Route path="/contabilidad/mayor" element={<LibroMayor />} />
            <Route path="/contabilidad/balance-comprobacion" element={<BalanceComprobacion />} />
            <Route path="/contabilidad/periodos" element={<PeriodosContables />} />

            <Route path="/ventas/clientes" element={<Clientes />} />
            <Route path="/ventas/facturas" element={<Facturas />} />
            <Route path="/ventas/notas-credito" element={<NotasCredito />} />
            <Route path="/ventas/notas-debito" element={<NotasDebito />} />
            <Route path="/ventas/recibos" element={<Recibos />} />

            <Route path="/compras/proveedores" element={<Proveedores />} />
            <Route path="/compras/partners" element={<Partners />} />
            <Route path="/compras/comisiones" element={<ComisionesPartners />} />
            <Route path="/compras/facturas" element={<FacturasCompra />} />
            <Route path="/compras/notas-credito" element={<NotasCreditoCompra />} />
            <Route path="/compras/ordenes" element={<OrdenesCompra />} />

            <Route path="/finanzas/cuentas-cobrar" element={<CuentasPorCobrar />} />
            <Route path="/finanzas/cuentas-pagar" element={<CuentasPorPagar />} />
            <Route path="/finanzas/tesoreria" element={<Tesoreria />} />
            <Route path="/finanzas/conciliacion" element={<ConciliacionBancaria />} />

            <Route path="/analisis/centros-costo" element={<CentrosCosto />} />
            <Route path="/analisis/segmentos" element={<SegmentosNegocio />} />
            <Route path="/analisis/presupuestos" element={<Presupuestos />} />

            <Route path="/reportes/balance-general" element={<BalanceGeneral />} />
            <Route path="/reportes/estado-resultados" element={<EstadoResultados />} />
            <Route path="/reportes/flujo-efectivo" element={<FlujoEfectivo />} />
            <Route path="/reportes/centros-costo" element={<ReporteCentrosCosto />} />

            <Route path="/admin/empresas" element={<GestionEmpresas />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/configuracion" element={<GestionNomencladores />} />
            <Route path="/admin/configuracion-mapeo" element={<ConfiguracionMapeoArchivos />} />
            <Route path="/admin/configuracion-aprobaciones" element={<ConfiguracionAprobaciones />} />
            <Route path="/admin/impuestos" element={<GestionImpuestos />} />
            <Route path="/admin/integraciones" element={<Integraciones />} />
            <Route path="/admin/auditoria" element={<Auditoria />} />
            <Route path="/admin/multimoneda" element={<Multimoneda />} />
            <Route path="/admin/autorizaciones" element={<BandejaAutorizaciones />} />

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
