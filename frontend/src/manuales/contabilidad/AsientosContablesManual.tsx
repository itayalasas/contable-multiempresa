import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Calculator, Plus, Edit, Trash2, CheckCircle, AlertCircle, Info, BookOpen, Eye } from 'lucide-react';

const AsientosContablesManual: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/manuales" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al índice del manual
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Manual de Asientos Contables
          </h1>
          <p className="mt-2 text-green-100">
            Guía completa para el registro y gestión de asientos contables
          </p>
        </div>
        
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Qué es un asiento contable?</h2>
            <p className="text-gray-700 mb-4">
              Un asiento contable es el registro de una transacción económica en el sistema contable de una empresa. 
              Cada asiento debe cumplir con el principio de partida doble, lo que significa que el total de débitos 
              debe ser igual al total de créditos, manteniendo así el balance en la ecuación contable.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Principio de partida doble:</strong> Todo hecho económico tiene una causa y un efecto. 
                    Por cada cargo (débito) debe existir un abono (crédito) por el mismo valor.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Elementos de un asiento contable</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">1. Fecha</h3>
                <p className="text-gray-600">Fecha en que se realiza la transacción económica.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">2. Número de asiento</h3>
                <p className="text-gray-600">Identificador único del asiento contable (generado automáticamente).</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">3. Descripción</h3>
                <p className="text-gray-600">Explicación breve y clara de la transacción registrada.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">4. Referencia (opcional)</h3>
                <p className="text-gray-600">Documento que respalda la transacción (factura, recibo, etc.).</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">5. Movimientos</h3>
                <p className="text-gray-600">Detalle de las cuentas afectadas con sus respectivos débitos y créditos.</p>
                <ul className="list-disc list-inside mt-2 text-gray-600">
                  <li>Cuenta: Seleccionada del plan de cuentas</li>
                  <li>Débito: Valor que aumenta las cuentas de activo y gasto, o disminuye las de pasivo, patrimonio e ingreso</li>
                  <li>Crédito: Valor que aumenta las cuentas de pasivo, patrimonio e ingreso, o disminuye las de activo y gasto</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tipos de asientos contables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de apertura</h3>
                <p className="text-gray-600">Registra los saldos iniciales al comenzar un período contable.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de ingreso</h3>
                <p className="text-gray-600">Registra las ventas, prestación de servicios u otros ingresos.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de gasto</h3>
                <p className="text-gray-600">Registra compras, pagos de servicios u otros gastos.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de ajuste</h3>
                <p className="text-gray-600">Corrige o actualiza saldos de cuentas (depreciaciones, provisiones, etc.).</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de cierre</h3>
                <p className="text-gray-600">Cierra las cuentas de resultados al final del período contable.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Asiento de reclasificación</h3>
                <p className="text-gray-600">Reclasifica saldos entre cuentas para una presentación adecuada.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ejemplos de asientos contables</h2>
            
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Ejemplo 1: Venta al contado</h3>
                <p className="text-gray-600 mb-3">Venta de mercadería por S/ 1,180 (incluye IGV 18%).</p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debe</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">1011 - Caja MN</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">1,180.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">7011 - Ventas de mercaderías</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">1,000.00</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">40111 - IGV - Cuenta propia</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">180.00</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">TOTALES</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">1,180.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">1,180.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Ejemplo 2: Compra al crédito</h3>
                <p className="text-gray-600 mb-3">Compra de mercadería a crédito por S/ 590 (incluye IGV 18%).</p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debe</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">6011 - Mercaderías</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">500.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">40111 - IGV - Cuenta propia</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">90.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">4212 - Facturas por pagar</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">590.00</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">TOTALES</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">590.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">590.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Ejemplo 3: Pago de servicios</h3>
                <p className="text-gray-600 mb-3">Pago de servicios de energía eléctrica por S/ 236 (incluye IGV 18%).</p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debe</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">6361 - Energía eléctrica</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">200.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">40111 - IGV - Cuenta propia</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">36.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">1041 - Cuentas corrientes operativas</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">236.00</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">TOTALES</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">236.00</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">236.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cómo crear un asiento contable</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Acceder al módulo de Asientos Contables</h3>
                  <p className="text-gray-600">Desde el menú lateral, seleccione "Contabilidad" y luego "Asientos Contables".</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Hacer clic en "Nuevo Asiento"</h3>
                  <p className="text-gray-600">Pulse el botón "Nuevo Asiento" ubicado en la parte superior derecha de la pantalla.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Completar la información básica</h3>
                  <p className="text-gray-600">Ingrese la fecha, descripción y referencia (opcional) del asiento.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Agregar movimientos</h3>
                  <p className="text-gray-600">Para cada movimiento, seleccione la cuenta contable y registre el monto en la columna correspondiente (debe o haber).</p>
                  <ul className="list-disc list-inside mt-2 text-gray-600 text-sm">
                    <li>Si la cuenta aumenta su saldo, registre el monto según la naturaleza de la cuenta (debe para activos y gastos, haber para pasivos, patrimonio e ingresos).</li>
                    <li>Si la cuenta disminuye su saldo, registre el monto en la columna contraria a su naturaleza.</li>
                    <li>Puede agregar más movimientos haciendo clic en el botón "Agregar".</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">5</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Verificar el balance</h3>
                  <p className="text-gray-600">Asegúrese de que el total de débitos sea igual al total de créditos. El sistema mostrará un indicador de "Balanceado" cuando esto se cumpla.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                  <div className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">6</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Guardar el asiento</h3>
                  <p className="text-gray-600">Una vez que el asiento esté balanceado y toda la información sea correcta, haga clic en "Crear Asiento".</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestión de asientos contables</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Ver asiento
                </h3>
                <p className="text-gray-600">Permite visualizar todos los detalles de un asiento contable sin posibilidad de modificación.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-indigo-600" />
                  Editar asiento
                </h3>
                <p className="text-gray-600">Permite modificar un asiento existente. Solo se pueden editar asientos en estado "borrador".</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Eliminar asiento
                </h3>
                <p className="text-gray-600">Elimina permanentemente un asiento contable. Esta acción no se puede deshacer.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Estados de un asiento contable</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Borrador
                </h3>
                <p className="text-gray-600">Asiento que aún no ha sido confirmado. Puede ser modificado o eliminado.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Confirmado
                </h3>
                <p className="text-gray-600">Asiento validado y registrado oficialmente en la contabilidad. No puede ser modificado.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Anulado
                </h3>
                <p className="text-gray-600">Asiento que ha sido invalidado pero se mantiene en el sistema por motivos de auditoría.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Importante</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Los asientos contables son la base del sistema contable. Un registro preciso y oportuno 
                    garantiza la integridad de la información financiera de la empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/contabilidad/asientos" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              <Calculator className="h-5 w-5 mr-2" />
              Ir al módulo de Asientos Contables
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsientosContablesManual;