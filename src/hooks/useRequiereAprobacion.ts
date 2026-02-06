import { useState, useCallback } from 'react';
import { useSesion } from '../context/SesionContext';
import { useAuth } from '../context/AuthContext';
import { verificarRequiereAprobacion } from '../services/supabase/configuracionAprobaciones';
import { aprobacionesService } from '../services/supabase/aprobaciones';

export type TipoTransaccion =
  | 'asiento_contable'
  | 'factura_venta'
  | 'nota_credito'
  | 'factura_compra'
  | 'pago_proveedor'
  | 'cobro_cliente'
  | 'movimiento_tesoreria'
  | 'transferencia';

export type TipoOperacion = 'crear' | 'modificar' | 'eliminar';

interface ConfiguracionActiva {
  requiereAprobacion: boolean;
}

const MAPEO_TRANSACCION_A_ENTIDAD: Record<TipoTransaccion, { modulo: string; entidad: string }> = {
  'asiento_contable': { modulo: 'contabilidad', entidad: 'asientos_contables' },
  'factura_venta': { modulo: 'ventas', entidad: 'facturas_venta' },
  'nota_credito': { modulo: 'ventas', entidad: 'notas_credito' },
  'factura_compra': { modulo: 'compras', entidad: 'facturas_compra' },
  'pago_proveedor': { modulo: 'finanzas', entidad: 'pagos_proveedor' },
  'cobro_cliente': { modulo: 'finanzas', entidad: 'cobros_cliente' },
  'movimiento_tesoreria': { modulo: 'tesoreria', entidad: 'movimientos_tesoreria' },
  'transferencia': { modulo: 'tesoreria', entidad: 'transferencias' }
};

const MAPEO_OPERACION: Record<TipoOperacion, 'crear' | 'editar' | 'eliminar'> = {
  'crear': 'crear',
  'modificar': 'editar',
  'eliminar': 'eliminar'
};

export const useRequiereAprobacion = () => {
  const { empresaActual } = useSesion();
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(false);

  const verificarSiRequiereAprobacion = useCallback(async (
    tipoTransaccion: TipoTransaccion,
    tipoOperacion: TipoOperacion,
    monto?: number
  ): Promise<ConfiguracionActiva> => {
    if (!empresaActual?.id) {
      return { requiereAprobacion: false };
    }

    try {
      const { modulo, entidad } = MAPEO_TRANSACCION_A_ENTIDAD[tipoTransaccion];
      const accion = MAPEO_OPERACION[tipoOperacion];

      const requiere = await verificarRequiereAprobacion(
        empresaActual.id,
        modulo,
        entidad,
        accion
      );

      return { requiereAprobacion: requiere };
    } catch (error) {
      console.error('Error verificando aprobación:', error);
      return { requiereAprobacion: false };
    }
  }, [empresaActual?.id]);

  const crearSolicitudAprobacion = useCallback(async (
    tipoTransaccion: TipoTransaccion,
    tipoOperacion: TipoOperacion,
    transaccionId: string,
    datosOriginales: any,
    datosNuevos: any,
    monto?: number
  ) => {
    if (!empresaActual?.id || !usuario?.id) {
      throw new Error('Faltan datos de empresa o usuario');
    }

    setLoading(true);
    try {
      const solicitud = await aprobacionesService.crearSolicitud({
        empresa_id: empresaActual.id,
        usuario_solicitante_id: usuario.id,
        tipo_transaccion: tipoTransaccion,
        tipo_operacion: tipoOperacion,
        transaccion_id: transaccionId,
        datos_originales: datosOriginales,
        datos_nuevos: datosNuevos,
        monto: monto
      });

      return solicitud;
    } catch (error) {
      console.error('Error creando solicitud de aprobación:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [empresaActual?.id, usuario?.id]);

  const procesarConAprobacion = useCallback(async <T>(
    tipoTransaccion: TipoTransaccion,
    tipoOperacion: TipoOperacion,
    transaccionId: string,
    datosOriginales: any,
    datosNuevos: any,
    onAplicarDirectamente: () => Promise<T>,
    monto?: number
  ): Promise<{ resultado?: T; solicitudAprobacion?: any; requirioAprobacion: boolean }> => {
    const { requiereAprobacion } = await verificarSiRequiereAprobacion(
      tipoTransaccion,
      tipoOperacion,
      monto
    );

    if (!requiereAprobacion) {
      const resultado = await onAplicarDirectamente();
      return { resultado, requirioAprobacion: false };
    }

    const solicitud = await crearSolicitudAprobacion(
      tipoTransaccion,
      tipoOperacion,
      transaccionId,
      datosOriginales,
      datosNuevos,
      monto
    );

    return { solicitudAprobacion: solicitud, requirioAprobacion: true };
  }, [verificarSiRequiereAprobacion, crearSolicitudAprobacion]);

  return {
    verificarSiRequiereAprobacion,
    crearSolicitudAprobacion,
    procesarConAprobacion,
    loading
  };
};
