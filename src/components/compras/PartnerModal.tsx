import React, { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';

interface Partner {
  id?: string;
  partner_id_externo: string;
  razon_social: string;
  documento: string;
  tipo_documento: string;
  email: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  comision_porcentaje_default: number;
  facturacion_frecuencia: string;
  dia_facturacion: number;
  cuenta_bancaria?: string;
  banco?: string;
}

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partner: Partial<Partner>) => Promise<void>;
  partner?: Partner | null;
  empresaId: string;
}

export function PartnerModal({ isOpen, onClose, onSave, partner, empresaId }: PartnerModalProps) {
  const [formData, setFormData] = useState<Partial<Partner>>({
    partner_id_externo: '',
    razon_social: '',
    documento: '',
    tipo_documento: 'RUT',
    email: '',
    telefono: '',
    direccion: '',
    activo: true,
    comision_porcentaje_default: 10,
    facturacion_frecuencia: 'mensual',
    dia_facturacion: 1,
    cuenta_bancaria: '',
    banco: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (partner) {
      setFormData(partner);
    } else {
      setFormData({
        partner_id_externo: `PARTNER-${Date.now()}`,
        razon_social: '',
        documento: '',
        tipo_documento: 'RUT',
        email: '',
        telefono: '',
        direccion: '',
        activo: true,
        comision_porcentaje_default: 10,
        facturacion_frecuencia: 'mensual',
        dia_facturacion: 1,
        cuenta_bancaria: '',
        banco: '',
      });
    }
    setErrors({});
  }, [partner, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.razon_social?.trim()) {
      newErrors.razon_social = 'La razón social es obligatoria';
    }

    if (!formData.documento?.trim()) {
      newErrors.documento = 'El documento es obligatorio';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.comision_porcentaje_default || formData.comision_porcentaje_default < 0 || formData.comision_porcentaje_default > 100) {
      newErrors.comision_porcentaje_default = 'El porcentaje debe estar entre 0 y 100';
    }

    if (!formData.dia_facturacion || formData.dia_facturacion < 1 || formData.dia_facturacion > 31) {
      newErrors.dia_facturacion = 'El día debe estar entre 1 y 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar partner:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {partner ? 'Editar Partner' : 'Nuevo Partner'}
              </h2>
              <p className="text-blue-100 text-sm">
                {partner ? 'Modifica los datos del partner' : 'Registra un nuevo partner o aliado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Externo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.partner_id_externo}
                onChange={(e) => setFormData({ ...formData, partner_id_externo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!partner}
              />
              <p className="text-xs text-gray-500 mt-1">
                Identificador único del partner (no se puede modificar después de crear)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.razon_social ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.razon_social && (
                <p className="text-xs text-red-500 mt-1">{errors.razon_social}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="RUT">RUT</option>
                <option value="CI">Cédula</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.documento ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.documento && (
                <p className="text-xs text-red-500 mt-1">{errors.documento}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono || ''}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion || ''}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comisión por Defecto (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.comision_porcentaje_default}
                onChange={(e) => setFormData({ ...formData, comision_porcentaje_default: parseFloat(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.comision_porcentaje_default ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.comision_porcentaje_default && (
                <p className="text-xs text-red-500 mt-1">{errors.comision_porcentaje_default}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia de Facturación <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.facturacion_frecuencia}
                onChange={(e) => setFormData({ ...formData, facturacion_frecuencia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="bimensual">Bimensual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día de Facturación <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_facturacion}
                onChange={(e) => setFormData({ ...formData, dia_facturacion: parseInt(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.dia_facturacion ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dia_facturacion && (
                <p className="text-xs text-red-500 mt-1">{errors.dia_facturacion}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco
              </label>
              <input
                type="text"
                value={formData.banco || ''}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuenta Bancaria
              </label>
              <input
                type="text"
                value={formData.cuenta_bancaria || ''}
                onChange={(e) => setFormData({ ...formData, cuenta_bancaria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Partner Activo</span>
              </label>
            </div>
          </div>
        </form>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
