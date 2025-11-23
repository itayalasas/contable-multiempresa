import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Calculator, PieChart, CreditCard, Receipt, Wallet, ArrowLeftRight, Building2, Users, Settings } from 'lucide-react';

const ManualIndex: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Manual de Usuario - ContaEmpresa
          </h1>
          <p className="mt-2 text-blue-100">
            Guía completa para el uso del sistema de gestión contable
          </p>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Bienvenido al manual de usuario de ContaEmpresa. Este manual le proporcionará toda la información necesaria para utilizar eficientemente nuestro sistema de gestión contable. Seleccione una sección para obtener información detallada.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/manuales/contabilidad" className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 flex items-start space-x-3 transition-colors">
              <Calculator className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-blue-800">Contabilidad</h2>
                <p className="text-sm text-gray-600">Plan de cuentas, asientos contables, libro mayor y balance de comprobación</p>
              </div>
            </Link>
            
            <Link to="/manuales/finanzas" className="bg-green-50 hover:bg-green-100 p-4 rounded-lg border border-green-200 flex items-start space-x-3 transition-colors">
              <CreditCard className="h-6 w-6 text-green-600 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-green-800">Finanzas</h2>
                <p className="text-sm text-gray-600">Cuentas por cobrar, cuentas por pagar, tesorería y conciliación bancaria</p>
              </div>
            </Link>
            
            <Link to="/manuales/reportes" className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border border-purple-200 flex items-start space-x-3 transition-colors">
              <PieChart className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-purple-800">Reportes</h2>
                <p className="text-sm text-gray-600">Balance general, estado de resultados y flujo de efectivo</p>
              </div>
            </Link>
            
            <Link to="/manuales/administracion" className="bg-red-50 hover:bg-red-100 p-4 rounded-lg border border-red-200 flex items-start space-x-3 transition-colors">
              <Settings className="h-6 w-6 text-red-600 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Administración</h2>
                <p className="text-sm text-gray-600">Gestión de empresas, usuarios y configuración del sistema</p>
              </div>
            </Link>
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Módulos Específicos</h2>
          
          <div className="space-y-3">
            <Link to="/manuales/contabilidad/plan-cuentas" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Plan de Cuentas</h3>
                <p className="text-sm text-gray-500">Gestión del catálogo contable</p>
              </div>
            </Link>
            
            <Link to="/manuales/contabilidad/asientos" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Asientos Contables</h3>
                <p className="text-sm text-gray-500">Registro de movimientos contables</p>
              </div>
            </Link>
            
            <Link to="/manuales/finanzas/cuentas-cobrar" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <CreditCard className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Cuentas por Cobrar</h3>
                <p className="text-sm text-gray-500">Gestión de facturas y cobros a clientes</p>
              </div>
            </Link>
            
            <Link to="/manuales/finanzas/cuentas-pagar" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <Receipt className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Cuentas por Pagar</h3>
                <p className="text-sm text-gray-500">Gestión de facturas y pagos a proveedores</p>
              </div>
            </Link>
            
            <Link to="/manuales/finanzas/tesoreria" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <Wallet className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Tesorería</h3>
                <p className="text-sm text-gray-500">Gestión de cuentas bancarias y flujo de efectivo</p>
              </div>
            </Link>
            
            <Link to="/manuales/finanzas/conciliacion" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <ArrowLeftRight className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Conciliación Bancaria</h3>
                <p className="text-sm text-gray-500">Conciliación de movimientos bancarios y contables</p>
              </div>
            </Link>
            
            <Link to="/manuales/administracion/empresas" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <Building2 className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Gestión de Empresas</h3>
                <p className="text-sm text-gray-500">Administración de empresas y configuración</p>
              </div>
            </Link>
            
            <Link to="/manuales/administracion/usuarios" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center space-x-3 transition-colors">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Gestión de Usuarios</h3>
                <p className="text-sm text-gray-500">Administración de usuarios y permisos</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualIndex;