import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Calculator, Plus, Edit, Trash2, CheckCircle, AlertCircle, Info, BookOpen } from 'lucide-react';

const PlanCuentasManual: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/manuales" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al índice del manual
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Manual del Plan de Cuentas
          </h1>
          <p className="mt-2 text-blue-100">
            Guía completa para la gestión del catálogo contable
          </p>
        </div>
        
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Qué es el Plan de Cuentas?</h2>
            <p className="text-gray-700 mb-4">
              El Plan de Cuentas es un listado organizado y codificado de todas las cuentas contables que una empresa 
              utiliza para registrar sus operaciones económicas. Proporciona una estructura jerárquica que facilita 
              la clasificación y el registro de las transacciones financieras.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Importancia:</strong> Un plan de cuentas bien estructurado es fundamental para mantener 
                    un sistema contable ordenado y facilitar la generación de informes financieros precisos.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Estructura del Plan de Cuentas</h2>
            <p className="text-gray-700 mb-4">
              El plan de cuentas en ContaEmpresa está organizado jerárquicamente por niveles, siguiendo la estructura 
              del Plan Contable General Empresarial (PCGE) para Perú u otros planes contables según el país seleccionado.
            </p>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 1: Clase</h3>
                <p className="text-gray-600">Representa las grandes categorías de cuentas (Activo, Pasivo, Patrimonio, Ingreso, Gasto).</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplo:</strong> 10 - EFECTIVO Y EQUIVALENTES DE EFECTIVO</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 2: Grupo</h3>
                <p className="text-gray-600">Subdivide las clases en grupos de cuentas relacionadas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplo:</strong> 101 - Caja</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 3: Cuenta</h3>
                <p className="text-gray-600">Detalla los grupos en cuentas específicas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplo:</strong> 1011 - Caja MN</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 4: Subcuenta</h3>
                <p className="text-gray-600">Proporciona un mayor detalle para el registro de operaciones específicas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplo:</strong> 10111 - Caja Principal</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Tipos de Cuentas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800">ACTIVO</h3>
                <p className="text-gray-600">Recursos controlados por la empresa como resultado de eventos pasados, de los cuales se espera obtener beneficios económicos futuros.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> Efectivo, Cuentas por Cobrar, Inventarios, Equipos</p>
                <p className="text-gray-600 mt-1"><strong>Naturaleza:</strong> Deudora (aumenta con débitos, disminuye con créditos)</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800">PASIVO</h3>
                <p className="text-gray-600">Obligaciones presentes de la empresa, surgidas de eventos pasados, cuya liquidación se espera que resulte en una salida de recursos.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> Cuentas por Pagar, Préstamos, Impuestos por Pagar</p>
                <p className="text-gray-600 mt-1"><strong>Naturaleza:</strong> Acreedora (aumenta con créditos, disminuye con débitos)</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800">PATRIMONIO</h3>
                <p className="text-gray-600">Parte residual de los activos de la empresa, una vez deducidos todos sus pasivos.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> Capital Social, Reservas, Resultados Acumulados</p>
                <p className="text-gray-600 mt-1"><strong>Naturaleza:</strong> Acreedora (aumenta con créditos, disminuye con débitos)</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800">INGRESO</h3>
                <p className="text-gray-600">Incrementos en los beneficios económicos durante el período contable en forma de entradas o aumentos de valor de los activos, o disminución de pasivos.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> Ventas, Ingresos Financieros, Otros Ingresos</p>
                <p className="text-gray-600 mt-1"><strong>Naturaleza:</strong> Acreedora (aumenta con créditos, disminuye con débitos)</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800">GASTO</h3>
                <p className="text-gray-600">Disminuciones en los beneficios económicos durante el período contable en forma de salidas o disminuciones del valor de los activos, o aumento de pasivos.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> Compras, Gastos Administrativos, Gastos Financieros</p>
                <p className="text-gray-600 mt-1"><strong>Naturaleza:</strong> Deudora (aumenta con débitos, disminuye con créditos)</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cómo gestionar el Plan de Cuentas</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Acceder al módulo de Plan de Cuentas</h3>
                  <p className="text-gray-600">Desde el menú lateral, seleccione "Contabilidad" y luego "Plan de Cuentas".</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Crear una nueva cuenta</h3>
                  <p className="text-gray-600">Pulse el botón "Nueva Cuenta" y complete el formulario con la siguiente información:</p>
                  <ul className="list-disc list-inside mt-2 text-gray-600 text-sm">
                    <li><strong>Código:</strong> Identificador único de la cuenta según la estructura del plan contable.</li>
                    <li><strong>Nombre:</strong> Denominación descriptiva de la cuenta.</li>
                    <li><strong>Tipo:</strong> Clasificación de la cuenta (Activo, Pasivo, Patrimonio, Ingreso, Gasto).</li>
                    <li><strong>Nivel:</strong> Posición jerárquica dentro del plan de cuentas.</li>
                    <li><strong>Cuenta Padre:</strong> Cuenta de nivel superior a la que pertenece (opcional).</li>
                    <li><strong>Descripción:</strong> Información adicional sobre el uso de la cuenta (opcional).</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Editar una cuenta existente</h3>
                  <p className="text-gray-600">Haga clic en el ícono de edición (lápiz) junto a la cuenta que desea modificar y actualice la información necesaria.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">4</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Eliminar una cuenta</h3>
                  <p className="text-gray-600">Haga clic en el ícono de eliminación (papelera) junto a la cuenta que desea eliminar. Solo se pueden eliminar cuentas que no tengan movimientos asociados.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-1">
                  <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">5</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Buscar y filtrar cuentas</h3>
                  <p className="text-gray-600">Utilice la barra de búsqueda para encontrar cuentas por código o nombre. También puede filtrar por tipo de cuenta utilizando el selector correspondiente.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Recomendaciones para el Plan de Cuentas</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
              <p className="text-gray-700">
                <strong>1. Mantener una estructura coherente:</strong> Respete la jerarquía y la codificación establecida en el plan contable de su país.
              </p>
              
              <p className="text-gray-700">
                <strong>2. Evitar duplicidades:</strong> No cree cuentas con el mismo código o función.
              </p>
              
              <p className="text-gray-700">
                <strong>3. Nivel de detalle adecuado:</strong> Cree subcuentas solo cuando sea necesario para un control más detallado.
              </p>
              
              <p className="text-gray-700">
                <strong>4. Documentar las cuentas:</strong> Utilice el campo de descripción para aclarar el propósito y uso de cada cuenta.
              </p>
              
              <p className="text-gray-700">
                <strong>5. Revisar periódicamente:</strong> Actualice el plan de cuentas según las necesidades cambiantes de la empresa.
              </p>
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
                    El plan de cuentas es la base de todo el sistema contable. Una estructura bien diseñada 
                    facilitará el registro de operaciones y la generación de informes financieros precisos.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/contabilidad/plan-cuentas" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Calculator className="h-5 w-5 mr-2" />
              Ir al módulo de Plan de Cuentas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanCuentasManual;