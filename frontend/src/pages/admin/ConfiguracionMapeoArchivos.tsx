import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Trash2, 
  Edit, 
  FileText, 
  Database, 
  Ban as BankIcon, 
  Check, 
  X, 
  Upload, 
  Download, 
  Copy,
  Loader2,
  AlertCircle,
  Info,
  HelpCircle,
  Eye
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../hooks/useModals';
import { useNomencladores } from '../../hooks/useNomencladores';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

// Tipos para la configuración de mapeo
interface MapeoColumna {
  indice: number;
  nombreColumna: string;
  campoDestino: string;
  formato?: string;
  requerido: boolean;
}

interface ConfiguracionMapeo {
  id: string;
  nombre: string;
  bancoId: string;
  nombreBanco: string;
  delimitador: string;
  tieneEncabezado: boolean;
  formatoFecha: string;
  columnaFecha: number;
  columnaDescripcion: number;
  columnaReferencia: number;
  columnaMonto: number;
  columnaTipo: number;
  valorTipoAbono: string;
  valorTipoCargo: string;
  mapeoColumnas: MapeoColumna[];
  activo: boolean;
  empresaId: string;
  creadoPor: string;
  fechaCreacion: Date;
}

// Servicio mock para gestionar configuraciones de mapeo
const mapeoService = {
  async getConfiguraciones(empresaId: string): Promise<ConfiguracionMapeo[]> {
    // Simulamos obtener datos desde localStorage para desarrollo
    const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
    if (configuracionesStr) {
      return JSON.parse(configuracionesStr);
    }
    return [];
  },
  
  async guardarConfiguracion(empresaId: string, configuracion: Omit<ConfiguracionMapeo, 'id' | 'fechaCreacion'>): Promise<string> {
    // Simulamos guardar en localStorage para desarrollo
    const configuraciones = await this.getConfiguraciones(empresaId);
    const id = `config_${Date.now()}`;
    const nuevaConfiguracion = {
      ...configuracion,
      id,
      fechaCreacion: new Date()
    };
    
    configuraciones.push(nuevaConfiguracion);
    localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
    return id;
  },
  
  async actualizarConfiguracion(empresaId: string, id: string, datos: Partial<ConfiguracionMapeo>): Promise<void> {
    const configuraciones = await this.getConfiguraciones(empresaId);
    const index = configuraciones.findIndex(c => c.id === id);
    
    if (index >= 0) {
      configuraciones[index] = {
        ...configuraciones[index],
        ...datos
      };
      localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
    }
  },
  
  async eliminarConfiguracion(empresaId: string, id: string): Promise<void> {
    const configuraciones = await this.getConfiguraciones(empresaId);
    const nuevasConfiguraciones = configuraciones.filter(c => c.id !== id);
    localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(nuevasConfiguraciones));
  }
};

// Componente principal
function ConfiguracionMapeoArchivos() {
  const { empresaActual, paisActual } = useSesion();
  const { usuario } = useAuth();
  const { bancos, loading: loadingBancos } = useNomencladores(paisActual?.id);
  
  // Estados
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionMapeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ConfiguracionMapeo | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [savingForm, setSavingForm] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Omit<ConfiguracionMapeo, 'id' | 'fechaCreacion'>>({
    nombre: '',
    bancoId: '',
    nombreBanco: '',
    delimitador: ',',
    tieneEncabezado: true,
    formatoFecha: 'DD/MM/YYYY',
    columnaFecha: 0,
    columnaDescripcion: 1,
    columnaReferencia: 2,
    columnaMonto: 3,
    columnaTipo: 4,
    valorTipoAbono: 'ABONO',
    valorTipoCargo: 'CARGO',
    mapeoColumnas: [],
    activo: true,
    empresaId: empresaActual?.id || '',
    creadoPor: usuario?.id || ''
  });
  
  // Modals
  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError
  } = useModals();
  
  // Cargar configuraciones al iniciar
  useEffect(() => {
    if (empresaActual?.id) {
      cargarConfiguraciones();
    }
  }, [empresaActual?.id]);
  
  // Cargar configuraciones
  const cargarConfiguraciones = async () => {
    if (!empresaActual?.id) return;
    
    try {
      setLoading(true);
      const configs = await mapeoService.getConfiguraciones(empresaActual.id);
      setConfiguraciones(configs);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      showError(
        'Error al cargar configuraciones',
        'No se pudieron cargar las configuraciones de mapeo de archivos'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir modal para crear/editar
  const openModal = (mode: 'create' | 'edit', config?: ConfiguracionMapeo) => {
    setModalMode(mode);
    
    if (mode === 'edit' && config) {
      setSelectedConfig(config);
      setFormData({
        nombre: config.nombre,
        bancoId: config.bancoId,
        nombreBanco: config.nombreBanco,
        delimitador: config.delimitador,
        tieneEncabezado: config.tieneEncabezado,
        formatoFecha: config.formatoFecha,
        columnaFecha: config.columnaFecha,
        columnaDescripcion: config.columnaDescripcion,
        columnaReferencia: config.columnaReferencia,
        columnaMonto: config.columnaMonto,
        columnaTipo: config.columnaTipo,
        valorTipoAbono: config.valorTipoAbono,
        valorTipoCargo: config.valorTipoCargo,
        mapeoColumnas: [...config.mapeoColumnas],
        activo: config.activo,
        empresaId: empresaActual?.id || '',
        creadoPor: usuario?.id || ''
      });
    } else {
      resetForm();
    }
    
    setShowModal(true);
  };
  
  // Resetear formulario
  const resetForm = () => {
    setSelectedConfig(null);
    setFormData({
      nombre: '',
      bancoId: '',
      nombreBanco: '',
      delimitador: ',',
      tieneEncabezado: true,
      formatoFecha: 'DD/MM/YYYY',
      columnaFecha: 0,
      columnaDescripcion: 1,
      columnaReferencia: 2,
      columnaMonto: 3,
      columnaTipo: 4,
      valorTipoAbono: 'ABONO',
      valorTipoCargo: 'CARGO',
      mapeoColumnas: [],
      activo: true,
      empresaId: empresaActual?.id || '',
      creadoPor: usuario?.id || ''
    });
    setPreviewFile(null);
    setPreviewData([]);
    setPreviewError(null);
  };
  
  // Manejar cambio de banco
  const handleBancoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bancoId = e.target.value;
    const banco = bancos.find(b => b.id === bancoId);
    
    setFormData({
      ...formData,
      bancoId,
      nombreBanco: banco?.nombre || ''
    });
  };
  
  // Manejar cambio de delimitador
  const handleDelimitadorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      delimitador: e.target.value
    });
    
    // Re-procesar archivo de vista previa si existe
    if (previewFile) {
      processPreviewFile(previewFile, e.target.value, formData.tieneEncabezado);
    }
  };
  
  // Manejar cambio de encabezado
  const handleEncabezadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tieneEncabezado = e.target.checked;
    
    setFormData({
      ...formData,
      tieneEncabezado
    });
    
    // Re-procesar archivo de vista previa si existe
    if (previewFile) {
      processPreviewFile(previewFile, formData.delimitador, tieneEncabezado);
    }
  };
  
  // Procesar archivo para vista previa
  const processPreviewFile = (file: File, delimitador: string, tieneEncabezado: boolean) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        // Determinar delimitador real
        let delimiterChar = ',';
        switch (delimitador) {
          case ',': delimiterChar = ','; break;
          case ';': delimiterChar = ';'; break;
          case '\t': delimiterChar = '\t'; break;
          case '|': delimiterChar = '|'; break;
          default: delimiterChar = ',';
        }
        
        // Parsear líneas
        const parsedData = lines.map(line => {
          // Manejar casos especiales como campos entre comillas
          const fields: string[] = [];
          let field = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
              inQuotes = !inQuotes;
            } else if (char === delimiterChar && !inQuotes) {
              fields.push(field);
              field = '';
            } else {
              field += char;
            }
          }
          
          // Agregar el último campo
          fields.push(field);
          
          return fields;
        });
        
        // Actualizar mapeo de columnas si hay encabezado
        if (tieneEncabezado && parsedData.length > 0) {
          const headers = parsedData[0];
          const mapeoColumnas: MapeoColumna[] = headers.map((header, index) => ({
            indice: index,
            nombreColumna: header.trim(),
            campoDestino: getCampoDestinoPorNombre(header.trim()),
            requerido: false
          }));
          
          setFormData(prev => ({
            ...prev,
            mapeoColumnas
          }));
        }
        
        setPreviewData(parsedData);
        setPreviewError(null);
      } catch (error) {
        console.error('Error procesando archivo:', error);
        setPreviewError('Error al procesar el archivo. Verifique el formato y el delimitador.');
        setPreviewData([]);
      }
    };
    
    reader.onerror = () => {
      setPreviewError('Error al leer el archivo.');
      setPreviewData([]);
    };
    
    reader.readAsText(file);
  };
  
  // Determinar campo destino basado en nombre de columna
  const getCampoDestinoPorNombre = (nombreColumna: string): string => {
    const nombreNormalizado = nombreColumna.toLowerCase().trim();
    
    if (nombreNormalizado.includes('fecha') || nombreNormalizado.includes('date')) {
      return 'fecha';
    } else if (nombreNormalizado.includes('descrip') || nombreNormalizado.includes('concept')) {
      return 'descripcion';
    } else if (nombreNormalizado.includes('ref') || nombreNormalizado.includes('document')) {
      return 'referencia';
    } else if (nombreNormalizado.includes('monto') || nombreNormalizado.includes('importe') || 
               nombreNormalizado.includes('amount') || nombreNormalizado.includes('valor')) {
      return 'monto';
    } else if (nombreNormalizado.includes('tipo') || nombreNormalizado.includes('type') || 
               nombreNormalizado.includes('deb') || nombreNormalizado.includes('cred')) {
      return 'tipo';
    }
    
    return '';
  };
  
  // Manejar carga de archivo para vista previa
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewFile(file);
      processPreviewFile(file, formData.delimitador, formData.tieneEncabezado);
    }
  };
  
  // Agregar mapeo de columna
  const addMapeoColumna = () => {
    const newMapeo: MapeoColumna = {
      indice: formData.mapeoColumnas.length,
      nombreColumna: '',
      campoDestino: '',
      requerido: false
    };
    
    setFormData({
      ...formData,
      mapeoColumnas: [...formData.mapeoColumnas, newMapeo]
    });
  };
  
  // Actualizar mapeo de columna
  const updateMapeoColumna = (index: number, field: keyof MapeoColumna, value: any) => {
    const updatedMapeo = [...formData.mapeoColumnas];
    updatedMapeo[index] = {
      ...updatedMapeo[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      mapeoColumnas: updatedMapeo
    });
  };
  
  // Eliminar mapeo de columna
  const removeMapeoColumna = (index: number) => {
    const updatedMapeo = formData.mapeoColumnas.filter((_, i) => i !== index);
    
    // Actualizar índices
    const reindexedMapeo = updatedMapeo.map((mapeo, i) => ({
      ...mapeo,
      indice: i
    }));
    
    setFormData({
      ...formData,
      mapeoColumnas: reindexedMapeo
    });
  };
  
  // Guardar configuración
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!empresaActual?.id) {
      showError('Error', 'No hay empresa seleccionada');
      return;
    }
    
    try {
      setSavingForm(true);
      
      if (modalMode === 'create') {
        const id = await mapeoService.guardarConfiguracion(empresaActual.id, formData);
        showSuccess(
          'Configuración creada',
          `La configuración "${formData.nombre}" ha sido creada exitosamente.`
        );
      } else if (modalMode === 'edit' && selectedConfig) {
        await mapeoService.actualizarConfiguracion(empresaActual.id, selectedConfig.id, formData);
        showSuccess(
          'Configuración actualizada',
          `La configuración "${formData.nombre}" ha sido actualizada exitosamente.`
        );
      }
      
      await cargarConfiguraciones();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showError(
        'Error al guardar',
        error instanceof Error ? error.message : 'Error desconocido al guardar la configuración'
      );
    } finally {
      setSavingForm(false);
    }
  };
  
  // Eliminar configuración
  const handleDelete = (config: ConfiguracionMapeo) => {
    if (!empresaActual?.id) return;
    
    confirmDelete(config.nombre, async () => {
      try {
        await mapeoService.eliminarConfiguracion(empresaActual.id, config.id);
        showSuccess(
          'Configuración eliminada',
          `La configuración "${config.nombre}" ha sido eliminada exitosamente.`
        );
        await cargarConfiguraciones();
      } catch (error) {
        console.error('Error eliminando configuración:', error);
        showError(
          'Error al eliminar',
          error instanceof Error ? error.message : 'Error desconocido al eliminar la configuración'
        );
      }
    });
  };
  
  // Exportar configuración
  const handleExport = (config: ConfiguracionMapeo) => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapeo_${config.nombreBanco.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Importar configuración
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const config = JSON.parse(content) as ConfiguracionMapeo;
          
          // Validar estructura básica
          if (!config.nombre || !config.bancoId || !config.delimitador) {
            throw new Error('El archivo no contiene una configuración de mapeo válida');
          }
          
          // Preparar para guardar
          const configToSave: Omit<ConfiguracionMapeo, 'id' | 'fechaCreacion'> = {
            nombre: config.nombre,
            bancoId: config.bancoId,
            nombreBanco: config.nombreBanco,
            delimitador: config.delimitador,
            tieneEncabezado: config.tieneEncabezado,
            formatoFecha: config.formatoFecha,
            columnaFecha: config.columnaFecha,
            columnaDescripcion: config.columnaDescripcion,
            columnaReferencia: config.columnaReferencia,
            columnaMonto: config.columnaMonto,
            columnaTipo: config.columnaTipo,
            valorTipoAbono: config.valorTipoAbono,
            valorTipoCargo: config.valorTipoCargo,
            mapeoColumnas: config.mapeoColumnas,
            activo: true,
            empresaId: empresaActual?.id || '',
            creadoPor: usuario?.id || ''
          };
          
          // Guardar configuración importada
          if (empresaActual?.id) {
            await mapeoService.guardarConfiguracion(empresaActual.id, configToSave);
            await cargarConfiguraciones();
            showSuccess(
              'Configuración importada',
              `La configuración "${config.nombre}" ha sido importada exitosamente.`
            );
          }
        } catch (error) {
          console.error('Error importando configuración:', error);
          showError(
            'Error al importar',
            error instanceof Error ? error.message : 'Error desconocido al importar la configuración'
          );
        }
      };
      
      reader.readAsText(file);
    }
  };
  
  // Renderizar contenido principal
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Cargando configuraciones...</p>
          </div>
        </div>
      );
    }
    
    return (
      <>
        {/* Lista de configuraciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Configuraciones de Mapeo ({configuraciones.length})
              </h3>
              <div className="flex space-x-2">
                <label className="cursor-pointer bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm">
                  <Upload className="h-4 w-4" />
                  <span>Importar</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={handleImport}
                  />
                </label>
                <button
                  onClick={() => openModal('create')}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva Configuración</span>
                </button>
              </div>
            </div>
          </div>
          
          {configuraciones.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay configuraciones de mapeo
                </h3>
                <p className="text-gray-600 mb-6">
                  Cree una nueva configuración para mapear los archivos de extractos bancarios.
                </p>
                <button
                  onClick={() => openModal('create')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Configuración
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {configuraciones.map(config => (
                <div key={config.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <BankIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{config.nombre}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{config.nombreBanco}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          config.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {config.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Delimitador:</span>
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {config.delimitador === '\t' ? 'Tab' : config.delimitador}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Formato Fecha:</span>
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{config.formatoFecha}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiene Encabezado:</span>
                        <span>{config.tieneEncabezado ? 'Sí' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Columnas Mapeadas:</span>
                        <span>{config.mapeoColumnas.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                      onClick={() => handleExport(config)}
                      className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Exportar configuración"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('edit', config)}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar configuración"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config)}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar configuración"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuración de Mapeo de Archivos</h1>
              <p className="text-indigo-100">Configuración para importación de extractos bancarios</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => openModal('create')}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              Nueva Configuración
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderMainContent()}

      {/* Modal de configuración */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Nueva Configuración de Mapeo' : 'Editar Configuración de Mapeo'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={savingForm}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Configuración *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    disabled={savingForm}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco *
                  </label>
                  <select
                    value={formData.bancoId}
                    onChange={handleBancoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    disabled={savingForm || loadingBancos}
                  >
                    <option value="">Seleccionar banco...</option>
                    {bancos.map(banco => (
                      <option key={banco.id} value={banco.id}>
                        {banco.nombre}
                      </option>
                    ))}
                  </select>
                  {loadingBancos && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Cargando bancos...
                    </p>
                  )}
                </div>
              </div>
              
              {/* Configuración de formato */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Configuración de Formato
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delimitador *
                    </label>
                    <select
                      value={formData.delimitador}
                      onChange={handleDelimitadorChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                      disabled={savingForm}
                    >
                      <option value=",">Coma (,)</option>
                      <option value=";">Punto y coma (;)</option>
                      <option value="\t">Tabulación</option>
                      <option value="|">Barra vertical (|)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Formato de Fecha *
                    </label>
                    <select
                      value={formData.formatoFecha}
                      onChange={(e) => setFormData({...formData, formatoFecha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                      disabled={savingForm}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tieneEncabezado"
                      checked={formData.tieneEncabezado}
                      onChange={handleEncabezadoChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      disabled={savingForm}
                    />
                    <label htmlFor="tieneEncabezado" className="ml-2 block text-sm text-gray-900">
                      El archivo tiene encabezado
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Cargar archivo para vista previa */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  Cargar Archivo de Ejemplo (Opcional)
                </h3>
                
                <p className="text-xs text-blue-600 mb-3">
                  Cargue un archivo de ejemplo para visualizar y configurar el mapeo de columnas automáticamente.
                </p>
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-blue-500" />
                      <p className="mb-2 text-sm text-blue-700">
                        <span className="font-semibold">Haga clic para cargar</span> o arrastre y suelte
                      </p>
                      <p className="text-xs text-blue-600">CSV, TXT, XLS, XLSX (máx. 10MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.txt,.xls,.xlsx"
                      onChange={handleFileUpload}
                      disabled={savingForm}
                    />
                  </label>
                </div>
                
                {previewError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <p className="ml-2 text-sm text-red-700">{previewError}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Vista previa de datos */}
              {previewData.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-600" />
                    Vista Previa de Datos
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          {previewData[0].map((_, colIndex) => (
                            <th key={colIndex} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Columna {colIndex + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 && formData.tieneEncabezado ? 'bg-indigo-50' : ''}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {rowIndex + 1}
                            </td>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {previewData.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Mostrando 5 de {previewData.length} filas
                    </p>
                  )}
                </div>
              )}
              
              {/* Mapeo de columnas */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-600" />
                    Mapeo de Columnas
                  </h3>
                  <button
                    type="button"
                    onClick={addMapeoColumna}
                    className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar Columna
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.mapeoColumnas.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        No hay columnas mapeadas. Agregue columnas o cargue un archivo de ejemplo.
                      </p>
                    </div>
                  ) : (
                    formData.mapeoColumnas.map((mapeo, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-gray-200">
                        <div className="col-span-1 text-center">
                          <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                            {mapeo.indice + 1}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={mapeo.nombreColumna}
                            onChange={(e) => updateMapeoColumna(index, 'nombreColumna', e.target.value)}
                            placeholder="Nombre en archivo"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                            disabled={savingForm}
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={mapeo.campoDestino}
                            onChange={(e) => updateMapeoColumna(index, 'campoDestino', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                            disabled={savingForm}
                          >
                            <option value="">Seleccionar campo...</option>
                            <option value="fecha">Fecha</option>
                            <option value="descripcion">Descripción</option>
                            <option value="referencia">Referencia</option>
                            <option value="monto">Monto</option>
                            <option value="tipo">Tipo (Cargo/Abono)</option>
                            <option value="ignorar">Ignorar columna</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={mapeo.formato || ''}
                            onChange={(e) => updateMapeoColumna(index, 'formato', e.target.value)}
                            placeholder="Formato (opcional)"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                            disabled={savingForm}
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={mapeo.requerido}
                            onChange={(e) => updateMapeoColumna(index, 'requerido', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            disabled={savingForm}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeMapeoColumna(index)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            disabled={savingForm}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {formData.mapeoColumnas.length > 0 && (
                  <div className="mt-3 grid grid-cols-12 gap-2 text-xs text-gray-500">
                    <div className="col-span-1 text-center">Índice</div>
                    <div className="col-span-3">Nombre en Archivo</div>
                    <div className="col-span-3">Campo Destino</div>
                    <div className="col-span-3">Formato</div>
                    <div className="col-span-1 text-center">Requerido</div>
                    <div className="col-span-1 text-center">Acción</div>
                  </div>
                )}
              </div>
              
              {/* Configuración de campos específicos */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-indigo-600" />
                  Configuración de Campos Específicos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Índice Columna Fecha *
                    </label>
                    <input
                      type="number"
                      value={formData.columnaFecha}
                      onChange={(e) => setFormData({...formData, columnaFecha: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      required
                      disabled={savingForm}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Índice Columna Descripción *
                    </label>
                    <input
                      type="number"
                      value={formData.columnaDescripcion}
                      onChange={(e) => setFormData({...formData, columnaDescripcion: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      required
                      disabled={savingForm}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Índice Columna Referencia *
                    </label>
                    <input
                      type="number"
                      value={formData.columnaReferencia}
                      onChange={(e) => setFormData({...formData, columnaReferencia: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      required
                      disabled={savingForm}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Índice Columna Monto *
                    </label>
                    <input
                      type="number"
                      value={formData.columnaMonto}
                      onChange={(e) => setFormData({...formData, columnaMonto: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      required
                      disabled={savingForm}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Índice Columna Tipo *
                    </label>
                    <input
                      type="number"
                      value={formData.columnaTipo}
                      onChange={(e) => setFormData({...formData, columnaTipo: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="0"
                      required
                      disabled={savingForm}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor para Tipo Abono *
                    </label>
                    <input
                      type="text"
                      value={formData.valorTipoAbono}
                      onChange={(e) => setFormData({...formData, valorTipoAbono: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: ABONO, CREDITO, +"
                      required
                      disabled={savingForm}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor para Tipo Cargo *
                    </label>
                    <input
                      type="text"
                      value={formData.valorTipoCargo}
                      onChange={(e) => setFormData({...formData, valorTipoCargo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: CARGO, DEBITO, -"
                      required
                      disabled={savingForm}
                    />
                  </div>
                </div>
              </div>
              
              {/* Información de ayuda */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Información de Ayuda</h3>
                    <div className="mt-2 text-sm text-blue-700 space-y-1">
                      <p>
                        <strong>Índices de columna:</strong> Los índices comienzan en 0. La primera columna es 0, la segunda es 1, etc.
                      </p>
                      <p>
                        <strong>Formato de fecha:</strong> Especifique el formato en que aparecen las fechas en el archivo.
                      </p>
                      <p>
                        <strong>Valores de tipo:</strong> Indique qué texto o símbolo identifica los cargos y abonos en el archivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botones */}
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
                  disabled={savingForm || !formData.nombre || !formData.bancoId}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px]"
                >
                  {savingForm ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar</span>
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

// Componente Settings para el icono
const Settings = (props: any) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
};

export { ConfiguracionMapeoArchivos }