import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ImpuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (impuesto: ImpuestoFormData) => Promise<void>;
  impuesto?: ImpuestoData | null;
}

interface ImpuestoData {
  id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  tasa: number;
  activo: boolean;
  descripcion?: string;
  aplica_ventas: boolean;
  aplica_compras: boolean;
  codigo_dgi?: string;
}

export interface ImpuestoFormData {
  id?: string;
  nombre: string;
  codigo: string;
  tipo: string;
  tasa: number;
  activo: boolean;
  descripcion?: string;
  aplica_ventas: boolean;
  aplica_compras: boolean;
  codigo_dgi?: string;
}

const TIPOS_IMPUESTO = [
  { value: 'IVA', label: 'IVA' },
  { value: 'IRPF', label: 'IRPF' },
  { value: 'IRAE', label: 'IRAE' },
  { value: 'IMESI', label: 'IMESI' },
  { value: 'OTRO', label: 'Otro' },
];

export function ImpuestoModal({ isOpen, onClose, onSave, impuesto }: ImpuestoModalProps) {
  const [formData, setFormData] = useState<ImpuestoFormData>({
    nombre: '',
    codigo: '',
    tipo: 'IVA',
    tasa: 0,
    activo: true,
    descripcion: '',
    aplica_ventas: true,
    aplica_compras: true,
    codigo_dgi: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (impuesto) {
      setFormData({
        id: impuesto.id,
        nombre: impuesto.nombre,
        codigo: impuesto.codigo,
        tipo: impuesto.tipo,
        tasa: impuesto.tasa,
        activo: impuesto.activo,
        descripcion: impuesto.descripcion || '',
        aplica_ventas: impuesto.aplica_ventas,
        aplica_compras: impuesto.aplica_compras,
        codigo_dgi: impuesto.codigo_dgi || '',
      });
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        tipo: 'IVA',
        tasa: 0,
        activo: true,
        descripcion: '',
        aplica_ventas: true,
        aplica_compras: true,
        codigo_dgi: '',
      });
    }
    setError(null);
  }, [impuesto, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!formData.codigo.trim()) {
      setError('El código es requerido');
      return;
    }

    if (formData.tasa < 0 || formData.tasa > 100) {
      setError('La tasa debe estar entre 0 y 100');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el impuesto');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {impuesto ? 'Editar Impuesto' : 'Nuevo Impuesto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: IVA Básico"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                placeholder="Ej: IVA_BASICO"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {TIPOS_IMPUESTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tasa}
                onChange={(e) => setFormData({ ...formData, tasa: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código DGI (opcional)
              </label>
              <input
                type="text"
                value={formData.codigo_dgi}
                onChange={(e) => setFormData({ ...formData, codigo_dgi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Código para DGI"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Descripción del impuesto"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplica_ventas"
                checked={formData.aplica_ventas}
                onChange={(e) => setFormData({ ...formData, aplica_ventas: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplica_ventas" className="ml-2 text-sm text-gray-700">
                Aplica a ventas
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplica_compras"
                checked={formData.aplica_compras}
                onChange={(e) => setFormData({ ...formData, aplica_compras: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplica_compras" className="ml-2 text-sm text-gray-700">
                Aplica a compras
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="activo" className="ml-2 text-sm text-gray-700">
                Activo
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Guardando...' : impuesto ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
