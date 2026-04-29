import React, { useEffect, useMemo, useState } from 'react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';
import { Download, Eye, Loader2, X } from 'lucide-react';

interface EventoAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  usuarioId: string;
  accion: string;
  modulo: string;
  detalles: string;
  ip?: string;
  userAgent?: string;
  tabla?: string;
  registroId?: string;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
  cambios?: unknown;
  metadata?: Record<string, unknown> | null;
  solicitudAprobacionId?: string;
  fuente: 'auditoria' | 'auditoria_cambios';
}

const MODULO_POR_TABLA: Record<string, string> = {
  facturas_venta: 'Ventas',
  facturas_venta_items: 'Ventas',
  facturas_compra: 'Compras',
  facturas_compra_items: 'Compras',
  asientos_contables: 'Contabilidad',
  movimientos_contables: 'Contabilidad',
  movimientos_tesoreria: 'Tesoreria',
  pagos_cliente: 'Finanzas',
  pagos_proveedor: 'Finanzas',
  conciliacion_bancaria: 'Conciliacion',
  configuracion_aprobaciones: 'Administracion',
  clientes: 'Ventas',
  proveedores: 'Compras',
  plan_cuentas: 'Contabilidad',
  cuentas_bancarias: 'Tesoreria',
  empresas: 'Administracion',
};

export default function Auditoria() {
  const { empresaActual } = useSesion();
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [eventoDetalle, setEventoDetalle] = useState<EventoAuditoria | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroModulo, busqueda, filtroUsuario, fechaDesde, fechaHasta]);

  const mapAccion = (accion: string) => {
    const normal = accion?.toString().trim().toUpperCase?.() || accion;
    const map: Record<string, string> = {
      INSERT: 'Crear',
      UPDATE: 'Editar',
      DELETE: 'Eliminar',
      SELECT: 'Ver',
      LOGIN: 'Login',
      CREAR: 'Crear',
      MODIFICAR: 'Editar',
      ELIMINAR: 'Eliminar',
      APROBAR: 'Aprobar',
      RECHAZAR: 'Rechazar',
    };
    return map[normal] || accion;
  };

  const normalizarModulo = (modulo?: string | null, tabla?: string | null) => {
    if (modulo) {
      const limpio = modulo.toString().trim();
      if (!limpio) return 'Sistema';
      return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
    }

    if (tabla && MODULO_POR_TABLA[tabla]) {
      return MODULO_POR_TABLA[tabla];
    }

    return 'Sistema';
  };

  const construirDetalleCambio = (row: any) => {
    const tabla = row.tabla_afectada?.replace(/_/g, ' ') || 'registro';
    const metadataMotivo = row.metadata?.motivo;
    const detalleBase = `${mapAccion(row.tipo_operacion)} sobre ${tabla}`;
    return metadataMotivo ? `${detalleBase}. Motivo: ${metadataMotivo}` : detalleBase;
  };

  const resolverIpCambio = (row: any) => {
    return row.ip_address
      || row.metadata?.ip_address
      || row.metadata?.ip
      || row.metadata?.client_ip
      || '';
  };

  const formatJson = (value: unknown) => {
    if (value === null || value === undefined) return 'Sin datos';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const fetchEventos = async () => {
    if (!empresaActual?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [auditoriaBase, auditoriaCambios] = await Promise.all([
        supabase
          .from('auditoria')
          .select('id, fecha_creacion, usuario_id, accion, modulo, descripcion, ip_address, user_agent, tabla, registro_id, valores_anteriores, valores_nuevos, cambios, metadata')
          .eq('empresa_id', empresaActual.id)
          .order('fecha_creacion', { ascending: false }),
        supabase
          .from('auditoria_cambios')
          .select('id, fecha, usuario_id, tabla_afectada, registro_id, tipo_operacion, datos_anteriores, datos_nuevos, solicitud_aprobacion_id, ip_address, user_agent, metadata')
          .eq('empresa_id', empresaActual.id)
          .order('fecha', { ascending: false }),
      ]);

      if (auditoriaBase.error) throw auditoriaBase.error;
      if (auditoriaCambios.error) throw auditoriaCambios.error;

      const usuarioIds = Array.from(new Set([
        ...(auditoriaBase.data || []).map((row: any) => row.usuario_id),
        ...(auditoriaCambios.data || []).map((row: any) => row.usuario_id),
      ].filter(Boolean)));

      const usuariosMap = new Map<string, string>();
      if (usuarioIds.length > 0) {
        const { data: usuarios, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, nombre, email')
          .in('id', usuarioIds);

        if (usuariosError) throw usuariosError;

        (usuarios || []).forEach((usuario: any) => {
          usuariosMap.set(usuario.id, usuario.nombre || usuario.email || usuario.id);
        });
      }

      const eventosUnificados: EventoAuditoria[] = [
        ...(auditoriaBase.data || []).map((row: any) => ({
          id: `aud-${row.id}`,
          fecha: row.fecha_creacion,
          usuario: usuariosMap.get(row.usuario_id) || row.usuario_id,
          usuarioId: row.usuario_id,
          accion: mapAccion(row.accion),
          modulo: normalizarModulo(row.modulo, row.tabla),
          detalles: row.descripcion || `${mapAccion(row.accion)} en ${row.tabla || 'sistema'}`,
          ip: row.ip_address || '',
          userAgent: row.user_agent || '',
          tabla: row.tabla,
          registroId: row.registro_id,
          datosAnteriores: row.valores_anteriores,
          datosNuevos: row.valores_nuevos,
          cambios: row.cambios,
          metadata: row.metadata,
          fuente: 'auditoria' as const,
        })),
        ...(auditoriaCambios.data || []).map((row: any) => ({
          id: `chg-${row.id}`,
          fecha: row.fecha,
          usuario: usuariosMap.get(row.usuario_id) || row.usuario_id,
          usuarioId: row.usuario_id,
          accion: mapAccion(row.tipo_operacion),
          modulo: normalizarModulo(undefined, row.tabla_afectada),
          detalles: construirDetalleCambio(row),
          ip: resolverIpCambio(row),
          userAgent: row.user_agent || row.metadata?.user_agent || '',
          tabla: row.tabla_afectada,
          registroId: row.registro_id,
          datosAnteriores: row.datos_anteriores,
          datosNuevos: row.datos_nuevos,
          metadata: row.metadata,
          solicitudAprobacionId: row.solicitud_aprobacion_id,
          fuente: 'auditoria_cambios' as const,
        })),
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      setEventos(eventosUnificados);
    } catch (err: any) {
      console.error('Error cargando auditoría:', err);
      setError(err.message || 'No se pudo cargar la auditoría');
      setEventos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, [empresaActual?.id]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      const matchesModulo = filtroModulo === 'todos' || evento.modulo === filtroModulo;
      const matchesBusqueda = !busqueda.trim() || [
        evento.usuario,
        evento.accion,
        evento.modulo,
        evento.detalles,
      ].some((value) => value?.toLowerCase().includes(busqueda.trim().toLowerCase()));
      const matchesUsuario = !filtroUsuario.trim()
        || evento.usuario.toLowerCase().includes(filtroUsuario.trim().toLowerCase())
        || evento.usuarioId.toLowerCase().includes(filtroUsuario.trim().toLowerCase());
      const matchesDesde = !fechaDesde || new Date(evento.fecha) >= new Date(`${fechaDesde}T00:00:00`);
      const matchesHasta = !fechaHasta || new Date(evento.fecha) <= new Date(`${fechaHasta}T23:59:59`);

      return matchesModulo && matchesBusqueda && matchesUsuario && matchesDesde && matchesHasta;
    });
  }, [eventos, filtroModulo, busqueda, filtroUsuario, fechaDesde, fechaHasta]);

  const totalItems = eventosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const eventosPaginados = eventosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resumenPaginacion = totalItems === 0
    ? 'Mostrando 0 a 0 de 0 eventos'
    : `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems} eventos`;

  const modulosDisponibles = useMemo(() => {
    const base = new Set(['Sistema']);
    eventos.forEach((e) => base.add(e.modulo));
    return Array.from(base).sort();
  }, [eventos]);

  const getAccionColor = (accion: string) => {
    const colores: Record<string, string> = {
      Crear: 'bg-green-100 text-green-700',
      Editar: 'bg-blue-100 text-blue-700',
      Eliminar: 'bg-red-100 text-red-700',
      Aprobar: 'bg-emerald-100 text-emerald-700',
      Rechazar: 'bg-rose-100 text-rose-700',
      Enviar: 'bg-purple-100 text-purple-700',
      Ver: 'bg-gray-100 text-gray-700',
      Login: 'bg-gray-100 text-gray-700',
    };
    return colores[accion] || 'bg-gray-100 text-gray-700';
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Detalles', 'Fuente', 'IP'];
      const rows = eventosFiltrados.map((evento) => [
        new Date(evento.fecha).toLocaleString(),
        evento.usuario,
        evento.accion,
        evento.modulo,
        evento.detalles,
        evento.fuente,
        evento.ip || '',
      ]);

      const escapeCell = (value: string) => {
        const text = String(value ?? '');
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCell).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_${empresaActual?.nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const estadisticas = useMemo(() => {
    const usuarios = new Set(eventosFiltrados.map((e) => e.usuarioId).filter(Boolean));
    const modulos = new Set(eventosFiltrados.map((e) => e.modulo).filter(Boolean));
    const conIp = eventosFiltrados.filter((e) => Boolean(e.ip)).length;
    const fuentes = eventosFiltrados.reduce<Record<EventoAuditoria['fuente'], number>>((acc, evento) => {
      acc[evento.fuente] = (acc[evento.fuente] || 0) + 1;
      return acc;
    }, { auditoria: 0, auditoria_cambios: 0 });

    return {
      total: eventosFiltrados.length,
      creaciones: eventosFiltrados.filter((e) => e.accion === 'Crear').length,
      modificaciones: eventosFiltrados.filter((e) => e.accion === 'Editar').length,
      eliminaciones: eventosFiltrados.filter((e) => e.accion === 'Eliminar').length,
      usuarios: usuarios.size,
      modulos: modulos.size,
      conIp,
      sinIp: eventosFiltrados.length - conIp,
      fuentes,
    };
  }, [eventosFiltrados]);

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-gray-600 mt-1">
            Registro consolidado de acciones realizadas por los usuarios y procesos aprobados
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Eventos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{estadisticas.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Creaciones</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{estadisticas.creaciones}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Modificaciones</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{estadisticas.modificaciones}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Eliminaciones</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{estadisticas.eliminaciones}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Usuarios</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{estadisticas.usuarios}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Módulos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{estadisticas.modulos}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Con IP</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{estadisticas.conIp}</div>
          <div className="text-xs text-gray-500 mt-1">Sin IP: {estadisticas.sinIp}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Fuentes</div>
          <div className="text-sm font-semibold text-gray-900 mt-2">
            <div>auditoria: {estadisticas.fuentes.auditoria}</div>
            <div>auditoria_cambios: {estadisticas.fuentes.auditoria_cambios}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por usuario, acción o detalles..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filtrar por usuario..."
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los módulos</option>
                {modulosDisponibles.map((modulo) => (
                  <option key={modulo} value={modulo}>
                    {modulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha y Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando auditoría...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : eventosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No hay eventos de auditoría con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                eventosPaginados.map((evento) => (
                  <tr key={evento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(evento.fecha).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {evento.usuario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccionColor(evento.accion)}`}>
                        {evento.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{evento.modulo}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{evento.detalles}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{evento.fuente}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{evento.ip || 'Sin IP'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setEventoDetalle(evento)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        title="Ver datos de la transacción"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">{resumenPaginacion}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Siguiente
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {eventoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Datos de la transacción</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {eventoDetalle.tabla || 'Sin tabla'} · {eventoDetalle.registroId || 'Sin registro'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventoDetalle(null)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-81px)] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Usuario</div>
                  <div className="font-medium text-gray-900">{eventoDetalle.usuario}</div>
                </div>
                <div>
                  <div className="text-gray-500">Fecha</div>
                  <div className="font-medium text-gray-900">{new Date(eventoDetalle.fecha).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">IP</div>
                  <div className="font-medium text-gray-900">{eventoDetalle.ip || 'Sin IP registrada'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Acción</div>
                  <div className="font-medium text-gray-900">{eventoDetalle.accion}</div>
                </div>
                <div>
                  <div className="text-gray-500">Módulo</div>
                  <div className="font-medium text-gray-900">{eventoDetalle.modulo}</div>
                </div>
                <div>
                  <div className="text-gray-500">Fuente</div>
                  <div className="font-medium text-gray-900">{eventoDetalle.fuente}</div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-gray-500">Detalles</div>
                <div className="font-medium text-gray-900">{eventoDetalle.detalles}</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos anteriores</h3>
                  <pre className="bg-gray-950 text-gray-100 text-xs rounded-lg p-4 overflow-auto max-h-80">
                    {formatJson(eventoDetalle.datosAnteriores)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos nuevos</h3>
                  <pre className="bg-gray-950 text-gray-100 text-xs rounded-lg p-4 overflow-auto max-h-80">
                    {formatJson(eventoDetalle.datosNuevos)}
                  </pre>
                </div>
              </div>

              {(eventoDetalle.cambios || eventoDetalle.metadata || eventoDetalle.userAgent || eventoDetalle.solicitudAprobacionId) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Cambios</h3>
                    <pre className="bg-gray-950 text-gray-100 text-xs rounded-lg p-4 overflow-auto max-h-64">
                      {formatJson(eventoDetalle.cambios)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
                    <pre className="bg-gray-950 text-gray-100 text-xs rounded-lg p-4 overflow-auto max-h-64">
                      {formatJson({
                        ...(eventoDetalle.metadata || {}),
                        solicitud_aprobacion_id: eventoDetalle.solicitudAprobacionId,
                        user_agent: eventoDetalle.userAgent,
                      })}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
