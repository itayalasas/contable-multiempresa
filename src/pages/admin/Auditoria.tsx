import React, { useEffect, useMemo, useState } from 'react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';
import { Download, Loader2 } from 'lucide-react';

interface EventoAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  usuarioId: string;
  accion: string;
  modulo: string;
  detalles: string;
  ip?: string;
}

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
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroModulo, busqueda, filtroUsuario, fechaDesde, fechaHasta]);

  const mapAccion = (accion: string) => {
    const normal = accion?.toUpperCase?.() || accion;
    const map: Record<string, string> = {
      INSERT: 'Crear',
      UPDATE: 'Editar',
      DELETE: 'Eliminar',
      SELECT: 'Ver',
      LOGIN: 'Login'
    };
    return map[normal] || accion;
  };

  const fetchEventos = async (options?: { exportAll?: boolean }) => {
    if (!empresaActual?.id) return;

    setLoading(!options?.exportAll);
    setError(null);

    try {
      let usuarioIds: string[] | null = null;
      if (filtroUsuario.trim()) {
        const { data: usuarios, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, nombre, email')
          .or(`nombre.ilike.%${filtroUsuario.trim()}%,email.ilike.%${filtroUsuario.trim()}%`);

        if (usuariosError) throw usuariosError;
        usuarioIds = (usuarios || [])
          .filter(u => u.nombre || u.email)
          .map(u => u.id);

        if (usuarioIds.length === 0) {
          setEventos([]);
          setTotalItems(0);
          return;
        }
      }

      let query = supabase
        .from('auditoria')
        .select('id, fecha_creacion, usuario_id, accion, modulo, descripcion, ip_address, usuarios:usuarios(nombre, email)', { count: 'exact' })
        .eq('empresa_id', empresaActual.id);

      if (filtroModulo !== 'todos') {
        query = query.eq('modulo', filtroModulo);
      }

      if (fechaDesde) {
        query = query.gte('fecha_creacion', `${fechaDesde}T00:00:00`);
      }

      if (fechaHasta) {
        query = query.lte('fecha_creacion', `${fechaHasta}T23:59:59`);
      }

      if (busqueda.trim()) {
        const term = busqueda.trim();
        query = query.or(
          `accion.ilike.%${term}%,modulo.ilike.%${term}%,descripcion.ilike.%${term}%,tabla.ilike.%${term}%,registro_id.ilike.%${term}%`
        );
      }

      if (usuarioIds) {
        query = query.in('usuario_id', usuarioIds);
      }

      query = query.order('fecha_creacion', { ascending: false });

      if (!options?.exportAll) {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        fecha: row.fecha_creacion,
        usuario: row.usuarios?.nombre || row.usuario_id,
        usuarioId: row.usuario_id,
        accion: mapAccion(row.accion),
        modulo: row.modulo || 'Sistema',
        detalles: row.descripcion || '',
        ip: row.ip_address || ''
      }));

      if (options?.exportAll) {
        return { eventos: mapped, total: count || mapped.length };
      }

      setEventos(mapped);
      setTotalItems(count || 0);
    } catch (err: any) {
      console.error('Error cargando auditoría:', err);
      setError(err.message || 'No se pudo cargar la auditoría');
      setEventos([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, [empresaActual?.id, filtroModulo, busqueda, filtroUsuario, fechaDesde, fechaHasta, currentPage, itemsPerPage]);

  const eventosFiltrados = eventos;

  const resumenPaginacion = totalItems === 0
    ? 'Mostrando 0 a 0 de 0 eventos'
    : `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems} eventos`;

  const modulosDisponibles = useMemo(() => {
    const base = new Set(['Sistema']);
    eventos.forEach(e => base.add(e.modulo));
    return Array.from(base).sort();
  }, [eventos]);

  const getAccionColor = (accion: string) => {
    const colores: Record<string, string> = {
      Crear: 'bg-green-100 text-green-700',
      Editar: 'bg-blue-100 text-blue-700',
      Eliminar: 'bg-red-100 text-red-700',
      Enviar: 'bg-purple-100 text-purple-700',
      Ver: 'bg-gray-100 text-gray-700',
      Login: 'bg-gray-100 text-gray-700',
    };
    return colores[accion] || 'bg-gray-100 text-gray-700';
  };

  const handleExportCsv = async () => {
    if (!empresaActual?.id) return;

    setExporting(true);
    try {
      const resultado = await fetchEventos({ exportAll: true });
      const exportEventos = resultado?.eventos || [];

      const headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Detalles', 'IP'];
      const rows = exportEventos.map(evento => [
        new Date(evento.fecha).toLocaleString(),
        evento.usuario,
        evento.accion,
        evento.modulo,
        evento.detalles,
        evento.ip || ''
      ]);

      const escapeCell = (value: string) => {
        const text = String(value ?? '');
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const csvContent = [headers, ...rows]
        .map(row => row.map(escapeCell).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_${empresaActual.nombre}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando CSV:', err);
    } finally {
      setExporting(false);
    }
  };

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
            Registro completo de acciones realizadas por los usuarios
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Eventos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Creaciones</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {eventos.filter((e) => e.accion === 'Crear').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Modificaciones</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {eventos.filter((e) => e.accion === 'Editar').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Eliminaciones</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {eventos.filter((e) => e.accion === 'Eliminar').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Inicios de Sesión</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {eventos.filter((e) => e.accion === 'Login').length}
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
                {modulosDisponibles.map(modulo => (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Módulo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Detalles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando auditoría...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay eventos de auditoría con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                eventosFiltrados.map((evento) => (
                  <tr key={evento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(evento.fecha).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {evento.usuario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccionColor(
                          evento.accion
                        )}`}
                      >
                        {evento.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {evento.modulo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{evento.detalles}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {evento.ip}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">
            {resumenPaginacion}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
              className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10 / pág</option>
              <option value={20}>20 / pág</option>
              <option value={50}>50 / pág</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-yellow-600 mt-0.5"
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
            <h3 className="text-sm font-medium text-yellow-800">Información de Retención</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Los registros de auditoría se conservan por 7 años según requisitos legales. Los
              datos no pueden ser modificados ni eliminados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
