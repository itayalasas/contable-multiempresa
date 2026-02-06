import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission, ModuleSlug } from '../../types/permissions';

interface ProtectedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  module: ModuleSlug;
  permission: Permission;
  children: React.ReactNode;
}

export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  module,
  permission,
  children,
  ...props
}) => {
  const { hasPermission, role } = usePermissions();

  if (role === 'administrador_sistema' || hasPermission(module, permission)) {
    return <button {...props}>{children}</button>;
  }

  return null;
};
