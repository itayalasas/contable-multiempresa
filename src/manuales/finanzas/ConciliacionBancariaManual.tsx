import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, CheckCircle, AlertTriangle, Info, Upload, Search, Filter, Ban as BankIcon, FileText } from 'lucide-react';

const ConciliacionBancariaManual: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/manuales" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al índice del manual
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8" />
            Manual de Conciliación Bancaria
          </h1>
          <p className="mt-2 text-indigo-100">
            Guía completa para la conciliación de movimientos bancarios y contables
          </p>
        </div>
        
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Qué es la Conciliación Bancaria?</h2>
            <p className="text-gray-700 mb-4">
              La conciliación bancaria es el proceso de comparar y ajustar los registros contables de una empresa 
              con los movimientos reportados por el banco en el extracto bancario. Este proceso permite identificar 
              y corregir discrepancias entre ambos registros, asegurando la exactitud de la información financiera.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Importancia:</strong> La conciliación bancaria es fundamental para detectar errores, 
                    omisiones, fraudes y para mantener un control preciso sobre los fondos de la empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Elementos de la Conciliación Bancaria</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">1. Movimientos Bancarios</h3>
                <p className="text-gray-600">Transacciones registradas en el extracto bancario (depósitos, retiros, transferencias, comisiones, etc.).</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">2. Movimientos Contables</h3>
                <p className="text-gray-600">Transacciones registradas en el sistema contable de la empresa relacionadas con cuentas bancarias.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">3. Partidas Conciliatorias</h3>
                <p className="text-gray-600">Diferencias entre los registros bancarios y contables que deben ser identificadas y ajustadas.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Proceso de Conciliación Bancaria</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Importar extracto bancario</h3>
                  <p className="text-gray-600">Cargue el extracto bancario en el sistema utilizando el botón "Importar Extracto".</p>
                  <p className="text-gray-600 text-sm mt-1">Formatos soportados: CSV, XLS, XLSX</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Revisar movimientos bancarios y contables</h3>
                  <p className="text-gray-600">Compare los movimientos bancarios importados con los movimientos contables registrados en el sistema.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Conciliar movimientos</h3>
                  <p className="text-gray-600">Para cada movimiento bancario, identifique su correspondiente movimiento contable y concílielos haciendo clic en el botón "Conciliar".</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Identificar partidas pendientes</h3>
                  <p className="text-gray-600">Identifique los movimientos que no tienen correspondencia y determine su causa:</p>
                  <ul className="list-disc list-inside mt-2 text-gray-600 text-sm">
                    <li><strong>Cheques girados y no cobrados:</strong> Registrados en la contabilidad pero no en el extracto.</li>
                    <li><strong>Depósitos en tránsito:</strong> Registrados en la contabilidad pero no reflejados en el extracto.</li>
                    <li><strong>Cargos bancarios no registrados:</strong> Comisiones, intereses u otros cargos que aparecen en el extracto pero no en la contabilidad.</li>
                    <li><strong>Errores de registro:</strong> Diferencias en montos o fechas entre ambos registros.</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">5</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Realizar ajustes contables</h3>
                  <p className="text-gray-600">Registre los asientos contables necesarios para corregir las diferencias identificadas.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                  <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">6</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Verificar el resultado de la conciliación</h3>
                  <p className="text-gray-600">Confirme que el saldo final según el extracto bancario coincide con el saldo contable ajustado.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cómo usar el módulo de Conciliación Bancaria</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Importar extracto bancario</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Acceder al módulo de Conciliación Bancaria</h4>
                      <p className="text-gray-600">Desde el menú lateral, seleccione "Finanzas" y luego "Conciliación Bancaria".</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Hacer clic en "Importar Extracto"</h4>
                      <p className="text-gray-600">Pulse el botón "Importar Extracto" ubicado en la parte superior de la pantalla.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Seleccionar cuenta y archivo</h4>
                      <p className="text-gray-600">Elija la cuenta bancaria correspondiente y seleccione el archivo del extracto bancario.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Confirmar importación</h4>
                      <p className="text-gray-600">Revise la vista previa de los datos y confirme la importación.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Conciliar movimientos</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Identificar movimientos a conciliar</h4>
                      <p className="text-gray-600">Revise las listas de movimientos bancarios y contables pendientes de conciliación.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Iniciar conciliación</h4>
                      <p className="text-gray-600">Haga clic en el botón "Conciliar" junto al movimiento bancario o contable que desea conciliar.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Seleccionar movimiento correspondiente</h4>
                      <p className="text-gray-600">En el modal que aparece, seleccione el movimiento correspondiente de la lista o utilice el buscador para encontrarlo.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Confirmar conciliación</h4>
                      <p className="text-gray-600">Verifique que los datos sean correctos y haga clic en "Conciliar" para confirmar la asociación entre ambos movimientos.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Revertir conciliación</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Identificar movimiento conciliado</h4>
                      <p className="text-gray-600">Localice el movimiento conciliado que desea revertir (aparecerá con estado "Conciliado").</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Hacer clic en "Revertir"</h4>
                      <p className="text-gray-600">Pulse el botón "Revertir" junto al movimiento conciliado.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-1">
                      <div className="bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Confirmar reversión</h4>
                      <p className="text-gray-600">Confirme la acción en el diálogo de confirmación que aparece.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Filtros y Herramientas</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  Búsqueda
                </h3>
                <p className="text-gray-600">Permite buscar movimientos por descripción, referencia o monto.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Filter className="h-5 w-5 text-indigo-600" />
                  Filtros
                </h3>
                <p className="text-gray-600">Opciones para filtrar por cuenta, fecha, estado de conciliación, etc.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-600" />
                  Importación de extractos
                </h3>
                <p className="text-gray-600">Herramienta para cargar extractos bancarios en diferentes formatos.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen de Conciliación</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Total Movimientos Bancarios</h3>
                <p className="text-gray-600">Cantidad total de movimientos registrados en el extracto bancario.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Total Movimientos Contables</h3>
                <p className="text-gray-600">Cantidad total de movimientos registrados en la contabilidad.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Movimientos Conciliados</h3>
                <p className="text-gray-600">Cantidad de movimientos que han sido correctamente conciliados.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Movimientos Pendientes</h3>
                <p className="text-gray-600">Cantidad de movimientos que aún no han sido conciliados.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Diferencia Total</h3>
                <p className="text-gray-600">Diferencia entre el saldo bancario y el saldo contable después de la conciliación.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    La conciliación bancaria debe realizarse periódicamente (idealmente de forma mensual) para 
                    mantener un control adecuado de las finanzas de la empresa y detectar oportunamente cualquier 
                    discrepancia o error.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/finanzas/conciliacion" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <ArrowLeftRight className="h-5 w-5 mr-2" />
              Ir al módulo de Conciliación Bancaria
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConciliacionBancariaManual;