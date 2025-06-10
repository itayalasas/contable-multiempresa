import { useState, useEffect, useCallback } from 'react';
import { ConciliacionFirebaseService, MovimientoBancario, MovimientoContable, ResumenConciliacion } from '../services/firebase/conciliacionFirebase';
import { ConciliacionMapeoService } from '../services/firebase/conciliacionMapeo';

export const useConciliacionFirebase = (empresaId: string | undefined) => {
  const [movimientosBancarios, setMovimientosBancarios] = useState<MovimientoBancario[]>([]);
  const [movimientosContables, setMovimientosContables] = useState<MovimientoContable[]>([]);
  const [resumen, setResumen] = useState<ResumenConciliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMockData, setIsLoadingMockData] = useState(false);
  
  // Filtros
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string | undefined>(undefined);
  const [fechaInicio, setFechaInicio] = useState<string | undefined>(undefined);
  const [fechaFin, setFechaFin] = useState<string | undefined>(undefined);

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de conciliación desde Firebase...');
      
      // Cargar movimientos bancarios y contables en paralelo
      const [movBancarios, movContables, resumenData] = await Promise.all([
        ConciliacionFirebaseService.getMovimientosBancarios(empresaId, cuentaSeleccionada, fechaInicio, fechaFin),
        ConciliacionFirebaseService.getMovimientosContables(empresaId, cuentaSeleccionada, fechaInicio, fechaFin),
        ConciliacionFirebaseService.getResumenConciliacion(empresaId, cuentaSeleccionada)
      ]);
      
      setMovimientosBancarios(movBancarios);
      setMovimientosContables(movContables);
      setResumen(resumenData);
      
      console.log(`✅ Datos cargados: ${movBancarios.length} movimientos bancarios, ${movContables.length} movimientos contables`);
    } catch (err) {
      console.error('❌ Error al cargar datos de conciliación:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId, cuentaSeleccionada, fechaInicio, fechaFin]);

  // Cargar datos cuando cambie la empresa o los filtros
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Cargar datos mock en Firebase
  const cargarDatosMockEnFirebase = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setIsLoadingMockData(true);
      setError(null);
      
      console.log('🔄 Cargando datos mock de conciliación en Firebase...');
      
      await ConciliacionFirebaseService.cargarDatosMockEnFirebase(empresaId);
      
      // Recargar datos después de cargar los mock
      await cargarDatos();
      
      console.log('✅ Datos mock de conciliación cargados exitosamente en Firebase');
      return true;
    } catch (err) {
      console.error('❌ Error al cargar datos mock en Firebase:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setIsLoadingMockData(false);
    }
  }, [empresaId, cargarDatos]);

  // Conciliar movimientos
  const conciliarMovimientos = useCallback(async (movimientoBancario: MovimientoBancario, movimientoContable: MovimientoContable) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      // Verificar que ambos movimientos existan
      const movBancarioExiste = movimientosBancarios.some(m => m.id === movimientoBancario.id);
      const movContableExiste = movimientosContables.some(m => m.id === movimientoContable.id);
      
      if (!movBancarioExiste) {
        throw new Error('El movimiento bancario no existe');
      }
      
      if (!movContableExiste) {
        throw new Error('El movimiento contable no existe');
      }
      
      await ConciliacionFirebaseService.conciliarMovimientos(
        empresaId,
        movimientoBancario.id,
        movimientoContable.id
      );
      
      // Actualizar estado local
      setMovimientosBancarios(prev => prev.map(m => 
        m.id === movimientoBancario.id 
          ? { 
              ...m, 
              conciliado: true, 
              movimientoContableId: movimientoContable.id,
              fechaConciliacion: new Date().toISOString()
            } 
          : m
      ));
      
      setMovimientosContables(prev => prev.map(m => 
        m.id === movimientoContable.id 
          ? { 
              ...m, 
              conciliado: true, 
              movimientoBancarioId: movimientoBancario.id,
              fechaConciliacion: new Date().toISOString()
            } 
          : m
      ));
      
      // Actualizar resumen
      if (resumen) {
        setResumen({
          ...resumen,
          movimientosBancariosConciliados: resumen.movimientosBancariosConciliados + 1,
          movimientosContablesConciliados: resumen.movimientosContablesConciliados + 1,
          movimientosPendientes: resumen.movimientosPendientes - 2
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error conciliando movimientos:', error);
      throw error;
    }
  }, [empresaId, movimientosBancarios, movimientosContables, resumen]);

  // Revertir conciliación
  const revertirConciliacion = useCallback(async (movimientoBancarioId: string, movimientoContableId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      await ConciliacionFirebaseService.revertirConciliacion(
        empresaId,
        movimientoBancarioId,
        movimientoContableId
      );
      
      // Actualizar estado local
      setMovimientosBancarios(prev => prev.map(m => 
        m.id === movimientoBancarioId 
          ? { 
              ...m, 
              conciliado: false, 
              movimientoContableId: undefined,
              fechaConciliacion: undefined,
              usuarioConciliacion: undefined
            } 
          : m
      ));
      
      setMovimientosContables(prev => prev.map(m => 
        m.id === movimientoContableId 
          ? { 
              ...m, 
              conciliado: false, 
              movimientoBancarioId: undefined,
              fechaConciliacion: undefined,
              usuarioConciliacion: undefined
            } 
          : m
      ));
      
      // Actualizar resumen
      if (resumen) {
        setResumen({
          ...resumen,
          movimientosBancariosConciliados: resumen.movimientosBancariosConciliados - 1,
          movimientosContablesConciliados: resumen.movimientosContablesConciliados - 1,
          movimientosPendientes: resumen.movimientosPendientes + 2
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error revertiendo conciliación:', error);
      throw error;
    }
  }, [empresaId, resumen]);

  // Importar extracto bancario
  const importarExtractoBancario = useCallback(async (
    file: File, 
    cuentaId: string, 
    formato: string,
    configuracionId?: string
  ) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    try {
      // Procesar archivo según configuración o formato
      let movimientosImportados;
      
      if (configuracionId) {
        // Procesar con configuración de mapeo
        movimientosImportados = await ConciliacionMapeoService.procesarArchivoExtracto(
          file,
          cuentaId,
          empresaId,
          configuracionId
        );
      } else {
        // Simular procesamiento del archivo según formato predefinido
        console.log(`Procesando archivo ${file.name} en formato ${formato}`);
        
        // Generar movimientos de ejemplo basados en el archivo
        movimientosImportados = [
          {
            fecha: '2024-03-25',
            descripcion: 'DEPOSITO CLIENTE XYZ',
            referencia: 'DEP-003',
            monto: 1800,
            tipo: 'ABONO',
            cuentaId,
            empresaId
          },
          {
            fecha: '2024-03-26',
            descripcion: 'PAGO SERVICIOS',
            referencia: 'PAG-001',
            monto: 450,
            tipo: 'CARGO',
            cuentaId,
            empresaId
          },
          {
            fecha: '2024-03-27',
            descripcion: 'TRANSFERENCIA RECIBIDA',
            referencia: 'TRF-003',
            monto: 2200,
            tipo: 'ABONO',
            cuentaId,
            empresaId
          }
        ];
      }
      
      // Importar movimientos a Firebase
      const cantidadImportada = await ConciliacionFirebaseService.importarExtractoBancario(
        empresaId,
        cuentaId,
        movimientosImportados
      );
      
      // Recargar datos
      await cargarDatos();
      
      return cantidadImportada;
    } catch (error) {
      console.error('Error importando extracto bancario:', error);
      throw error;
    }
  }, [empresaId, cargarDatos]);

  return {
    // Estado
    movimientosBancarios,
    movimientosContables,
    resumen,
    loading,
    error,
    isLoadingMockData,
    
    // Filtros
    cuentaSeleccionada,
    fechaInicio,
    fechaFin,
    setCuentaSeleccionada,
    setFechaInicio,
    setFechaFin,
    
    // Operaciones
    conciliarMovimientos,
    revertirConciliacion,
    importarExtractoBancario,
    cargarDatosMockEnFirebase,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};