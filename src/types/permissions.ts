export type Permission = 'create' | 'read' | 'update' | 'delete';

export const PERMISSION_LABELS: Record<Permission, string> = {
  create: 'Crear',
  read: 'Ver',
  update: 'Actualizar',
  delete: 'Eliminar'
};

export type RoleName =
  | 'auxiliar_contable'
  | 'contador'
  | 'encargado_impuestos'
  | 'tesorero'
  | 'supervisor_contable'
  | 'administrador_contable'
  | 'auditor'
  | 'gerente'
  | 'administrador_sistema';

export const ROLE_LABELS: Record<RoleName, string> = {
  auxiliar_contable: 'Auxiliar Contable',
  contador: 'Contador',
  encargado_impuestos: 'Encargado de Impuestos',
  tesorero: 'Tesorero',
  supervisor_contable: 'Supervisor Contable',
  administrador_contable: 'Administrador Contable',
  auditor: 'Auditor',
  gerente: 'Gerente',
  administrador_sistema: 'Administrador del Sistema'
};

export type ModuleSlug =
  | 'dashboard'
  | 'contabilidad'
  | 'plan-cuentas'
  | 'asientos'
  | 'mayor'
  | 'balance-comprobacion'
  | 'periodos'
  | 'ventas'
  | 'clientes'
  | 'facturas'
  | 'notas-credito'
  | 'notas-debito'
  | 'recibos'
  | 'compras'
  | 'proveedores'
  | 'partners'
  | 'comisiones'
  | 'finanzas'
  | 'cuentas-cobrar'
  | 'cuentas-pagar'
  | 'tesoreria'
  | 'conciliacion'
  | 'analisis'
  | 'centros-costo'
  | 'reportes'
  | 'balance-general'
  | 'administracion'
  | 'empresas'
  | 'usuarios'
  | 'autorizaciones'
  | 'configuracion'
  | 'configuracion-mapeo'
  | 'impuestos'
  | 'integraciones'
  | 'auditoria'
  | 'multimoneda';

export const MODULE_LABELS: Record<ModuleSlug, string> = {
  'dashboard': 'Dashboard',
  'contabilidad': 'Contabilidad',
  'plan-cuentas': 'Plan de Cuentas',
  'asientos': 'Asientos Contables',
  'mayor': 'Libro Mayor',
  'balance-comprobacion': 'Balance de Comprobación',
  'periodos': 'Periodos Contables',
  'ventas': 'Ventas',
  'clientes': 'Clientes',
  'facturas': 'Facturas',
  'notas-credito': 'Notas de Crédito',
  'notas-debito': 'Notas de Débito',
  'recibos': 'Recibos',
  'compras': 'Compras',
  'proveedores': 'Proveedores',
  'partners': 'Partners',
  'comisiones': 'Comisiones',
  'finanzas': 'Finanzas',
  'cuentas-cobrar': 'Cuentas por Cobrar',
  'cuentas-pagar': 'Cuentas por Pagar',
  'tesoreria': 'Tesorería',
  'conciliacion': 'Conciliación Bancaria',
  'analisis': 'Análisis',
  'centros-costo': 'Centros de Costo',
  'reportes': 'Reportes',
  'balance-general': 'Balance General',
  'administracion': 'Administración',
  'empresas': 'Empresas',
  'usuarios': 'Usuarios',
  'autorizaciones': 'Autorizaciones',
  'configuracion': 'Nomencladores',
  'configuracion-mapeo': 'Mapeo de Archivos',
  'impuestos': 'Impuestos',
  'integraciones': 'Integraciones',
  'auditoria': 'Auditoría',
  'multimoneda': 'Multi-moneda'
};

export type ModulePermissions = Partial<Record<ModuleSlug, Permission[]>>;

export interface RolePermissions {
  role: RoleName;
  permissions: ModulePermissions;
}

export interface UserPermissions {
  role: RoleName;
  permissions: ModulePermissions;
}
