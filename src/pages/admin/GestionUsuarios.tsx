import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Mail,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Usuario } from '../../types';
import { usuariosSupabaseService } from '../../services/supabase/usuarios';
import { provisionarUsuarioSistema } from '../../services/supabase/provisionUsuarios';
import { useAuth } from '../../context/AuthContext';
import { useSesion } from '../../context/SesionContext';

type RolUsuario = Usuario['rol'];

const PERMISOS_DISPONIBLES = [
  { id: 'contabilidad:asientos:crear', nombre: 'Crear Asientos', categoria: 'Contabilidad' },
  { id: 'contabilidad:asientos:editar', nombre: 'Editar Asientos', categoria: 'Contabilidad' },
  { id: 'contabilidad:asientos:ver', nombre: 'Ver Asientos', categoria: 'Contabilidad' },
  { id: 'ventas:facturas:crear', nombre: 'Crear Facturas Venta', categoria: 'Ventas' },
  { id: 'ventas:facturas:editar', nombre: 'Editar Facturas Venta', categoria: 'Ventas' },
  { id: 'compras:facturas:crear', nombre: 'Crear Facturas Compra', categoria: 'Compras' },
  { id: 'tesoreria:movimientos:crear', nombre: 'Crear Movimientos Tesoreria', categoria: 'Tesoreria' },
  { id: 'tesoreria:autorizar', nombre: 'Autorizar Cambios', categoria: 'Tesoreria' },
  { id: 'reportes:ver', nombre: 'Ver Reportes', categoria: 'Reportes' },
  { id: 'usuarios:gestionar', nombre: 'Gestionar Usuarios', categoria: 'Administracion' },
  { id: 'empresas:gestionar', nombre: 'Gestionar Empresas', categoria: 'Administracion' },
];

const ROLES_PREDEFINIDOS: Array<{ id: RolUsuario; nombre: string; permisos: string[] }> = [
  { id: 'usuario', nombre: 'Usuario', permisos: ['reportes:ver'] },
  { id: 'contador', nombre: 'Contador', permisos: ['contabilidad:asientos:crear', 'contabilidad:asientos:editar', 'contabilidad:asientos:ver', 'reportes:ver'] },
  { id: 'supervisor', nombre: 'Supervisor', permisos: ['tesoreria:autorizar', 'reportes:ver'] },
  { id: 'admin', nombre: 'Administrador', permisos: PERMISOS_DISPONIBLES.map((permiso) => permiso.id) },
  { id: 'admin_empresa', nombre: 'Admin Empresa', permisos: PERMISOS_DISPONIBLES.map((permiso) => permiso.id) },
  { id: 'super_admin', nombre: 'Super Admin', permisos: ['admin:all'] },
];

const emptyForm = {
  nombre: '',
  email: '',
  rol: 'usuario' as RolUsuario,
  empresasAsignadas: [] as string[],
  permisos: ['reportes:ver'],
};

export const GestionUsuarios: React.FC = () => {
  const { usuario: usuarioActual } = useAuth();
  const { empresaActual, empresasDisponibles } = useSesion();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'invite'>('create');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const puedeVerTodos = usuarioActual?.rol === 'super_admin' || usuarioActual?.rol === 'admin_empresa';

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = puedeVerTodos || !empresaActual
        ? await usuariosSupabaseService.getAllUsuarios()
        : await usuariosSupabaseService.getUsuariosByEmpresa(empresaActual.id);

      setUsuarios(data);
    } catch (loadError) {
      console.error('Error cargando usuarios:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [empresaActual?.id, puedeVerTodos]);

  const filteredUsuarios = useMemo(() => usuarios.filter((usuario) => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      || usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = !selectedRol || usuario.rol === selectedRol;
    return matchesSearch && matchesRol;
  }), [usuarios, searchTerm, selectedRol]);

  const getRolPermissions = (rolId: RolUsuario) => (
    ROLES_PREDEFINIDOS.find((rol) => rol.id === rolId)?.permisos || []
  );

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      ...emptyForm,
      empresasAsignadas: empresaActual?.id ? [empresaActual.id] : [],
    });
  };

  const openModal = (type: 'create' | 'edit' | 'invite', user?: Usuario) => {
    setModalType(type);

    if (user) {
      setSelectedUser(user);
      setFormData({
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresasAsignadas: user.empresasAsignadas || [],
        permisos: user.permisos || getRolPermissions(user.rol),
      });
    } else {
      resetForm();
    }

    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (modalType === 'edit' && selectedUser) {
        await usuariosSupabaseService.updateUsuario(selectedUser.id, {
          nombre: formData.nombre,
          rol: formData.rol,
          permisos: formData.permisos,
          empresasAsignadas: formData.empresasAsignadas,
          activo: true,
          metadata: {
            ...(selectedUser.metadata || {}),
            gestion_origen: 'admin_ui',
          },
        });
      } else {
        await provisionarUsuarioSistema({
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          empresasAsignadas: formData.empresasAsignadas,
          permisos: formData.permisos,
          paisId: usuarioActual?.paisId,
          solicitadoPorId: usuarioActual?.id,
          modo: modalType,
          metadata: {
            gestion_origen: modalType === 'invite' ? 'invitacion_admin_ui' : 'creacion_admin_ui',
          },
        });
      }

      await cargarDatos();
      setShowModal(false);
      resetForm();
    } catch (saveError) {
      console.error('Error guardando usuario:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (user: Usuario) => {
    try {
      await usuariosSupabaseService.updateUsuario(user.id, { activo: !user.activo });
      await cargarDatos();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo actualizar el usuario');
    }
  };

  const getRolColor = (rol: RolUsuario) => ({
    super_admin: 'bg-fuchsia-100 text-fuchsia-800',
    admin_empresa: 'bg-red-100 text-red-800',
    admin: 'bg-red-100 text-red-800',
    supervisor: 'bg-amber-100 text-amber-800',
    contador: 'bg-blue-100 text-blue-800',
    usuario: 'bg-green-100 text-green-800',
  }[rol] || 'bg-gray-100 text-gray-800');

  const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(' ');
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  };

  const toggleEmpresa = (empresaId: string) => {
    setFormData((prev) => ({
      ...prev,
      empresasAsignadas: prev.empresasAsignadas.includes(empresaId)
        ? prev.empresasAsignadas.filter((id) => id !== empresaId)
        : [...prev.empresasAsignadas, empresaId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra usuarios, roles y acceso por empresa desde Supabase.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openModal('invite')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Invitar Usuario
          </button>
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Total Usuarios</p>
            <p className="text-lg font-semibold text-gray-900">{usuarios.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <p className="text-sm text-gray-600">Administradores</p>
            <p className="text-lg font-semibold text-gray-900">{usuarios.filter((u) => ['admin', 'admin_empresa', 'super_admin'].includes(u.rol)).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">Usuarios Activos</p>
            <p className="text-lg font-semibold text-gray-900">{usuarios.filter((u) => u.activo).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-purple-600" />
          <div>
            <p className="text-sm text-gray-600">Invitaciones Manuales</p>
            <p className="text-lg font-semibold text-gray-900">{usuarios.filter((u) => u.metadata?.gestion_origen === 'invitacion_manual').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedRol}
            onChange={(e) => setSelectedRol(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los roles</option>
            {ROLES_PREDEFINIDOS.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Usuarios ({filteredUsuarios.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ultima Conexion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                        {getInitials(usuario.nombre)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                        <div className="text-sm text-gray-500">{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRolColor(usuario.rol)}`}>
                      {ROLES_PREDEFINIDOS.find((rol) => rol.id === usuario.rol)?.nombre || usuario.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(usuario.empresasAsignadas || []).slice(0, 2).map((empresaId) => {
                        const empresa = empresasDisponibles.find((item) => item.id === empresaId);
                        return (
                          <span key={empresaId} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {empresa?.nombre || empresaId}
                          </span>
                        );
                      })}
                      {(usuario.empresasAsignadas || []).length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{usuario.empresasAsignadas.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.ultimaConexion ? new Date(usuario.ultimaConexion).toLocaleDateString() : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openModal('edit', usuario)} className="text-indigo-600 hover:text-indigo-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleToggleActivo(usuario)} className={usuario.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === 'create' ? 'Crear Usuario' : modalType === 'edit' ? 'Editar Usuario' : 'Registrar Invitacion'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={modalType === 'edit'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.rol}
                  onChange={(e) => {
                    const rol = e.target.value as RolUsuario;
                    setFormData((prev) => ({ ...prev, rol, permisos: getRolPermissions(rol) }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ROLES_PREDEFINIDOS.map((rol) => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresas Asignadas</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                  {empresasDisponibles.map((empresa) => (
                    <label key={empresa.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.empresasAsignadas.includes(empresa.id)}
                        onChange={() => toggleEmpresa(empresa.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{empresa.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permisos Personalizados</label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-3 bg-gray-50">
                  {Object.entries(PERMISOS_DISPONIBLES.reduce((acc, permiso) => {
                    if (!acc[permiso.categoria]) acc[permiso.categoria] = [];
                    acc[permiso.categoria].push(permiso);
                    return acc;
                  }, {} as Record<string, typeof PERMISOS_DISPONIBLES>)).map(([categoria, permisosCategoria]) => (
                    <div key={categoria} className="space-y-1">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">{categoria}</h4>
                      {permisosCategoria.map((permiso) => (
                        <label key={permiso.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.permisos.includes(permiso.id)}
                            onChange={(e) => setFormData((prev) => ({
                              ...prev,
                              permisos: e.target.checked
                                ? [...prev.permisos, permiso.id]
                                : prev.permisos.filter((id) => id !== permiso.id),
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{permiso.nombre}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {modalType !== 'edit' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                  El alta provisiona el usuario en Supabase Auth y sincroniza su perfil interno en el sistema.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || formData.empresasAsignadas.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : modalType === 'edit' ? 'Guardar Cambios' : 'Guardar Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
