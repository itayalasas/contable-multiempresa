import React, { useState, useEffect } from 'react';
import { X, Save, ArrowUpRight, ArrowDownRight, ArrowLeftRight, FileText, Calendar, DollarSign, Search, Loader2, Check } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { NotificationModal } from '../common/NotificationModal';
import { useModals } from '../../hooks/useModals';
import { useNomencladores } from '../../hooks/useNomencladores';

// Tipos para el componente
interface CuentaBancaria {
  id: string;
  nombre: string;
  tipo: 'CORRIENTE' | 'AHORRO' | 'EFECTIVO' | 'TARJETA';
  numero: string;
  banco?: string;
  moneda: string;
  saldoActual: number;
  saldoDisponible: number;
  fechaUltimoCierre?: string;
  activa: boolean;
  empresaId: string;
  fechaCreacion: Date;
}

interface MovimientoTesoreria {
  id: string;
  fecha: string;
  tipo: string; // Ahora es string para soportar nomencladores
  concepto: string;
  monto: number;
  cuentaId: string;
  cuentaDestinoId?: string;
  referencia?: string;
  estado: 'PENDIENTE' | 'CONCILIADO' | 'ANULADO';
  documentoRelacionado?: {
    tipo: string;
    id: string;
    numero: string;
  };
  empresaId: string;
  creadoPor: string;
  fechaCreacion: string;
}

interface MovimientoTesoreriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimiento?: MovimientoTesoreria | null;
  cuentas: CuentaBancaria[];
  mode: 'create' | 'edit' | 'view';
  onSave: (movimiento: Omit<MovimientoTesoreria, 'id' | 'fechaCreacion'>) => Promise<string>;
}

export const MovimientoTesoreriaModal: React.FC<MovimientoTesoreriaModalProps> = ({
  isOpen,
  onClose,
  movimiento,
  cuentas,
  mode,
  onSave
}) => {
  const { empresaActual, paisActual, formatearMoneda } = useSesion();
  const { notificationModal, showError, closeNotification } = useModals();
  const { tiposMovimientoTesoreria, loading: loadingNomencladores } = useNomencladores(paisActual?.id);
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: '',
    concepto: '',
    monto: 0,
    cuentaId: '',
    cuentaDestinoId: '',
    referencia: '',
    estado: 'PENDIENTE' as const
  });

  // Estados para búsqueda de cuentas
  const [cuentaSearchTerm, setCuentaSearchTerm] = useState('');
  const [cuentaDestinoSearchTerm, setCuentaDestinoSearchTerm] = useState('');
  const [showCuentaDropdown, setShowCuentaDropdown] = useState(false);
  const [showCuentaDestinoDropdown, setShowCuentaDestinoDropdown] = useState(false);
  const [selectedCuentaDisplay, setSelectedCuentaDisplay] = useState('');
  const [selectedCuentaDestinoDisplay, setSelectedCuentaDestinoDisplay] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (movimiento && (mode === 'edit' || mode === 'view')) {
      setFormData({
        fecha: movimiento.fecha,
        tipo: movimiento.tipo,
        concepto: movimiento.concepto,
        monto: movimiento.monto,
        cuentaId: movimiento.cuentaId,
        cuentaDestinoId: movimiento.cuentaDestinoId || '',
        referencia: movimiento.referencia || '',
        estado: movimiento.estado
      });
      
      // Establecer los nombres de las cuentas para mostrar
      const cuentaOrigen = cuentas.find(c => c.id === movimiento.cuentaId);
      if (cuentaOrigen) {
        setSelectedCuentaDisplay(`${cuentaOrigen.nombre} - ${cuentaOrigen.numero}`);
      }
      
      if (movimiento.cuentaDestinoId) {
        const cuentaDestino = cuentas.find(c => c.id === movimiento.cuentaDestinoId);
        if (cuentaDestino) {
          setSelectedCuentaDestinoDisplay(`${cuentaDestino.nombre} - ${cuentaDestino.numero}`);
        }
      }
    } else if (mode === 'create') {
      // Valores por defecto para nuevo movimiento
      const defaultTipo = tiposMovimientoTesoreria.length > 0 ? tiposMovimientoTesoreria[0].id : 'INGRESO';
      const defaultCuentaId = cuentas.length > 0 ? cuentas[0].id : '';
      
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        tipo: defaultTipo,
        concepto: '',
        monto: 0,
        cuentaId: defaultCuentaId,
        cuentaDestinoId: '',
        referencia: '',
        estado: 'PENDIENTE'
      });
      
      // Establecer el nombre de la cuenta origen por defecto
      if (cuentas.length > 0) {
        setSelectedCuentaDisplay(`${cuentas[0].nombre} - ${cuentas[0].numero}`);
      }
    }
  }, [movimiento, mode, cuentas, tiposMovimientoTesoreria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    // Validaciones específicas
    if (formData.tipo === 'TRANSFERENCIA' && formData.cuentaId === formData.cuentaDestinoId) {
      showError(
        'Error de validación',
        'La cuenta de origen y destino no pueden ser la misma'
      );
      return;
    }

    // Verificar que la cuenta exista
    if (!cuentas.some(c => c.id === formData.cuentaId)) {
      showError(
        'Error de validación',
        'La cuenta seleccionada no existe o no es válida'
      );
      return;
    }

    // Si es transferencia, verificar que la cuenta destino exista
    if (formData.tipo === 'TRANSFERENCIA' && !cuentas.some(c => c.id === formData.cuentaDestinoId)) {
      showError(
        'Error de validación',
        'La cuenta destino seleccionada no existe o no es válida'
      );
      return;
    }

    // Verificar si estamos editando datos mock
    if (mode === 'edit' && movimiento && 
        (movimiento.id === '1' || movimiento.id === '2' || movimiento.id === '3' || 
         movimiento.id === '4' || movimiento.id === '5')) {
      showError(
        'Error al guardar movimiento',
        'No se puede editar un movimiento de datos de prueba. Por favor, cargue los datos en Firebase primero usando el botón "Cargar Datos en Firebase".'
      );
      return;
    }

    try {
      setSaving(true);
      
      const movimientoData: Omit<MovimientoTesoreria, 'id' | 'fechaCreacion'> = {
        ...formData,
        monto: Math.abs(formData.monto), // Asegurar que el monto sea positivo
        empresaId: empresaActual?.id || 'dev-empresa-pe',
        creadoPor: 'dev-user-123'
      };

      await onSave(movimientoData);
      onClose();
    } catch (error) {
      console.error('❌ Error guardando movimiento:', error);
      
      showError(
        'Error al guardar movimiento',
        error instanceof Error ? error.message : 'Error desconocido al guardar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  };

  // Filtrar cuentas según término de búsqueda
  const filteredCuentas = cuentas.filter(cuenta => 
    cuenta.nombre.toLowerCase().includes(cuentaSearchTerm.toLowerCase()) ||
    cuenta.numero.toLowerCase().includes(cuentaSearchTerm.toLowerCase()) ||
    (cuenta.banco && cuenta.banco.toLowerCase().includes(cuentaSearchTerm.toLowerCase()))
  );

  // Filtrar cuentas destino (excluyendo la cuenta origen)
  const filteredCuentasDestino = cuentas.filter(cuenta => 
    cuenta.id !== formData.cuentaId && (
      cuenta.nombre.toLowerCase().includes(cuentaDestinoSearchTerm.toLowerCase()) ||
      cuenta.numero.toLowerCase().includes(cuentaDestinoSearchTerm.toLowerCase()) ||
      (cuenta.banco && cuenta.banco.toLowerCase().includes(cuentaDestinoSearchTerm.toLowerCase()))
    )
  );

  // Obtener cuenta seleccionada
  const selectedCuenta = cuentas.find(c => c.id === formData.cuentaId);
  const selectedCuentaDestino = cuentas.find(c => c.id === formData.cuentaDestinoId);

  // Obtener tipo de movimiento seleccionado
  const selectedTipoMovimiento = tiposMovimientoTesoreria.find(t => t.id === formData.tipo);

  // Obtener ícono según tipo de movimiento
  const getTipoIcon = () => {
    switch (formData.tipo) {
      case 'INGRESO':
        return ArrowUpRight;
      case 'EGRESO':
        return ArrowDownRight;
      case 'TRANSFERENCIA':
        return ArrowLeftRight;
      default:
        return FileText;
    }
  };

  const TipoIcon = getTipoIcon();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TipoIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Nuevo Movimiento' : 
                 mode === 'edit' ? 'Editar Movimiento' : 'Detalles del Movimiento'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={mode === 'view' || saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Movimiento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={mode === 'view' || saving || loadingNomencladores}
              >
                {loadingNomencladores ? (
                  <option value="">Cargando tipos...</option>
                ) : tiposMovimientoTesoreria && tiposMovimientoTesoreria.length > 0 ? (
                  tiposMovimientoTesoreria.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="INGRESO">Ingreso</option>
                    <option value="EGRESO">Egreso</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </>
                )}
              </select>
              {loadingNomencladores && (
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Cargando tipos de movimiento...
                </p>
              )}
              {tiposMovimientoTesoreria.length === 0 && !loadingNomencladores && (
                <p className="text-xs text-yellow-600 mt-1">
                  No hay tipos de movimiento disponibles. Cargue los datos en Firebase primero.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción del movimiento"
              required
              disabled={mode === 'view' || saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="0.01"
                  min="0"
                  required
                  disabled={mode === 'view' || saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia {selectedTipoMovimiento?.requiereReferencia && '*'}
              </label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Número de operación, cheque, etc."
                required={selectedTipoMovimiento?.requiereReferencia}
                disabled={mode === 'view' || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.tipo === 'TRANSFERENCIA' ? 'Cuenta Origen *' : 'Cuenta *'}
              </label>
              <div className="relative">
                <div 
                  className="relative border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                  onClick={() => !saving && mode !== 'view' && setShowCuentaDropdown(true)}
                >
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar cuenta por nombre o número..."
                    value={cuentaSearchTerm}
                    onChange={(e) => {
                      setCuentaSearchTerm(e.target.value);
                      setShowCuentaDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2 border-0 focus:ring-0 focus:outline-none"
                    disabled={mode === 'view' || saving}
                    onFocus={() => setShowCuentaDropdown(true)}
                  />
                  {selectedCuenta && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {formatearMoneda(selectedCuenta.saldoActual)}
                    </div>
                  )}
                </div>
                
                {showCuentaDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCuentas.length > 0 ? (
                      <ul className="py-1">
                        {filteredCuentas.map(cuenta => (
                          <li 
                            key={cuenta.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              setFormData({ ...formData, cuentaId: cuenta.id });
                              setSelectedCuentaDisplay(`${cuenta.nombre} - ${cuenta.numero}`);
                              setCuentaSearchTerm('');
                              setShowCuentaDropdown(false);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{cuenta.nombre}</div>
                                <div className="text-xs text-gray-500">
                                  {cuenta.banco ? `${cuenta.banco} - ` : ''}{cuenta.numero}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-blue-600">
                                {formatearMoneda(cuenta.saldoActual)}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No se encontraron cuentas
                      </div>
                    )}
                    <div className="p-2 border-t border-gray-200">
                      <button
                        type="button"
                        className="w-full text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => setShowCuentaDropdown(false)}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {selectedCuenta && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{selectedCuenta.nombre}</div>
                      <div className="text-xs text-gray-500">{selectedCuenta.numero}</div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatearMoneda(selectedCuenta.saldoActual)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formData.tipo === 'TRANSFERENCIA' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta Destino *
                </label>
                <div className="relative">
                  <div 
                    className="relative border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                    onClick={() => !saving && mode !== 'view' && setShowCuentaDestinoDropdown(true)}
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Buscar cuenta destino..."
                      value={cuentaDestinoSearchTerm}
                      onChange={(e) => {
                        setCuentaDestinoSearchTerm(e.target.value);
                        setShowCuentaDestinoDropdown(true);
                      }}
                      className="w-full pl-10 pr-4 py-2 border-0 focus:ring-0 focus:outline-none"
                      disabled={mode === 'view' || saving}
                      onFocus={() => setShowCuentaDestinoDropdown(true)}
                    />
                    {selectedCuentaDestino && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {formatearMoneda(selectedCuentaDestino.saldoActual)}
                      </div>
                    )}
                  </div>
                  
                  {showCuentaDestinoDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCuentasDestino.length > 0 ? (
                        <ul className="py-1">
                          {filteredCuentasDestino.map(cuenta => (
                            <li 
                              key={cuenta.id}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                              onClick={() => {
                                setFormData({ ...formData, cuentaDestinoId: cuenta.id });
                                setSelectedCuentaDestinoDisplay(`${cuenta.nombre} - ${cuenta.numero}`);
                                setCuentaDestinoSearchTerm('');
                                setShowCuentaDestinoDropdown(false);
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900">{cuenta.nombre}</div>
                                  <div className="text-xs text-gray-500">
                                    {cuenta.banco ? `${cuenta.banco} - ` : ''}{cuenta.numero}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-blue-600">
                                  {formatearMoneda(cuenta.saldoActual)}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No se encontraron cuentas disponibles
                          {formData.cuentaId && " (diferentes a la cuenta origen)"}
                        </div>
                      )}
                      <div className="p-2 border-t border-gray-200">
                        <button
                          type="button"
                          className="w-full text-xs text-gray-500 hover:text-gray-700"
                          onClick={() => setShowCuentaDestinoDropdown(false)}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {selectedCuentaDestino && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{selectedCuentaDestino.nombre}</div>
                        <div className="text-xs text-gray-500">{selectedCuentaDestino.numero}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatearMoneda(selectedCuentaDestino.saldoActual)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {mode !== 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={mode === 'view' || saving}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONCILIADO">Conciliado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
          )}

          {/* Resumen de la operación */}
          {mode !== 'view' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Check className="h-4 w-4 mr-1" />
                Resumen de la Operación
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <span className="ml-2 font-medium">{selectedTipoMovimiento?.nombre || formData.tipo}</span>
                </div>
                <div>
                  <span className="text-gray-600">Monto:</span>
                  <span className="ml-2 font-medium">{formatearMoneda(formData.monto)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cuenta:</span>
                  <span className="ml-2 font-medium truncate">{selectedCuenta?.nombre || 'No seleccionada'}</span>
                </div>
                {formData.tipo === 'TRANSFERENCIA' && (
                  <div>
                    <span className="text-gray-600">Destino:</span>
                    <span className="ml-2 font-medium truncate">{selectedCuentaDestino?.nombre || 'No seleccionado'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {mode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                disabled={
                  saving || 
                  !formData.concepto.trim() || 
                  !formData.cuentaId || 
                  formData.monto <= 0 ||
                  (formData.tipo === 'TRANSFERENCIA' && !formData.cuentaDestinoId) ||
                  (selectedTipoMovimiento?.requiereReferencia && !formData.referencia) ||
                  tiposMovimientoTesoreria.length === 0
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{mode === 'create' ? 'Crear Movimiento' : 'Actualizar Movimiento'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
        
        {/* Modal de notificación para errores */}
        <NotificationModal
          isOpen={notificationModal.isOpen}
          onClose={closeNotification}
          title={notificationModal.title}
          message={notificationModal.message}
          type={notificationModal.type}
          autoClose={notificationModal.autoClose}
        />
      </div>
    </div>
  );
};