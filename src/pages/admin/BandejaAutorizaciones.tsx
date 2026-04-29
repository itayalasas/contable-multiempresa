import React, { useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, User, Calendar, Eye, X } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useAutorizaciones } from '../../hooks/useAutorizaciones';
import { useModals } from '../../hooks/useModals';
import { usePermissions } from '../../hooks/usePermissions';
import { InputModal } from '../../components/common/InputModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { SolicitudAutorizacion } from '../../services/supabase/autorizaciones';

type DiffEntry = {
  campo: string;
  anterior: unknown;
  nuevo: unknown;
};

const CAMPOS_OCULTOS = new Set([
  'id',
  'empresa_id',
  'cliente_id',
  'proveedor_id',
  'pais_id',
  'factura_id',
  'nota_credito_id',
  'asiento_id',
  'cuenta_id',
  'tercero_id',
  'cuenta_bancaria_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'updated_by_user',
  'updated_by_id',
  'creado_por',
  'fecha_creacion',
  'fecha_modificacion',
  'eliminado',
  'eliminado_por',
  'fecha_eliminacion',
  'motivo_eliminacion',
  'ocultar_en_listados',
]);

const CAMPOS_PRIORITARIOS = [
  'numero',
  'numero_asiento',
  'numero_factura',
  'numero_nota',
  'serie',
  'fecha',
  'fecha_emision',
  'fecha_vencimiento',
  'descripcion',
  'concepto',
  'referencia',
  'estado',
  'tipo_documento',
  'beneficiario',
  'cliente',
  'proveedor',
  'subtotal',
  'total_iva',
  'total',
  'monto',
];

const CAMPOS_RELEVANTES_PARA_CAMBIOS = new Set([
  'fecha',
  'fecha_emision',
  'fecha_vencimiento',
  'descripcion',
  'concepto',
  'referencia',
  'estado',
  'tipo_documento',
  'beneficiario',
  'subtotal',
  'total_iva',
  'total',
  'monto',
  'movimientos',
  'items',
]);

const esObjetoPlano = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const serializarComparable = (value: unknown) => JSON.stringify(value ?? null);

const formatearEtiquetaCampo = (campo: string) =>
  campo
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letra => letra.toUpperCase());

const formatearValor = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'Sin dato';
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'number') {
    return value.toLocaleString('es-UY');
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
};

const obtenerCamposVisibles = (data: unknown) => {
  if (!esObjetoPlano(data)) {
    return [];
  }

  return Object.entries(data).filter(([campo, valor]) => !CAMPOS_OCULTOS.has(campo) && valor !== undefined);
};

const resumirColeccion = (campo: string, value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }

  if (campo === 'movimientos') {
    const debe = value.reduce((acc, item: any) => acc + Number(item?.debito || 0), 0);
    const haber = value.reduce((acc, item: any) => acc + Number(item?.credito || 0), 0);
    return `${value.length} movimientos, debe ${debe.toLocaleString('es-UY')}, haber ${haber.toLocaleString('es-UY')}`;
  }

  if (campo === 'items') {
    return `${value.length} items`;
  }

  return `${value.length} registros`;
};

const obtenerCambios = (original: unknown, modificado: unknown): DiffEntry[] => {
  if (!esObjetoPlano(modificado)) {
    return [];
  }

  const originalPlano = esObjetoPlano(original) ? original : {};
  const claves = Object.keys(modificado);

  return claves
    .filter(campo => !CAMPOS_OCULTOS.has(campo))
    .filter(campo => CAMPOS_RELEVANTES_PARA_CAMBIOS.has(campo))
    .filter(campo => serializarComparable(originalPlano[campo]) !== serializarComparable(modificado[campo]))
    .map(campo => ({
      campo,
      anterior: originalPlano[campo],
      nuevo: modificado[campo],
    }));
};

const resumirImpactoSolicitud = (solicitud: SolicitudAutorizacion, cambios: DiffEntry[]) => {
  const mensajes: string[] = [];

  if (solicitud.tipoOperacion.startsWith('eliminar_')) {
    if (solicitud.tablaAfectada === 'asientos_contables') {
      mensajes.push('El asiento quedara anulado y dejara de mostrarse en los listados operativos.');
    } else {
      mensajes.push('El registro quedara eliminado logicamente y seguira disponible en auditoria.');
    }

    return mensajes;
  }

  const cambiosTexto = cambios
    .filter(cambio => cambio.campo !== 'movimientos' && cambio.campo !== 'items')
    .map(cambio => formatearEtiquetaCampo(cambio.campo).toLowerCase());

  if (cambiosTexto.length > 0) {
    mensajes.push(`Se actualizara: ${cambiosTexto.join(', ')}.`);
  }

  if (cambios.some(cambio => cambio.campo === 'movimientos')) {
    mensajes.push('Se reemplazaran los movimientos contables del asiento.');
  }

  if (cambios.some(cambio => cambio.campo === 'items')) {
    mensajes.push('Se actualizara el detalle de lineas o items del documento.');
  }

  if (mensajes.length === 0) {
    mensajes.push('No se detectaron cambios de negocio claros para resumir en esta vista.');
  }

  return mensajes;
};

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

  const {
    showSuccess,
    showError,
    showInput,
    inputModal,
    closeInput,
    notificationModal,
    closeNotification,
  } = useModals();
  const [filtroEstado, setFiltroEstado] = useState<string>('PENDIENTE');
  const [solicitudDetalle, setSolicitudDetalle] = useState<SolicitudAutorizacion | null>(null);

  const solicitudesFiltradas = filtroEstado
    ? solicitudes.filter(s => s.estado === filtroEstado)
    : solicitudes;

  const cambiosSolicitudDetalle = useMemo(
    () => obtenerCambios(solicitudDetalle?.datosRegistro, solicitudDetalle?.datosModificados),
    [solicitudDetalle]
  );

  const resumenImpactoDetalle = useMemo(
    () => solicitudDetalle ? resumirImpactoSolicitud(solicitudDetalle, cambiosSolicitudDetalle) : [],
    [solicitudDetalle, cambiosSolicitudDetalle]
  );

  const abrirInputEncima = (callback: () => void) => {
    if (solicitudDetalle) {
      setSolicitudDetalle(null);
      window.setTimeout(callback, 60);
      return;
    }

    callback();
  };

  const puedeAprobarRechazar = (solicitudUsuarioId?: string) => {
    if (!usuario) return false;

    const tieneAccesoAdministracion = hasModuleAccess('administracion');
    if (!tieneAccesoAdministracion) return false;
    if (solicitudUsuarioId && solicitudUsuarioId === usuario.id) return false;

    return true;
  };

  const handleAprobar = async (solicitud: SolicitudAutorizacion) => {
    if (solicitud.solicitadoPor === usuario?.id) {
      showError('Error', 'No puedes aprobar tu propia solicitud');
      return;
    }

    if (!puedeAprobarRechazar(solicitud.solicitadoPor)) {
      showError(
        'Permisos insuficientes',
        'Solo los usuarios con acceso al modulo de Administracion pueden aprobar solicitudes.'
      );
      return;
    }

    abrirInputEncima(() => {
      showInput({
        title: 'Comentario de aprobacion',
        message: 'Puedes agregar un comentario sobre esta aprobacion (opcional):',
        placeholder: 'Ej: Aprobado segun procedimiento establecido',
        required: false,
        multiline: true,
        rows: 2,
        confirmText: 'Aprobar',
        cancelText: 'Cancelar',
        onConfirm: async (comentario: string) => {
          try {
            await aprobarSolicitud(solicitud.id, usuario?.id || '', comentario || undefined);
            showSuccess('Solicitud aprobada', 'La accion aprobada fue ejecutada exitosamente');
            setSolicitudDetalle(null);
          } catch (error: any) {
            showError('Error al aprobar', error.message || 'No se pudo aprobar la solicitud');
          }
        }
      });
    });
  };

  const handleRechazar = async (solicitud: SolicitudAutorizacion) => {
    if (solicitud.solicitadoPor === usuario?.id) {
      showError('Error', 'No puedes rechazar tu propia solicitud');
      return;
    }

    if (!puedeAprobarRechazar(solicitud.solicitadoPor)) {
      showError(
        'Permisos insuficientes',
        'Solo los usuarios con acceso al modulo de Administracion pueden rechazar solicitudes.'
      );
      return;
    }

    abrirInputEncima(() => {
      showInput({
        title: 'Motivo del rechazo',
        message: 'Por favor, indica el motivo del rechazo:',
        placeholder: 'Ej: No se justifica la modificacion, falta informacion',
        required: true,
        multiline: true,
        rows: 3,
        confirmText: 'Rechazar',
        cancelText: 'Cancelar',
        onConfirm: async (comentario: string) => {
          try {
            await rechazarSolicitud(solicitud.id, usuario?.id || '', comentario);
            showSuccess('Solicitud rechazada', 'La solicitud fue rechazada');
            setSolicitudDetalle(null);
          } catch (error: any) {
            showError('Error al rechazar', error.message || 'No se pudo rechazar la solicitud');
          }
        }
      });
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

  const obtenerTipoTransaccion = (solicitud: SolicitudAutorizacion) => {
    const { tablaAfectada, datosRegistro } = solicitud;

    if (tablaAfectada === 'movimientos_tesoreria' || tablaAfectada === 'transferencias') {
      return datosRegistro?.tipo_movimiento || datosRegistro?.tipo || 'Movimiento';
    }

    if (tablaAfectada === 'asientos_contables') return 'Asiento contable';
    if (tablaAfectada === 'facturas_venta') return 'Factura de venta';
    if (tablaAfectada === 'notas_credito') return 'Nota de credito';
    if (tablaAfectada === 'facturas_compra') return 'Factura de compra';
    if (tablaAfectada === 'pagos_proveedor') return 'Pago a proveedor';
    if (tablaAfectada === 'cobros_cliente' || tablaAfectada === 'pagos_cliente') return 'Cobro de cliente';

    return tablaAfectada?.replace(/_/g, ' ') || 'Transaccion';
  };

  const obtenerResumenOperacion = (tipoOperacion: string) => {
    if (tipoOperacion.startsWith('modificar_')) return 'Modificacion';
    if (tipoOperacion.startsWith('eliminar_')) return 'Eliminacion';
    if (tipoOperacion.startsWith('crear_')) return 'Creacion';
    return 'Operacion';
  };

  const obtenerTituloSolicitud = (solicitud: SolicitudAutorizacion) => {
    const datos = solicitud.datosModificados || solicitud.datosRegistro || {};

    if (solicitud.tablaAfectada === 'asientos_contables') {
      return datos?.descripcion || datos?.concepto || datos?.numero_asiento || `Asiento ${solicitud.registroId.slice(0, 8)}`;
    }

    if (solicitud.tablaAfectada === 'facturas_venta' || solicitud.tablaAfectada === 'facturas_compra') {
      const serie = datos?.serie || datos?.serie_factura;
      const numero = datos?.numero_factura || datos?.numero;
      return [serie, numero].filter(Boolean).join('-') || datos?.descripcion || 'Factura';
    }

    if (solicitud.tablaAfectada === 'notas_credito') {
      const serie = datos?.serie || datos?.serie_nota;
      const numero = datos?.numero_nota || datos?.numero;
      return [serie, numero].filter(Boolean).join('-') || datos?.descripcion || 'Nota de credito';
    }

    return datos?.descripcion || datos?.concepto || datos?.referencia || datos?.numero_documento || solicitud.registroId;
  };

  const obtenerIdentificadorBusqueda = (solicitud: SolicitudAutorizacion) => {
    const datos = solicitud.datosRegistro || {};
    const datosNuevos = solicitud.datosModificados || {};
    const origen = { ...datos, ...datosNuevos };

    if (solicitud.tablaAfectada === 'asientos_contables') {
      return origen?.numero || origen?.numero_asiento || `ID ${solicitud.registroId.slice(0, 8)}`;
    }

    if (solicitud.tablaAfectada === 'facturas_venta' || solicitud.tablaAfectada === 'facturas_compra') {
      const serie = origen?.serie || origen?.serie_factura;
      const numero = origen?.numero_factura || origen?.numero;
      return [serie, numero].filter(Boolean).join('-') || `ID ${solicitud.registroId.slice(0, 8)}`;
    }

    if (solicitud.tablaAfectada === 'notas_credito') {
      const serie = origen?.serie || origen?.serie_nota;
      const numero = origen?.numero_nota || origen?.numero;
      return [serie, numero].filter(Boolean).join('-') || `ID ${solicitud.registroId.slice(0, 8)}`;
    }

    return origen?.referencia || origen?.numero_documento || `ID ${solicitud.registroId.slice(0, 8)}`;
  };

  const obtenerCamposNegocio = (data: unknown) => {
    const visibles = obtenerCamposVisibles(data);
    const ordenados = visibles.sort(([a], [b]) => {
      const indexA = CAMPOS_PRIORITARIOS.indexOf(a);
      const indexB = CAMPOS_PRIORITARIOS.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return ordenados.filter(([campo]) => CAMPOS_PRIORITARIOS.includes(campo) || campo === 'movimientos' || campo === 'items');
  };

  const obtenerMontoSolicitud = (solicitud: SolicitudAutorizacion) => {
    const datos = solicitud.datosModificados || solicitud.datosRegistro || {};

    return Number(
      datos?.monto
      ?? datos?.total
      ?? datos?.importe
      ?? datos?.debe
      ?? datos?.haber
      ?? 0
    );
  };

  const renderValorDetalle = (value: unknown) => {
    if (Array.isArray(value)) {
      const resumen = resumirColeccion('items', value);
      return <p className="mt-1 text-sm text-gray-900">{resumen || `${value.length} registros`}</p>;
    }

    if (typeof value === 'object' && value !== null) {
      return <p className="mt-1 text-sm text-gray-900">Revisar detalle especifico de estructura</p>;
    }

    return <p className="mt-1 text-sm text-gray-900">{formatearValor(value)}</p>;
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
          Gestiona las solicitudes de autorizacion pendientes de aprobacion
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
            solicitudesFiltradas.map(solicitud => {
              const cambiosDetectados = obtenerCambios(solicitud.datosRegistro, solicitud.datosModificados);

              return (
                <div
                  key={solicitud.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        {getEstadoBadge(solicitud.estado)}
                        <span className="text-sm text-gray-500">
                          {solicitud.tipoOperacion.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {obtenerResumenOperacion(solicitud.tipoOperacion)}
                        </span>
                      </div>

                      <h3 className="font-medium text-gray-900 mb-2">
                        {obtenerTituloSolicitud(solicitud)}
                      </h3>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Monto:</span>
                          <span className="ml-2 font-medium">
                            {formatearMoneda(obtenerMontoSolicitud(solicitud))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-2 font-medium">
                            {obtenerTipoTransaccion(solicitud)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Motivo:</span>
                          <p className="mt-1 text-gray-700">{solicitud.motivo}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Validacion:</span>
                          <p className="mt-1 text-gray-700">
                            {cambiosDetectados.length > 0
                              ? cambiosDetectados.map(cambio => formatearEtiquetaCampo(cambio.campo)).join(', ')
                              : solicitud.datosModificados
                                ? 'La solicitud trae cambios cargados; revisa el detalle para ver estructura completa.'
                                : 'La solicitud no trae campos modificados y debe validarse contra el registro actual.'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Identificador para buscar:</span>
                          <p className="mt-1 font-medium text-gray-900">{obtenerIdentificadorBusqueda(solicitud)}</p>
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

                    <div className="ml-4">
                      {solicitud.estado === 'PENDIENTE' ? (
                        puedeAprobarRechazar(solicitud.solicitadoPor) ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSolicitudDetalle(solicitud)}
                              className="flex items-center gap-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalle
                            </button>
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
                          <div className="space-y-2">
                            <button
                              onClick={() => setSolicitudDetalle(solicitud)}
                              className="flex items-center gap-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalle
                            </button>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>
                                  {solicitud.solicitadoPor === usuario?.id ? (
                                    <>No puedes aprobar o rechazar tu propia solicitud.</>
                                  ) : (
                                    <>No tienes permisos para aprobar o rechazar solicitudes.</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => setSolicitudDetalle(solicitud)}
                          className="flex items-center gap-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.autoClose}
      />

      {solicitudDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Detalle de autorizacion</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Revisa los datos actuales y los cambios propuestos antes de aprobar o rechazar.
                </p>
              </div>
              <button
                onClick={() => setSolicitudDetalle(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Solicitud</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Registro</p>
                      <p className="font-medium text-gray-900">{obtenerTituloSolicitud(solicitudDetalle)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Identificador para buscar</p>
                      <p className="font-medium text-gray-900">{obtenerIdentificadorBusqueda(solicitudDetalle)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Accion</p>
                      <p className="font-medium text-gray-900">{obtenerResumenOperacion(solicitudDetalle.tipoOperacion)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tipo</p>
                      <p className="font-medium text-gray-900">{obtenerTipoTransaccion(solicitudDetalle)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Monto</p>
                      <p className="font-medium text-gray-900">{formatearMoneda(obtenerMontoSolicitud(solicitudDetalle))}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Solicitado por</p>
                      <p className="font-medium text-gray-900">{solicitudDetalle.solicitadoPorNombre || solicitudDetalle.solicitadoPor}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-medium text-gray-900">{new Date(solicitudDetalle.fechaSolicitud).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Motivo</p>
                      <p className="font-medium text-gray-900">{solicitudDetalle.motivo}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Que pasara al aprobar</h3>
                  <div className="mt-4 rounded-lg bg-blue-50 p-4">
                    <div className="space-y-2">
                      {resumenImpactoDetalle.map((mensaje, index) => (
                        <p key={`${mensaje}-${index}`} className="text-sm text-blue-900">
                          {mensaje}
                        </p>
                      ))}
                    </div>
                  </div>

                  {cambiosSolicitudDetalle.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {cambiosSolicitudDetalle.map(cambio => (
                        <div key={cambio.campo} className="rounded-lg border border-gray-200 p-4">
                          <p className="text-sm font-semibold text-gray-900">{formatearEtiquetaCampo(cambio.campo)}</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg bg-red-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Anterior</p>
                              {Array.isArray(cambio.anterior)
                                ? <p className="mt-1 text-sm text-gray-900">{resumirColeccion(cambio.campo, cambio.anterior) || 'Coleccion'}</p>
                                : renderValorDetalle(cambio.anterior)}
                            </div>
                            <div className="rounded-lg bg-green-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Nuevo</p>
                              {Array.isArray(cambio.nuevo)
                                ? <p className="mt-1 text-sm text-gray-900">{resumirColeccion(cambio.campo, cambio.nuevo) || 'Coleccion'}</p>
                                : renderValorDetalle(cambio.nuevo)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                      {solicitudDetalle.datosModificados
                        ? 'La solicitud no trae cambios de negocio suficientemente claros para mostrarlos en comparacion.'
                        : 'Esta solicitud no trae datos nuevos. La validacion se hace sobre el registro actual y el motivo de la solicitud.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Datos actuales del registro</h3>
                  <div className="mt-4 space-y-4">
                    {obtenerCamposNegocio(solicitudDetalle.datosRegistro).length > 0 ? (
                      obtenerCamposNegocio(solicitudDetalle.datosRegistro).map(([campo, valor]) => (
                        <div key={campo} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {formatearEtiquetaCampo(campo)}
                          </p>
                          {Array.isArray(valor)
                            ? <p className="mt-1 text-sm text-gray-900">{resumirColeccion(campo, valor) || 'Coleccion'}</p>
                            : renderValorDetalle(valor)}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                        No hay datos originales visibles para esta solicitud.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Datos propuestos en la solicitud</h3>
                  <div className="mt-4 space-y-4">
                    {obtenerCamposNegocio(solicitudDetalle.datosModificados).length > 0 ? (
                      obtenerCamposNegocio(solicitudDetalle.datosModificados).map(([campo, valor]) => (
                        <div key={campo} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {formatearEtiquetaCampo(campo)}
                          </p>
                          {Array.isArray(valor)
                            ? <p className="mt-1 text-sm text-gray-900">{resumirColeccion(campo, valor) || 'Coleccion'}</p>
                            : renderValorDetalle(valor)}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                        Esta solicitud no trae un bloque de datos nuevos. Si es una eliminacion, la validacion se hace contra los datos actuales.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setSolicitudDetalle(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              {solicitudDetalle.estado === 'PENDIENTE' && puedeAprobarRechazar(solicitudDetalle.solicitadoPor) && (
                <>
                  <button
                    onClick={() => handleRechazar(solicitudDetalle)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleAprobar(solicitudDetalle)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Aprobar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BandejaAutorizaciones;
