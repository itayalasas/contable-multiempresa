import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Check, AlertTriangle, Loader2, Database, HelpCircle } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';

interface ImportarExtractoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, cuentaId: string, formato: string, configuracionId?: string) => Promise<void>;
  cuentas: { id: string; nombre: string; banco?: string }[];
}

export const ImportarExtractoModal: React.FC<ImportarExtractoModalProps> = ({
  isOpen,
  onClose,
  onImport,
  cuentas
}) => {
  const [selectedCuenta, setSelectedCuenta] = useState('');
  const [selectedFormato, setSelectedFormato] = useState('auto');
  const [selectedConfiguracion, setSelectedConfiguracion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuraciones, setConfiguraciones] = useState<any[]>([]);
  const [loadingConfiguraciones, setLoadingConfiguraciones] = useState(false);

  // Cargar configuraciones de mapeo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      cargarConfiguraciones();
    }
  }, [isOpen]);

  // Cargar configuraciones de mapeo desde localStorage (simulación)
  const cargarConfiguraciones = async () => {
    try {
      setLoadingConfiguraciones(true);
      
      // Simulamos obtener configuraciones desde localStorage
      const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${cuentas[0]?.id}`);
      let configs = [];
      
      if (configuracionesStr) {
        configs = JSON.parse(configuracionesStr);
      }
      
      setConfiguraciones(configs);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setLoadingConfiguraciones(false);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    
    // Validar tipo de archivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && 
        !file.name.endsWith('.csv') && 
        !file.name.endsWith('.xls') && 
        !file.name.endsWith('.xlsx')) {
      setError('Formato de archivo no válido. Por favor, sube un archivo CSV, XLS o XLSX.');
      return;
    }
    
    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. El tamaño máximo permitido es 10MB.');
      return;
    }
    
    setFile(file);
    
    // Intentar determinar el formato basado en el nombre del archivo
    const fileName = file.name.toLowerCase();
    if (fileName.includes('bcp')) {
      setSelectedFormato('bcp');
    } else if (fileName.includes('bbva')) {
      setSelectedFormato('bbva');
    } else if (fileName.includes('interbank')) {
      setSelectedFormato('interbank');
    } else if (fileName.includes('scotiabank')) {
      setSelectedFormato('scotiabank');
    }
    
    // Intentar determinar la configuración basada en el nombre del archivo
    const matchingConfig = configuraciones.find(config => 
      file.name.toLowerCase().includes(config.nombreBanco.toLowerCase())
    );
    
    if (matchingConfig) {
      setSelectedConfiguracion(matchingConfig.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCuenta) {
      setError('Por favor, selecciona una cuenta bancaria.');
      return;
    }
    
    if (!file) {
      setError('Por favor, selecciona un archivo para importar.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await onImport(file, selectedCuenta, selectedFormato, selectedConfiguracion || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el extracto bancario.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Importar Extracto Bancario
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuenta Bancaria *
            </label>
            <select
              value={selectedCuenta}
              onChange={(e) => setSelectedCuenta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
              required
            >
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map(cuenta => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} {cuenta.banco ? `(${cuenta.banco})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo de Extracto *
            </label>
            <div 
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
                dragActive ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
              } ${file ? 'border-green-300 bg-green-50' : 'border-dashed'} rounded-md`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                {file ? (
                  <div className="flex flex-col items-center">
                    <Check className="h-10 w-10 text-green-500" />
                    <p className="text-sm font-medium text-green-800 mt-2">{file.name}</p>
                    <p className="text-xs text-green-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Subir un archivo</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".csv,.xls,.xlsx"
                          disabled={loading}
                        />
                      </label>
                      <p className="pl-1">o arrastrar y soltar</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV, XLS, XLSX hasta 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formato del Archivo
              </label>
              <select
                value={selectedFormato}
                onChange={(e) => setSelectedFormato(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="auto">Detectar automáticamente</option>
                <option value="bcp">Banco de Crédito BCP</option>
                <option value="bbva">BBVA</option>
                <option value="interbank">Interbank</option>
                <option value="scotiabank">Scotiabank</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Configuración de Mapeo
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" title="Seleccione una configuración de mapeo previamente definida" />
              </label>
              <select
                value={selectedConfiguracion}
                onChange={(e) => setSelectedConfiguracion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading || loadingConfiguraciones}
              >
                <option value="">Sin configuración específica</option>
                {loadingConfiguraciones ? (
                  <option value="" disabled>Cargando configuraciones...</option>
                ) : (
                  configuraciones.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.nombre} ({config.nombreBanco})
                    </option>
                  ))
                )}
              </select>
              {configuraciones.length === 0 && !loadingConfiguraciones && (
                <p className="mt-1 text-xs text-indigo-600">
                  No hay configuraciones disponibles. Puede crear una en Administración &gt; Configuración de Mapeo.
                </p>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !file || !selectedCuenta}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Importar Extracto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};