import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission, ModuleSlug } from '../../types/permissions';

interface CanAccessProps {
  module: ModuleSlug;
  permission?: Permission;
  anyPermission?: Permission[];
  allPermissions?: Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const CanAccess: React.FC<CanAccessProps> = ({
  module,
  permission,
  anyPermission,
  allPermissions,
  fallback = null,
  children
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, role } = usePermissions();

  if (role === 'administrador_sistema') {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(module, permission);
  } else if (anyPermission) {
    hasAccess = hasAnyPermission(module, anyPermission);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(module, allPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
