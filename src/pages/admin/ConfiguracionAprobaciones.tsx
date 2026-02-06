import React, { useState } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Settings,
  Info,
  Receipt,
  DollarSign,
  BookOpen,
  CreditCard,
  Wallet,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useConfiguracionAprobaciones } from '../../hooks/useConfiguracionAprobaciones';
import { useModals } from '../../hooks/useModals';

const ICONOS = {
  Receipt,
  DollarSign,
  BookOpen,
  CreditCard,
  Wallet,
  FileText,
};

const COLORES_MODULO = {
  ventas: 'bg-blue-50 border-blue-200 text-blue-800',
  tesoreria: 'bg-green-50 border-green-200 text-green-800',
  contabilidad: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  finanzas: 'bg-purple-50 border-purple-200 text-purple-800',
  compras: 'bg-orange-50 border-orange-200 text-orange-800',
};

const COLORES_ACCION = {
  crear: 'bg-green-100 text-green-800',
  editar: 'bg-yellow-100 text-yellow-800',
  eliminar: 'bg-red-100 text-red-800',
};

function ConfiguracionAprobaciones() {
  const { empresaActual } = useSesion();
  const { usuario } = useAuth();
  const {
    configuraciones,
    loading,
    error,
    resumenPorModulo,
    cambiarRequiereAprobacion,
    obtenerModulosUnicos,
  } = useConfiguracionAprobaciones(empresaActual?.id);

  const { showSuccess, showError } = useModals();
  const [filtroModulo, setFiltroModulo] = useState<string>('todos');
  const [buscando, setBuscando] = useState(false);

  const modulos = obtenerModulosUnicos();

  const configuracionesFiltradas = filtroModulo === 'todos'
    ? configuraciones
    : configuraciones.filter(c => c.modulo === filtroModulo);

  const handleToggleAprobacion = async (id: string, requiere: boolean) => {
    try {
      setBuscando(true);
      await cambiarRequiereAprobacion(id, requiere, usuario?.id);
      showSuccess(
        'Configuración actualizada',
        `La configuración ha sido ${requiere ? 'activada' : 'desactivada'} correctamente`
      );
    } catch (err: any) {
      showError('Error', err.message || 'No se pudo actualizar la configuración');
    } finally {
      setBuscando(false);
    }
  };

  const getIcono = (nombreIcono: string) => {
    const Icono = ICONOS[nombreIcono as keyof typeof ICONOS] || FileText;
    return Icono;
  };

  const getColorModulo = (modulo: string) => {
    return COLORES_MODULO[modulo as keyof typeof COLORES_MODULO] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getColorAccion = (accion: string) => {
    return COLORES_ACCION[accion as keyof typeof COLORES_ACCION] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Configuración de Aprobaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Configura qué acciones requieren aprobación en tu sistema
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">¿Cómo funciona?</p>
            <p>
              Las aprobaciones permiten que ciertas acciones críticas requieran autorización de un supervisor
              antes de ejecutarse. Esto añade una capa adicional de seguridad y control.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resumenPorModulo.map(resumen => (
          <div key={resumen.modulo} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {resumen.modulo}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getColorModulo(resumen.modulo)}`}>
                {resumen.total}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Activas:</span>
                <span className="font-medium text-gray-900">{resumen.activas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Requieren aprobación:</span>
                <span className="font-medium text-green-600">{resumen.requieren_aprobacion}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Configuraciones</h2>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFiltroModulo('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtroModulo === 'todos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {modulos.map(modulo => (
                <button
                  key={modulo}
                  onClick={() => setFiltroModulo(modulo)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                    filtroModulo === modulo
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {modulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {configuracionesFiltradas.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay configuraciones disponibles</p>
            </div>
          ) : (
            configuracionesFiltradas.map((config) => {
              const Icono = getIcono(config.icono);

              return (
                <div
                  key={config.id}
                  className="p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg border ${getColorModulo(config.modulo)}`}>
                        <Icono className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {config.descripcion}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getColorAccion(config.accion)}`}>
                            {config.accion}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Módulo:</span>
                            <span className="capitalize">{config.modulo}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Entidad:</span>
                            <span>{config.entidad.replace(/_/g, ' ')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={() => handleToggleAprobacion(config.id, !config.requiere_aprobacion)}
                        disabled={buscando}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          config.requiere_aprobacion ? 'bg-green-600' : 'bg-gray-300'
                        } ${buscando ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            config.requiere_aprobacion ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {config.requiere_aprobacion ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Activa</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          <span>Inactiva</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionAprobaciones;
