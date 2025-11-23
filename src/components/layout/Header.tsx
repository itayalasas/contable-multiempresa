import React, { useState } from 'react';
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Building2,
  Menu,
  Globe,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSesion } from '../../context/SesionContext';
import { SelectorEmpresa } from '../common/SelectorEmpresa';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { usuario, logout } = useAuth();
  const { empresaActual, paisActual, empresasDisponibles } = useSesion();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - MANTENER tamaños originales */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">ContaEmpresa</h1>
              <p className="text-xs text-gray-500">Sistema Multi-País</p>
            </div>
          </div>
        </div>

        {/* Center - Selector de Empresa */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <SelectorEmpresa />
        </div>

        {/* Right side - MANTENER tamaños originales */}
        <div className="flex items-center space-x-4">
          {/* Información del país actual */}
          {paisActual && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              <Globe className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {paisActual.codigo}
              </span>
              <span className="text-xs text-gray-500">
                {paisActual.simboloMoneda}
              </span>
            </div>
          )}

          {/* Ayuda */}
          <div className="relative">
            <button
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Ayuda"
            >
              <HelpCircle className="h-5 w-5 text-gray-600" />
            </button>
            
            {showHelpMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <Link 
                    to="/manuales"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowHelpMenu(false)}
                  >
                    Manual de Usuario
                  </Link>
                  <Link 
                    to="/manuales/contabilidad/asientos"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowHelpMenu(false)}
                  >
                    Guía de Asientos Contables
                  </Link>
                  <Link 
                    to="/manuales/finanzas/tesoreria"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowHelpMenu(false)}
                  >
                    Guía de Tesorería
                  </Link>
                  <Link 
                    to="/manuales/finanzas/conciliacion"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowHelpMenu(false)}
                  >
                    Guía de Conciliación Bancaria
                  </Link>
                  <hr className="my-1" />
                  <a 
                    href="https://contaempresa.com/soporte" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Soporte Técnico
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <button className="p-2 rounded-md hover:bg-gray-100 transition-colors relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>

          {/* Menú de Usuario */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <img
                src={usuario?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150'}
                alt={usuario?.nombre}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{usuario?.nombre}</p>
                <p className="text-xs text-gray-500">
                  {empresasDisponibles.length} empresa{empresasDisponibles.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{usuario?.nombre}</p>
                  <p className="text-xs text-gray-500">{usuario?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {usuario?.rol === 'super_admin' ? 'Super Admin' :
                       usuario?.rol === 'admin_empresa' ? 'Admin Empresa' :
                       usuario?.rol === 'contador' ? 'Contador' : 'Usuario'}
                    </span>
                    {paisActual && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {paisActual.nombre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Empresa actual en móvil */}
                <div className="md:hidden px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">Empresa Actual:</p>
                  <SelectorEmpresa />
                </div>

                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                  </button>
                  <Link 
                    to="/manuales"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Manual de Usuario</span>
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};