import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus, Ban as BankIcon, CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Info, AlertCircle } from 'lucide-react';

const TesoreriaManual: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/manuales" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al índice del manual
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="h-8 w-8" />
            Manual de Tesorería
          </h1>
          <p className="mt-2 text-cyan-100">
            Guía completa para la gestión de cuentas bancarias y flujo de efectivo
          </p>
        </div>
        
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Qué es el módulo de Tesorería?</h2>
            <p className="text-gray-700 mb-4">
              El módulo de Tesorería permite gestionar las cuentas bancarias y de efectivo de la empresa, 
              registrar movimientos de ingresos y egresos, realizar transferencias entre cuentas, y mantener 
              un control detallado del flujo de efectivo.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Importancia:</strong> Una gestión eficiente de tesorería permite optimizar la 
                    liquidez de la empresa, controlar los flujos de efectivo y tomar decisiones financieras 
                    informadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cuentas Bancarias</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Tipos de cuentas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <BankIcon className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Cuenta Corriente</h4>
                  </div>
                  <p className="text-gray-600">Cuenta bancaria para operaciones diarias, con disponibilidad inmediata de fondos.</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <PiggyBank className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Cuenta de Ahorro</h4>
                  </div>
                  <p className="text-gray-600">Cuenta bancaria que genera intereses, generalmente con algunas restricciones de disponibilidad.</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wallet className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-800">Caja/Efectivo</h4>
                  </div>
                  <p className="text-gray-600">Registro de dinero en efectivo disponible físicamente en la empresa.</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-800">Tarjeta de Crédito</h4>
                  </div>
                  <p className="text-gray-600">Línea de crédito bancaria para pagos, con saldo negativo y límite de crédito.</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Cómo crear una cuenta bancaria</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Acceder al módulo de Tesorería</h4>
                    <p className="text-gray-600">Desde el menú lateral, seleccione "Finanzas" y luego "Tesorería".</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Hacer clic en "Nueva Cuenta"</h4>
                    <p className="text-gray-600">Pulse el botón "Nueva Cuenta" ubicado en la sección de Cuentas Bancarias.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Completar la información de la cuenta</h4>
                    <p className="text-gray-600">Ingrese los siguientes datos:</p>
                    <ul className="list-disc list-inside mt-2 text-gray-600 text-sm">
                      <li><strong>Nombre de la Cuenta:</strong> Identificador descriptivo (ej. "Cuenta Corriente BCP").</li>
                      <li><strong>Tipo de Cuenta:</strong> Seleccione entre Corriente, Ahorro, Efectivo o Tarjeta.</li>
                      <li><strong>Número de Cuenta:</strong> Número asignado por el banco o identificador interno.</li>
                      <li><strong>Banco:</strong> Entidad financiera (solo para cuentas bancarias).</li>
                      <li><strong>Moneda:</strong> Divisa en la que opera la cuenta.</li>
                      <li><strong>Saldo Actual:</strong> Monto disponible en la cuenta al momento de crearla.</li>
                      <li><strong>Saldo Disponible/Límite de Crédito:</strong> Para tarjetas de crédito, el límite máximo.</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Guardar la cuenta</h4>
                    <p className="text-gray-600">Una vez completada la información, haga clic en "Crear Cuenta".</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Movimientos de Tesorería</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Tipos de movimientos</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Ingreso</h4>
                  </div>
                  <p className="text-gray-600">Entrada de dinero a una cuenta (cobros, depósitos, transferencias recibidas, etc.).</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Egreso</h4>
                  </div>
                  <p className="text-gray-600">Salida de dinero de una cuenta (pagos, retiros, transferencias enviadas, etc.).</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Transferencia</h4>
                  </div>
                  <p className="text-gray-600">Movimiento de fondos entre cuentas propias de la empresa.</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Cómo registrar un movimiento</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Acceder a la sección de movimientos</h4>
                    <p className="text-gray-600">En el módulo de Tesorería, ubique la sección de Movimientos de Tesorería.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Hacer clic en "Nuevo Movimiento"</h4>
                    <p className="text-gray-600">Pulse el botón "Nuevo Movimiento" ubicado en la parte superior de la sección.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Completar la información del movimiento</h4>
                    <p className="text-gray-600">Ingrese los siguientes datos:</p>
                    <ul className="list-disc list-inside mt-2 text-gray-600 text-sm">
                      <li><strong>Fecha:</strong> Fecha en que se realizó el movimiento.</li>
                      <li><strong>Tipo de Movimiento:</strong> Seleccione Ingreso, Egreso o Transferencia.</li>
                      <li><strong>Concepto:</strong> Descripción clara del motivo del movimiento.</li>
                      <li><strong>Monto:</strong> Cantidad de dinero involucrada en la operación.</li>
                      <li><strong>Cuenta:</strong> Cuenta bancaria o de efectivo afectada.</li>
                      <li><strong>Cuenta Destino:</strong> Solo para transferencias, la cuenta que recibe los fondos.</li>
                      <li><strong>Referencia:</strong> Número de operación, cheque u otro identificador (opcional).</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 bg-cyan-100 rounded-full p-1">
                    <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Guardar el movimiento</h4>
                    <p className="text-gray-600">Una vez completada la información, haga clic en "Crear Movimiento".</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen de Tesorería</h2>
            <p className="text-gray-700 mb-4">
              El resumen de tesorería proporciona una visión general de la situación financiera de la empresa 
              en términos de liquidez y flujo de efectivo.
            </p>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Saldo Total</h3>
                <p className="text-gray-600">Suma de los saldos de todas las cuentas bancarias y de efectivo.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Ingresos del Mes</h3>
                <p className="text-gray-600">Total de movimientos de ingreso registrados en el mes actual.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Egresos del Mes</h3>
                <p className="text-gray-600">Total de movimientos de egreso registrados en el mes actual.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Distribución por Tipo de Cuenta</h3>
                <p className="text-gray-600">Desglose de saldos según el tipo de cuenta (corriente, ahorro, efectivo, tarjeta).</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Distribución por Moneda</h3>
                <p className="text-gray-600">Desglose de saldos según la moneda de las cuentas.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Filtros y Búsqueda</h2>
            <p className="text-gray-700 mb-4">
              El módulo de Tesorería ofrece diversas opciones para filtrar y buscar movimientos:
            </p>
            
            <div className="space-y-3">
              <p className="text-gray-700">
                <strong>• Búsqueda por concepto o referencia:</strong> Permite encontrar movimientos específicos por palabras clave.
              </p>
              
              <p className="text-gray-700">
                <strong>• Filtro por cuenta:</strong> Muestra solo los movimientos de una cuenta seleccionada.
              </p>
              
              <p className="text-gray-700">
                <strong>• Filtro por tipo de movimiento:</strong> Permite ver solo ingresos, egresos o transferencias.
              </p>
              
              <p className="text-gray-700">
                <strong>• Filtro por fecha:</strong> Acota los resultados a un período específico.
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Los movimientos de tesorería afectan inmediatamente los saldos de las cuentas. Verifique 
                    cuidadosamente la información antes de registrar un movimiento, especialmente el tipo de 
                    movimiento y las cuentas involucradas.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/finanzas/tesoreria" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
              <Wallet className="h-5 w-5 mr-2" />
              Ir al módulo de Tesorería
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesoreriaManual;