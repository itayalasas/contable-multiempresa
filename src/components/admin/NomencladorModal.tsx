import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, CheckCircle } from 'lucide-react';

interface NomencladorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  tipo: string;
  nomenclador?: any;
  paisId: string;
}

export const NomencladorModal: React.FC<NomencladorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tipo,
  nomenclador,
  paisId
}) => {
  const [formData, setFormData] = useState<any>({
    nombre: '',
    codigo: '',
    descripcion: '',
    activo: true,
    paisId: paisId
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nomenclador) {
      setFormData({
        ...nomenclador,
        paisId: paisId
      });
    } else {
      // Valores por defecto según tipo
      const defaultData = {
        nombre: '',
        codigo: '',
        descripcion: '',
        activo: true,
        paisId: paisId
      };
      
      // Agregar campos específicos según tipo
      switch (tipo) {
        case 'tiposImpuesto':
          defaultData.porcentaje = 0;
          defaultData.tipo = 'IVA';
          break;
        case 'tiposMoneda':
          defaultData.simbolo = '';
          defaultData.esPrincipal = false;
          break;
        case 'tiposMovimientoTesoreria':
          defaultData.afectaSaldo = true;
          defaultData.requiereReferencia = false;
          break;
        case 'formasPago':
          defaultData.requiereBanco = false;
          defaultData.requiereReferencia = false;
          defaultData.requiereFecha = false;
          break;
        case 'tiposDocumentoFactura':
          defaultData.requiereImpuesto = true;
          defaultData.requiereCliente = true;
          defaultData.afectaInventario = true;
          defaultData.afectaContabilidad = true;
          defaultData.prefijo = '';
          defaultData.formato = '';
          break;
      }
      
      setFormData(defaultData);
    }
  }, [nomenclador, paisId, tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const getTipoNombre = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {nomenclador ? `Editar ${getTipoNombre()}` : `Nuevo ${getTipoNombre()}`}
            </h2>
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
          {/* Campos comunes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({...formData, codigo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              disabled={saving}
            />
          </div>
          
          {/* Campos específicos según tipo */}
          {tipo === 'tiposImpuesto' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje *
                </label>
                <input
                  type="number"
                  value={formData.porcentaje}
                  onChange={(e) => setFormData({...formData, porcentaje: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  disabled={saving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={saving}
                >
                  <option value="IVA">IVA</option>
                  <option value="IGV">IGV</option>
                  <option value="ISR">ISR</option>
                  <option value="RETENCION">Retención</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
          )}
          
          {tipo === 'tiposMoneda' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Símbolo *
                </label>
                <input
                  type="text"
                  value={formData.simbolo}
                  onChange={(e) => setFormData({...formData, simbolo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={saving}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="esPrincipal"
                  checked={formData.esPrincipal}
                  onChange={(e) => setFormData({...formData, esPrincipal: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="esPrincipal" className="ml-2 block text-sm text-gray-900">
                  Es moneda principal
                </label>
              </div>
            </div>
          )}
          
          {tipo === 'tiposMovimientoTesoreria' && (
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="afectaSaldo"
                  checked={formData.afectaSaldo}
                  onChange={(e) => setFormData({...formData, afectaSaldo: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="afectaSaldo" className="ml-2 block text-sm text-gray-900">
                  Afecta saldo de cuenta
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereReferencia"
                  checked={formData.requiereReferencia}
                  onChange={(e) => setFormData({...formData, requiereReferencia: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereReferencia" className="ml-2 block text-sm text-gray-900">
                  Requiere referencia
                </label>
              </div>
            </div>
          )}
          
          {tipo === 'formasPago' && (
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereBanco"
                  checked={formData.requiereBanco}
                  onChange={(e) => setFormData({...formData, requiereBanco: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereBanco" className="ml-2 block text-sm text-gray-900">
                  Requiere banco
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereReferencia"
                  checked={formData.requiereReferencia}
                  onChange={(e) => setFormData({...formData, requiereReferencia: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereReferencia" className="ml-2 block text-sm text-gray-900">
                  Requiere referencia
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereFecha"
                  checked={formData.requiereFecha}
                  onChange={(e) => setFormData({...formData, requiereFecha: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereFecha" className="ml-2 block text-sm text-gray-900">
                  Requiere fecha
                </label>
              </div>
            </div>
          )}
          
          {tipo === 'tiposDocumentoFactura' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefijo
                  </label>
                  <input
                    type="text"
                    value={formData.prefijo}
                    onChange={(e) => setFormData({...formData, prefijo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato
                  </label>
                  <input
                    type="text"
                    value={formData.formato}
                    onChange={(e) => setFormData({...formData, formato: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: F###-########"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereImpuesto"
                  checked={formData.requiereImpuesto}
                  onChange={(e) => setFormData({...formData, requiereImpuesto: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereImpuesto" className="ml-2 block text-sm text-gray-900">
                  Requiere impuesto
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiereCliente"
                  checked={formData.requiereCliente}
                  onChange={(e) => setFormData({...formData, requiereCliente: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="requiereCliente" className="ml-2 block text-sm text-gray-900">
                  Requiere cliente
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="afectaInventario"
                  checked={formData.afectaInventario}
                  onChange={(e) => setFormData({...formData, afectaInventario: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="afectaInventario" className="ml-2 block text-sm text-gray-900">
                  Afecta inventario
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="afectaContabilidad"
                  checked={formData.afectaContabilidad}
                  onChange={(e) => setFormData({...formData, afectaContabilidad: e.target.checked})}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="afectaContabilidad" className="ml-2 block text-sm text-gray-900">
                  Afecta contabilidad
                </label>
              </div>
            </div>
          )}
          
          {/* Estado activo (común para todos) */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => setFormData({...formData, activo: e.target.checked})}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={saving}
            />
            <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
              Activo
            </label>
          </div>
          
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{nomenclador ? 'Actualizar' : 'Crear'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};