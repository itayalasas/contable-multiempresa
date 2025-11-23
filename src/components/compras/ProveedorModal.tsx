import React, { useState, useEffect } from 'react';
import { X, User, Building2 } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { crearProveedor, actualizarProveedor, Proveedor } from '../../services/supabase/proveedores';
import { useNomencladores } from '../../hooks/useNomencladores';

interface ProveedorModalProps {
  proveedor: Proveedor | null;
  onClose: (guardado: boolean) => void;
}

export default function ProveedorModal({ proveedor, onClose }: ProveedorModalProps) {
  const { empresaActual, paisActual } = useSesion();
  const { tiposDocumentoIdentidad, loading: loadingNomencladores } = useNomencladores(paisActual?.id);

  const [formData, setFormData] = useState({
    tipo_persona: 'juridica' as 'fisica' | 'juridica',
    nombre_completo: '',
    razon_social: '',
    nombre_comercial: '',
    documento_tipo: '',
    documento_numero: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    codigo_postal: '',
    pais_codigo: 'UY',
    tipo_proveedor: 'servicio',
    condicion_pago: 'contado',
    dias_credito: 0,
    cuenta_bancaria: '',
    banco: '',
    notas: '',
    activo: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proveedor) {
      setFormData({
        tipo_persona: proveedor.tipo_persona,
        nombre_completo: proveedor.nombre_completo || '',
        razon_social: proveedor.razon_social || '',
        nombre_comercial: proveedor.nombre_comercial || '',
        documento_tipo: proveedor.documento_tipo,
        documento_numero: proveedor.documento_numero,
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        direccion: proveedor.direccion || '',
        ciudad: proveedor.ciudad || '',
        departamento: proveedor.departamento || '',
        codigo_postal: proveedor.codigo_postal || '',
        pais_codigo: proveedor.pais_codigo,
        tipo_proveedor: proveedor.tipo_proveedor,
        condicion_pago: proveedor.condicion_pago,
        dias_credito: proveedor.dias_credito,
        cuenta_bancaria: proveedor.cuenta_bancaria || '',
        banco: proveedor.banco || '',
        notas: proveedor.notas || '',
        activo: proveedor.activo,
      });
    }
  }, [proveedor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaActual) return;

    if (!formData.documento_numero) {
      alert('El número de documento es obligatorio');
      return;
    }

    if (formData.tipo_persona === 'fisica' && !formData.nombre_completo) {
      alert('El nombre completo es obligatorio para personas físicas');
      return;
    }

    if (formData.tipo_persona === 'juridica' && !formData.razon_social) {
      alert('La razón social es obligatoria para personas jurídicas');
      return;
    }

    try {
      setSaving(true);

      const proveedorData = {
        empresa_id: empresaActual.id,
        tipo_persona: formData.tipo_persona,
        nombre_completo: formData.tipo_persona === 'fisica' ? formData.nombre_completo : null,
        razon_social: formData.tipo_persona === 'juridica' ? formData.razon_social : null,
        nombre_comercial: formData.nombre_comercial || null,
        documento_tipo: formData.documento_tipo,
        documento_numero: formData.documento_numero,
        email: formData.email || null,
        telefono: formData.telefono || null,
        direccion: formData.direccion || null,
        ciudad: formData.ciudad || null,
        departamento: formData.departamento || null,
        codigo_postal: formData.codigo_postal || null,
        pais_codigo: formData.pais_codigo,
        tipo_proveedor: formData.tipo_proveedor,
        condicion_pago: formData.condicion_pago,
        dias_credito: formData.dias_credito,
        cuenta_bancaria: formData.cuenta_bancaria || null,
        banco: formData.banco || null,
        notas: formData.notas || null,
        activo: formData.activo,
      };

      if (proveedor) {
        await actualizarProveedor(proveedor.id, proveedorData);
      } else {
        await crearProveedor(proveedorData);
      }

      onClose(true);
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      alert('Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo_persona: 'fisica' })}
              className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition-colors ${
                formData.tipo_persona === 'fisica'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Persona Física</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo_persona: 'juridica' })}
              className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition-colors ${
                formData.tipo_persona === 'juridica'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Persona Jurídica</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.tipo_persona === 'fisica' ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            ) : (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_comercial}
                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={formData.documento_tipo}
                onChange={(e) => setFormData({ ...formData, documento_tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                {tiposDocumentoIdentidad.map((tipo) => (
                  <option key={tipo.id} value={tipo.codigo}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Documento *
              </label>
              <input
                type="text"
                value={formData.documento_numero}
                onChange={(e) => setFormData({ ...formData, documento_numero: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Proveedor *
              </label>
              <select
                value={formData.tipo_proveedor}
                onChange={(e) => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="servicio">Servicios</option>
                <option value="mercaderia">Mercadería</option>
                <option value="insumo">Insumos</option>
                <option value="aliado">Aliado/Socio</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del banco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuenta Bancaria
              </label>
              <input
                type="text"
                value={formData.cuenta_bancaria}
                onChange={(e) => setFormData({ ...formData, cuenta_bancaria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Número de cuenta"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condición de Pago
              </label>
              <select
                value={formData.condicion_pago}
                onChange={(e) => setFormData({ ...formData, condicion_pago: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Crédito
              </label>
              <input
                type="number"
                value={formData.dias_credito}
                onChange={(e) => setFormData({ ...formData, dias_credito: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Proveedor Activo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : proveedor ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
