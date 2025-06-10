import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, ChevronDown, ChevronRight, Database, Download, FileText, Building2, TrendingUp, Loader2 } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { PlanCuenta } from '../../types';
import { SeedDataService } from '../../services/firebase/seedData';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';
import { usePlanCuentas } from '../../hooks/usePlanCuentas';

function PlanCuentas() {
  const { empresaActual } = useSesion();
  
  // Hook personalizado para manejo optimista de cuentas
  const {
    cuentas,
    loading,
    error,
    crearCuenta,
    actualizarCuenta,
    eliminarCuenta,
    recargarCuentas
  } = usePlanCuentas(empresaActual?.id);

  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<PlanCuenta | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ACTIVO', 'PASIVO', 'PATRIMONIO']));
  
  // Estados de loading para diferentes operaciones
  const [insertingTestData, setInsertingTestData] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingCuentas, setDeletingCuentas] = useState<Set<string>>(new Set());

  // Hook para modales
  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError
  } = useModals();

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'ACTIVO' as const,
    nivel: 1,
    cuentaPadre: '',
    descripcion: '',
    activa: true
  });

  // Filtrado y agrupación optimizada con useMemo
  const { filteredCuentas, groupedCuentas } = useMemo(() => {
    const filtered = cuentas.filter(cuenta => {
      const matchesSearch = cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = !selectedTipo || cuenta.tipo === selectedTipo;
      return matchesSearch && matchesTipo;
    });

    const grouped = filtered.reduce((groups, cuenta) => {
      const key = cuenta.tipo;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(cuenta);
      return groups;
    }, {} as Record<string, PlanCuenta[]>);

    return { filteredCuentas: filtered, groupedCuentas: grouped };
  }, [cuentas, searchTerm, selectedTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaActual?.id) return;

    try {
      setSavingForm(true);
      
      if (editingCuenta) {
        // Actualización optimista - se actualiza inmediatamente en la UI
        await actualizarCuenta(editingCuenta.id, formData);
        showSuccess(
          'Cuenta actualizada',
          `La cuenta "${formData.nombre}" ha sido actualizada exitosamente.`
        );
      } else {
        // Creación optimista - se agrega inmediatamente a la UI
        await crearCuenta({
          ...formData,
          paisId: 'peru' // Por defecto Perú
        });
        showSuccess(
          'Cuenta creada',
          `La cuenta "${formData.nombre}" ha sido creada exitosamente.`
        );
      }
      
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error al guardar cuenta:', error);
      showError(
        'Error al guardar cuenta',
        error instanceof Error ? error.message : 'Error desconocido al guardar la cuenta'
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = (cuenta: PlanCuenta) => {
    setEditingCuenta(cuenta);
    setFormData({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      nivel: cuenta.nivel,
      cuentaPadre: cuenta.cuentaPadre || '',
      descripcion: cuenta.descripcion || '',
      activa: cuenta.activa
    });
    setShowModal(true);
  };

  const handleDelete = async (cuenta: PlanCuenta) => {
    if (!empresaActual?.id) return;
    
    confirmDelete(cuenta.nombre, async () => {
      try {
        // Agregar a la lista de cuentas siendo eliminadas
        setDeletingCuentas(prev => new Set([...prev, cuenta.id]));
        
        // Eliminación optimista - se remueve inmediatamente de la UI
        await eliminarCuenta(cuenta.id);
        
        showSuccess(
          'Cuenta eliminada',
          `La cuenta "${cuenta.nombre}" ha sido eliminada exitosamente.`
        );
      } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        showError(
          'Error al eliminar cuenta',
          error instanceof Error ? error.message : 'Error desconocido al eliminar la cuenta'
        );
      } finally {
        // Remover de la lista de cuentas siendo eliminadas
        setDeletingCuentas(prev => {
          const newSet = new Set(prev);
          newSet.delete(cuenta.id);
          return newSet;
        });
      }
    });
  };

  const handleInsertTestData = async () => {
    if (!empresaActual?.id) return;
    
    try {
      setInsertingTestData(true);
      await SeedDataService.insertTestData(empresaActual.id);
      
      // Recargar datos después de insertar datos de prueba
      await recargarCuentas();
      
      showSuccess(
        'Datos de prueba insertados',
        'El plan de cuentas base y los asientos de ejemplo han sido creados exitosamente.'
      );
    } catch (error) {
      console.error('Error insertando datos de prueba:', error);
      showError(
        'Error al insertar datos de prueba',
        error instanceof Error ? error.message : 'Error desconocido al insertar los datos de prueba'
      );
    } finally {
      setInsertingTestData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'ACTIVO',
      nivel: 1,
      cuentaPadre: '',
      descripcion: '',
      activa: true
    });
    setEditingCuenta(null);
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const tiposCuenta = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO'];

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ACTIVO': return TrendingUp;
      case 'PASIVO': return FileText;
      case 'PATRIMONIO': return Building2;
      case 'INGRESO': return Plus;
      case 'GASTO': return Trash2;
      default: return FileText;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ACTIVO': return 'bg-green-100 text-green-800 border-green-200';
      case 'PASIVO': return 'bg-red-100 text-red-800 border-red-200';
      case 'PATRIMONIO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INGRESO': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'GASTO': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Mostrar error si existe
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Trash2 className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar cuentas</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={recargarCuentas}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando plan de cuentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {/* Header moderno - MÁS COMPACTO */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Plan de Cuentas</h1>
              <p className="text-blue-100 text-sm">Gestiona el catálogo de cuentas contables</p>
              <div className="flex items-center space-x-3 mt-1 text-xs">
                <span className="bg-white/20 px-2 py-0.5 rounded">
                  {cuentas.length} cuentas
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded">
                  {Object.keys(groupedCuentas).length} tipos
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {cuentas.length === 0 && (
              <button
                onClick={handleInsertTestData}
                disabled={insertingTestData}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg min-w-[120px] min-h-[36px] text-sm"
              >
                {insertingTestData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Datos de Prueba</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva Cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Filtros modernos - MÁS COMPACTOS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all text-sm"
            >
              <option value="">Todos los tipos</option>
              {tiposCuenta.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Mostrando {filteredCuentas.length} de {cuentas.length} cuentas
            </div>
            <button className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs">
              <Download className="h-3 w-3" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Cuentas moderna - DISEÑO HORIZONTAL MÁS COMPACTO */}
      <div className="space-y-2">
        {cuentas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Database className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay cuentas configuradas
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Comience insertando el plan de cuentas base para empezar a trabajar con la contabilidad de su empresa.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleInsertTestData}
                  disabled={insertingTestData}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors min-h-[40px] text-sm"
                >
                  {insertingTestData ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Insertando Plan de Cuentas...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      <span>Insertar Plan de Cuentas Base</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Crear Cuenta Manual
                </button>
              </div>
            </div>
          </div>
        ) : (
          // DISEÑO HORIZONTAL - Grid de tarjetas MÁS COMPACTO
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {Object.entries(groupedCuentas).map(([tipo, cuentasTipo]) => {
              const TipoIcon = getTipoIcon(tipo);
              return (
                <div key={tipo} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(tipo)}
                    className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-l-4 ${getTipoColor(tipo).replace('bg-', 'border-').replace('-100', '-400')}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${getTipoColor(tipo)}`}>
                        <TipoIcon className="h-3 w-3" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 text-sm">{tipo}</h3>
                        <p className="text-xs text-gray-500">{cuentasTipo.length} cuenta{cuentasTipo.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(tipo)}`}>
                        {cuentasTipo.length}
                      </span>
                      {expandedGroups.has(tipo) ? (
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {expandedGroups.has(tipo) && (
                    <div className="border-t border-gray-100">
                      <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                        {cuentasTipo.map((cuenta) => {
                          const isDeleting = deletingCuentas.has(cuenta.id);
                          const isTemp = cuenta.id.startsWith('temp_');
                          
                          return (
                            <div
                              key={cuenta.id}
                              className={`group flex items-center justify-between p-2 rounded-lg transition-all ${
                                isDeleting ? 'bg-red-50 opacity-50' : 
                                isTemp ? 'bg-blue-50 border border-blue-200' : 
                                'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1">
                                  <span className={`font-mono text-xs font-medium px-1.5 py-0.5 rounded border ${
                                    isTemp ? 'text-blue-600 bg-blue-100 border-blue-200' : 
                                    'text-blue-600 bg-blue-50 border-blue-200'
                                  }`}>
                                    {cuenta.codigo}
                                  </span>
                                  {!cuenta.activa && (
                                    <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-medium">
                                      Inactiva
                                    </span>
                                  )}
                                  {isTemp && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
                                      Guardando...
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900 text-xs mt-0.5 truncate">{cuenta.nombre}</p>
                                {cuenta.descripcion && (
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">{cuenta.descripcion}</p>
                                )}
                              </div>
                              <div className={`flex items-center space-x-0.5 ml-1 transition-opacity ${
                                isDeleting ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
                              }`}>
                                <button
                                  onClick={() => handleEdit(cuenta)}
                                  disabled={isDeleting || isTemp}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Editar cuenta"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(cuenta)}
                                  disabled={isDeleting || isTemp}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Eliminar cuenta"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal moderno */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {editingCuenta ? 'Modifica los datos de la cuenta contable' : 'Crea una nueva cuenta en el plan contable'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    placeholder="ej: 1011"
                    required
                    disabled={savingForm}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    disabled={savingForm}
                  >
                    {tiposCuenta.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="ej: Caja Moneda Nacional"
                  required
                  disabled={savingForm}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  rows={2}
                  placeholder="Descripción opcional de la cuenta..."
                  disabled={savingForm}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activa"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={savingForm}
                />
                <label htmlFor="activa" className="ml-2 block text-xs text-gray-900">
                  Cuenta activa
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  disabled={savingForm}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] min-h-[32px] text-sm"
                >
                  {savingForm ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{editingCuenta ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    <>
                      {editingCuenta ? <Edit2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {editingCuenta ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales de confirmación y notificación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={confirmModal.loading}
      />

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.autoClose}
      />
    </div>
  );
}

export { PlanCuentas }