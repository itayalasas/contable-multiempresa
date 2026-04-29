import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../hooks/useModals';
import { useNomencladores } from '../../hooks/useNomencladores';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import {
  MapeoArchivoBancario,
  mapeoArchivosSupabaseService,
} from '../../services/supabase/mapeoArchivos';

interface ConfiguracionMapeoForm {
  nombre: string;
  bancoId: string;
  bancoNombre: string;
  delimitador: string;
  tieneEncabezado: boolean;
  formatoFecha: string;
  valorTipoAbono: string;
  valorTipoCargo: string;
  columnaFecha: number;
  columnaDescripcion: number;
  columnaReferencia: number;
  columnaMonto: number;
  columnaTipo: number;
  activo: boolean;
}

const initialForm: ConfiguracionMapeoForm = {
  nombre: '',
  bancoId: '',
  bancoNombre: '',
  delimitador: ';',
  tieneEncabezado: true,
  formatoFecha: 'DD/MM/YYYY',
  valorTipoAbono: 'ABONO',
  valorTipoCargo: 'CARGO',
  columnaFecha: 0,
  columnaDescripcion: 1,
  columnaReferencia: 2,
  columnaMonto: 3,
  columnaTipo: 4,
  activo: true,
};

function mapToForm(config: MapeoArchivoBancario): ConfiguracionMapeoForm {
  const campos = config.configCampos || {};
  return {
    nombre: config.nombre,
    bancoId: config.bancoId,
    bancoNombre: config.bancoNombre,
    delimitador: config.delimitador || ';',
    tieneEncabezado: config.tieneEncabezado,
    formatoFecha: config.formatoFecha || 'DD/MM/YYYY',
    valorTipoAbono: campos.valorTipoAbono || 'ABONO',
    valorTipoCargo: campos.valorTipoCargo || 'CARGO',
    columnaFecha: Number(campos.columnaFecha ?? 0),
    columnaDescripcion: Number(campos.columnaDescripcion ?? 1),
    columnaReferencia: Number(campos.columnaReferencia ?? 2),
    columnaMonto: Number(campos.columnaMonto ?? 3),
    columnaTipo: Number(campos.columnaTipo ?? 4),
    activo: config.activo,
  };
}

function buildConfigCampos(form: ConfiguracionMapeoForm) {
  return {
    columnaFecha: form.columnaFecha,
    columnaDescripcion: form.columnaDescripcion,
    columnaReferencia: form.columnaReferencia,
    columnaMonto: form.columnaMonto,
    columnaTipo: form.columnaTipo,
    valorTipoAbono: form.valorTipoAbono,
    valorTipoCargo: form.valorTipoCargo,
  };
}

function ConfiguracionMapeoArchivos() {
  const { empresaActual, paisActual } = useSesion();
  const { usuario } = useAuth();
  const { bancos } = useNomencladores(paisActual?.id);
  const [configuraciones, setConfiguraciones] = useState<MapeoArchivoBancario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MapeoArchivoBancario | null>(null);
  const [formData, setFormData] = useState<ConfiguracionMapeoForm>(initialForm);

  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError,
  } = useModals();

  const cargarConfiguraciones = async () => {
    if (!empresaActual?.id) return;

    try {
      setLoading(true);
      const data = await mapeoArchivosSupabaseService.getMapeos(empresaActual.id);
      setConfiguraciones(data);
    } catch (error) {
      console.error('Error cargando configuraciones de mapeo:', error);
      showError('Error al cargar', error instanceof Error ? error.message : 'No se pudieron cargar las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfiguraciones();
  }, [empresaActual?.id]);

  const resetForm = () => {
    setSelectedConfig(null);
    setFormData(initialForm);
  };

  const openModal = (config?: MapeoArchivoBancario) => {
    if (config) {
      setSelectedConfig(config);
      setFormData(mapToForm(config));
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!empresaActual?.id || !usuario?.id) {
      showError('Error', 'No se pudo identificar la empresa o el usuario actual');
      return;
    }

    setSaving(true);

    try {
      const bancoSeleccionado = bancos.find((banco) => banco.id === formData.bancoId);
      const basePayload = {
        empresaId: empresaActual.id,
        nombre: formData.nombre,
        bancoId: formData.bancoId,
        bancoNombre: bancoSeleccionado?.nombre || formData.bancoNombre,
        formatoArchivo: 'CSV',
        delimitador: formData.delimitador,
        formatoFecha: formData.formatoFecha,
        tieneEncabezado: formData.tieneEncabezado,
        tieneTotales: false,
        codificacion: 'UTF-8',
        configCampos: buildConfigCampos(formData),
        rutEmpresa: undefined,
        cuentaDebito: undefined,
        tipoCuentaDebito: undefined,
        activo: formData.activo,
        creadoPor: usuario.id,
      };

      if (selectedConfig) {
        await mapeoArchivosSupabaseService.updateMapeo(selectedConfig.id, {
          nombre: basePayload.nombre,
          activo: basePayload.activo,
          configCampos: basePayload.configCampos,
        });
        showSuccess('Configuracion actualizada', `La configuracion "${formData.nombre}" fue actualizada.`);
      } else {
        await mapeoArchivosSupabaseService.createMapeo(basePayload);
        showSuccess('Configuracion creada', `La configuracion "${formData.nombre}" fue creada.`);
      }

      await cargarConfiguraciones();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando configuracion de mapeo:', error);
      showError('Error al guardar', error instanceof Error ? error.message : 'No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (config: MapeoArchivoBancario) => {
    confirmDelete(
      'Confirmar eliminacion',
      `Se desactivara la configuracion "${config.nombre}".`,
      async () => {
        try {
          await mapeoArchivosSupabaseService.updateMapeo(config.id, { activo: false });
          await cargarConfiguraciones();
          showSuccess('Configuracion desactivada', `La configuracion "${config.nombre}" fue desactivada.`);
        } catch (error) {
          showError('Error al desactivar', error instanceof Error ? error.message : 'No se pudo desactivar la configuracion');
        }
      },
    );
  };

  const handleExport = (config: MapeoArchivoBancario) => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapeo_${config.nombre.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !empresaActual?.id || !usuario?.id) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const imported = JSON.parse(String(loadEvent.target?.result || '{}')) as Partial<MapeoArchivoBancario>;
        if (!imported.nombre || !imported.bancoId) {
          throw new Error('El archivo no contiene una configuracion valida');
        }

        await mapeoArchivosSupabaseService.createMapeo({
          empresaId: empresaActual.id,
          nombre: imported.nombre,
          bancoId: imported.bancoId,
          bancoNombre: imported.bancoNombre || '',
          formatoArchivo: imported.formatoArchivo || 'CSV',
          delimitador: imported.delimitador || ';',
          formatoFecha: imported.formatoFecha || 'DD/MM/YYYY',
          tieneEncabezado: imported.tieneEncabezado ?? true,
          tieneTotales: imported.tieneTotales ?? false,
          codificacion: imported.codificacion || 'UTF-8',
          configCampos: imported.configCampos || {},
          rutEmpresa: imported.rutEmpresa,
          cuentaDebito: imported.cuentaDebito,
          tipoCuentaDebito: imported.tipoCuentaDebito,
          activo: true,
          creadoPor: usuario.id,
        });

        await cargarConfiguraciones();
        showSuccess('Configuracion importada', `La configuracion "${imported.nombre}" fue importada.`);
      } catch (error) {
        console.error('Error importando configuracion:', error);
        showError('Error al importar', error instanceof Error ? error.message : 'No se pudo importar la configuracion');
      }
    };

    reader.readAsText(file);
  };

  const configuracionesActivas = useMemo(
    () => configuraciones.filter((config) => config.activo),
    [configuraciones],
  );

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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuracion de Mapeo de Archivos</h1>
              <p className="text-indigo-100">Persistencia real en Supabase para formatos bancarios.</p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Nueva Configuracion
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Configuraciones Activas ({configuracionesActivas.length})
          </h3>
          <label className="cursor-pointer bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm">
            <Upload className="h-4 w-4" />
            Importar JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>

        {configuracionesActivas.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No hay configuraciones cargadas para la empresa actual.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {configuracionesActivas.map((config) => (
              <div key={config.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900">{config.nombre}</h4>
                  <p className="text-xs text-gray-500 mt-1">{config.bancoNombre}</p>
                </div>
                <div className="p-4 space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between"><span>Delimitador</span><span>{config.delimitador || '(fijo)'}</span></div>
                  <div className="flex justify-between"><span>Fecha</span><span>{config.formatoFecha}</span></div>
                  <div className="flex justify-between"><span>Encabezado</span><span>{config.tieneEncabezado ? 'Si' : 'No'}</span></div>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => handleExport(config)} className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Exportar">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => openModal(config)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(config)} className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Desactivar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedConfig ? 'Editar Configuracion' : 'Nueva Configuracion'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600" disabled={saving}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <select
                    value={formData.bancoId}
                    onChange={(e) => {
                      const banco = bancos.find((item) => item.id === e.target.value);
                      setFormData((prev) => ({ ...prev, bancoId: e.target.value, bancoNombre: banco?.nombre || '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    disabled={!!selectedConfig}
                  >
                    <option value="">Seleccione un banco</option>
                    {bancos.map((banco) => (
                      <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delimitador</label>
                  <select
                    value={formData.delimitador}
                    onChange={(e) => setFormData((prev) => ({ ...prev, delimitador: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!!selectedConfig}
                  >
                    <option value=";">Punto y coma</option>
                    <option value=",">Coma</option>
                    <option value="|">Pipe</option>
                    <option value="	">Tab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato Fecha</label>
                  <input
                    type="text"
                    value={formData.formatoFecha}
                    onChange={(e) => setFormData((prev) => ({ ...prev, formatoFecha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!!selectedConfig}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 mt-7">
                  <input
                    type="checkbox"
                    checked={formData.tieneEncabezado}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tieneEncabezado: e.target.checked }))}
                    className="rounded border-gray-300"
                    disabled={!!selectedConfig}
                  />
                  Tiene encabezado
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ['Fecha', 'columnaFecha'],
                  ['Descripcion', 'columnaDescripcion'],
                  ['Referencia', 'columnaReferencia'],
                  ['Monto', 'columnaMonto'],
                  ['Tipo', 'columnaTipo'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData[key as keyof ConfiguracionMapeoForm] as number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Abono</label>
                  <input
                    type="text"
                    value={formData.valorTipoAbono}
                    onChange={(e) => setFormData((prev) => ({ ...prev, valorTipoAbono: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Cargo</label>
                  <input
                    type="text"
                    value={formData.valorTipoCargo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, valorTipoCargo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export { ConfiguracionMapeoArchivos };
