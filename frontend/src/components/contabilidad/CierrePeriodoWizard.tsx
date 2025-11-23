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
import { supabase } from '../../config/supabase';
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
  facturasVentaSinContabilizar?: number;
  facturasCompraSinContabilizar?: number;
  facturasConError?: number;
}

type Step = 'validacion' | 'ajustes' | 'confirmar' | 'cerrar';

export function CierrePeriodoWizard({ periodo, onClose, onSuccess, onError }: CierrePeriodoWizardProps) {
  const { empresaActual, sesion } = useSesion();
  const usuario = sesion?.usuario;
  const [currentStep, setCurrentStep] = useState<Step>('validacion');
  const [loading, setLoading] = useState(false);
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null);

  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showAjusteInfo, setShowAjusteInfo] = useState<string | null>(null);
  const [cantidadAsientos, setCantidadAsientos] = useState(0);

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

      setCantidadAsientos(asientos.length);
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

      const { data: facturasVentaSinAsiento } = await supabase
        .from('facturas_venta')
        .select('id')
        .eq('empresa_id', empresaActual.id)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .eq('estado', 'emitida')
        .or('asiento_generado.is.null,asiento_generado.eq.false');

      const facturasVentaSinContabilizar = facturasVentaSinAsiento?.length || 0;
      if (facturasVentaSinContabilizar > 0) {
        errores.push(`Hay ${facturasVentaSinContabilizar} factura(s) de venta sin contabilizar`);
      }

      const { data: facturasCompraSinAsiento } = await supabase
        .from('facturas_compra')
        .select('id')
        .eq('empresa_id', empresaActual.id)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .or('asiento_generado.is.null,asiento_generado.eq.false');

      const facturasCompraSinContabilizar = facturasCompraSinAsiento?.length || 0;
      if (facturasCompraSinContabilizar > 0) {
        errores.push(`Hay ${facturasCompraSinContabilizar} factura(s) de compra sin contabilizar`);
      }

      const { data: facturasConError } = await supabase
        .from('facturas_venta')
        .select('id')
        .eq('empresa_id', empresaActual.id)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .not('asiento_error', 'is', null);

      const cantidadFacturasConError = facturasConError?.length || 0;
      if (cantidadFacturasConError > 0) {
        errores.push(`Hay ${cantidadFacturasConError} factura(s) con errores en la contabilización`);
      }

      // Validar comisiones pendientes
      const { data: comisionesPendientes } = await supabase
        .from('comisiones_partners')
        .select('id')
        .eq('empresa_id', empresaActual.id)
        .gte('fecha', periodo.fecha_inicio)
        .lte('fecha', periodo.fecha_fin)
        .eq('estado', 'pendiente');

      const cantidadComisionesPendientes = comisionesPendientes?.length || 0;
      if (cantidadComisionesPendientes > 0) {
        errores.push(`Hay ${cantidadComisionesPendientes} comisión(es) pendiente(s) de facturar. Ve a Compras > Comisiones Partners.`);
      }

      setValidacion({
        valido: errores.length === 0,
        errores,
        advertencias,
        asientosBorrador,
        asientosDescuadrados,
        totalDebitos,
        totalCreditos,
        facturasVentaSinContabilizar,
        facturasCompraSinContabilizar,
        facturasConError: cantidadFacturasConError
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
    console.log('handleCerrar iniciado', { usuario, motivo, periodo });

    if (!usuario?.id) {
      console.error('No hay usuario autenticado');
      if (onError) {
        onError('Usuario no autenticado');
      }
      return;
    }

    if (!motivo || motivo.trim() === '') {
      console.error('Motivo vacío');
      if (onError) {
        onError('El motivo del cierre es obligatorio');
      }
      return;
    }

    setLoading(true);
    console.log('Iniciando cierre de período...');

    try {
      const { periodosContablesService } = await import('../../services/supabase/periodosContables');

      console.log('Llamando a cerrarPeriodo con:', {
        periodoId: periodo.id,
        usuarioId: usuario.id,
        motivo,
        observaciones
      });

      await periodosContablesService.cerrarPeriodo(
        periodo.id,
        usuario.id,
        motivo,
        observaciones || undefined
      );

      console.log('Período cerrado exitosamente');
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
        <button
          onClick={() => setShowAjusteInfo('depreciacion')}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
        >
          <Calculator className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Depreciación de Activos</p>
            <p className="text-sm text-gray-600">Registrar depreciación mensual de activos fijos</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">Ver guía →</span>
        </button>

        <button
          onClick={() => setShowAjusteInfo('provisiones')}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-left transition-colors"
        >
          <FileText className="w-5 h-5 text-orange-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Provisiones</p>
            <p className="text-sm text-gray-600">Provisión de cuentas incobrables, vacaciones, etc.</p>
          </div>
          <span className="text-xs text-orange-600 font-medium">Ver guía →</span>
        </button>

        <button
          onClick={() => setShowAjusteInfo('inventario')}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 text-left transition-colors"
        >
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Ajuste de Inventario</p>
            <p className="text-sm text-gray-600">Ajustar inventario por diferencias físicas</p>
          </div>
          <span className="text-xs text-green-600 font-medium">Ver guía →</span>
        </button>

        <button
          onClick={() => setShowAjusteInfo('devengamientos')}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 text-left transition-colors"
        >
          <Plus className="w-5 h-5 text-purple-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Devengamientos</p>
            <p className="text-sm text-gray-600">Gastos e ingresos devengados del período</p>
          </div>
          <span className="text-xs text-purple-600 font-medium">Ver guía →</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">¿Cómo Funciona?</h4>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li><strong>Haz clic en "Ver guía"</strong> de cualquier tipo de ajuste</li>
              <li><strong>Lee el ejemplo práctico</strong> con cálculos y cuentas a usar</li>
              <li><strong>Clic en "Ir a Crear Asiento"</strong> (se abre en nueva pestaña)</li>
              <li><strong>Crea el asiento</strong> siguiendo los pasos mostrados</li>
              <li><strong>Regresa aquí</strong> y continúa con el próximo ajuste o el cierre</li>
            </ol>
            <p className="text-sm text-blue-700 mt-3 font-medium">
              Si no necesitas crear ajustes ahora, puedes continuar directamente al cierre.
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
            <dd className="text-sm text-gray-900">{cantidadAsientos}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo del Cierre <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Cierre mensual regular"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {!motivo && (
            <p className="mt-1 text-xs text-gray-500">
              El motivo es obligatorio para cerrar el período
            </p>
          )}
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

  const getAjusteContent = () => {
    const content = {
      depreciacion: {
        title: 'Depreciación de Activos',
        description: 'La depreciación distribuye el costo de un activo fijo a lo largo de su vida útil.',
        steps: [
          'Ve a Contabilidad → Asientos Contables',
          'Clic en "Nuevo Asiento"',
          'Fecha: último día del período (ej: 31/10/2025)',
          'Descripción: "Depreciación mensual Octubre 2025"'
        ],
        example: {
          concepto: 'Ejemplo: Edificio de $120,000 con vida útil de 20 años',
          calculo: 'Depreciación mensual = $120,000 ÷ 20 años ÷ 12 meses = $500',
          movimientos: [
            { type: 'DEBE', cuenta: 'Depreciación del Período', monto: 500 },
            { type: 'HABER', cuenta: 'Depreciación Acumulada - Edificios', monto: 500 }
          ]
        }
      },
      provisiones: {
        title: 'Provisiones',
        description: 'Reconoce gastos probables futuros relacionados con el período actual.',
        steps: [
          'Ve a Contabilidad → Asientos Contables',
          'Clic en "Nuevo Asiento"',
          'Fecha: último día del período',
          'Descripción: "Provisión [tipo] Octubre 2025"'
        ],
        example: {
          concepto: 'Ejemplo: Provisión del 2% sobre ventas de $50,000',
          calculo: 'Provisión = $50,000 × 2% = $1,000',
          movimientos: [
            { type: 'DEBE', cuenta: 'Gastos por Cuentas Incobrables', monto: 1000 },
            { type: 'HABER', cuenta: 'Provisión para Cuentas Incobrables', monto: 1000 }
          ]
        }
      },
      inventario: {
        title: 'Ajuste de Inventario',
        description: 'Corrige diferencias entre inventario contable e inventario físico.',
        steps: [
          'Ve a Contabilidad → Asientos Contables',
          'Clic en "Nuevo Asiento"',
          'Fecha: último día del período',
          'Descripción: "Ajuste inventario físico Octubre 2025"'
        ],
        example: {
          concepto: 'Ejemplo: Faltante de $200 detectado en conteo físico',
          calculo: 'Diferencia = Contable ($5,000) - Físico ($4,800) = $200',
          movimientos: [
            { type: 'DEBE', cuenta: 'Pérdida por Faltante de Inventario', monto: 200 },
            { type: 'HABER', cuenta: 'Inventario de Mercaderías', monto: 200 }
          ]
        }
      },
      devengamientos: {
        title: 'Devengamientos',
        description: 'Registra ingresos o gastos del período que aún no fueron pagados/cobrados.',
        steps: [
          'Ve a Contabilidad → Asientos Contables',
          'Clic en "Nuevo Asiento"',
          'Fecha: último día del período',
          'Descripción: "Devengamiento [concepto] Octubre 2025"'
        ],
        example: {
          concepto: 'Ejemplo: Sueldos de $3,000 ganados en octubre, se pagan en noviembre',
          calculo: 'Sueldos devengados pero no pagados = $3,000',
          movimientos: [
            { type: 'DEBE', cuenta: 'Sueldos y Salarios', monto: 3000 },
            { type: 'HABER', cuenta: 'Sueldos por Pagar', monto: 3000 }
          ]
        }
      }
    };
    return showAjusteInfo ? content[showAjusteInfo as keyof typeof content] : null;
  };

  const ajusteContent = getAjusteContent();

  return (
    <>
      {showAjusteInfo && ajusteContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-800">
              <h3 className="text-xl font-bold text-white">{ajusteContent.title}</h3>
              <p className="text-blue-100 text-sm mt-1">{ajusteContent.description}</p>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Pasos a Seguir
                </h4>
                <ol className="space-y-2">
                  {ajusteContent.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="text-blue-600 font-medium">{idx + 1}.</span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Ejemplo Práctico
                </h4>
                <p className="text-sm text-green-800 mb-2">{ajusteContent.example.concepto}</p>
                <p className="text-sm text-green-700 font-mono bg-green-100 p-2 rounded">
                  {ajusteContent.example.calculo}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  Movimientos del Asiento
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Cuenta</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ajusteContent.example.movimientos.map((mov, idx) => (
                        <tr key={idx} className={mov.type === 'DEBE' ? 'bg-red-50' : 'bg-green-50'}>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${
                              mov.type === 'DEBE' ? 'text-red-700' : 'text-green-700'
                            }`}>
                              {mov.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{mov.cuenta}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">
                            ${mov.monto.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between gap-4">
              <button
                onClick={() => setShowAjusteInfo(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Volver
              </button>
              <a
                href="/contabilidad/asientos-contables"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Ir a Crear Asiento
              </a>
            </div>
          </div>
        </div>
      )}

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
                disabled={loading || !motivo || motivo.trim() === ''}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  );
}
