import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Search, Loader2 } from 'lucide-react';
import { Usuario } from '../../types';
import { usuariosSupabaseService } from '../../services/supabase/usuarios';

interface GestionarUsuariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  empresaNombre: string;
}

export const GestionarUsuariosModal: React.FC<GestionarUsuariosModalProps> = ({
  isOpen,
  onClose,
  empresaId,
  empresaNombre,
}) => {
  const [usuariosAsignados, setUsuariosAsignados] = useState<Usuario[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
    }
  }, [isOpen, empresaId]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const [asignados, disponibles] = await Promise.all([
        usuariosSupabaseService.getUsuariosByEmpresa(empresaId),
        usuariosSupabaseService.getUsuariosDisponiblesParaEmpresa(empresaId),
      ]);
      setUsuariosAsignados(asignados);
      setUsuariosDisponibles(disponibles);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarUsuario = async () => {
    if (!selectedUsuarioId) return;

    try {
      setSaving(true);
      await usuariosSupabaseService.asignarEmpresa(selectedUsuarioId, empresaId);
      setSelectedUsuarioId('');
      await cargarUsuarios();
    } catch (error) {
      console.error('Error asignando usuario:', error);
      alert('Error al asignar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDesasignarUsuario = async (usuarioId: string) => {
    if (!confirm('¿Está seguro de desasignar este usuario de la empresa?')) return;

    try {
      setSaving(true);
      await usuariosSupabaseService.desasignarEmpresa(usuarioId, empresaId);
      await cargarUsuarios();
    } catch (error) {
      console.error('Error desasignando usuario:', error);
      alert('Error al desasignar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleActualizarRol = async (usuarioId: string, nuevoRol: string) => {
    try {
      setSaving(true);
      await usuariosSupabaseService.actualizarRol(usuarioId, nuevoRol);
      await cargarUsuarios();
    } catch (error) {
      console.error('Error actualizando rol:', error);
      alert('Error al actualizar rol');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsuariosAsignados = usuariosAsignados.filter(usuario =>
    usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestionar Usuarios</h2>
            <p className="text-sm text-gray-600 mt-1">{empresaNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Asignar Usuario */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
                  Asignar Usuario
                </h3>
                <div className="flex gap-3">
                  <select
                    value={selectedUsuarioId}
                    onChange={(e) => setSelectedUsuarioId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  >
                    <option value="">Seleccione un usuario...</option>
                    {usuariosDisponibles.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} ({usuario.email}) - {usuario.rol}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAsignarUsuario}
                    disabled={!selectedUsuarioId || saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Asignar'
                    )}
                  </button>
                </div>
              </div>

              {/* Usuarios Asignados */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Usuarios Asignados ({filteredUsuariosAsignados.length})
                </h3>

                {/* Buscador */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Lista de usuarios */}
                <div className="space-y-3">
                  {filteredUsuariosAsignados.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No hay usuarios asignados a esta empresa
                    </p>
                  ) : (
                    filteredUsuariosAsignados.map((usuario) => (
                      <div
                        key={usuario.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {usuario.nombre}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {usuario.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={usuario.rol}
                            onChange={(e) => handleActualizarRol(usuario.id, e.target.value)}
                            disabled={saving}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin_empresa">Admin Empresa</option>
                            <option value="contador">Contador</option>
                            <option value="usuario">Usuario</option>
                          </select>

                          <button
                            onClick={() => handleDesasignarUsuario(usuario.id)}
                            disabled={saving}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Desasignar usuario"
                          >
                            <UserMinus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
