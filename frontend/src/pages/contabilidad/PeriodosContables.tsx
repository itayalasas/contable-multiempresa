import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  History,
  Loader2,
  FileText,
  Eye
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import {
  periodosContablesService,
  EjercicioFiscal,
  PeriodoContable,
  CierreContable
} from '../../services/supabase/periodosContables';
import { supabase } from '../../config/supabase';
import { NotificationModal } from '../../components/common/NotificationModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useModals } from '../../hooks/useModals';
import { CierrePeriodoWizard } from '../../components/contabilidad/CierrePeriodoWizard';

export default function PeriodosContables() {
  const { empresaActual, usuario } = useSesion();

  const [ejercicios, setEjercicios] = useState<EjercicioFiscal[]>([]);
  const [ejercicioActual, setEjercicioActual] = useState<EjercicioFiscal | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoContable[]>([]);
  const [periodoActual, setPeriodoActual] = useState<PeriodoContable | null>(null);
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEjercicio, setSelectedEjercicio] = useState<string | null>(null);

  const [showNuevoEjercicio, setShowNuevoEjercicio] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showCierreWizard, setShowCierreWizard] = useState(false);
  const [showReabrirModal, setShowReabrirModal] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoContable | null>(null);
  const [historial, setHistorial] = useState<CierreContable[]>([]);

  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    fecha_inicio: `${new Date().getFullYear()}-01-01`,
    fecha_fin: `${new Date().getFullYear()}-12-31`,
    descripcion: ''
  });

  const [cierreData, setCierreData] = useState({
    motivo: '',
    observaciones: ''
  });

  const {
    notificationModal,
    closeNotification,
    showSuccess,
    showError
  } = useModals();

  useEffect(() => {
    if (empresaActual?.id) {
      loadData();
    }
  }, [empresaActual?.id]);

  const loadData = async () => {
    if (!empresaActual?.id) return;

    setLoading(true);
    try {
      const [ejercicioData, ejerciciosData, periodoData, dias] = await Promise.all([
        periodosContablesService.getEjercicioActual(empresaActual.id),
        periodosContablesService.getEjerciciosFiscales(empresaActual.id),
        periodosContablesService.getPeriodoActual(empresaActual.id),
        periodosContablesService.getDiasRestantesPeriodoActual(empresaActual.id)
      ]);

      setEjercicioActual(ejercicioData);
      setEjercicios(ejerciciosData);
      setPeriodoActual(periodoData);
      setDiasRestantes(dias);

      if (ejercicioData) {
        setSelectedEjercicio(ejercicioData.id);
        const periodosData = await periodosContablesService.getPeriodosContables(ejercicioData.id);
        setPeriodos(periodosData);
      }
    } catch (error) {
      console.error('Error cargando períodos:', error);
      showError('Error', 'No se pudieron cargar los períodos contables');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEjercicio = async () => {
    console.log('handleCreateEjercicio called');
    console.log('empresaActual:', empresaActual);
    console.log('usuario:', usuario);
    console.log('formData:', formData);

    if (!empresaActual?.id) {
      showError('Error', 'No hay empresa seleccionada');
      return;
    }

    if (!formData.fecha_inicio || !formData.fecha_fin) {
      showError('Error', 'Debes completar las fechas de inicio y fin');
      return;
    }

    if (formData.fecha_inicio >= formData.fecha_fin) {
      showError('Error', 'La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    try {
      console.log('Creating ejercicio fiscal...');
      const ejercicio = await periodosContablesService.createEjercicioFiscal({
        empresa_id: empresaActual.id,
        anio: formData.anio,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        descripcion: formData.descripcion,
        estado: 'abierto',
        moneda: 'UYU'
      });

      console.log('Ejercicio created:', ejercicio);
      showSuccess('Ejercicio creado', 'El ejercicio fiscal y sus períodos mensuales han sido creados');
      setShowNuevoEjercicio(false);
      setFormData({
        anio: new Date().getFullYear() + 1,
        fecha_inicio: `${new Date().getFullYear() + 1}-01-01`,
        fecha_fin: `${new Date().getFullYear() + 1}-12-31`,
        descripcion: ''
      });
      await loadData();
    } catch (error: any) {
      console.error('Error creando ejercicio:', error);
      showError('Error', error.message || 'No se pudo crear el ejercicio fiscal');
    }
  };

  const handleSelectEjercicio = async (ejercicioId: string) => {
    setSelectedEjercicio(ejercicioId);
    try {
      const periodosData = await periodosContablesService.getPeriodosContables(ejercicioId);
      setPeriodos(periodosData);
    } catch (error) {
      console.error('Error cargando períodos:', error);
      showError('Error', 'No se pudieron cargar los períodos');
    }
  };

  const handleCerrarPeriodo = async () => {
    if (!selectedPeriodo || !usuario?.id) return;

    try {
      await periodosContablesService.cerrarPeriodo(
        selectedPeriodo.id,
        usuario.id,
        cierreData.motivo || undefined,
        cierreData.observaciones || undefined
      );

      showSuccess('Período cerrado', 'El período contable ha sido cerrado exitosamente');
      setShowCerrarModal(false);
      setCierreData({ motivo: '', observaciones: '' });
      setSelectedPeriodo(null);
      loadData();
    } catch (error: any) {
      console.error('Error cerrando período:', error);
      showError('Error', error.message || 'No se pudo cerrar el período');
    }
  };

  const handleReabrirPeriodo = async () => {
    if (!selectedPeriodo || !usuario?.id) return;

    if (!cierreData.motivo || cierreData.motivo.trim() === '') {
      showError('Error', 'El motivo de reapertura es obligatorio');
      return;
    }

    try {
      await periodosContablesService.reabrirPeriodo(
        selectedPeriodo.id,
        usuario.id,
        cierreData.motivo,
        cierreData.observaciones || undefined
      );

      showSuccess('Período reabierto', 'El período contable ha sido reabierto');
      setShowReabrirModal(false);
      setCierreData({ motivo: '', observaciones: '' });
      setSelectedPeriodo(null);
      loadData();
    } catch (error: any) {
      console.error('Error reabriendo período:', error);
      showError('Error', error.message || 'No se pudo reabrir el período');
    }
  };

  const handleVerHistorial = async (periodo: PeriodoContable) => {
    if (!empresaActual?.id) return;

    try {
      const historialData = await periodosContablesService.getHistorialCierres(
        empresaActual.id,
        periodo.id
      );
      setHistorial(historialData);
      setSelectedPeriodo(periodo);
      setShowHistorial(true);
    } catch (error) {
      console.error('Error cargando historial:', error);
      showError('Error', 'No se pudo cargar el historial');
    }
  };

  const handleSincronizarVisibilidad = async () => {
    if (!empresaActual?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('sincronizar_visibilidad_registros');

      if (error) throw error;

      if (data && data.length > 0) {
        const stats = data[0];
        showSuccess(
          'Sincronización completa',
          `Se procesaron ${stats.periodos_procesados} períodos y se actualizaron ${stats.registros_actualizados} registros.`
        );
      } else {
        showSuccess('Sincronización completa', 'Todos los registros están sincronizados.');
      }

      loadData();
    } catch (error: any) {
      console.error('Error sincronizando:', error);
      showError('Error', error.message || 'No se pudo sincronizar la visibilidad');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'abierto':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Abierto</span>;
      case 'cerrado':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Cerrado</span>;
      case 'cerrado_definitivo':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Cerrado Definitivo</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{estado}</span>;
    }
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona una empresa para ver los períodos contables</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Períodos Contables</h1>
              <p className="text-blue-100">Gestión de ejercicios fiscales y períodos contables</p>
            </div>
          </div>
          <button
            onClick={() => setShowNuevoEjercicio(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Ejercicio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Período Actual</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {ejercicioActual?.anio || '-'}
              </div>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Estado</div>
              <div className="mt-1">
                {ejercicioActual ? getEstadoBadge(ejercicioActual.estado) : '-'}
              </div>
            </div>
            {ejercicioActual?.estado === 'abierto' ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <Lock className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Asientos</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {periodoActual?.cantidad_asientos || 0}
              </div>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Días Restantes</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{diasRestantes}</div>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {ejercicios.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Ver ejercicio:</label>
            <select
              value={selectedEjercicio || ''}
              onChange={(e) => handleSelectEjercicio(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {ejercicios.map((ej) => (
                <option key={ej.id} value={ej.id}>
                  {ej.anio} - {ej.estado}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-800">Importante</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Al cerrar un periodo contable, no se podrán crear ni modificar asientos en ese periodo.
              Asegúrate de revisar toda la información antes de cerrar.
            </p>
          </div>
        </div>
      </div>

      {periodos.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Períodos Fiscales - {ejercicios.find(e => e.id === selectedEjercicio)?.anio}
            </h2>
            <button
              onClick={handleSincronizarVisibilidad}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="Sincronizar visibilidad de facturas y comisiones según el estado de los períodos"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Sincronizar Visibilidad
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Asientos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {periodos.map((periodo) => (
                  <tr key={periodo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {periodo.numero_periodo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {periodo.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(periodo.fecha_inicio).toLocaleDateString('es-UY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(periodo.fecha_fin).toLocaleDateString('es-UY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(periodo.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {periodo.cantidad_asientos || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleVerHistorial(periodo)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <History className="h-4 w-4 inline" />
                      </button>
                      {periodo.estado === 'abierto' && (
                        <button
                          onClick={() => {
                            setSelectedPeriodo(periodo);
                            setShowCierreWizard(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Proceso de cierre"
                        >
                          <Lock className="h-4 w-4 inline" />
                        </button>
                      )}
                      {periodo.estado === 'cerrado' && (
                        <button
                          onClick={() => {
                            setSelectedPeriodo(periodo);
                            setShowReabrirModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Unlock className="h-4 w-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay períodos contables</h3>
          <p className="text-gray-600">Crea un nuevo ejercicio fiscal para comenzar</p>
        </div>
      )}

      {showNuevoEjercicio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nuevo Ejercicio Fiscal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <input
                  type="number"
                  value={formData.anio}
                  onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateEjercicio}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Crear Ejercicio
              </button>
              <button
                onClick={() => setShowNuevoEjercicio(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCerrarModal && selectedPeriodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cerrar Período</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro que deseas cerrar el período <strong>{selectedPeriodo.nombre}</strong>?
              No podrás crear ni modificar asientos en este período.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={cierreData.motivo}
                  onChange={(e) => setCierreData({ ...cierreData, motivo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={cierreData.observaciones}
                  onChange={(e) => setCierreData({ ...cierreData, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCerrarPeriodo}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Cerrar Período
              </button>
              <button
                onClick={() => {
                  setShowCerrarModal(false);
                  setSelectedPeriodo(null);
                  setCierreData({ motivo: '', observaciones: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReabrirModal && selectedPeriodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reabrir Período</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro que deseas reabrir el período <strong>{selectedPeriodo.nombre}</strong>?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de reapertura <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cierreData.motivo}
                  onChange={(e) => setCierreData({ ...cierreData, motivo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Requerido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={cierreData.observaciones}
                  onChange={(e) => setCierreData({ ...cierreData, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReabrirPeriodo}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Reabrir Período
              </button>
              <button
                onClick={() => {
                  setShowReabrirModal(false);
                  setSelectedPeriodo(null);
                  setCierreData({ motivo: '', observaciones: '' });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistorial && selectedPeriodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Historial de Cierres - {selectedPeriodo.nombre}
            </h2>
            {historial.length > 0 ? (
              <div className="space-y-3">
                {historial.map((cierre) => (
                  <div key={cierre.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {cierre.accion === 'CIERRE' ? (
                          <Lock className="h-5 w-5 text-red-500" />
                        ) : (
                          <Unlock className="h-5 w-5 text-green-500" />
                        )}
                        <span className="font-semibold">{cierre.accion}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(cierre.fecha_accion).toLocaleString('es-UY')}
                      </span>
                    </div>
                    {cierre.motivo && (
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>Motivo:</strong> {cierre.motivo}
                      </div>
                    )}
                    {cierre.observaciones && (
                      <div className="text-sm text-gray-600">
                        <strong>Observaciones:</strong> {cierre.observaciones}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay historial de cierres</p>
            )}
            <button
              onClick={() => {
                setShowHistorial(false);
                setSelectedPeriodo(null);
              }}
              className="w-full mt-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showCierreWizard && selectedPeriodo && (
        <CierrePeriodoWizard
          periodo={selectedPeriodo}
          onClose={() => {
            setShowCierreWizard(false);
            setSelectedPeriodo(null);
          }}
          onSuccess={() => {
            setShowCierreWizard(false);
            setSelectedPeriodo(null);
            showSuccess('Período cerrado', 'El período ha sido cerrado exitosamente');
            loadData();
          }}
          onError={(message) => {
            showError('Error al cerrar período', message);
          }}
        />
      )}

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
      />
    </div>
  );
}
