import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Building2,
  Globe,
  Users,
  Settings,
  Eye,
  UserPlus,
  UserMinus,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Empresa, Pais, Usuario } from '../../types';
import { EmpresasService } from '../../services/empresas/empresasService';
import { PaisesService } from '../../services/paises/paisesService';
import { useSesion } from '../../context/SesionContext';
import { useModals } from '../../hooks/useModals';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

export const GestionEmpresas: React.FC = () => {
  const { usuario, tienePermiso, formatearMoneda } = useSesion();
  
  // Estados principales
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPais, setSelectedPais] = useState('');
  
  // Estados de modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view' | 'users'>('create');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<Usuario[]>([]);
  
  // Estados de loading para operaciones específicas
  const [savingForm, setSavingForm] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Hook para modales
  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    showSuccess,
    showError,
    confirmDelete
  } = useModals();

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    razonSocial: '',
    numeroIdentificacion: '',
    paisId: '',
    direccion: '',
    telefono: '',
    email: '',
    monedaPrincipal: '',
    subdominio: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Iniciando carga de datos...');
      
      const [empresasData, paisesData] = await Promise.all([
        usuario?.rol === 'super_admin' 
          ? EmpresasService.getEmpresasByPais('') // Todas las empresas
          : EmpresasService.getEmpresasByUsuario(usuario?.id || ''),
        PaisesService.getPaisesActivos()
      ]);

      console.log('✅ Datos cargados:', { empresas: empresasData.length, paises: paisesData.length });
      
      setEmpresas(empresasData);
      setPaises(paisesData);
      setTotalPages(Math.ceil(empresasData.length / itemsPerPage));
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar los datos';
      setError(errorMessage);
      showError('Error al cargar datos', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmpresas = empresas.filter(empresa => {
    const matchesSearch = empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         empresa.numeroIdentificacion.includes(searchTerm) ||
                         empresa.razonSocial.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPais = !selectedPais || empresa.paisId === selectedPais;
    return matchesSearch && matchesPais;
  });

  // Calcular empresas paginadas
  const paginatedEmpresas = filteredEmpresas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Actualizar total de páginas cuando cambian los filtros
  useEffect(() => {
    setTotalPages(Math.ceil(filteredEmpresas.length / itemsPerPage));
    setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
  }, [filteredEmpresas.length, itemsPerPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSavingForm(true);
      
      if (modalType === 'create') {
        await EmpresasService.crearEmpresa({
          ...formData,
          usuariosAsignados: [usuario?.id || ''],
          configuracionContable: {
            ejercicioFiscal: new Date().getFullYear(),
            fechaInicioEjercicio: new Date(new Date().getFullYear(), 0, 1),
            fechaFinEjercicio: new Date(new Date().getFullYear(), 11, 31),
            metodoCosteo: 'PROMEDIO',
            tipoInventario: 'PERPETUO',
            manejaInventario: true,
            decimalesMoneda: 2,
            decimalesCantidades: 2,
            numeracionAutomatica: true,
            prefijoAsientos: 'ASI',
            longitudNumeracion: 6,
            regimenTributario: '',
            configuracionImpuestos: []
          },
          activa: true,
          fechaCreacion: new Date()
        }, usuario?.id || '');
        
        showSuccess('Empresa creada', `La empresa "${formData.nombre}" ha sido creada exitosamente.`);
      } else if (modalType === 'edit' && selectedEmpresa) {
        await EmpresasService.actualizarEmpresa(selectedEmpresa.id, formData);
        showSuccess('Empresa actualizada', `La empresa "${formData.nombre}" ha sido actualizada exitosamente.`);
      }

      await cargarDatos();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando empresa:', error);
      showError(
        'Error al guardar empresa',
        error instanceof Error ? error.message : 'Error desconocido al guardar la empresa'
      );
    } finally {
      setSavingForm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      razonSocial: '',
      numeroIdentificacion: '',
      paisId: '',
      direccion: '',
      telefono: '',
      email: '',
      monedaPrincipal: '',
      subdominio: ''
    });
    setSelectedEmpresa(null);
  };

  const openModal = (type: 'create' | 'edit' | 'view' | 'users', empresa?: Empresa) => {
    setModalType(type);
    if (empresa) {
      setSelectedEmpresa(empresa);
      if (type === 'edit') {
        setFormData({
          nombre: empresa.nombre,
          razonSocial: empresa.razonSocial,
          numeroIdentificacion: empresa.numeroIdentificacion,
          paisId: empresa.paisId,
          direccion: empresa.direccion,
          telefono: empresa.telefono,
          email: empresa.email,
          monedaPrincipal: empresa.monedaPrincipal,
          subdominio: empresa.subdominio || ''
        });
      } else if (type === 'users') {
        cargarUsuariosEmpresa(empresa.id);
      }
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const cargarUsuariosEmpresa = async (empresaId: string) => {
    try {
      setLoadingUsers(true);
      const usuarios = await EmpresasService.getUsuariosEmpresa(empresaId);
      setUsuariosEmpresa(usuarios);
    } catch (error) {
      console.error('Error cargando usuarios de empresa:', error);
      showError('Error al cargar usuarios', 'No se pudieron cargar los usuarios de la empresa');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteEmpresa = (empresa: Empresa) => {
    confirmDelete(empresa.nombre, async () => {
      try {
        // Aquí iría la lógica de eliminación real
        console.log('Eliminando empresa:', empresa.id);
        showSuccess('Empresa eliminada', `La empresa "${empresa.nombre}" ha sido eliminada exitosamente.`);
        await cargarDatos();
      } catch (error) {
        showError('Error al eliminar', 'No se pudo eliminar la empresa');
      }
    });
  };

  const getPaisNombre = (paisId: string) => {
    const pais = paises.find(p => p.id === paisId);
    return pais ? `${pais.nombre} (${pais.codigo})` : paisId;
  };

  const getPaisMoneda = (paisId: string) => {
    const pais = paises.find(p => p.id === paisId);
    return pais ? `${pais.monedaPrincipal} (${pais.simboloMoneda})` : '';
  };

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Mostrar error si existe
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar empresas</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={cargarDatos}
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
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
          <p className="text-gray-600 mt-1">
            Administra empresas y su configuración por país
          </p>
        </div>
        {tienePermiso('empresas:create') && (
          <button
            onClick={() => openModal('create')}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Empresa</span>
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Empresas</p>
              <p className="text-lg font-semibold text-gray-900">{empresas.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Países</p>
              <p className="text-lg font-semibold text-gray-900">{paises.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Empresas Activas</p>
              <p className="text-lg font-semibold text-gray-900">
                {empresas.filter(e => e.activa).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Con Configuración</p>
              <p className="text-lg font-semibold text-gray-900">
                {empresas.filter(e => e.configuracionContable).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedPais}
            onChange={(e) => setSelectedPais(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los países</option>
            {paises.map(pais => (
              <option key={pais.id} value={pais.id}>
                {pais.nombre} ({pais.codigo})
              </option>
            ))}
          </select>

          <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Más Filtros</span>
          </button>
        </div>
      </div>

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Empresas ({filteredEmpresas.length})
          </h3>
        </div>
        
        {filteredEmpresas.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedPais ? 'No se encontraron empresas' : 'No hay empresas registradas'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedPais 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primera empresa'
              }
            </p>
            {!searchTerm && !selectedPais && tienePermiso('empresas:create') && (
              <button
                onClick={() => openModal('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Primera Empresa
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    País
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEmpresas.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{empresa.nombre}</div>
                          <div className="text-sm text-gray-500">{empresa.razonSocial}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        <Globe className="h-3 w-3 mr-1" />
                        {getPaisNombre(empresa.paisId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {empresa.numeroIdentificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{empresa.usuariosAsignados.length}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        empresa.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {empresa.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openModal('view', empresa)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openModal('users', empresa)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Gestionar usuarios"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        {tienePermiso('empresas:edit') && (
                          <button 
                            onClick={() => openModal('edit', empresa)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {tienePermiso('empresas:delete') && (
                          <button 
                            onClick={() => handleDeleteEmpresa(empresa)}
                            className="text-red-600 hover:text-red-900" 
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredEmpresas.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredEmpresas.length)} de {filteredEmpresas.length} empresas
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Mostrar números de página */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Lógica para mostrar páginas alrededor de la actual
                  let pageToShow;
                  if (totalPages <= 5) {
                    pageToShow = i + 1;
                  } else if (currentPage <= 3) {
                    pageToShow = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageToShow = totalPages - 4 + i;
                  } else {
                    pageToShow = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => goToPage(pageToShow)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md ${
                        currentPage === pageToShow
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageToShow}
                    </button>
                  );
                })}
                
                {/* Mostrar puntos suspensivos si hay más páginas */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-2">...</span>
                )}
                
                {/* Mostrar última página si estamos lejos */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    {totalPages}
                  </button>
                )}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={5}>5 / pág</option>
                <option value={10}>10 / pág</option>
                <option value={20}>20 / pág</option>
                <option value={50}>50 / pág</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {modalType === 'create' ? 'Nueva Empresa' : 
                   modalType === 'edit' ? 'Editar Empresa' : 
                   modalType === 'view' ? 'Detalles de Empresa' : 'Gestionar Usuarios'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={savingForm || loadingUsers}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {(modalType === 'create' || modalType === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        value={formData.razonSocial}
                        onChange={(e) => setFormData({...formData, razonSocial: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        País
                      </label>
                      <select
                        value={formData.paisId}
                        onChange={(e) => {
                          const paisId = e.target.value;
                          const pais = paises.find(p => p.id === paisId);
                          setFormData({
                            ...formData, 
                            paisId,
                            monedaPrincipal: pais?.monedaPrincipal || ''
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      >
                        <option value="">Seleccionar país...</option>
                        {paises.map(pais => (
                          <option key={pais.id} value={pais.id}>
                            {pais.nombre} ({pais.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Identificación
                      </label>
                      <input
                        type="text"
                        value={formData.numeroIdentificacion}
                        onChange={(e) => setFormData({...formData, numeroIdentificacion: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={formData.paisId ? getPaisMoneda(formData.paisId) : 'RUC, NIT, RFC, etc.'}
                        required
                        disabled={savingForm}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={savingForm}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <textarea
                      value={formData.direccion}
                      onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      required
                      disabled={savingForm}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      disabled={savingForm}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingForm}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] min-h-[40px]"
                    >
                      {savingForm ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {modalType === 'create' ? 'Creando...' : 'Actualizando...'}
                        </>
                      ) : (
                        modalType === 'create' ? 'Crear Empresa' : 'Actualizar Empresa'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'view' && selectedEmpresa && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Información General</h4>
                        <div className="mt-2 space-y-2">
                          <p><span className="font-medium">Nombre:</span> {selectedEmpresa.nombre}</p>
                          <p><span className="font-medium">Razón Social:</span> {selectedEmpresa.razonSocial}</p>
                          <p><span className="font-medium">País:</span> {getPaisNombre(selectedEmpresa.paisId)}</p>
                          <p><span className="font-medium">Identificación:</span> {selectedEmpresa.numeroIdentificacion}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Contacto</h4>
                        <div className="mt-2 space-y-2">
                          <p className="flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-400" />{selectedEmpresa.email}</p>
                          <p className="flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-400" />{selectedEmpresa.telefono}</p>
                          <p className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-gray-400" />{selectedEmpresa.direccion}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Configuración Contable</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><span className="font-medium">Ejercicio Fiscal:</span> {selectedEmpresa.configuracionContable.ejercicioFiscal}</p>
                        <p><span className="font-medium">Método de Costeo:</span> {selectedEmpresa.configuracionContable.metodoCosteo}</p>
                        <p><span className="font-medium">Tipo de Inventario:</span> {selectedEmpresa.configuracionContable.tipoInventario}</p>
                        <p><span className="font-medium">Moneda:</span> {selectedEmpresa.monedaPrincipal}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'users' && selectedEmpresa && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">
                      Usuarios Asignados
                    </h4>
                    <button className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                      <UserPlus className="h-4 w-4" />
                      <span>Asignar Usuario</span>
                    </button>
                  </div>
                  
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Cargando usuarios...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {usuariosEmpresa.map((usuario) => (
                        <div key={usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                              <p className="text-xs text-gray-500">{usuario.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {usuario.rol === 'super_admin' ? 'Super Admin' :
                               usuario.rol === 'admin_empresa' ? 'Admin' :
                               usuario.rol === 'contador' ? 'Contador' : 'Usuario'}
                            </span>
                            <button className="text-red-600 hover:text-red-900">
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {usuariosEmpresa.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No hay usuarios asignados a esta empresa</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
};