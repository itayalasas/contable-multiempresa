import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Mail, 
  Shield,
  Users,
  Eye,
  EyeOff,
  UserPlus,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Usuario, Rol, Permiso } from '../../types';
import { usuariosSupabaseService } from '../../services/supabase/usuarios';
import { useAuth } from '../../context/AuthContext';
import { useSesion } from '../../context/SesionContext';

export const GestionUsuarios: React.FC = () => {
  const { usuario: usuarioActual } = useAuth();
  const { empresaActual } = useSesion();
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRol, setSelectedRol] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'invite'>('create');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [auth0Connected, setAuth0Connected] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showManagementSetup, setShowManagementSetup] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'usuario',
    empresas: [] as string[],
    permisos: [] as string[],
    password: '',
    generatePassword: true
  });

  useEffect(() => {
    cargarDatos();
    verificarConexionAuth0();
  }, [empresaActual]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cargando usuarios...', { empresaActual: empresaActual?.id, usuarioActual: usuarioActual?.rol });

      let usuariosData: Usuario[] = [];

      // Mostrar todos los usuarios si:
      // 1. Es super_admin
      // 2. No hay empresa seleccionada
      // 3. Es admin_empresa (para gestionar usuarios en general)
      if (
        usuarioActual?.rol === 'super_admin' ||
        usuarioActual?.rol === 'admin_empresa' ||
        !empresaActual
      ) {
        usuariosData = await usuariosSupabaseService.getAllUsuarios();
        console.log('✅ Usuarios cargados (todos):', usuariosData.length);
      } else {
        // Sino, solo los de la empresa actual
        usuariosData = await usuariosSupabaseService.getUsuariosByEmpresa(empresaActual.id);
        console.log('✅ Usuarios cargados (empresa):', usuariosData.length);
      }

      setUsuarios(usuariosData);

      // TODO: Implementar roles y permisos desde Supabase
      setRoles([]);
      setPermisos([]);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const verificarConexionAuth0 = async () => {
    // No necesitamos Auth0 Management API
    setAuth0Connected(true);
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = !selectedRol || usuario.rol === selectedRol;
    return matchesSearch && matchesRol;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    alert('Funcionalidad en desarrollo. Próximamente se podrá crear/editar usuarios desde Supabase.');

    // TODO: Implementar creación/edición de usuarios con Supabase
    /*
    try {
      if (modalType === 'create' || modalType === 'invite') {
        // await crearUsuario(...)
        alert('Usuario creado exitosamente');
      } else if (modalType === 'edit' && selectedUser) {
        // await actualizarUsuario(...)
        alert('Usuario actualizado exitosamente');
      }

      await cargarDatos();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert(`Error al guardar usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
    */
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      rol: 'usuario',
      empresas: [],
      permisos: [],
      password: '',
      generatePassword: true
    });
    setSelectedUser(null);
  };

  const openModal = (type: 'create' | 'edit' | 'invite', user?: Usuario) => {
    setModalType(type);
    if (user) {
      setSelectedUser(user);
      setFormData({
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresas: user.empresas,
        permisos: user.permisos,
        password: '',
        generatePassword: true
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const getRolColor = (rol: string) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'contador': 'bg-blue-100 text-blue-800',
      'usuario': 'bg-green-100 text-green-800'
    };
    return colors[rol as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRolPermissions = (rolId: string) => {
    const rol = roles.find(r => r.id === rolId);
    return rol?.permisos || [];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (nombre: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    const index = nombre.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Administra usuarios, roles y permisos para {empresaActual?.nombre}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => openModal('invite')}
            disabled={!auth0Connected}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="h-4 w-4" />
            <span>Invitar Usuario</span>
          </button>
          <button
            onClick={() => openModal('create')}
            disabled={!auth0Connected}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-lg font-semibold text-gray-900">{usuarios.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-lg font-semibold text-gray-900">
                {usuarios.filter(u => u.rol === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-lg font-semibold text-gray-900">
                {usuarios.filter(u => u.activo).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Roles Definidos</p>
              <p className="text-lg font-semibold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
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
            <option value="admin">Administrador</option>
            <option value="contador">Contador</option>
            <option value="usuario">Usuario</option>
          </select>

          <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Más Filtros</span>
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Conexión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full ${getAvatarColor(usuario.nombre)} flex items-center justify-center text-white font-semibold`}>
                        {getInitials(usuario.nombre)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                        <div className="text-sm text-gray-500">{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRolColor(usuario.rol)}`}>
                      {usuario.rol === 'admin' ? 'Administrador' : 
                       usuario.rol === 'contador' ? 'Contador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {usuario.permisos.slice(0, 3).map((permiso) => (
                        <span key={permiso} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {permiso}
                        </span>
                      ))}
                      {usuario.permisos.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{usuario.permisos.length - 3} más
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {usuario.ultimaConexion ? 
                      new Date(usuario.ultimaConexion).toLocaleDateString() : 
                      'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => openModal('edit', usuario)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === 'create' ? 'Crear Usuario' : 
               modalType === 'edit' ? 'Editar Usuario' : 'Invitar Usuario'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={modalType === 'edit'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => {
                    const newRol = e.target.value;
                    setFormData({
                      ...formData, 
                      rol: newRol,
                      permisos: getRolPermissions(newRol)
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="usuario">Usuario</option>
                  <option value="contador">Contador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permisos
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {permisos.map((permiso) => (
                    <label key={permiso.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={formData.permisos.includes(permiso.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              permisos: [...formData.permisos, permiso.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              permisos: formData.permisos.filter(p => p !== permiso.id)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{permiso.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              {modalType === 'create' && (
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.generatePassword}
                      onChange={(e) => setFormData({...formData, generatePassword: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Generar contraseña automáticamente</span>
                  </label>
                  
                  {!formData.generatePassword && (
                    <div className="mt-2 relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required={!formData.generatePassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={!auth0Connected}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalType === 'create' ? 'Crear Usuario' : 
                   modalType === 'edit' ? 'Guardar Cambios' : 'Enviar Invitación'}
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