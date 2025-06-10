import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Wallet, Ban as BankIcon, CreditCard, PiggyBank, Loader2 } from 'lucide-react';
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

interface CuentaBancariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta?: CuentaBancaria | null;
  onSave: (cuenta: Omit<CuentaBancaria, 'id' | 'fechaCreacion'>) => Promise<string>;
  mode: 'create' | 'edit' | 'view';
}

export const CuentaBancariaModal: React.FC<CuentaBancariaModalProps> = ({
  isOpen,
  onClose,
  cuenta,
  onSave,
  mode
}) => {
  const { empresaActual, paisActual } = useSesion();
  const { notificationModal, showError, closeNotification } = useModals();
  const { tiposMoneda, bancos, loading: loadingNomencladores } = useNomencladores(paisActual?.id);
  
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'CORRIENTE' as const,
    numero: '',
    banco: '',
    moneda: '',
    saldoActual: 0,
    saldoDisponible: 0,
    activa: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cuenta && (mode === 'edit' || mode === 'view')) {
      setFormData({
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        numero: cuenta.numero,
        banco: cuenta.banco || '',
        moneda: cuenta.moneda,
        saldoActual: cuenta.saldoActual,
        saldoDisponible: cuenta.saldoDisponible,
        activa: cuenta.activa
      });
    } else if (mode === 'create') {
      // Valores por defecto para nueva cuenta
      const monedaPrincipal = tiposMoneda.find(m => m.esPrincipal)?.codigo || 
                             paisActual?.monedaPrincipal || 
                             'PEN';
      
      setFormData({
        nombre: '',
        tipo: 'CORRIENTE',
        numero: '',
        banco: '',
        moneda: monedaPrincipal,
        saldoActual: 0,
        saldoDisponible: 0,
        activa: true
      });
    }
  }, [cuenta, mode, paisActual, tiposMoneda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    // Validaciones específicas
    if (formData.tipo === 'TRANSFERENCIA' && formData.banco === '') {
      showError(
        'Error de validación',
        'El banco es requerido para cuentas de tipo Transferencia'
      );
      return;
    }

    // Verificar si estamos editando datos mock
    if (mode === 'edit' && cuenta && (cuenta.id === '1' || cuenta.id === '2' || cuenta.id === '3' || cuenta.id === '4')) {
      showError(
        'Error al guardar cuenta',
        'No se puede editar una cuenta de datos de prueba. Por favor, cargue los datos en Firebase primero usando el botón "Cargar Datos en Firebase".'
      );
      return;
    }

    try {
      setSaving(true);
      
      const cuentaData: Omit<CuentaBancaria, 'id' | 'fechaCreacion'> = {
        ...formData,
        empresaId: empresaActual?.id || 'dev-empresa-pe'
      };

      await onSave(cuentaData);
      onClose();
    } catch (error) {
      console.error('❌ Error guardando cuenta bancaria:', error);
      
      showError(
        'Error al guardar cuenta',
        error instanceof Error ? error.message : 'Error desconocido al guardar la cuenta bancaria'
      );
    } finally {
      setSaving(false);
    }
  };

  const getTipoCuentaIcon = () => {
    switch (formData.tipo) {
      case 'CORRIENTE':
        return <BankIcon className="h-6 w-6 text-blue-600" />;
      case 'AHORRO':
        return <PiggyBank className="h-6 w-6 text-green-600" />;
      case 'EFECTIVO':
        return <Wallet className="h-6 w-6 text-yellow-600" />;
      case 'TARJETA':
        return <CreditCard className="h-6 w-6 text-purple-600" />;
      default:
        return <BankIcon className="h-6 w-6 text-blue-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                {getTipoCuentaIcon()}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Nueva Cuenta Bancaria' : 
                 mode === 'edit' ? 'Editar Cuenta Bancaria' : 'Ver Cuenta Bancaria'}
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
                Nombre de la Cuenta *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={mode === 'view' || saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cuenta *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={mode === 'view' || saving}
              >
                <option value="CORRIENTE">Cuenta Corriente</option>
                <option value="AHORRO">Cuenta de Ahorro</option>
                <option value="EFECTIVO">Caja/Efectivo</option>
                <option value="TARJETA">Tarjeta de Crédito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cuenta *
              </label>
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={mode === 'view' || saving}
                placeholder={formData.tipo === 'EFECTIVO' ? 'CAJA-001' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              {loadingNomencladores ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value="Cargando bancos..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                </div>
              ) : (
                <select
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={mode === 'view' || saving || formData.tipo === 'EFECTIVO'}
                >
                  <option value="">Seleccione un banco</option>
                  {bancos.map(banco => (
                    <option key={banco.id} value={banco.nombre}>
                      {banco.nombre}
                    </option>
                  ))}
                </select>
              )}
              {bancos.length === 0 && !loadingNomencladores && (
                <p className="text-xs text-yellow-600 mt-1">
                  No hay bancos disponibles. Cargue los datos en Firebase primero.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda *
              </label>
              {loadingNomencladores ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value="Cargando monedas..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                </div>
              ) : (
                <select
                  value={formData.moneda}
                  onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={mode === 'view' || saving}
                >
                  {tiposMoneda.map(moneda => (
                    <option key={moneda.id} value={moneda.codigo}>
                      {moneda.nombre} ({moneda.simbolo})
                    </option>
                  ))}
                </select>
              )}
              {tiposMoneda.length === 0 && !loadingNomencladores && (
                <p className="text-xs text-yellow-600 mt-1">
                  No hay monedas disponibles. Cargue los datos en Firebase primero.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Actual *
              </label>
              <input
                type="number"
                value={formData.saldoActual}
                onChange={(e) => {
                  const saldoActual = parseFloat(e.target.value) || 0;
                  setFormData({ 
                    ...formData, 
                    saldoActual,
                    // Actualizar saldo disponible automáticamente si es una cuenta normal
                    saldoDisponible: formData.tipo !== 'TARJETA' ? saldoActual : formData.saldoDisponible
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                required
                disabled={mode === 'view' || saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.tipo === 'TARJETA' ? 'Límite de Crédito *' : 'Saldo Disponible *'}
              </label>
              <input
                type="number"
                value={formData.saldoDisponible}
                onChange={(e) => setFormData({ ...formData, saldoDisponible: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                required
                disabled={mode === 'view' || saving || (formData.tipo !== 'TARJETA')}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="activa"
              checked={formData.activa}
              onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={mode === 'view' || saving}
            />
            <label htmlFor="activa" className="ml-2 block text-sm text-gray-900">
              Cuenta activa
            </label>
          </div>

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
                disabled={saving || !formData.nombre.trim() || !formData.numero.trim() || tiposMoneda.length === 0}
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
                    <span>{mode === 'create' ? 'Crear Cuenta' : 'Actualizar Cuenta'}</span>
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