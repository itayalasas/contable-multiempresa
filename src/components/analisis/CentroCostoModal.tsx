import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { CentroCosto } from '../../services/supabase/centrosCosto';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';

interface CentroCostoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (centro: Omit<CentroCosto, 'id' | 'fecha_creacion' | 'fecha_modificacion'>) => Promise<void>;
  centro?: CentroCosto | null;
  centros: CentroCosto[];
}

const TIPOS_CENTRO = [
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'PROYECTO', label: 'Proyecto' },
  { value: 'SUCURSAL', label: 'Sucursal' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'ALIADO', label: 'Aliado' },
  { value: 'OTRO', label: 'Otro' }
];

export function CentroCostoModal({
  isOpen,
  onClose,
  onSave,
  centro,
  centros
}: CentroCostoModalProps) {
  const { empresaActual } = useSesion();
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'DEPARTAMENTO' as any,
    centro_padre: '',
    nivel: 1,
    responsable_id: '',
    presupuesto_anual: 0,
    presupuesto_mensual: 0,
    activo: true
  });

  useEffect(() => {
    if (centro) {
      setFormData({
        codigo: centro.codigo,
        nombre: centro.nombre,
        descripcion: centro.descripcion || '',
        tipo: centro.tipo,
        centro_padre: centro.centro_padre || '',
        nivel: centro.nivel,
        responsable_id: centro.responsable_id || '',
        presupuesto_anual: centro.presupuesto_anual,
        presupuesto_mensual: centro.presupuesto_mensual,
        activo: centro.activo
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        tipo: 'DEPARTAMENTO',
        centro_padre: '',
        nivel: 1,
        responsable_id: '',
        presupuesto_anual: 0,
        presupuesto_mensual: 0,
        activo: true
      });
    }
    setError(null);
  }, [centro, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaActual || !usuario) return;

    try {
      setLoading(true);
      setError(null);

      const centroPadre = centros.find(c => c.id === formData.centro_padre);
      const nivel = centroPadre ? centroPadre.nivel + 1 : 1;

      await onSave({
        empresa_id: empresaActual.id,
        codigo: formData.codigo,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo: formData.tipo,
        centro_padre: formData.centro_padre || undefined,
        nivel,
        responsable_id: formData.responsable_id || undefined,
        presupuesto_anual: formData.presupuesto_anual,
        presupuesto_mensual: formData.presupuesto_mensual,
        activo: formData.activo,
        creado_por: usuario.id
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar centro de costo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {centro ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                required
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: CC-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                required
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TIPOS_CENTRO.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del centro de costo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción opcional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Centro Padre
            </label>
            <select
              value={formData.centro_padre}
              onChange={(e) => setFormData({ ...formData, centro_padre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Ninguno (nivel raíz)</option>
              {centros
                .filter(c => c.id !== centro?.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} - {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto Anual
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.presupuesto_anual}
                onChange={(e) => setFormData({ ...formData, presupuesto_anual: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Presupuesto Mensual
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.presupuesto_mensual}
                onChange={(e) => setFormData({ ...formData, presupuesto_mensual: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
              Centro activo
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
