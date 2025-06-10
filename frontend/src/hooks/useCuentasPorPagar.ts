import { useState, useEffect, useCallback } from 'react';
import { FacturaPorPagar, Proveedor, PagoProveedor, ResumenCuentasPorPagar } from '../types/cuentasPorPagar';
import { cuentasPorPagarService } from '../services/firebase/cuentasPorPagar';

export const useCuentasPorPagar = (empresaId: string | undefined) => {
  const [facturas, setFacturas] = useState<FacturaPorPagar[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [resumen, setResumen] = useState<ResumenCuentasPorPagar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de cuentas por pagar...');
      
      const [facturasData, proveedoresData, resumenData] = await Promise.all([
        cuentasPorPagarService.getFacturas(empresaId),
        cuentasPorPagarService.getProveedores(empresaId),
        cuentasPorPagarService.getResumen(empresaId)
      ]);
      
      console.log(`✅ Datos cargados: ${facturasData.length} facturas, ${proveedoresData.length} proveedores`);
      
      setFacturas(facturasData);
      setProveedores(proveedoresData);
      setResumen(resumenData);
    } catch (err) {
      console.error('❌ Error al cargar cuentas por pagar:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Cargar datos cuando cambie la empresa
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Crear factura con actualización optimista
  const crearFactura = useCallback(async (nuevaFactura: Omit<FacturaPorPagar, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const tempId = `temp_${Date.now()}`;
    const facturaOptimista: FacturaPorPagar = {
      ...nuevaFactura,
      id: tempId,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    // Actualización optimista
    setFacturas(prev => [facturaOptimista, ...prev]);

    try {
      const realId = await cuentasPorPagarService.crearFactura(empresaId, nuevaFactura);
      
      // Actualizar con el ID real
      setFacturas(prev => prev.map(factura => 
        factura.id === tempId 
          ? { ...factura, id: realId }
          : factura
      ));

      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorPagarService.getResumen(empresaId);
      setResumen(nuevoResumen);

      return realId;
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.filter(factura => factura.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  // Actualizar factura
  const actualizarFactura = useCallback(async (facturaId: string, datos: Partial<FacturaPorPagar>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const facturaAnterior = facturas.find(f => f.id === facturaId);
    if (!facturaAnterior) throw new Error('Factura no encontrada');

    // Actualización optimista
    setFacturas(prev => prev.map(factura => 
      factura.id === facturaId 
        ? { ...factura, ...datos, fechaModificacion: new Date().toISOString() }
        : factura
    ));

    try {
      await cuentasPorPagarService.actualizarFactura(empresaId, facturaId, datos);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorPagarService.getResumen(empresaId);
      setResumen(nuevoResumen);
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.map(factura => 
        factura.id === facturaId ? facturaAnterior : factura
      ));
      throw error;
    }
  }, [empresaId, facturas]);

  // Eliminar factura
  const eliminarFactura = useCallback(async (facturaId: string) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const facturaEliminada = facturas.find(f => f.id === facturaId);
    if (!facturaEliminada) throw new Error('Factura no encontrada');

    // Actualización optimista
    setFacturas(prev => prev.filter(factura => factura.id !== facturaId));

    try {
      await cuentasPorPagarService.eliminarFactura(empresaId, facturaId);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorPagarService.getResumen(empresaId);
      setResumen(nuevoResumen);
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => [...prev, facturaEliminada].sort((a, b) => 
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      ));
      throw error;
    }
  }, [empresaId, facturas]);

  // Registrar pago
  const registrarPago = useCallback(async (facturaId: string, pago: Omit<PagoProveedor, 'id' | 'facturaId' | 'fechaCreacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const facturaOriginal = facturas.find(f => f.id === facturaId);
    if (!facturaOriginal) throw new Error('Factura no encontrada');

    // Calcular nuevo estado y saldos
    const nuevoMontoPagado = facturaOriginal.montoPagado + pago.monto;
    const nuevoSaldoPendiente = facturaOriginal.montoTotal - nuevoMontoPagado;
    
    let nuevoEstado = facturaOriginal.estado;
    if (nuevoSaldoPendiente <= 0) {
      nuevoEstado = 'PAGADA';
    } else if (nuevoMontoPagado > 0) {
      nuevoEstado = 'PARCIAL';
    }

    // Actualización optimista
    const facturaActualizada = {
      ...facturaOriginal,
      montoPagado: nuevoMontoPagado,
      saldoPendiente: Math.max(0, nuevoSaldoPendiente),
      estado: nuevoEstado,
      fechaModificacion: new Date().toISOString()
    };

    setFacturas(prev => prev.map(factura => 
      factura.id === facturaId ? facturaActualizada : factura
    ));

    try {
      await cuentasPorPagarService.registrarPago(empresaId, facturaId, pago);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorPagarService.getResumen(empresaId);
      setResumen(nuevoResumen);
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.map(factura => 
        factura.id === facturaId ? facturaOriginal : factura
      ));
      throw error;
    }
  }, [empresaId, facturas]);

  // Crear proveedor
  const crearProveedor = useCallback(async (nuevoProveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const tempId = `temp_${Date.now()}`;
    const proveedorOptimista: Proveedor = {
      ...nuevoProveedor,
      id: tempId,
      empresaId,
      fechaCreacion: new Date()
    };

    // Actualización optimista
    setProveedores(prev => [proveedorOptimista, ...prev]);

    try {
      const realId = await cuentasPorPagarService.crearProveedor(empresaId, nuevoProveedor);
      
      // Actualizar con el ID real
      setProveedores(prev => prev.map(proveedor => 
        proveedor.id === tempId 
          ? { ...proveedor, id: realId }
          : proveedor
      ));

      return realId;
    } catch (error) {
      // Revertir si hay error
      setProveedores(prev => prev.filter(proveedor => proveedor.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  return {
    // Estado
    facturas,
    proveedores,
    resumen,
    loading,
    error,
    
    // Operaciones
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    registrarPago,
    crearProveedor,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};