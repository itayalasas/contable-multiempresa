import React, { useState } from 'react';
import { useSesion } from '../../context/SesionContext';

interface EventoAuditoria {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalles: string;
  ip?: string;
}

export default function Auditoria() {
  const { empresaActual } = useSesion();
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const [eventos] = useState<EventoAuditoria[]>([
    {
      id: '1',
      fecha: new Date().toISOString(),
      usuario: 'Pedro Ayala',
      accion: 'Crear',
      modulo: 'Facturas',
      detalles: 'Creó factura A-00000123',
      ip: '192.168.1.100',
    },
    {
      id: '2',
      fecha: new Date(Date.now() - 3600000).toISOString(),
      usuario: 'Pedro Ayala',
      accion: 'Editar',
      modulo: 'Clientes',
      detalles: 'Modificó cliente Juan Pérez',
      ip: '192.168.1.100',
    },
    {
      id: '3',
      fecha: new Date(Date.now() - 7200000).toISOString(),
      usuario: 'Pedro Ayala',
      accion: 'Eliminar',
      modulo: 'Asientos',
      detalles: 'Eliminó asiento ASI-000045',
      ip: '192.168.1.100',
    },
    {
      id: '4',
      fecha: new Date(Date.now() - 10800000).toISOString(),
      usuario: 'Pedro Ayala',
      accion: 'Enviar',
      modulo: 'Facturas',
      detalles: 'Envió factura A-00000122 a DGI',
      ip: '192.168.1.100',
    },
    {
      id: '5',
      fecha: new Date(Date.now() - 14400000).toISOString(),
      usuario: 'Pedro Ayala',
      accion: 'Login',
      modulo: 'Sistema',
      detalles: 'Inició sesión en el sistema',
      ip: '192.168.1.100',
    },
  ]);

  const eventosFiltrados = eventos.filter((evento) => {
    const cumpleFiltro = filtroModulo === 'todos' || evento.modulo === filtroModulo;
    const cumpleBusqueda =
      evento.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.detalles.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const getAccionColor = (accion: string) => {
    const colores: Record<string, string> = {
      Crear: 'bg-green-100 text-green-700',
      Editar: 'bg-blue-100 text-blue-700',
      Eliminar: 'bg-red-100 text-red-700',
      Enviar: 'bg-purple-100 text-purple-700',
      Login: 'bg-gray-100 text-gray-700',
    };
    return colores[accion] || 'bg-gray-100 text-gray-700';
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
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Exportar Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Eventos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{eventos.length}</div>
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
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los módulos</option>
                <option value="Facturas">Facturas</option>
                <option value="Clientes">Clientes</option>
                <option value="Asientos">Asientos</option>
                <option value="Sistema">Sistema</option>
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
              {eventosFiltrados.map((evento) => (
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
              ))}
            </tbody>
          </table>
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
