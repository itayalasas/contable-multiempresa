import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, User, Calendar } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useAutorizaciones } from '../../hooks/useAutorizaciones';
import { useModals } from '../../hooks/useModals';
import { usePermissions } from '../../hooks/usePermissions';
import { InputModal } from '../../components/common/InputModal';

function BandejaAutorizaciones() {
  const { empresaActual, formatearMoneda } = useSesion();
  const { usuario } = useAuth();
  const { hasModuleAccess } = usePermissions();
  const {
    solicitudes,
    loading,
    error,
    contadorPendientes,
    aprobarSolicitud,
    rechazarSolicitud,
  } = useAutorizaciones(empresaActual?.id);

  const { showSuccess, showError, showInput, inputModal, closeInput } = useModals();
  const [filtroEstado, setFiltroEstado] = useState<string>('PENDIENTE');

  const solicitudesFiltradas = filtroEstado
    ? solicitudes.filter(s => s.estado === filtroEstado)
    : solicitudes;

  const puedeAprobarRechazar = (solicitudUsuarioId?: string) => {
    if (!usuario) return false;

    const tieneAccesoAdministracion = hasModuleAccess('administracion');

    if (!tieneAccesoAdministracion) return false;

    if (solicitudUsuarioId && solicitudUsuarioId === usuario.id) {
      return false;
    }

    return true;
  };

  const handleAprobar = async (solicitud: any) => {
    if (solicitud.solicitadoPor === usuario?.id) {
      showError('Error', 'No puedes aprobar tu propia solicitud');
      return;
    }

    if (!puedeAprobarRechazar(solicitud.solicitadoPor)) {
      showError(
        'Permisos insuficientes',
        'Solo los usuarios con acceso al módulo de Administración pueden aprobar solicitudes.\n\nPara obtener estos permisos, contacte al administrador del sistema en la sección "Gestión de Usuarios".'
      );
      return;
    }

    showInput({
      title: 'Comentario de aprobación',
      message: 'Puedes agregar un comentario sobre esta aprobación (opcional):',
      placeholder: 'Ej: Aprobado según procedimiento establecido',
      required: false,
      multiline: true,
      rows: 2,
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      onConfirm: async (comentario: string) => {
        try {
          await aprobarSolicitud(solicitud.id, usuario?.id || '', comentario || undefined);
          showSuccess('Solicitud aprobada', 'La eliminación ha sido ejecutada exitosamente');
        } catch (error: any) {
          showError('Error al aprobar', error.message || 'No se pudo aprobar la solicitud');
        }
      }
    });
  };

  const handleRechazar = async (solicitud: any) => {
    if (solicitud.solicitadoPor === usuario?.id) {
      showError('Error', 'No puedes rechazar tu propia solicitud');
      return;
    }

    if (!puedeAprobarRechazar(solicitud.solicitadoPor)) {
      showError(
        'Permisos insuficientes',
        'Solo los usuarios con acceso al módulo de Administración pueden rechazar solicitudes.\n\nPara obtener estos permisos, contacte al administrador del sistema en la sección "Gestión de Usuarios".'
      );
      return;
    }

    showInput({
      title: 'Motivo del rechazo',
      message: 'Por favor, indique el motivo por el cual rechaza esta solicitud (requerido):',
      placeholder: 'Ej: No se justifica la eliminación, falta información',
      required: true,
      multiline: true,
      rows: 3,
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      onConfirm: async (comentario: string) => {
        try {
          await rechazarSolicitud(solicitud.id, usuario?.id || '', comentario);
          showSuccess('Solicitud rechazada', 'La solicitud ha sido rechazada');
        } catch (error: any) {
          showError('Error al rechazar', error.message || 'No se pudo rechazar la solicitud');
        }
      }
    });
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      PENDIENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      APROBADA: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      RECHAZADA: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      CANCELADA: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle },
    };
    const { color, icon: Icon } = config[estado as keyof typeof config] || config.PENDIENTE;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {estado}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bandeja de Autorizaciones</h1>
        <p className="text-gray-600 mt-1">
          Gestiona las solicitudes de autorización pendientes de aprobación
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Solicitudes</h2>
            {contadorPendientes > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {contadorPendientes}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {['PENDIENTE', 'APROBADA', 'RECHAZADA'].map(estado => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtroEstado === estado
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {solicitudesFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay solicitudes {filtroEstado.toLowerCase()}s</p>
            </div>
          ) : (
            solicitudesFiltradas.map(solicitud => (
              <div
                key={solicitud.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getEstadoBadge(solicitud.estado)}
                      <span className="text-sm text-gray-500">
                        {solicitud.tipoOperacion.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-2">
                      {solicitud.datosRegistro?.descripcion || 'Movimiento de tesorería'}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Monto:</span>
                        <span className="ml-2 font-medium">
                          {formatearMoneda(solicitud.datosRegistro?.monto || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <span className="ml-2 font-medium">
                          {solicitud.datosRegistro?.tipo_movimiento}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Motivo:</span>
                        <p className="mt-1 text-gray-700">{solicitud.motivo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Solicitado por: {solicitud.solicitadoPorNombre || solicitud.solicitadoPor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(solicitud.fechaSolicitud).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {solicitud.aprobadoPor && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <p className="text-gray-600">
                          <strong>{solicitud.estado === 'APROBADA' ? 'Aprobado' : 'Rechazado'} por:</strong> {solicitud.aprobadoPorNombre || solicitud.aprobadoPor}
                        </p>
                        {solicitud.comentarioAprobacion && (
                          <p className="text-gray-600 mt-1">
                            <strong>Comentario:</strong> {solicitud.comentarioAprobacion}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {solicitud.estado === 'PENDIENTE' && (
                    <div className="ml-4">
                      {puedeAprobarRechazar(solicitud.solicitadoPor) ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAprobar(solicitud)}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRechazar(solicitud)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>
                              {solicitud.solicitadoPor === usuario?.id ? (
                                <>No puedes aprobar o rechazar tu propia solicitud.</>
                              ) : (
                                <>
                                  No tienes permisos para aprobar o rechazar solicitudes.
                                  Solo usuarios con acceso al módulo de <strong>Administración</strong> pueden realizar esta acción.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <InputModal
        isOpen={inputModal.isOpen}
        onClose={closeInput}
        onConfirm={inputModal.onConfirm}
        title={inputModal.title}
        message={inputModal.message}
        placeholder={inputModal.placeholder}
        defaultValue={inputModal.defaultValue}
        required={inputModal.required}
        confirmText={inputModal.confirmText}
        cancelText={inputModal.cancelText}
        multiline={inputModal.multiline}
        rows={inputModal.rows}
        loading={inputModal.loading}
      />
    </div>
  );
}

export default BandejaAutorizaciones;
