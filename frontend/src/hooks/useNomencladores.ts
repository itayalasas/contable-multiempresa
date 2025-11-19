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

export const useNomencladores = (paisId: string | undefined) => {
  const [tiposDocumentoIdentidad, setTiposDocumentoIdentidad] = useState<TipoDocumentoIdentidad[]>([]);
  const [tiposDocumentoFactura, setTiposDocumentoFactura] = useState<TipoDocumentoFactura[]>([]);
  const [tiposImpuesto, setTiposImpuesto] = useState<TipoImpuesto[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [tiposMovimientoTesoreria, setTiposMovimientoTesoreria] = useState<TipoMovimientoTesoreria[]>([]);
  const [tiposMoneda, setTiposMoneda] = useState<TipoMoneda[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos inicialmente
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

      console.log(`✅ Datos cargados desde Supabase: ${tiposDocIdentidad.length} tipos de documento, ${tiposDocFactura.length} tipos de factura`);
      console.log(`✅ Datos de tesorería: ${tiposMovTesoreria.length} tipos de movimiento, ${tiposMon.length} monedas, ${bancosData.length} bancos`);

      setTiposDocumentoIdentidad(tiposDocIdentidad);
      setTiposDocumentoFactura(tiposDocFactura);
      setTiposImpuesto(tiposImp);
      setFormasPago(formasDePago);
      setTiposMovimientoTesoreria(tiposMovTesoreria);
      setTiposMoneda(tiposMon);
      setBancos(bancosData);
    } catch (err) {
      console.error('❌ Error al cargar nomencladores:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [paisId]);

  // Cargar datos cuando cambie el país
  useEffect(() => {
    if (paisId) {
      cargarDatos();
    }
  }, [paisId, cargarDatos]);

  return {
    // Estado
    tiposDocumentoIdentidad,
    tiposDocumentoFactura,
    tiposImpuesto,
    formasPago,
    tiposMovimientoTesoreria,
    tiposMoneda,
    bancos,
    loading,
    error,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};