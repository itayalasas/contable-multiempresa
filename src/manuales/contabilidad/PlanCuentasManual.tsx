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
              El plan de cuentas en ContaEmpresa está organizado jerárquicamente por niveles, siguiendo un estándar
              de códigos de 6 dígitos sin puntos, adaptado para Uruguay y países de la región.
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 1: Clase (1 dígito)</h3>
                <p className="text-gray-600">Representa las grandes categorías de cuentas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> 1 - ACTIVO, 2 - PASIVO, 5 - PATRIMONIO, 6 - GASTOS, 7 - INGRESOS</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 2: Subgrupo (2 dígitos)</h3>
                <p className="text-gray-600">Subdivide las clases en grupos de cuentas relacionadas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> 11 - ACTIVO CORRIENTE, 21 - PASIVO CORRIENTE, 51 - CAPITAL</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 3: Categoría (3 dígitos)</h3>
                <p className="text-gray-600">Detalla los grupos en categorías específicas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> 111 - DISPONIBILIDADES, 112 - BANCOS, 211 - Tributos por Pagar</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800">Nivel 4: Cuenta Detalle (6 dígitos)</h3>
                <p className="text-gray-600">Proporciona el máximo detalle para el registro de operaciones específicas.</p>
                <p className="text-gray-600 mt-1"><strong>Ejemplos:</strong> 111001 - Caja MN, 112002 - Banco Itaú, 211001 - IVA por Pagar</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Formato de códigos:</strong> El sistema usa códigos de 6 dígitos sin puntos (ejemplo: 111001 en lugar de 1.1.1.001).
                    Los grupos de niveles superiores usan 1, 2 o 3 dígitos según corresponda.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-3">Plan de Cuentas Completo (73 cuentas)</h3>
            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre">{`📊 PLAN DE CUENTAS URUGUAY (73 cuentas totales)

1. ACTIVO (16 cuentas de detalle)
   ├─ 11. ACTIVO CORRIENTE
   │   ├─ 111. DISPONIBILIDADES
   │   │   ├─ 111001 Caja MN
   │   │   └─ 111002 Caja ME
   │   └─ 112. BANCOS
   │       ├─ 112001 Cuentas Corrientes Operativas
   │       ├─ 112002 Banco Itaú
   │       └─ 112003 Banco BROU
   ├─ 12. CUENTAS POR COBRAR
   │   └─ 121. Cuentas por Cobrar Comerciales
   │       ├─ 121001 Facturas no emitidas
   │       └─ 121002 Facturas emitidas en cartera
   ├─ 13. INVENTARIOS
   │   └─ 131. Mercaderías
   │       └─ 131001 Mercaderías manufacturadas
   └─ 14. ACTIVO FIJO
       └─ 141. Inmuebles, Maquinaria y Equipo
           ├─ 141001 Terrenos
           ├─ 141002 Maquinarias y equipos
           └─ 141003 Unidades de transporte

2. PASIVO (11 cuentas de detalle)
   └─ 21. PASIVO CORRIENTE
       ├─ 211. Tributos por Pagar
       │   ├─ 211001 IVA por Pagar
       │   └─ 211002 IGV por Pagar
       ├─ 212. Comisiones por Pagar
       │   ├─ 212001 Comisiones por Pagar - Partners
       │   └─ 212002 Comisiones MercadoPago por Pagar
       ├─ 213. Cuentas por Pagar Comerciales
       │   ├─ 213001 Facturas emitidas por pagar
       │   └─ 213002 Cuentas por Pagar - Partners
       └─ 214. Cuentas por Pagar Diversas
           └─ 214001 Pasivos por compra de activo

5. PATRIMONIO (3 cuentas de detalle)
   ├─ 51. CAPITAL
   │   └─ 511. Capital Social
   │       └─ 511001 Acciones
   └─ 59. RESULTADOS ACUMULADOS
       ├─ 591. Utilidades
       │   └─ 591001 Utilidades no distribuidas
       └─ 592. Pérdidas
           └─ 592001 Pérdidas acumuladas

7. INGRESOS (6 cuentas de detalle)
   ├─ 70. VENTAS
   │   ├─ 7011 Ventas
   │   ├─ 7012 Ingresos por Comisiones Marketplace
   │   └─ 7013 Ingresos por Comisiones Procesamiento Pagos
   └─ 75. OTROS INGRESOS
       └─ 751. Otros Ingresos de Gestión
           ├─ 751001 Servicios en beneficio del personal
           └─ 751002 Otros ingresos diversos

6. GASTOS (15 cuentas de detalle)
   ├─ 61. COMPRAS
   │   ├─ 611. Mercaderías
   │   │   └─ 611001 Mercaderías manufacturadas
   │   └─ 612. Comisiones
   │       ├─ 612001 Comisiones a Partners
   │       └─ 612002 Comisiones MercadoPago
   ├─ 63. GASTOS DE SERVICIOS
   │   ├─ 631. Servicios de Terceros
   │   │   ├─ 631001 Transporte y correos
   │   │   └─ 631002 Mantenimiento y reparaciones
   │   ├─ 6305 - Gastos por Comisiones de Pasarelas
   │   │   └─ 630501 Gastos Comisiones Mercado Pago (⭐ NUEVA)
   │   └─ 636. Servicios Básicos
   │       ├─ 636001 Energía eléctrica
   │       ├─ 636002 Gas
   │       ├─ 636003 Agua
   │       ├─ 636004 Teléfono
   │       └─ 636005 Internet
   ├─ 64. GASTOS POR TRIBUTOS
   │   ├─ 6402 - Comisiones Partners (⭐ NUEVA)
   │   └─ 6403 - Comisiones por Retencion Partners
   └─ 65. OTROS GASTOS DE GESTIÓN
       └─ 651. Gastos Generales
           ├─ 651001 Seguros
           ├─ 651002 Suministros
           └─ 651003 Otros gastos diversos`}</pre>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Cuentas operativas:</strong> Las cuentas de 6 dígitos (nivel 4) son las únicas que se pueden
                    usar en asientos contables y movimientos. Los niveles superiores son solo organizacionales.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cuentas Especiales para Marketplace y Comisiones</h2>

            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800">7012 - Ingresos por Comisiones Marketplace</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Registra los ingresos por comisiones que la empresa gana al conectar compradores con partners (vendedores).
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Uso:</strong> Se carga automáticamente cuando se crea una factura de venta con comisión de partner.
                  Ejemplo: 5% sobre venta de $5,016.39 = Ingreso de $250.82 (con IVA incluido).
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800">7013 - Ingresos por Comisiones Procesamiento Pagos</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Registra ingresos adicionales por procesamiento de pagos compartidos con el marketplace.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Uso:</strong> Cuando el marketplace comparte parte de la comisión de Mercado Pago con nosotros.
                </p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800">630501 - Gastos Comisiones Mercado Pago ⭐ NUEVA</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Registra el gasto por comisión que cobra Mercado Pago u otra pasarela de pago.
                </p>
                <p className="text-gray-600 text-sm mb-2">
                  <strong>Uso:</strong> Cuando se cobra una factura por Mercado Pago con comisión del 5%:
                </p>
                <ul className="list-disc list-inside text-gray-600 text-sm ml-4">
                  <li>Factura al cliente: $6,120</li>
                  <li>Comisión MP (5%): <strong className="text-red-700">-$306</strong> (se registra aquí)</li>
                  <li>Ingreso neto al banco: $5,814</li>
                </ul>
                <p className="text-green-700 text-sm font-medium mt-2">
                  ✓ Esto hace que el saldo bancario cuadre exactamente con lo que ingresa realmente
                </p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800">6402 - Comisiones Partners ⭐ ACTUALIZADA</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Registra el gasto por comisiones que se le pagan a los partners (vendedores) por sus ventas.
                </p>
                <p className="text-gray-600 text-sm mb-2">
                  <strong>Importante:</strong> El porcentaje acordado (ej: 5%) INCLUYE el IVA. El partner debe facturar con IVA.
                </p>
                <p className="text-gray-600 text-sm">
                  Ejemplo: Comisión 5% sobre $5,016.39 = $250.82 total (incluye $45.23 de IVA recuperable)
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800">1213 - Comisiones por Cobrar - Marketplace</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Cuenta de activo que registra las comisiones que el marketplace nos debe por ventas realizadas.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Uso:</strong> Se carga cuando se genera una venta con comisión. Se abona cuando el marketplace nos paga.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 mb-2">
                    <strong>Configuración de Comisión MP:</strong> Para que el sistema calcule automáticamente las comisiones
                    de Mercado Pago, debe activarse en la configuración de la empresa.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Ruta: Administración → Empresas → Configuración → Comisión Mercado Pago (porcentaje y activar/desactivar)
                  </p>
                </div>
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