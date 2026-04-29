/*
  # Endurecer aprobaciones de asientos contables

  - Activa aprobación para edición y eliminación de asientos
  - Corrige empresas creadas antes de ajustes recientes
*/

UPDATE configuracion_aprobaciones
   SET requiere_aprobacion = true,
       updated_at = now()
 WHERE modulo = 'contabilidad'
   AND entidad = 'asientos_contables'
   AND accion IN ('editar', 'eliminar')
   AND activo = true;
