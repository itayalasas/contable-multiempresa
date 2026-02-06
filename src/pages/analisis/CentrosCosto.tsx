import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useCentrosCosto } from '../../hooks/useCentrosCosto';
import { useModals } from '../../hooks/useModals';
import { CentroCostoModal } from '../../components/analisis/CentroCostoModal';
import { CentroCosto } from '../../services/supabase/centrosCosto';

export default function CentrosCosto() {
  const { empresaActual, formatearMoneda } = useSesion();
  const {
    centros,
    loading,
    error,
    estadisticas,
    crearCentro,
    actualizarCentro,
    eliminarCentro
  } = useCentrosCosto(empresaActual?.id);
  const { showSuccess, showError, showConfirm } = useModals();

  const [centroSeleccionado, setCentroSeleccionado] = useState<CentroCosto | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleNuevo = () => {
    setCentroSeleccionado(null);
    setModalAbierto(true);
  };

  const handleEditar = (centro: CentroCosto) => {
    setCentroSeleccionado(centro);
    setModalAbierto(true);
  };

  const handleEliminar = (centro: CentroCosto) => {
    showConfirm(
      'Confirmar eliminación',
      `¿Está seguro de eliminar el centro de costo "${centro.nombre}"?`,
      async () => {
        try {
          await eliminarCentro(centro.id);
          showSuccess('Centro eliminado', 'El centro de costo ha sido eliminado exitosamente');
        } catch (error: any) {
          showError('Error', error.message || 'No se pudo eliminar el centro de costo');
        }
      }
    );
  };

  const handleGuardar = async (centro: Omit<CentroCosto, 'id' | 'fecha_creacion' | 'fecha_modificacion'>) => {
    try {
      if (centroSeleccionado) {
        await actualizarCentro(centroSeleccionado.id, centro);
        showSuccess('Centro actualizado', 'El centro de costo ha sido actualizado exitosamente');
      } else {
        await crearCentro(centro);
        showSuccess('Centro creado', 'El centro de costo ha sido creado exitosamente');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const obtenerIconoTipo = (tipo: string) => {
    const iconos: Record<string, any> = {
      DEPARTAMENTO: Building2,
      PROYECTO: TrendingUp,
      SUCURSAL: Building2,
      SERVICIO: Info,
      ALIADO: Building2,
      OTRO: Info
    };
    const Icon = iconos[tipo] || Info;
    return <Icon className="w-4 h-4" />;
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando centros de costo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centros de Costo</h1>
          <p className="text-gray-600 mt-1">
            Gestión de centros de costo para análisis de rentabilidad
          </p>
        </div>
        <button
          onClick={handleNuevo}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Centro de Costo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Centros</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {estadisticas.totalCentros}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Activos</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {estadisticas.activos}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Inactivos</div>
          <div className="text-2xl font-bold text-gray-400 mt-1">
            {estadisticas.inactivos}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Presupuesto Total</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {formatearMoneda(estadisticas.totalPresupuesto)}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {centros.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin centros de costo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Los centros de costo permiten analizar ingresos y gastos por departamento o proyecto
          </p>
          <div className="mt-6">
            <button
              onClick={handleNuevo}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Crear primer centro de costo
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presupuesto Anual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {centros.map((centro) => (
                  <tr key={centro.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {centro.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{centro.nombre}</div>
                      {centro.descripcion && (
                        <div className="text-xs text-gray-500">{centro.descripcion}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {obtenerIconoTipo(centro.tipo)}
                        <span className="text-sm text-gray-700">{centro.tipo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearMoneda(centro.presupuesto_anual)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          centro.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {centro.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditar(centro)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(centro)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Información</h3>
            <p className="mt-1 text-sm text-blue-700">
              Ejemplos de centros de costo: Departamento de Ventas, Departamento de Marketing,
              Proyecto X, Sucursal A, etc.
            </p>
          </div>
        </div>
      </div>

      <CentroCostoModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setCentroSeleccionado(null);
        }}
        onSave={handleGuardar}
        centro={centroSeleccionado}
        centros={centros}
      />
    </div>
  );
}
