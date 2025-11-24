import { useState, useEffect, useCallback } from 'react';
import {
  TipoDocumentoIdentidad,
  TipoDocumentoFactura,
  TipoImpuesto,
  FormaPago,
  TipoMovimientoTesoreria,
  TipoMoneda,
  Banco
} from '../types/nomencladores';
import { nomencladoresSupabaseService } from '../services/supabase/nomencladores';

export const useNomencladoresAdmin = (paisId: string | undefined) => {
  const [tiposDocumentoIdentidad, setTiposDocumentoIdentidad] = useState<TipoDocumentoIdentidad[]>([]);
  const [tiposDocumentoFactura, setTiposDocumentoFactura] = useState<TipoDocumentoFactura[]>([]);
  const [tiposImpuesto, setTiposImpuesto] = useState<TipoImpuesto[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [tiposMovimientoTesoreria, setTiposMovimientoTesoreria] = useState<TipoMovimientoTesoreria[]>([]);
  const [tiposMoneda, setTiposMoneda] = useState<TipoMoneda[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<{
    totalPaises: number;
    totalNomencladores: number;
    porTipo: Record<string, number>;
    porPais: Record<string, number>;
  } | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!paisId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando nomencladores desde Supabase para país:', paisId);

      const [
        tiposDocIdentidad,
        tiposDocFactura,
        tiposImp,
        formasDePago,
        tiposMovTesoreria,
        tiposMon,
        bancosData
      ] = await Promise.all([
        nomencladoresSupabaseService.getTiposDocumentoIdentidad(paisId),
        nomencladoresSupabaseService.getTiposDocumentoFactura(paisId),
        nomencladoresSupabaseService.getTiposImpuesto(paisId),
        nomencladoresSupabaseService.getFormasPago(paisId),
        nomencladoresSupabaseService.getTiposMovimiento(paisId),
        nomencladoresSupabaseService.getTiposMoneda(paisId),
        nomencladoresSupabaseService.getBancos(paisId)
      ]);

      console.log(`✅ Datos cargados desde Supabase:
        - ${tiposDocIdentidad.length} tipos de documento
        - ${tiposDocFactura.length} tipos de factura
        - ${tiposImp.length} tipos de impuesto
        - ${formasDePago.length} formas de pago
        - ${tiposMon.length} tipos de moneda
        - ${bancosData.length} bancos
        - ${tiposMovTesoreria.length} tipos de movimiento de tesorería
      `);

      setTiposDocumentoIdentidad(tiposDocIdentidad);
      setTiposDocumentoFactura(tiposDocFactura);
      setTiposImpuesto(tiposImp);
      setFormasPago(formasDePago);
      setTiposMovimientoTesoreria(tiposMovTesoreria);
      setTiposMoneda(tiposMon);
      setBancos(bancosData);

      setEstadisticas({
        totalPaises: 1,
        totalNomencladores: tiposDocIdentidad.length + tiposDocFactura.length +
                          tiposImp.length + formasDePago.length + tiposMon.length +
                          bancosData.length + tiposMovTesoreria.length,
        porTipo: {
          tipo_documento_identidad: tiposDocIdentidad.length,
          tipo_documento_factura: tiposDocFactura.length,
          tipo_impuesto: tiposImp.length,
          forma_pago: formasDePago.length,
          tipo_moneda: tiposMon.length,
          bancos: bancosData.length,
          tipo_movimiento_tesoreria: tiposMovTesoreria.length
        },
        porPais: { [paisId]: tiposDocIdentidad.length + tiposDocFactura.length +
                             tiposImp.length + formasDePago.length + tiposMon.length +
                             bancosData.length + tiposMovTesoreria.length }
      });
    } catch (err) {
      console.error('❌ Error al cargar nomencladores:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [paisId]);

  const guardarNomenclador = useCallback(
    async (tipo: string, datos: any) => {
      if (!paisId) throw new Error('No hay país seleccionado');
      return await nomencladoresSupabaseService.crearNomenclador(tipo, paisId, datos);
    },
    [paisId]
  );

  const actualizarNomenclador = useCallback(
    async (tipo: string, id: string, datos: any) => {
      return await nomencladoresSupabaseService.actualizarNomenclador(tipo, id, datos);
    },
    []
  );

  const eliminarNomenclador = useCallback(
    async (tipo: string, id: string) => {
      return await nomencladoresSupabaseService.eliminarNomenclador(tipo, id);
    },
    []
  );

  useEffect(() => {
    if (paisId) {
      cargarDatos();
    }
  }, [paisId, cargarDatos]);

  return {
    tiposDocumentoIdentidad,
    tiposDocumentoFactura,
    tiposImpuesto,
    formasPago,
    tiposMovimientoTesoreria,
    tiposMoneda,
    bancos,
    loading,
    error,
    estadisticas,
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null),
    guardarNomenclador,
    actualizarNomenclador,
    eliminarNomenclador
  };
};