import React, { useState, useEffect } from 'react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';
import { ImpuestoModal, ImpuestoFormData } from '../../components/admin/ImpuestoModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

interface Impuesto {
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

export default function GestionImpuestos() {
  const { empresaActual } = useSesion();
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [impuestoEditar, setImpuestoEditar] = useState<Impuesto | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [impuestoEliminar, setImpuestoEliminar] = useState<Impuesto | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    console.log('🔄 [GestionImpuestos] useEffect disparado');
    console.log('📊 [GestionImpuestos] empresaActual en useEffect:', empresaActual);
    if (empresaActual) {
      cargarImpuestos();
    } else {
      console.warn('⚠️ [GestionImpuestos] No hay empresaActual, no se cargan impuestos');
    }
  }, [empresaActual]);

  const cargarImpuestos = async () => {
    console.log('🔍 [GestionImpuestos] Iniciando carga de impuestos...');
    console.log('📊 [GestionImpuestos] empresaActual:', empresaActual);

    const paisId = empresaActual?.paisId || empresaActual?.pais_id;
    console.log('🌍 [GestionImpuestos] paisId:', paisId);

    if (!paisId) {
      console.error('❌ [GestionImpuestos] No hay paisId en empresaActual');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 [GestionImpuestos] Consultando impuestos_configuracion...');

      const { data, error } = await supabase
        .from('impuestos_configuracion')
        .select('*')
        .eq('pais_id', paisId)
        .order('tipo', { ascending: true })
        .order('nombre', { ascending: true });

      console.log('📥 [GestionImpuestos] Respuesta de Supabase:', { data, error });

      if (error) {
        console.error('❌ [GestionImpuestos] Error en query:', error);
        throw error;
      }

      const impuestosFormateados = (data || []).map((imp: any) => ({
        id: imp.id,
        nombre: imp.nombre,
        codigo: imp.codigo,
        tipo: imp.tipo,
        tasa: parseFloat(imp.tasa),
        activo: imp.activo,
        descripcion: imp.descripcion,
        aplica_ventas: imp.aplica_ventas,
        aplica_compras: imp.aplica_compras,
        codigo_dgi: imp.codigo_dgi,
      }));

      console.log('✅ [GestionImpuestos] Impuestos cargados:', impuestosFormateados.length);
      setImpuestos(impuestosFormateados);
    } catch (error) {
      console.error('❌ [GestionImpuestos] Error al cargar impuestos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoImpuesto = () => {
    setImpuestoEditar(null);
    setShowModal(true);
  };

  const handleEditarImpuesto = (impuesto: Impuesto) => {
    setImpuestoEditar(impuesto);
    setShowModal(true);
  };

  const handleEliminarClick = (impuesto: Impuesto) => {
    setImpuestoEliminar(impuesto);
    setShowDeleteModal(true);
  };

  const handleGuardarImpuesto = async (formData: ImpuestoFormData) => {
    const paisId = empresaActual?.paisId || empresaActual?.pais_id;
    if (!paisId) {
      throw new Error('No se pudo obtener el país de la empresa');
    }

    try {
      if (formData.id) {
        const { error } = await supabase
          .from('impuestos_configuracion')
          .update({
            nombre: formData.nombre,
            codigo: formData.codigo,
            tipo: formData.tipo,
            tasa: formData.tasa,
            activo: formData.activo,
            descripcion: formData.descripcion,
            aplica_ventas: formData.aplica_ventas,
            aplica_compras: formData.aplica_compras,
            codigo_dgi: formData.codigo_dgi,
          })
          .eq('id', formData.id);

        if (error) throw error;

        setNotification({
          show: true,
          type: 'success',
          title: 'Impuesto actualizado',
          message: 'El impuesto se actualizó correctamente.',
        });
      } else {
        const { error } = await supabase
          .from('impuestos_configuracion')
          .insert({
            pais_id: paisId,
            nombre: formData.nombre,
            codigo: formData.codigo,
            tipo: formData.tipo,
            tasa: formData.tasa,
            activo: formData.activo,
            descripcion: formData.descripcion,
            aplica_ventas: formData.aplica_ventas,
            aplica_compras: formData.aplica_compras,
            codigo_dgi: formData.codigo_dgi,
          });

        if (error) throw error;

        setNotification({
          show: true,
          type: 'success',
          title: 'Impuesto creado',
          message: 'El impuesto se creó correctamente.',
        });
      }

      await cargarImpuestos();
    } catch (error: any) {
      console.error('Error al guardar impuesto:', error);
      throw new Error(error.message || 'Error al guardar el impuesto');
    }
  };

  const handleEliminarConfirm = async () => {
    if (!impuestoEliminar) return;

    try {
      const { error } = await supabase
        .from('impuestos_configuracion')
        .delete()
        .eq('id', impuestoEliminar.id);

      if (error) throw error;

      setNotification({
        show: true,
        type: 'success',
        title: 'Impuesto eliminado',
        message: 'El impuesto se eliminó correctamente.',
      });

      await cargarImpuestos();
      setShowDeleteModal(false);
      setImpuestoEliminar(null);
    } catch (error: any) {
      console.error('Error al eliminar impuesto:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al eliminar el impuesto',
      });
    }
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando impuestos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Impuestos</h1>
          <p className="text-gray-600 mt-1">
            Configuración de tasas impositivas y tipos de impuestos
          </p>
        </div>
        <button
          onClick={handleNuevoImpuesto}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Impuesto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Impuestos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{impuestos.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {impuestos.filter((i) => i.activo).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Tipos</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {new Set(impuestos.map((i) => i.tipo)).size}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tasa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {impuestos.map((impuesto) => (
                <tr key={impuesto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{impuesto.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      {impuesto.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{impuesto.tasa}%</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{impuesto.descripcion}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {impuesto.activo ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditarImpuesto(impuesto)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarClick(impuesto)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Información</h3>
            <p className="mt-1 text-sm text-blue-700">
              Los impuestos configurados aquí se aplicarán automáticamente en facturas y
              documentos. Asegúrate de que las tasas correspondan con la legislación vigente.
            </p>
          </div>
        </div>
      </div>

      <ImpuestoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleGuardarImpuesto}
        impuesto={impuestoEditar}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleEliminarConfirm}
        title="Eliminar Impuesto"
        message={`¿Está seguro que desea eliminar el impuesto "${impuestoEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      <NotificationModal
        isOpen={notification.show}
        onClose={() => setNotification({ ...notification, show: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
