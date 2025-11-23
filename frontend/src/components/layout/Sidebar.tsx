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
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/'
  },
  {
    title: 'Contabilidad',
    icon: Calculator,
    submenu: [
      { title: 'Plan de Cuentas', icon: FileText, path: '/contabilidad/plan-cuentas' },
      { title: 'Asientos Contables', icon: Receipt, path: '/contabilidad/asientos' },
      { title: 'Libro Mayor', icon: FileBarChart, path: '/contabilidad/mayor' },
      { title: 'Balance de Comprobación', icon: BarChart3, path: '/contabilidad/balance-comprobacion' },
      { title: 'Periodos Contables', icon: Calendar, path: '/contabilidad/periodos' }
    ]
  },
  {
    title: 'Ventas',
    icon: ShoppingCart,
    submenu: [
      { title: 'Clientes', icon: Users, path: '/ventas/clientes' },
      { title: 'Facturas', icon: Receipt, path: '/ventas/facturas' },
      { title: 'Notas de Crédito', icon: FileText, path: '/ventas/notas-credito' },
      { title: 'Notas de Débito', icon: FileText, path: '/ventas/notas-debito' },
      { title: 'Recibos', icon: Receipt, path: '/ventas/recibos' }
    ]
  },
  {
    title: 'Compras',
    icon: ShoppingBag,
    submenu: [
      { title: 'Proveedores', icon: Users, path: '/compras/proveedores' },
      { title: 'Partners', icon: Users, path: '/compras/partners' },
      { title: 'Comisiones', icon: DollarSign, path: '/compras/comisiones' }
    ]
  },
  {
    title: 'Finanzas',
    icon: Wallet,
    submenu: [
      { title: 'Cuentas por Cobrar', icon: CreditCard, path: '/finanzas/cuentas-cobrar' },
      { title: 'Cuentas por Pagar', icon: Receipt, path: '/finanzas/cuentas-pagar' },
      { title: 'Tesorería', icon: Wallet, path: '/finanzas/tesoreria' },
      { title: 'Conciliación Bancaria', icon: ArrowLeftRight, path: '/finanzas/conciliacion' }
    ]
  },
  {
    title: 'Análisis',
    icon: TrendingUp,
    submenu: [
      { title: 'Centros de Costo', icon: Target, path: '/analisis/centros-costo' }
    ]
  },
  {
    title: 'Reportes',
    icon: PieChart,
    submenu: [
      { title: 'Balance General', icon: FileBarChart, path: '/reportes/balance-general' }
    ]
  },
  {
    title: 'Administración',
    icon: Settings,
    submenu: [
      { title: 'Empresas', icon: Building2, path: '/admin/empresas' },
      { title: 'Usuarios', icon: Users, path: '/admin/usuarios' },
      { title: 'Nomencladores', icon: Database, path: '/admin/configuracion' },
      { title: 'Mapeo de Archivos', icon: FileText, path: '/admin/configuracion-mapeo' },
      { title: 'Impuestos', icon: DollarSign, path: '/admin/impuestos' },
      { title: 'Integraciones', icon: Plug, path: '/admin/integraciones' },
      { title: 'Auditoría', icon: Shield, path: '/admin/auditoria' },
      { title: 'Multi-moneda', icon: TrendingUp, path: '/admin/multimoneda' }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>('Contabilidad');

  const toggleSubmenu = (title: string) => {
    setExpandedMenu(expandedMenu === title ? null : title);
  };

  return (
    <>
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static h-full z-50
          w-64 bg-white border-r border-gray-200
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
          {menuItems.map((item) => (
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

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <p className="font-medium">ContaEmpresa</p>
            <p className="mt-1">v2.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};
