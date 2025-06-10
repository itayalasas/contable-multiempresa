import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  FileText,
  Save,
  X,
  Database,
  CheckCircle,
  AlertCircle,
  Calculator,
  Loader2,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { AsientoContable, MovimientoContable, PlanCuenta } from '../../types';
import { obtenerPlanCuentas } from '../../services/firebase/planCuentas';
import { SeedDataService } from '../../services/firebase/seedData';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { SearchableAccountSelector } from '../../components/common/SearchableAccountSelector';
import { useModals } from '../../hooks/useModals';
import { useAsientosContables } from '../../hooks/useAsientosContables';

function AsientosContables() {
  const { empresaActual } = useSesion();
  const { usuario } = useAuth();
  
  // Hook personalizado para manejo optimista de asientos
  const {
    asientos,
    loading,
    error,
    crearAsiento,
    actualizarAsiento,
    eliminarAsiento,
    recargarAsientos
  } = useAsientosContables(empresaActual?.id);
  
  const [cuentas, setCuentas] = useState<PlanCuenta[]>([]);
  const [cuentasLoading, setCuentasLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAsiento, setSelectedAsiento] = useState<AsientoContable | null>(null);
  
  // Estados de loading para diferentes operaciones
  const [insertingTestData, setInsertingTestData] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingAsientos, setDeletingAsientos] = useState<Set<string>>(new Set());

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

  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    referencia: '',
    movimientos: [] as MovimientoContable[]
  });

  useEffect(() => {
    if (empresaActual?.id) {
      loadCuentas();
    }
  }, [empresaActual?.id]);

  const loadCuentas = async () => {
    if (!empresaActual?.id) return;
    
    try {
      setCuentasLoading(true);
      console.log('🔄 Cargando cuentas desde Firebase para empresa:', empresaActual.id);
      
      const cuentasData = await obtenerPlanCuentas(empresaActual.id);
      console.log('✅ Cuentas cargadas exitosamente:', cuentasData.length, 'cuentas');
      
      setCuentas(cuentasData);
      
      if (cuentasData.length === 0) {
        showError(
          'No hay cuentas disponibles',
          'No se encontraron cuentas contables. Por favor, configure el plan de cuentas primero.'
        );
      }
    } catch (error) {
      console.error('❌ Error loading cuentas:', error);
      showError(
        'Error al cargar cuentas',
        'No se pudieron cargar las cuentas contables desde la base de datos. Por favor, intente nuevamente.'
      );
    } finally {
      setCuentasLoading(false);
    }
  };

  const handleInsertTestData = async () => {
    if (!empresaActual?.id) return;
    
    try {
      setInsertingTestData(true);
      await SeedDataService.insertTestData(empresaActual.id);
      await recargarAsientos(); // Solo recargar asientos, no toda la data
      showSuccess(
        'Datos de prueba insertados',
        'Los asientos de prueba han sido creados exitosamente.'
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

  const filteredAsientos = asientos.filter(asiento => {
    const matchesSearch = asiento.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asiento.numero.toString().includes(searchTerm) ||
                         asiento.referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = !selectedPeriod || asiento.fecha.includes(selectedPeriod);
    return matchesSearch && matchesPeriod;
  });

  const openModal = (type: 'create' | 'edit' | 'view', asiento?: AsientoContable) => {
    setModalType(type);
    if (asiento) {
      setSelectedAsiento(asiento);
      if (type === 'edit') {
        setFormData({
          numero: asiento.numero,
          fecha: asiento.fecha,
          descripcion: asiento.descripcion,
          referencia: asiento.referencia || '',
          movimientos: asiento.movimientos
        });
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    const nextNumber = generateNextNumber();
    setFormData({
      numero: nextNumber,
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      referencia: '',
      movimientos: [
        { id: '1', cuentaId: '', cuenta: '', debito: 0, credito: 0, descripcion: '' },
        { id: '2', cuentaId: '', cuenta: '', debito: 0, credito: 0, descripcion: '' }
      ]
    });
    setSelectedAsiento(null);
  };

  const generateNextNumber = () => {
    const maxNumber = asientos.reduce((max, asiento) => {
      const num = parseInt(asiento.numero.replace(/\D/g, ''));
      return num > max ? num : max;
    }, 0);
    return `ASI-${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const addMovimiento = () => {
    const newId = String(formData.movimientos.length + 1);
    setFormData({
      ...formData,
      movimientos: [
        ...formData.movimientos,
        { id: newId, cuentaId: '', cuenta: '', debito: 0, credito: 0, descripcion: '' }
      ]
    });
  };

  const removeMovimiento = (id: string) => {
    if (formData.movimientos.length <= 2) return; // Mínimo 2 movimientos
    setFormData({
      ...formData,
      movimientos: formData.movimientos.filter(m => m.id !== id)
    });
  };

  const updateMovimiento = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      movimientos: formData.movimientos.map(m => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };
          
          // Si se actualiza débito, limpiar crédito y viceversa
          if (field === 'debito' && value > 0) {
            updated.credito = 0;
          } else if (field === 'credito' && value > 0) {
            updated.debito = 0;
          }
          
          return updated;
        }
        return m;
      })
    });
  };

  // Función específica para actualizar cuenta desde el selector
  const updateCuentaMovimiento = (id: string, cuentaId: string, cuentaText: string) => {
    setFormData({
      ...formData,
      movimientos: formData.movimientos.map(m => 
        m.id === id 
          ? { ...m, cuentaId, cuenta: cuentaText }
          : m
      )
    });
  };

  const validateAsiento = () => {
    const totalDebito = formData.movimientos.reduce((sum, m) => sum + (m.debito || 0), 0);
    const totalCredito = formData.movimientos.reduce((sum, m) => sum + (m.credito || 0), 0);
    
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      showError(
        'Asiento desbalanceado',
        `El asiento no está balanceado. Débito: S/ ${totalDebito.toFixed(2)}, Crédito: S/ ${totalCredito.toFixed(2)}`
      );
      return false;
    }

    if (!formData.descripcion.trim()) {
      showError('Campo requerido', 'La descripción es obligatoria');
      return false;
    }

    const movimientosValidos = formData.movimientos.filter(m => 
      m.cuentaId && ((m.debito || 0) > 0 || (m.credito || 0) > 0)
    );

    if (movimientosValidos.length < 2) {
      showError('Movimientos insuficientes', 'Debe tener al menos 2 movimientos válidos');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaActual?.id || !validateAsiento()) return;

    try {
      setSavingForm(true);
      
      const asientoData: Omit<AsientoContable, 'id'> = {
        numero: formData.numero,
        fecha: formData.fecha,
        descripcion: formData.descripcion,
        referencia: formData.referencia,
        estado: 'confirmado',
        movimientos: formData.movimientos.filter(m => 
          m.cuentaId && ((m.debito || 0) > 0 || (m.credito || 0) > 0)
        ),
        empresaId: empresaActual.id,
        paisId: 'peru',
        creadoPor: usuario?.id || 'sistema',
        fechaCreacion: new Date().toISOString()
      };

      if (modalType === 'create') {
        // Actualización optimista - se agrega inmediatamente a la UI
        await crearAsiento(asientoData);
        showSuccess(
          'Asiento creado',
          `El asiento "${formData.numero}" ha sido creado exitosamente.`
        );
      } else if (modalType === 'edit' && selectedAsiento) {
        // Actualización optimista - se actualiza inmediatamente en la UI
        await actualizarAsiento(selectedAsiento.id, asientoData);
        showSuccess(
          'Asiento actualizado',
          `El asiento "${formData.numero}" ha sido actualizado exitosamente.`
        );
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando asiento:', error);
      showError(
        'Error al guardar asiento',
        error instanceof Error ? error.message : 'Error desconocido al guardar el asiento'
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (asiento: AsientoContable) => {
    if (!empresaActual?.id) return;
    
    confirmDelete(asiento.numero, async () => {
      try {
        // Agregar a la lista de asientos siendo eliminados
        setDeletingAsientos(prev => new Set([...prev, asiento.id]));
        
        // Eliminación optimista - se remueve inmediatamente de la UI
        await eliminarAsiento(asiento.id);
        
        showSuccess(
          'Asiento eliminado',
          `El asiento "${asiento.numero}" ha sido eliminado exitosamente.`
        );
      } catch (error) {
        console.error('Error eliminando asiento:', error);
        showError(
          'Error al eliminar asiento',
          error instanceof Error ? error.message : 'Error desconocido al eliminar el asiento'
        );
      } finally {
        // Remover de la lista de asientos siendo eliminados
        setDeletingAsientos(prev => {
          const newSet = new Set(prev);
          newSet.delete(asiento.id);
          return newSet;
        });
      }
    });
  };

  const getTotalDebito = (asiento: AsientoContable) => {
    return asiento.movimientos.reduce((sum, mov) => sum + (mov.debito || 0), 0);
  };

  const getTotalCredito = (asiento: AsientoContable) => {
    return asiento.movimientos.reduce((sum, mov) => sum + (mov.credito || 0), 0);
  };

  const getFormTotalDebito = () => {
    return formData.movimientos.reduce((sum, mov) => sum + (mov.debito || 0), 0);
  };

  const getFormTotalCredito = () => {
    return formData.movimientos.reduce((sum, mov) => sum + (mov.credito || 0), 0);
  };

  const isBalanced = () => {
    const totalDebito = getFormTotalDebito();
    const totalCredito = getFormTotalCredito();
    return Math.abs(totalDebito - totalCredito) < 0.01;
  };

  // Mostrar error si existe
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar asientos</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={recargarAsientos}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
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
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">Cargando asientos contables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Asientos Contables</h1>
              <p className="text-green-100">Gestión de asientos contables y movimientos</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {asientos.length} asientos
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {asientos.filter(a => a.estado === 'confirmado').length} confirmados
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {cuentas.length} cuentas disponibles
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            {asientos.length === 0 && (
              <button
                onClick={handleInsertTestData}
                disabled={insertingTestData}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] min-h-[40px]"
              >
                {insertingTestData ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Insertando...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    <span>Datos de Prueba</span>
                  </>
                )}
              </button>
            )}
            <Link 
              to="/manuales/contabilidad/asientos"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <BookOpen className="h-5 w-5" />
              <span>Manual</span>
            </Link>
            <button
              onClick={() => openModal('create')}
              className="bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              Nuevo Asiento
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por descripción, número o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="">Todos los períodos</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {filteredAsientos.length} asientos encontrados
            </span>
          </div>
          <div className="flex justify-end">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Exportar Lista
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carga de cuentas */}
      {cuentasLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Cargando cuentas contables...</p>
              <p className="text-xs text-blue-600">Obteniendo datos desde Firebase</p>
            </div>
          </div>
        </div>
      )}

      {/* Asientos Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {asientos.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay asientos contables
              </h3>
              <p className="text-gray-600 mb-6">
                Comience creando su primer asiento contable o inserte datos de prueba.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleInsertTestData}
                  disabled={insertingTestData}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[40px]"
                >
                  {insertingTestData ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Insertando Datos...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      <span>Insertar Asientos de Prueba</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => openModal('create')}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear Asiento Manual
                </button>
                <Link
                  to="/manuales/contabilidad/asientos"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Ver Manual de Asientos
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Débito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crédito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAsientos.map((asiento) => {
                  const isDeleting = deletingAsientos.has(asiento.id);
                  const isTemp = asiento.id.startsWith('temp_');
                  
                  return (
                    <tr key={asiento.id} className={`hover:bg-gray-50 transition-colors ${
                      isDeleting ? 'bg-red-50 opacity-50' : 
                      isTemp ? 'bg-green-50 border border-green-200' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span>{asiento.numero}</span>
                          {isTemp && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              Guardando...
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(asiento.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {asiento.descripcion}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {asiento.referencia || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                        S/ {getTotalDebito(asiento).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                        S/ {getTotalCredito(asiento).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          asiento.estado === 'confirmado' 
                            ? 'bg-green-100 text-green-800'
                            : asiento.estado === 'borrador'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {asiento.estado === 'confirmado' ? 'Confirmado' : 
                           asiento.estado === 'borrador' ? 'Borrador' : 'Anulado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className={`flex items-center justify-end gap-2 transition-opacity ${
                          isDeleting || isTemp ? 'opacity-50' : 'opacity-100'
                        }`}>
                          <button
                            onClick={() => openModal('view', asiento)}
                            disabled={isDeleting || isTemp}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', asiento)}
                            disabled={isDeleting || isTemp}
                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(asiento)}
                            disabled={isDeleting || isTemp}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                          <Link
                            to="/manuales/contabilidad/asientos"
                            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Ver manual"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === 'create' ? 'Nuevo Asiento Contable' : 
                   modalType === 'edit' ? 'Editar Asiento Contable' : 'Ver Asiento Contable'}
                </h2>
                <div className="flex items-center space-x-2">
                  <Link
                    to="/manuales/contabilidad/asientos"
                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Ver manual"
                  >
                    <BookOpen className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={savingForm}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {modalType === 'view' && selectedAsiento ? (
                <div className="space-y-6">
                  {/* Información del asiento */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número</label>
                      <p className="text-lg font-semibold">{selectedAsiento.numero}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha</label>
                      <p className="text-lg">{new Date(selectedAsiento.fecha).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estado</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedAsiento.estado === 'confirmado' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedAsiento.estado === 'confirmado' ? 'Confirmado' : 'Borrador'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total</label>
                      <p className="text-lg font-semibold">S/ {getTotalDebito(selectedAsiento).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <p className="text-gray-900">{selectedAsiento.descripcion}</p>
                  </div>

                  {selectedAsiento.referencia && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
                      <p className="text-gray-900">{selectedAsiento.referencia}</p>
                    </div>
                  )}

                  {/* Movimientos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Movimientos Contables</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedAsiento.movimientos.map((mov, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{mov.cuenta}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{mov.descripcion}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {mov.debito ? `S/ ${mov.debito.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {mov.credito ? `S/ ${mov.credito.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">TOTALES</td>
                            <td className="px-4 py-3 text-sm text-right">
                              S/ {getTotalDebito(selectedAsiento).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              S/ {getTotalCredito(selectedAsiento).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        value={formData.numero}
                        onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Referencia
                      </label>
                      <input
                        type="text"
                        value={formData.referencia}
                        onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Ej: FACT-001"
                        disabled={savingForm}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        isBalanced() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isBalanced() ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Balanceado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Desbalanceado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción *
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={2}
                      placeholder="Descripción del asiento contable..."
                      required
                      disabled={savingForm}
                    />
                  </div>

                  {/* Movimientos */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Movimientos Contables</h3>
                      <button
                        type="button"
                        onClick={addMovimiento}
                        disabled={savingForm}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>

                    {/* Información sobre cuentas disponibles */}
                    {cuentas.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          📊 <strong>{cuentas.length} cuentas disponibles</strong> cargadas desde Firebase. 
                          Puede buscar por código o nombre en cada selector.
                        </p>
                      </div>
                    )}

                    {cuentas.length === 0 && !cuentasLoading && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          ⚠️ <strong>No hay cuentas disponibles.</strong> 
                          Por favor, configure el plan de cuentas primero.
                        </p>
                        <button
                          type="button"
                          onClick={loadCuentas}
                          className="mt-2 text-sm text-yellow-800 underline hover:no-underline"
                        >
                          Recargar cuentas
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {formData.movimientos.map((mov, index) => (
                        <div key={mov.id} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="col-span-4">
                            <SearchableAccountSelector
                              cuentas={cuentas}
                              value={mov.cuentaId}
                              onChange={(cuentaId, cuentaText) => updateCuentaMovimiento(mov.id, cuentaId, cuentaText)}
                              placeholder="Seleccionar cuenta..."
                              disabled={savingForm || cuentasLoading}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={mov.descripcion}
                              onChange={(e) => updateMovimiento(mov.id, 'descripcion', e.target.value)}
                              placeholder="Descripción..."
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              disabled={savingForm}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={mov.debito || ''}
                              onChange={(e) => updateMovimiento(mov.id, 'debito', parseFloat(e.target.value) || 0)}
                              placeholder="Débito"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              disabled={savingForm}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={mov.credito || ''}
                              onChange={(e) => updateMovimiento(mov.id, 'credito', parseFloat(e.target.value) || 0)}
                              placeholder="Crédito"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              disabled={savingForm}
                            />
                          </div>
                          <div className="col-span-1 flex items-center justify-center">
                            {formData.movimientos.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeMovimiento(mov.id)}
                                disabled={savingForm}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Total Débito:</span>
                          <p className="text-lg font-bold text-blue-600">
                            S/ {getFormTotalDebito().toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Total Crédito:</span>
                          <p className="text-lg font-bold text-blue-600">
                            S/ {getFormTotalCredito().toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Diferencia:</span>
                          <p className={`text-lg font-bold ${
                            isBalanced() ? 'text-green-600' : 'text-red-600'
                          }`}>
                            S/ {Math.abs(getFormTotalDebito() - getFormTotalCredito()).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={savingForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!isBalanced() || savingForm || cuentas.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] min-h-[40px]"
                    >
                      {savingForm ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{modalType === 'create' ? 'Creando...' : 'Actualizando...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{modalType === 'create' ? 'Crear Asiento' : 'Actualizar Asiento'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
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

export { AsientosContables };