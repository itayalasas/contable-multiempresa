import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  Lock,
  TrendingUp,
  TrendingDown,
  Calculator,
  Loader2
} from 'lucide-react';
import { PeriodoContable } from '../../services/supabase/periodosContables';
import { asientosSupabaseService } from '../../services/supabase/asientos';
import { balanceComprobacionService } from '../../services/supabase/balanceComprobacion';
import { useSesion } from '../../context/SesionContext';

interface CierrePeriodoWizardProps {
  periodo: PeriodoContable;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (message: string) => void;
}

interface ValidacionResult {
  valido: boolean;
  errores: string[];
  advertencias: string[];
  asientosBorrador: number;
  asientosDescuadrados: number;
  totalDebitos: number;
  totalCreditos: number;
}

type Step = 'validacion' | 'ajustes' | 'confirmar' | 'cerrar';

export function CierrePeriodoWizard({ periodo, onClose, onSuccess, onError }: CierrePeriodoWizardProps) {
  const { empresaActual, usuario } = useSesion();
  const [currentStep, setCurrentStep] = useState<Step>('validacion');
  const [loading, setLoading] = useState(false);
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null);

  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (currentStep === 'validacion') {
      validarPeriodo();
    }
  }, [currentStep]);

  const validarPeriodo = async () => {
    if (!empresaActual?.id) return;

    setLoading(true);
    try {
      const asientos = await asientosSupabaseService.getAsientosByEmpresaFechas(
        empresaActual.id,
        periodo.fecha_inicio,
        periodo.fecha_fin
      );

      const asientosBorrador = asientos.filter(a => a.estado === 'borrador').length;

      let asientosDescuadrados = 0;
      asientos.forEach(asiento => {
        const totalDebitos = asiento.movimientos.reduce((sum, m) => sum + (m.debito || 0), 0);
        const totalCreditos = asiento.movimientos.reduce((sum, m) => sum + (m.credito || 0), 0);
        if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
          asientosDescuadrados++;
        }
      });

      const totalDebitos = asientos.reduce((sum, a) =>
        sum + a.movimientos.reduce((s, m) => s + (m.debito || 0), 0), 0
      );
      const totalCreditos = asientos.reduce((sum, a) =>
        sum + a.movimientos.reduce((s, m) => s + (m.credito || 0), 0), 0
      );

      const errores: string[] = [];
      const advertencias: string[] = [];

      if (asientosBorrador > 0) {
        errores.push(`Hay ${asientosBorrador} asiento(s) en estado borrador que deben confirmarse`);
      }

      if (asientosDescuadrados > 0) {
        errores.push(`Hay ${asientosDescuadrados} asiento(s) descuadrado(s) que deben corregirse`);
      }

      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        errores.push(`El total de débitos ($${totalDebitos.toFixed(2)}) no coincide con créditos ($${totalCreditos.toFixed(2)})`);
      }

      if (asientos.length === 0) {
        advertencias.push('No hay asientos registrados en este período');
      }

      setValidacion({
        valido: errores.length === 0,
        errores,
        advertencias,
        asientosBorrador,
        asientosDescuadrados,
        totalDebitos,
        totalCreditos
      });
    } catch (error) {
      console.error('Error validando período:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    if (currentStep === 'validacion' && validacion?.valido) {
      setCurrentStep('ajustes');
    } else if (currentStep === 'ajustes') {
      setCurrentStep('confirmar');
    }
  };

  const handleCerrar = async () => {
    if (!usuario?.id) return;

    setLoading(true);
    try {
      const { periodosContablesService } = await import('../../services/supabase/periodosContables');

      await periodosContablesService.cerrarPeriodo(
        periodo.id,
        usuario.id,
        motivo || 'Cierre mensual regular',
        observaciones || undefined
      );

      onSuccess();
    } catch (error: any) {
      console.error('Error cerrando período:', error);
      if (onError) {
        onError(error.message || 'Error al cerrar el período');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderValidacion = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Validación de Cierre</h3>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
      </div>

      {validacion && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Débitos</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                ${validacion.totalDebitos.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Total Créditos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                ${validacion.totalCreditos.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {validacion.errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">Errores que Impiden el Cierre</h4>
                  <ul className="space-y-1">
                    {validacion.errores.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validacion.advertencias.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">Advertencias</h4>
                  <ul className="space-y-1">
                    {validacion.advertencias.map((adv, idx) => (
                      <li key={idx} className="text-sm text-yellow-700">• {adv}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validacion.valido && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">Período Válido para Cierre</h4>
                  <p className="text-sm text-green-700">
                    Todos los asientos están confirmados y cuadrados. Puedes continuar con el proceso de cierre.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!validacion.valido && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">Acciones Requeridas</h4>
                  <p className="text-sm text-blue-700">
                    Debes corregir los errores antes de poder cerrar el período. Ve a "Asientos Contables" para hacer las correcciones necesarias.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderAjustes = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Asientos de Ajuste</h3>
        <p className="text-sm text-gray-600 mb-4">
          Antes de cerrar el período, puedes crear asientos de ajuste necesarios como:
        </p>
      </div>

      <div className="grid gap-3">
        <a
          href="/contabilidad/asientos-contables"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 text-left transition-colors"
        >
          <Calculator className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Depreciación de Activos</p>
            <p className="text-sm text-gray-600">Registrar depreciación mensual de activos fijos</p>
          </div>
          <span className="text-xs text-gray-500">Abrir →</span>
        </a>

        <a
          href="/contabilidad/asientos-contables"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 text-left transition-colors"
        >
          <FileText className="w-5 h-5 text-orange-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Provisiones</p>
            <p className="text-sm text-gray-600">Provisión de cuentas incobrables, vacaciones, etc.</p>
          </div>
          <span className="text-xs text-gray-500">Abrir →</span>
        </a>

        <a
          href="/contabilidad/asientos-contables"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 text-left transition-colors"
        >
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Ajuste de Inventario</p>
            <p className="text-sm text-gray-600">Ajustar inventario por diferencias físicas</p>
          </div>
          <span className="text-xs text-gray-500">Abrir →</span>
        </a>

        <a
          href="/contabilidad/asientos-contables"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 text-left transition-colors"
        >
          <Plus className="w-5 h-5 text-purple-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Devengamientos</p>
            <p className="text-sm text-gray-600">Gastos e ingresos devengados del período</p>
          </div>
          <span className="text-xs text-gray-500">Abrir →</span>
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">Información Importante</h4>
            <p className="text-sm text-blue-700 mb-2">
              Los asientos de ajuste deben crearse antes de cerrar el período. Una vez cerrado,
              no podrás crear nuevos asientos sin reabrir el período.
            </p>
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> Los enlaces se abren en nueva pestaña para que puedas crear los asientos
              sin perder tu progreso en este wizard. Cuando termines, regresa aquí para continuar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Cierre</h3>
        <p className="text-sm text-gray-600 mb-4">
          Estás a punto de cerrar el período contable. Esta acción bloqueará la creación y modificación
          de asientos en este período.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-700">Período:</dt>
            <dd className="text-sm text-gray-900">{periodo.nombre}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-700">Fecha Inicio:</dt>
            <dd className="text-sm text-gray-900">{new Date(periodo.fecha_inicio).toLocaleDateString('es-UY')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-700">Fecha Fin:</dt>
            <dd className="text-sm text-gray-900">{new Date(periodo.fecha_fin).toLocaleDateString('es-UY')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-gray-700">Asientos:</dt>
            <dd className="text-sm text-gray-900">{periodo.cantidad_asientos}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo del Cierre
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Cierre mensual regular"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas adicionales sobre el cierre..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">Atención</h4>
            <p className="text-sm text-yellow-700">
              Una vez cerrado, el período bloqueará la creación y modificación de asientos.
              Podrás reabrirlo si es necesario hacer correcciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <h2 className="text-xl font-bold text-gray-900">Proceso de Cierre - {periodo.nombre}</h2>

          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-2 ${currentStep === 'validacion' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'validacion' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>1</div>
              <span className="text-sm font-medium">Validación</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${currentStep === 'ajustes' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'ajustes' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>2</div>
              <span className="text-sm font-medium">Ajustes</span>
            </div>
            <div className="flex-1 h-px bg-gray-300" />
            <div className={`flex items-center gap-2 ${currentStep === 'confirmar' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'confirmar' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>3</div>
              <span className="text-sm font-medium">Confirmar</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {currentStep === 'validacion' && renderValidacion()}
          {currentStep === 'ajustes' && renderAjustes()}
          {currentStep === 'confirmar' && renderConfirmar()}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            {currentStep !== 'validacion' && (
              <button
                onClick={() => {
                  if (currentStep === 'ajustes') setCurrentStep('validacion');
                  else if (currentStep === 'confirmar') setCurrentStep('ajustes');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Anterior
              </button>
            )}

            {currentStep === 'validacion' && validacion?.valido && (
              <button
                onClick={handleContinuar}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Continuar
              </button>
            )}

            {currentStep === 'ajustes' && (
              <button
                onClick={handleContinuar}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Continuar al Cierre
              </button>
            )}

            {currentStep === 'confirmar' && (
              <button
                onClick={handleCerrar}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Cerrar Período
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
