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

  const hasPermission = (module: ModuleSlug, permission: Permission): boolean => {
    const modulePermissions = permissions[module] || [];
    return modulePermissions.includes(permission);
  };

  const hasAnyPermission = (module: ModuleSlug, requiredPermissions: Permission[]): boolean => {
    const modulePermissions = permissions[module] || [];
    return requiredPermissions.some(permission => modulePermissions.includes(permission));
  };

  const hasAllPermissions = (module: ModuleSlug, requiredPermissions: Permission[]): boolean => {
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
    return permissions[module] || [];
  };

  const hasModuleAccess = (module: ModuleSlug): boolean => {
    const modulePermissions = permissions[module] || [];
    if (modulePermissions.length > 0) {
      return true;
    }

    const moduleToParent: Partial<Record<ModuleSlug, ModuleSlug>> = {
      'plan-cuentas': 'contabilidad',
      'asientos': 'contabilidad',
      'mayor': 'contabilidad',
      'balance-comprobacion': 'contabilidad',
      'periodos': 'contabilidad',
      'clientes': 'ventas',
      'facturas': 'ventas',
      'notas-credito': 'ventas',
      'notas-debito': 'ventas',
      'recibos': 'ventas',
      'proveedores': 'compras',
      'partners': 'compras',
      'comisiones': 'compras',
      'cuentas-cobrar': 'finanzas',
      'cuentas-pagar': 'finanzas',
      'tesoreria': 'finanzas',
      'conciliacion': 'finanzas',
      'centros-costo': 'analisis',
      'balance-general': 'reportes',
      'empresas': 'administracion',
      'usuarios': 'administracion',
      'autorizaciones': 'administracion',
      'configuracion': 'administracion',
      'configuracion-mapeo': 'administracion',
      'impuestos': 'administracion',
      'integraciones': 'administracion',
      'auditoria': 'administracion',
      'multimoneda': 'administracion'
    };

    const parentModule = moduleToParent[module];
    if (parentModule) {
      const parentPermissions = permissions[parentModule] || [];
      return parentPermissions.length > 0;
    }

    return false;
  };

  return {
    role,
    permissions,
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
