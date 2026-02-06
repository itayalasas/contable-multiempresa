import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Permission, ModuleSlug, RoleName, ModulePermissions } from '../types/permissions';

export const usePermissions = () => {
  const { usuario } = useAuth();

  const role = useMemo(() => {
    if (!usuario?.metadata?.role) return null;
    return usuario.metadata.role as RoleName;
  }, [usuario]);

  const permissions = useMemo(() => {
    if (!usuario?.metadata?.permissions) return {} as ModulePermissions;
    return usuario.metadata.permissions as ModulePermissions;
  }, [usuario]);

  const isAdmin = useMemo(() => {
    if (!role) return false;
    const adminRoles = ['administrador_sistema', 'admin', 'administrador', 'superadmin'];
    return adminRoles.includes(role.toLowerCase());
  }, [role]);

  const hasPermission = (module: ModuleSlug, permission: Permission): boolean => {
    if (isAdmin) return true;

    const modulePermissions = permissions[module] || [];
    return modulePermissions.includes(permission);
  };

  const hasAnyPermission = (module: ModuleSlug, requiredPermissions: Permission[]): boolean => {
    if (isAdmin) return true;

    const modulePermissions = permissions[module] || [];
    return requiredPermissions.some(permission => modulePermissions.includes(permission));
  };

  const hasAllPermissions = (module: ModuleSlug, requiredPermissions: Permission[]): boolean => {
    if (isAdmin) return true;

    const modulePermissions = permissions[module] || [];
    return requiredPermissions.every(permission => modulePermissions.includes(permission));
  };

  const canCreate = (module: ModuleSlug): boolean => {
    return hasPermission(module, 'create');
  };

  const canRead = (module: ModuleSlug): boolean => {
    return hasPermission(module, 'read');
  };

  const canUpdate = (module: ModuleSlug): boolean => {
    return hasPermission(module, 'update');
  };

  const canDelete = (module: ModuleSlug): boolean => {
    return hasPermission(module, 'delete');
  };

  const getModulePermissions = (module: ModuleSlug): Permission[] => {
    if (isAdmin) {
      return ['create', 'read', 'update', 'delete'];
    }
    return permissions[module] || [];
  };

  const hasModuleAccess = (module: ModuleSlug): boolean => {
    if (isAdmin) return true;

    const modulePermissions = permissions[module] || [];
    return modulePermissions.length > 0;
  };

  return {
    role,
    permissions,
    isAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    getModulePermissions,
    hasModuleAccess
  };
};
