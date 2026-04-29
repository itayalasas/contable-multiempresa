/*
  # Expandir configuración base de aprobaciones

  Agrega configuraciones faltantes para módulos que ya tienen operaciones
  editables/eliminables y que deben poder gobernarse desde Administración.
*/

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'compras',
  'facturas_compra',
  'editar',
  false,
  'Modificación de facturas de compra registradas',
  'Receipt',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'compras',
  'facturas_compra',
  'eliminar',
  false,
  'Eliminación de facturas de compra registradas',
  'Receipt',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'finanzas',
  'pagos_cliente',
  'editar',
  false,
  'Modificación de cobros de clientes registrados',
  'Wallet',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'finanzas',
  'pagos_cliente',
  'eliminar',
  false,
  'Eliminación de cobros de clientes registrados',
  'Wallet',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'finanzas',
  'pagos_proveedor',
  'editar',
  false,
  'Modificación de pagos a proveedores registrados',
  'CreditCard',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'ventas',
  'notas_credito',
  'editar',
  false,
  'Modificación de notas de crédito emitidas',
  'FileText',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;

INSERT INTO configuracion_aprobaciones (
  empresa_id,
  modulo,
  entidad,
  accion,
  requiere_aprobacion,
  descripcion,
  icono,
  activo
)
SELECT
  e.id,
  'ventas',
  'notas_credito',
  'eliminar',
  false,
  'Eliminación de notas de crédito emitidas',
  'FileText',
  true
FROM empresas e
ON CONFLICT (empresa_id, modulo, entidad, accion) DO NOTHING;
