import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Globe, 
  FileText, 
  CreditCard, 
  Percent, 
  Database, 
  DollarSign, 
  Ban as BankIcon, 
  Wallet,
  Loader2,
  AlertCircle,
  Settings,
  Link,
  Save,
  X,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useNomencladoresAdmin } from '../../hooks/useNomencladoresAdmin';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { useModals } from '../../hooks/useModals';
import { NomencladorCard } from '../../components/admin/NomencladorCard';
import { NomencladoresStats } from '../../components/admin/NomencladoresStats';
import { PaisesNomencladores } from '../../components/admin/PaisesNomencladores';
import { NomencladorModal } from '../../components/admin/NomencladorModal';

function GestionNomencladores() {
  const { empresaActual, paisActual } = useSesion();
  const { usuario } = useAuth();
  
  // Hook personalizado para manejo de nomencladores
  const {
    tiposDocumentoIdentidad,
    tiposDocumentoFactura,
    tiposImpuesto,
    formasPago,
    tiposMovimientoTesoreria,
    tiposMoneda,
    bancos,
    loading,
    error,
    estadisticas,
    recargarDatos
  } = useNomencladoresAdmin(paisActual?.id);
  
  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [selectedPais, setSelectedPais] = useState<string | null>(paisActual?.id || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estados para modal de nuevo país
  const [showPaisModal, setShowPaisModal] = useState(false);
  const [paisFormData, setPaisFormData] = useState({
    id: '',
    nombre: '',
    codigo: '',
    codigoISO: '',
    monedaPrincipal: '',
    simboloMoneda: ''
  });
  const [savingPais, setSavingPais] = useState(false);
  
  // Estados para modal de nomenclador
  const [showNomencladorModal, setShowNomencladorModal] = useState(false);
  const [selectedNomenclador, setSelectedNomenclador] = useState<any | null>(null);
  const [nomencladorTipo, setNomencladorTipo] = useState<string>('');
  
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

  // Efecto para actualizar país seleccionado cuando cambia el país actual
  useEffect(() => {
    if (paisActual?.id) {
      setSelectedPais(paisActual.id);
    }
  }, [paisActual?.id]);

  // Función para actualizar datos sin recargar la página completa
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await recargarDatos();
      showSuccess('Datos actualizados', 'Los nomencladores se han actualizado correctamente');
    } catch (error) {
      showError(
        'Error al actualizar datos',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Obtener todos los nomencladores en un solo array
  const getAllNomencladores = () => {
    return [
      ...tiposDocumentoIdentidad.map(item => ({ ...item, tipo: 'tiposDocumentoIdentidad' })),
      ...tiposDocumentoFactura.map(item => ({ ...item, tipo: 'tiposDocumentoFactura' })),
      ...tiposImpuesto.map(item => ({ ...item, tipo: 'tiposImpuesto' })),
      ...formasPago.map(item => ({ ...item, tipo: 'formasPago' })),
      ...tiposMovimientoTesoreria.map(item => ({ ...item, tipo: 'tiposMovimientoTesoreria' })),
      ...tiposMoneda.map(item => ({ ...item, tipo: 'tiposMoneda' })),
      ...bancos.map(item => ({ ...item, tipo: 'bancos' }))
    ];
  };

  // Filtrar nomencladores
  const filteredNomencladores = getAllNomencladores().filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = !selectedTipo || item.tipo === selectedTipo;
    return matchesSearch && matchesTipo;
  });

  // Obtener ícono según tipo de nomenclador
  const getNomencladorIcon = (tipo: string) => {
    switch (tipo) {
      case 'tiposDocumentoIdentidad': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'tiposDocumentoFactura': return <FileText className="h-4 w-4 text-purple-600" />;
      case 'tiposImpuesto': return <Percent className="h-4 w-4 text-orange-600" />;
      case 'formasPago': return <CreditCard className="h-4 w-4 text-indigo-600" />;
      case 'tiposMovimientoTesoreria': return <Wallet className="h-4 w-4 text-teal-600" />;
      case 'tiposMoneda': return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'bancos': return <BankIcon className="h-4 w-4 text-cyan-600" />;
      default: return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  // Obtener nombre legible del tipo de nomenclador
  const getNomencladorTypeName = (tipo: string) => {
    switch (tipo) {
      case 'tiposDocumentoIdentidad': return 'Tipo de Documento de Identidad';
      case 'tiposDocumentoFactura': return 'Tipo de Documento de Factura';
      case 'tiposImpuesto': return 'Tipo de Impuesto';
      case 'formasPago': return 'Forma de Pago';
      case 'tiposMovimientoTesoreria': return 'Tipo de Movimiento de Tesorería';
      case 'tiposMoneda': return 'Tipo de Moneda';
      case 'bancos': return 'Banco';
      default: return 'Nomenclador';
    }
  };

  // Agrupar nomencladores por tipo
  const groupedNomencladores = filteredNomencladores.reduce((groups, item) => {
    const key = item.tipo;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  // Manejar creación de nuevo país
  const handleCreatePais = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos
    if (!paisFormData.id || !paisFormData.nombre || !paisFormData.codigo || 
        !paisFormData.codigoISO || !paisFormData.monedaPrincipal || !paisFormData.simboloMoneda) {
      showError('Datos incompletos', 'Por favor complete todos los campos requeridos');
      return;
    }
    
    setSavingPais(true);
    try {
      // Aquí iría la lógica para crear el país en Firebase
      // Por ahora simulamos una operación exitosa
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(
        'País creado exitosamente',
        `El país ${paisFormData.nombre} ha sido creado con sus nomencladores básicos`
      );
      
      // Limpiar formulario y cerrar modal
      setPaisFormData({
        id: '',
        nombre: '',
        codigo: '',
        codigoISO: '',
        monedaPrincipal: '',
        simboloMoneda: ''
      });
      setShowPaisModal(false);
      
      // Recargar datos
      await recargarDatos();
    } catch (error) {
      showError(
        'Error al crear país',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setSavingPais(false);
    }
  };

  // Abrir modal para crear nuevo nomenclador
  const handleOpenNomencladorModal = (tipo: string) => {
    setNomencladorTipo(tipo);
    setSelectedNomenclador(null);
    setShowNomencladorModal(true);
  };

  // Editar nomenclador existente
  const handleEditNomenclador = (nomenclador: any, tipo: string) => {
    setNomencladorTipo(tipo);
    setSelectedNomenclador(nomenclador);
    setShowNomencladorModal(true);
  };

  // Eliminar nomenclador
  const handleDeleteNomenclador = (nomenclador: any, tipo: string) => {
    confirmDelete(
      `${getNomencladorTypeName(tipo)} "${nomenclador.nombre}"`,
      async () => {
        try {
          // Aquí iría la lógica para eliminar el nomenclador
          await new Promise(resolve => setTimeout(resolve, 500));
          
          showSuccess(
            'Nomenclador eliminado',
            `El nomenclador ha sido eliminado exitosamente`
          );
          
          // Recargar datos
          await recargarDatos();
        } catch (error) {
          showError(
            'Error al eliminar nomenclador',
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
      }
    );
  };

  // Guardar nomenclador
  const handleSaveNomenclador = async (data: any) => {
    try {
      // Aquí iría la lógica para guardar el nomenclador
      await new Promise(resolve => setTimeout(resolve, 800));
      
      showSuccess(
        'Nomenclador guardado',
        `El nomenclador ha sido guardado exitosamente`
      );
      
      // Recargar datos
      await recargarDatos();
      
      // Cerrar modal
      setShowNomencladorModal(false);
    } catch (error) {
      showError(
        'Error al guardar nomenclador',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Obtener color según tipo de nomenclador
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'tiposDocumentoIdentidad': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tiposDocumentoFactura': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tiposImpuesto': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'formasPago': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'tiposMovimientoTesoreria': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'tiposMoneda': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bancos': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Renderizar contenido principal
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Cargando nomencladores...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={recargarDatos}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Estadísticas */}
        <NomencladoresStats 
          estadisticas={estadisticas} 
          loading={isRefreshing}
        />

        {/* Selector de país y nomencladores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel de países */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-600" />
                    Países Configurados
                  </h3>
                  <button
                    onClick={() => setShowPaisModal(true)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo País
                  </button>
                </div>
              </div>
              
              <PaisesNomencladores
                paises={[
                  { id: 'peru', nombre: 'Perú', codigo: 'PE', totalNomencladores: 25, tieneDocumentoIdentidad: true, tieneDocumentoFactura: true, tieneImpuestos: true, tieneFormasPago: true },
                  { id: 'colombia', nombre: 'Colombia', codigo: 'CO', totalNomencladores: 22, tieneDocumentoIdentidad: true, tieneDocumentoFactura: true, tieneImpuestos: true, tieneFormasPago: true },
                  { id: 'mexico', nombre: 'México', codigo: 'MX', totalNomencladores: 20, tieneDocumentoIdentidad: true, tieneDocumentoFactura: true, tieneImpuestos: true, tieneFormasPago: true },
                  { id: 'argentina', nombre: 'Argentina', codigo: 'AR', totalNomencladores: 18, tieneDocumentoIdentidad: true, tieneDocumentoFactura: true, tieneImpuestos: true, tieneFormasPago: true },
                  { id: 'chile', nombre: 'Chile', codigo: 'CL', totalNomencladores: 16, tieneDocumentoIdentidad: true, tieneDocumentoFactura: true, tieneImpuestos: true, tieneFormasPago: true }
                ]}
                onSelectPais={setSelectedPais}
                paisSeleccionado={selectedPais}
                onEditPais={() => {}}
                onDeletePais={() => {}}
              />
            </div>
            
            {/* Enlace a configuración de mapeo */}
            <div className="mt-4 bg-indigo-50 rounded-lg shadow-sm border border-indigo-200 p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Settings className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-indigo-800">Configuración de Mapeo</h3>
                  <p className="text-xs text-indigo-600 mt-1">
                    Configure el mapeo de archivos de extractos bancarios para la conciliación automática.
                  </p>
                  <RouterLink
                    to="/admin/configuracion-mapeo"
                    className="mt-2 inline-flex items-center text-xs font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    <Link className="h-3.5 w-3.5 mr-1" />
                    Ir a Configuración de Mapeo
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>
          
          {/* Lista de nomencladores */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                    Nomencladores {selectedPais ? `de ${paisActual?.nombre || selectedPais}` : ''}
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-1.5 w-full sm:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <select
                      value={selectedTipo}
                      onChange={(e) => setSelectedTipo(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      <option value="">Todos los tipos</option>
                      <option value="tiposDocumentoIdentidad">Documentos de Identidad</option>
                      <option value="tiposDocumentoFactura">Documentos de Factura</option>
                      <option value="tiposImpuesto">Impuestos</option>
                      <option value="formasPago">Formas de Pago</option>
                      <option value="tiposMovimientoTesoreria">Movimientos de Tesorería</option>
                      <option value="tiposMoneda">Monedas</option>
                      <option value="bancos">Bancos</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {!selectedPais ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Seleccione un país
                    </h4>
                    <p className="text-gray-600">
                      Seleccione un país para ver sus nomencladores
                    </p>
                  </div>
                ) : filteredNomencladores.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No se encontraron nomencladores
                    </h4>
                    <p className="text-gray-600">
                      {searchTerm || selectedTipo
                        ? 'Intente con otros criterios de búsqueda'
                        : 'No hay nomencladores configurados para este país'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sección por cada tipo de nomenclador */}
                    {Object.entries(groupedNomencladores).map(([tipo, items]) => (
                      <div key={tipo} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className={`p-3 flex items-center justify-between ${getTipoColor(tipo)}`}>
                          <div className="flex items-center space-x-2">
                            {getNomencladorIcon(tipo)}
                            <h4 className="font-medium">{getNomencladorTypeName(tipo)}</h4>
                            <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                              {items.length}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenNomencladorModal(tipo)}
                            className="bg-white bg-opacity-50 hover:bg-opacity-70 text-xs font-medium px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Nuevo
                          </button>
                        </div>
                        
                        <div className="p-3 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((item) => (
                            <NomencladorCard
                              key={`${tipo}-${item.id}`}
                              id={item.id}
                              nombre={item.nombre}
                              codigo={item.codigo}
                              descripcion={item.descripcion}
                              activo={item.activo !== false}
                              onEdit={() => handleEditNomenclador(item, tipo)}
                              onDelete={() => handleDeleteNomenclador(item, tipo)}
                              icon={getNomencladorIcon(tipo)}
                              badges={[
                                { label: getNomencladorTypeName(tipo), color: getTipoColor(tipo) }
                              ]}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Database className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestión de Nomencladores</h1>
              <p className="text-indigo-100">Administración de catálogos y configuraciones del sistema</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {estadisticas?.totalNomencladores || 0} nomencladores
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {estadisticas?.totalPaises || 0} países
                </span>
                <RouterLink
                  to="/admin/configuracion-mapeo"
                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
                >
                  Configuración de Mapeo
                </RouterLink>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderMainContent()}

      {/* Modal de nuevo país */}
      {showPaisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  Nuevo País
                </h2>
                <button
                  onClick={() => setShowPaisModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={savingPais}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreatePais} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del País *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.nombre}
                    onChange={(e) => setPaisFormData({...paisFormData, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: Perú"
                    required
                    disabled={savingPais}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.id}
                    onChange={(e) => setPaisFormData({...paisFormData, id: e.target.value.toLowerCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: peru"
                    required
                    disabled={savingPais}
                  />
                  <p className="text-xs text-gray-500 mt-1">Identificador único, sin espacios ni caracteres especiales</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.codigo}
                    onChange={(e) => setPaisFormData({...paisFormData, codigo: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: PE"
                    maxLength={2}
                    required
                    disabled={savingPais}
                  />
                  <p className="text-xs text-gray-500 mt-1">Código ISO de 2 letras (PE, CO, MX, etc.)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código ISO *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.codigoISO}
                    onChange={(e) => setPaisFormData({...paisFormData, codigoISO: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: PER"
                    maxLength={3}
                    required
                    disabled={savingPais}
                  />
                  <p className="text-xs text-gray-500 mt-1">Código ISO de 3 letras (PER, COL, MEX, etc.)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda Principal *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.monedaPrincipal}
                    onChange={(e) => setPaisFormData({...paisFormData, monedaPrincipal: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: PEN"
                    maxLength={3}
                    required
                    disabled={savingPais}
                  />
                  <p className="text-xs text-gray-500 mt-1">Código ISO de la moneda (PEN, COP, MXN, etc.)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Símbolo Moneda *
                  </label>
                  <input
                    type="text"
                    value={paisFormData.simboloMoneda}
                    onChange={(e) => setPaisFormData({...paisFormData, simboloMoneda: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: S/"
                    maxLength={3}
                    required
                    disabled={savingPais}
                  />
                  <p className="text-xs text-gray-500 mt-1">Símbolo de la moneda (S/, $, €, etc.)</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Creación de Nomencladores</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Al crear un nuevo país, se generarán automáticamente los nomencladores básicos necesarios para su funcionamiento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPaisModal(false)}
                  disabled={savingPais}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPais}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px]"
                >
                  {savingPais ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Crear País</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de nomenclador */}
      {showNomencladorModal && (
        <NomencladorModal
          isOpen={showNomencladorModal}
          onClose={() => setShowNomencladorModal(false)}
          onSave={handleSaveNomenclador}
          tipo={nomencladorTipo}
          nomenclador={selectedNomenclador}
          paisId={selectedPais || 'peru'}
        />
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

export { GestionNomencladores }