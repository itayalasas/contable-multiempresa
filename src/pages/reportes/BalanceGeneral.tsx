import React, { useState, useEffect } from 'react';
import { FileDown, FileSpreadsheet, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useBalanceGeneral } from '../../hooks/useBalanceGeneral';
import { CuentaBalance } from '../../services/supabase/balanceGeneral';

export default function BalanceGeneral() {
  const { empresaActual, formatearMoneda } = useSesion();
  const {
    balance,
    loading,
    error,
    periodosCerrados,
    cargarBalance,
    exportarPDF,
    exportarExcel
  } = useBalanceGeneral(empresaActual?.id);

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');
  const [fechaCorte, setFechaCorte] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (empresaActual) {
      cargarBalance(fechaCorte);
    }
  }, [empresaActual]);

  const handleCargar = () => {
    if (periodoSeleccionado) {
      cargarBalance(undefined, periodoSeleccionado);
    } else {
      cargarBalance(fechaCorte);
    }
  };

  const renderCuenta = (cuenta: CuentaBalance, nivel: number = 0) => {
    const paddingLeft = nivel * 16;
    const esNegativo = cuenta.saldo_final < 0;
    const montoAbsoluto = Math.abs(cuenta.saldo_final);

    return (
      <React.Fragment key={cuenta.id}>
        <div
          className={`flex justify-between py-1 ${
            cuenta.es_titulo ? 'font-semibold' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <span className={cuenta.es_titulo ? 'text-gray-900' : 'text-gray-700'}>
            {cuenta.codigo} - {cuenta.nombre}
          </span>
          <span className={esNegativo ? 'text-red-600' : ''}>
            {formatearMoneda(montoAbsoluto)}
          </span>
        </div>
        {cuenta.subcuentas && cuenta.subcuentas.map(sub => renderCuenta(sub, nivel + 1))}
      </React.Fragment>
    );
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
          <p className="text-gray-600 mt-1">Estado de situación financiera</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportarPDF}
            disabled={!balance}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={exportarExcel}
            disabled={!balance}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periodo Cerrado
            </label>
            <select
              value={periodoSeleccionado}
              onChange={(e) => {
                setPeriodoSeleccionado(e.target.value);
                setFechaCorte('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={periodosCerrados.length === 0}
            >
              <option value="">
                {periodosCerrados.length === 0
                  ? 'No hay periodos cerrados'
                  : 'Seleccionar periodo...'}
              </option>
              {periodosCerrados.map(periodo => (
                <option key={periodo.id} value={periodo.id}>
                  {periodo.nombre} ({new Date(periodo.fecha_inicio).toLocaleDateString()} - {new Date(periodo.fecha_fin).toLocaleDateString()})
                </option>
              ))}
            </select>
            {periodosCerrados.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Debe cerrar un periodo en Contabilidad → Periodos Contables
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              O Fecha de Corte
            </label>
            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => {
                setFechaCorte(e.target.value);
                setPeriodoSeleccionado('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleCargar}
            disabled={loading || (!periodoSeleccionado && !fechaCorte)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            <Calendar className="w-4 h-4" />
            {loading ? 'Cargando...' : 'Generar Balance'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {periodosCerrados.length === 0 && !balance && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                ¿Cómo generar el Balance General desde periodos cerrados?
              </h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p>
                  El Balance General puede generarse de dos formas:
                </p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>
                    <strong>Desde un periodo cerrado:</strong> Ve a Contabilidad → Periodos Contables
                    y cierra un periodo mensual o anual. Una vez cerrado, aparecerá en el dropdown
                    "Periodo Cerrado" de esta pantalla.
                  </li>
                  <li>
                    <strong>Por fecha de corte:</strong> Selecciona cualquier fecha y el sistema
                    calculará los saldos hasta esa fecha.
                  </li>
                </ol>
                <p className="mt-2">
                  💡 <strong>Recomendación:</strong> Usar periodos cerrados garantiza que los datos
                  no cambien y proporciona un balance oficial de la empresa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generando balance...</p>
          </div>
        </div>
      )}

      {balance && !loading && (
        <>
          {balance.cuadrado ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">
                El balance está cuadrado. Activo = Pasivo + Patrimonio
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                Atención: El balance presenta una diferencia de {formatearMoneda(balance.diferencia)}
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900">{empresaActual.nombre}</h2>
              <p className="text-gray-600">Balance General</p>
              <p className="text-sm text-gray-500">
                Al {new Date(balance.fecha_corte).toLocaleDateString()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                  ACTIVO
                </h3>
                <div className="space-y-2">
                  {balance.activo_corriente.length > 0 && (
                    <>
                      <div className="flex justify-between font-semibold text-gray-900 mt-2">
                        <span>Activo Corriente</span>
                        <span></span>
                      </div>
                      {balance.activo_corriente.map(cuenta => renderCuenta(cuenta, 1))}
                    </>
                  )}

                  {balance.activo_no_corriente.length > 0 && (
                    <>
                      <div className="flex justify-between font-semibold text-gray-900 mt-4">
                        <span>Activo No Corriente</span>
                        <span></span>
                      </div>
                      {balance.activo_no_corriente.map(cuenta => renderCuenta(cuenta, 1))}
                    </>
                  )}

                  <div className="flex justify-between pt-4 border-t-2 border-gray-300 font-bold text-lg text-gray-900 mt-4">
                    <span>TOTAL ACTIVO</span>
                    <span>{formatearMoneda(balance.total_activo)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                  PASIVO Y PATRIMONIO
                </h3>
                <div className="space-y-2">
                  {balance.pasivo_corriente.length > 0 && (
                    <>
                      <div className="flex justify-between font-semibold text-gray-900 mt-2">
                        <span>Pasivo Corriente</span>
                        <span></span>
                      </div>
                      {balance.pasivo_corriente.map(cuenta => renderCuenta(cuenta, 1))}
                    </>
                  )}

                  {balance.pasivo_no_corriente.length > 0 && (
                    <>
                      <div className="flex justify-between font-semibold text-gray-900 mt-4">
                        <span>Pasivo No Corriente</span>
                        <span></span>
                      </div>
                      {balance.pasivo_no_corriente.map(cuenta => renderCuenta(cuenta, 1))}
                    </>
                  )}

                  <div className="flex justify-between font-semibold text-gray-900 mt-4 pt-2 border-t border-gray-200">
                    <span>Total Pasivo</span>
                    <span>{formatearMoneda(balance.total_pasivo)}</span>
                  </div>

                  {balance.patrimonio.length > 0 && (
                    <>
                      <div className="flex justify-between font-semibold text-gray-900 mt-4">
                        <span>Patrimonio</span>
                        <span></span>
                      </div>
                      {balance.patrimonio.map(cuenta => renderCuenta(cuenta, 1))}
                      <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total Patrimonio</span>
                        <span>{formatearMoneda(balance.total_patrimonio)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-4 border-t-2 border-gray-300 font-bold text-lg text-gray-900 mt-4">
                    <span>TOTAL PASIVO + PATRIMONIO</span>
                    <span>{formatearMoneda(balance.total_pasivo_patrimonio)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
