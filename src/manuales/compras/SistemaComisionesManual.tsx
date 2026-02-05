import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, CreditCard, TrendingUp, AlertCircle, Info, CheckCircle, Settings } from 'lucide-react';

const SistemaComisionesManual: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/manuales" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al índice del manual
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="h-8 w-8" />
            Manual del Sistema de Comisiones
          </h1>
          <p className="mt-2 text-purple-100">
            Guía completa para gestión de comisiones de partners y pasarelas de pago
          </p>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Introducción</h2>
            <p className="text-gray-700 mb-4">
              El sistema de comisiones permite gestionar correctamente dos tipos de comisiones en operaciones de marketplace:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Comisiones de Partners</h4>
                </div>
                <p className="text-gray-600 text-sm">Porcentaje que la empresa paga a los vendedores/proveedores por ventas realizadas a través de la plataforma.</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">Comisiones de Pasarelas</h4>
                </div>
                <p className="text-gray-600 text-sm">Porcentaje que cobran Mercado Pago u otras pasarelas de pago por procesar las transacciones.</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Comisiones de Partners</h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">
                    Principio Fundamental: El porcentaje acordado INCLUYE el IVA
                  </p>
                  <p className="text-sm text-yellow-700">
                    Si acuerdas 5% de comisión con un partner, ese 5% ya incluye el IVA que el partner debe declarar.
                    El partner NO paga más, simplemente debe facturar el monto total con IVA desglosado.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Ejemplo Práctico</h3>

            <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Escenario</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Venta de alimento para mascotas: $5,016.39 (sin IVA)</li>
                <li>IVA 22%: $1,103.61</li>
                <li>Total factura cliente: $6,120.00</li>
                <li>Comisión acordada con partner: 5%</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Cálculo de Comisión</h4>
              <div className="space-y-2 text-gray-700">
                <p><strong>Base de cálculo:</strong> $5,016.39 (subtotal sin IVA)</p>
                <p><strong>Comisión 5% CON IVA:</strong> $5,016.39 × 5% = $250.82</p>
                <div className="ml-4 mt-2 text-sm">
                  <p className="text-gray-600">Desglose del monto $250.82:</p>
                  <p>• Comisión sin IVA: $250.82 ÷ 1.22 = <strong>$205.59</strong></p>
                  <p>• IVA (22%): <strong>$45.23</strong></p>
                  <p className="text-green-700 font-medium mt-1">✓ Total a pagar al partner: <strong>$250.82</strong></p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-blue-800 text-sm">
                <strong>Factura que emite el partner:</strong> El partner debe emitir una factura por $250.82,
                desglosada como: Servicios $205.59 + IVA $45.23 = Total $250.82
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Comisiones de Mercado Pago</h2>

            <p className="text-gray-700 mb-4">
              Cuando se cobra a través de Mercado Pago u otra pasarela, el dinero que realmente ingresa a tu cuenta
              bancaria es menor que el total de la factura debido a la comisión que cobra la pasarela.
            </p>

            <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Ejemplo de Flujo Real</h4>
              <div className="space-y-2 text-gray-700">
                <p><strong>Factura al cliente:</strong> $6,120.00</p>
                <p><strong>Comisión Mercado Pago (5%):</strong> -$306.00</p>
                <p className="text-green-700 font-semibold"><strong>Ingreso neto a tu cuenta:</strong> $5,814.00 ✓</p>
              </div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Ventaja del Sistema:</strong> El sistema registra automáticamente:
                  </p>
                  <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
                    <li>Ingreso neto en la cuenta bancaria: $5,814</li>
                    <li>Gasto por comisión MP: $306 (cuenta 630501)</li>
                    <li>El saldo bancario cuadra perfectamente con el banco</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Configuración</h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-purple-100 rounded-full p-1">
                  <div className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Ir a Administración → Empresas</h4>
                  <p className="text-gray-600 text-sm">Selecciona tu empresa y accede a Configuración</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-purple-100 rounded-full p-1">
                  <div className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Configurar Comisión Mercado Pago</h4>
                  <p className="text-gray-600 text-sm mb-2">En la sección de configuración de empresa:</p>
                  <ul className="list-disc list-inside text-gray-600 text-sm">
                    <li>Ingresa el porcentaje de comisión (ej: 5.00 para 5%)</li>
                    <li>Activa el cálculo automático</li>
                    <li>Guarda los cambios</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-purple-100 rounded-full p-1">
                  <div className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Efecto Automático</h4>
                  <p className="text-gray-600 text-sm">
                    A partir de ahora, todas las facturas de venta desde webhooks calcularán automáticamente
                    la comisión MP y registrarán el ingreso neto correcto.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Flujo Contable Completo</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Al crear la factura de venta</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre">{`DEBE  1212 Cuentas por Cobrar             6,120.00
    HABER  7011 Ventas                     5,016.39
    HABER  2113 IVA por Pagar              1,103.61

DEBE  1213 Comisiones por Cobrar           250.82
    HABER  7012 Ingresos Comisión App      250.82`}</pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Al cobrar por Mercado Pago</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre">{`DEBE  1121 Banco MercadoPago             5,814.00  (ingreso real)
DEBE  630501 Gastos Comisión MP            306.00  (gasto MP)
    HABER  1212 Cuentas por Cobrar        6,120.00  (total factura)`}</pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Partner emite su factura</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre">{`DEBE  6402 Comisiones Partners             205.59
DEBE  2111 IVA Crédito Fiscal              45.23
    HABER  2211 Cuentas por Pagar          250.82`}</pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">4. Al pagar al partner</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <pre className="text-sm text-gray-700 whitespace-pre">{`DEBE  2211 Cuentas por Pagar               250.82
    HABER  1121 Banco Principal            250.82`}</pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Resultado Económico</h2>

            <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">Estado de Resultados</h3>

              <div className="space-y-2 text-gray-700">
                <p className="font-semibold text-green-700">Ingresos:</p>
                <div className="ml-4 space-y-1">
                  <p>• Ventas: $5,016.39</p>
                  <p>• Comisiones App: $250.82</p>
                  <p className="font-semibold">= Total Ingresos: $5,267.21</p>
                </div>

                <p className="font-semibold text-red-700 mt-3">Gastos:</p>
                <div className="ml-4 space-y-1">
                  <p>• Comisión MP: $306.00</p>
                  <p>• Comisión Partner: $205.59</p>
                  <p className="font-semibold">= Total Gastos: $511.59</p>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-gray-300">
                  <p className="font-bold text-lg text-blue-700">Utilidad Bruta: $4,755.62 ✓</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
              <p className="text-blue-800 text-sm">
                <strong>Beneficio del Sistema:</strong> Todos los flujos de dinero están correctamente contabilizados,
                los saldos bancarios cuadran con exactitud, y tienes visibilidad completa de tus ingresos y gastos reales.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reportes Disponibles</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Comisiones de Partners
                </h4>
                <p className="text-gray-600 text-sm mb-2">Ruta: Compras → Comisiones Partners</p>
                <p className="text-gray-600 text-sm">
                  Visualiza todas las comisiones pendientes, facturadas y pagadas. Filtra por partner, fecha o estado.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Gastos por Pasarelas
                </h4>
                <p className="text-gray-600 text-sm mb-2">Ruta: Contabilidad → Libro Mayor → Cuenta 630501</p>
                <p className="text-gray-600 text-sm">
                  Consulta todos los gastos por comisiones de Mercado Pago y otras pasarelas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Notas Importantes</h3>
                <div className="mt-2 text-sm text-yellow-700 space-y-2">
                  <p>
                    • El sistema genera automáticamente los asientos contables. No necesitas crear asientos manuales.
                  </p>
                  <p>
                    • Los movimientos de tesorería se crean automáticamente al cobrar o pagar.
                  </p>
                  <p>
                    • Los saldos bancarios se actualizan en tiempo real con cada operación.
                  </p>
                  <p>
                    • Puedes desactivar el cálculo automático de comisión MP si no lo necesitas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/compras/comisiones-partners" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
              <DollarSign className="h-5 w-5 mr-2" />
              Ir al módulo de Comisiones
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SistemaComisionesManual;
