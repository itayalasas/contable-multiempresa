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
import { NomencladoresService } from '../services/firebase/nomencladores';
import { SeedDataNomencladoresService } from '../services/firebase/seedDataNomencladores';

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

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!paisId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando nomencladores para país:', paisId);
      
      // Inicializar nomencladores si no existen
      await NomencladoresService.inicializarNomencladores(paisId);
      
      // Cargar todos los nomencladores en paralelo
      const [
        tiposDocIdentidad,
        tiposDocFactura,
        tiposImp,
        formasDePago,
        tiposMovTesoreria,
        tiposMon,
        bancosData,
        stats
      ] = await Promise.all([
        NomencladoresService.getTiposDocumentoIdentidad(paisId),
        NomencladoresService.getTiposDocumentoFactura(paisId),
        NomencladoresService.getTiposImpuesto(paisId),
        NomencladoresService.getFormasPago(paisId),
        NomencladoresService.getTiposMovimientoTesoreria(paisId),
        NomencladoresService.getTiposMoneda(paisId),
        NomencladoresService.getBancos(paisId),
        SeedDataNomencladoresService.getEstadisticasNomencladores()
      ]);
      
      // Eliminar duplicados por ID
      const uniqueTiposDocIdentidad = removeDuplicatesById(tiposDocIdentidad);
      const uniqueTiposDocFactura = removeDuplicatesById(tiposDocFactura);
      const uniqueTiposImp = removeDuplicatesById(tiposImp);
      const uniqueFormasDePago = removeDuplicatesById(formasDePago);
      const uniqueTiposMovTesoreria = removeDuplicatesById(tiposMovTesoreria);
      const uniqueTiposMon = removeDuplicatesById(tiposMon);
      const uniqueBancos = removeDuplicatesById(bancosData);
      
      console.log(`✅ Datos cargados y filtrados: 
        - ${uniqueTiposDocIdentidad.length} tipos de documento
        - ${uniqueTiposDocFactura.length} tipos de factura
        - ${uniqueTiposImp.length} tipos de impuesto
        - ${uniqueFormasDePago.length} formas de pago
        - ${uniqueTiposMon.length} tipos de moneda
        - ${uniqueBancos.length} bancos
        - ${uniqueTiposMovTesoreria.length} tipos de movimiento de tesorería
      `);
      
      setTiposDocumentoIdentidad(uniqueTiposDocIdentidad);
      setTiposDocumentoFactura(uniqueTiposDocFactura);
      setTiposImpuesto(uniqueTiposImp);
      setFormasPago(uniqueFormasDePago);
      setTiposMovimientoTesoreria(uniqueTiposMovTesoreria);
      setTiposMoneda(uniqueTiposMon);
      setBancos(uniqueBancos);
      setEstadisticas(stats);
    } catch (err) {
      console.error('❌ Error al cargar nomencladores:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [paisId]);

  // Función para eliminar duplicados por ID
  const removeDuplicatesById = <T extends { id: string }>(items: T[]): T[] => {
    const uniqueMap = new Map<string, T>();
    items.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  };

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
    estadisticas,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};