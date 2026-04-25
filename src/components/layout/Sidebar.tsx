import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calculator,
  PieChart,
  Users,
  Building2,
  Settings,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  FileBarChart,
  ArrowLeftRight,
  X,
  Database,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  Calendar,
  Target,
  Plug,
  Shield,
  TrendingUp,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { ModuleSlug } from '../../types/permissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

interface MenuItem {
  title: string;
  icon: any;
  path?: string;
  slug?: ModuleSlug;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  title: string;
  icon: any;
  path: string;
  slug: ModuleSlug;
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    slug: 'dashboard'
  },
  {
    title: 'Contabilidad',
    icon: Calculator,
    slug: 'contabilidad',
    submenu: [
      { title: 'Plan de Cuentas', icon: FileText, path: '/contabilidad/plan-cuentas', slug: 'plan-cuentas' },
      { title: 'Asientos Contables', icon: Receipt, path: '/contabilidad/asientos', slug: 'asientos' },
      { title: 'Libro Mayor', icon: FileBarChart, path: '/contabilidad/mayor', slug: 'mayor' },
      { title: 'Balance de Comprobación', icon: BarChart3, path: '/contabilidad/balance-comprobacion', slug: 'balance-comprobacion' },
      { title: 'Periodos Contables', icon: Calendar, path: '/contabilidad/periodos', slug: 'periodos' }
    ]
  },
  {
    title: 'Ventas',
    icon: ShoppingCart,
    slug: 'ventas',
    submenu: [
      { title: 'Clientes', icon: Users, path: '/ventas/clientes', slug: 'clientes' },
      { title: 'Facturas', icon: Receipt, path: '/ventas/facturas', slug: 'facturas' },
      { title: 'Notas de Crédito', icon: FileText, path: '/ventas/notas-credito', slug: 'notas-credito' },
      { title: 'Notas de Débito', icon: FileText, path: '/ventas/notas-debito', slug: 'notas-debito' },
      { title: 'Recibos', icon: Receipt, path: '/ventas/recibos', slug: 'recibos' }
    ]
  },
  {
    title: 'Compras',
    icon: ShoppingBag,
    slug: 'compras',
    submenu: [
      { title: 'Proveedores', icon: Users, path: '/compras/proveedores', slug: 'proveedores' },
      { title: 'Facturas Compra', icon: Receipt, path: '/compras/facturas', slug: 'proveedores' },
      { title: 'Notas Crédito', icon: FileText, path: '/compras/notas-credito', slug: 'proveedores' },
      { title: 'Órdenes Compra', icon: ShoppingBag, path: '/compras/ordenes', slug: 'proveedores' },
      { title: 'Partners', icon: Users, path: '/compras/partners', slug: 'partners' },
      { title: 'Comisiones', icon: DollarSign, path: '/compras/comisiones', slug: 'comisiones' }
    ]
  },
  {
    title: 'Finanzas',
    icon: Wallet,
    slug: 'finanzas',
    submenu: [
      { title: 'Cuentas por Cobrar', icon: CreditCard, path: '/finanzas/cuentas-cobrar', slug: 'cuentas-cobrar' },
      { title: 'Cuentas por Pagar', icon: Receipt, path: '/finanzas/cuentas-pagar', slug: 'cuentas-pagar' },
      { title: 'Tesorería', icon: Wallet, path: '/finanzas/tesoreria', slug: 'tesoreria' },
      { title: 'Conciliación Bancaria', icon: ArrowLeftRight, path: '/finanzas/conciliacion', slug: 'conciliacion' }
    ]
  },
  {
    title: 'Análisis',
    icon: TrendingUp,
    slug: 'analisis',
    submenu: [
      { title: 'Centros de Costo', icon: Target, path: '/analisis/centros-costo', slug: 'centros-costo' },
      { title: 'Segmentos', icon: TrendingUp, path: '/analisis/segmentos', slug: 'centros-costo' },
      { title: 'Presupuestos', icon: Calendar, path: '/analisis/presupuestos', slug: 'centros-costo' }
    ]
  },
  {
    title: 'Reportes',
    icon: PieChart,
    slug: 'reportes',
    submenu: [
      { title: 'Balance General', icon: FileBarChart, path: '/reportes/balance-general', slug: 'balance-general' },
      { title: 'Estado Resultados', icon: BarChart3, path: '/reportes/estado-resultados', slug: 'balance-general' },
      { title: 'Flujo de Efectivo', icon: Wallet, path: '/reportes/flujo-efectivo', slug: 'balance-general' },
      { title: 'Por Centro Costo', icon: PieChart, path: '/reportes/centros-costo', slug: 'balance-general' }
    ]
  },
  {
    title: 'Administración',
    icon: Settings,
    slug: 'administracion',
    submenu: [
      { title: 'Empresas', icon: Building2, path: '/admin/empresas', slug: 'empresas' },
      { title: 'Usuarios', icon: Users, path: '/admin/usuarios', slug: 'usuarios' },
      { title: 'Autorizaciones', icon: CheckCircle, path: '/admin/autorizaciones', slug: 'autorizaciones' },
      { title: 'Configurar Aprobaciones', icon: Shield, path: '/admin/configuracion-aprobaciones', slug: 'configuracion-aprobaciones' },
      { title: 'Nomencladores', icon: Database, path: '/admin/configuracion', slug: 'configuracion' },
      { title: 'Mapeo de Archivos', icon: FileText, path: '/admin/configuracion-mapeo', slug: 'configuracion-mapeo' },
      { title: 'Impuestos', icon: DollarSign, path: '/admin/impuestos', slug: 'impuestos' },
      { title: 'Integraciones', icon: Plug, path: '/admin/integraciones', slug: 'integraciones' },
      { title: 'Auditoría', icon: Shield, path: '/admin/auditoria', slug: 'auditoria' },
      { title: 'Multi-moneda', icon: TrendingUp, path: '/admin/multimoneda', slug: 'multimoneda' }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>('Contabilidad');
  const { hasModuleAccess } = usePermissions();

  const toggleSubmenu = (title: string) => {
    setExpandedMenu(expandedMenu === title ? null : title);
  };

  const filteredMenuItems = React.useMemo(() => {
    console.log('🔍 Filtrando menús basado en permisos');

    const filtered = menuItems
      .filter(item => {
        if (!item.slug) return true;

        if (item.submenu) {
          const hasAccess = hasModuleAccess(item.slug);
          console.log(`📁 ${item.title}: ${hasAccess ? '✅ MOSTRAR' : '❌ OCULTAR'}`);
          return hasAccess;
        }

        const hasAccess = hasModuleAccess(item.slug);
        console.log(`📄 ${item.title} (${item.slug}):`, hasAccess ? '✅ MOSTRAR' : '❌ OCULTAR');
        return hasAccess;
      });

    console.log('🎯 Menús filtrados:', filtered.map(i => i.title));
    return filtered;
  }, [hasModuleAccess]);

  return (
    <>
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Navegación principal"
        className={`
          fixed lg:static h-full z-50
          w-72 max-w-[85vw] lg:w-64 bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isMobile
            ? isOpen
              ? 'translate-x-0 shadow-2xl'
              : '-translate-x-full'
            : 'translate-x-0'
          }
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {filteredMenuItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        expandedMenu === item.title ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  <div className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${expandedMenu === item.title ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}
                  `}>
                    <div className="ml-3 pl-3 border-l-2 border-gray-200 space-y-1">
                      {item.submenu.map((subItem) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                          onClick={() => isMobile && onClose()}
                        >
                          <subItem.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{subItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  onClick={() => isMobile && onClose()}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{item.title}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
