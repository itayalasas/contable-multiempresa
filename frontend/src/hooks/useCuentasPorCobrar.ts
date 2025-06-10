import { useState, useEffect, useCallback } from 'react';
import { FacturaPorCobrar, Cliente, PagoFactura, ResumenCuentasPorCobrar } from '../types/cuentasPorCobrar';
import { cuentasPorCobrarService } from '../services/firebase/cuentasPorCobrar';

export const useCuentasPorCobrar = (empresaId: string | undefined) => {
  const [facturas, setFacturas] = useState<FacturaPorCobrar[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<ResumenCuentasPorCobrar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de cuentas por cobrar...');
      
      const [facturasData, clientesData, resumenData] = await Promise.all([
        cuentasPorCobrarService.getFacturas(empresaId),
        cuentasPorCobrarService.getClientes(empresaId),
        cuentasPorCobrarService.getResumen(empresaId)
      ]);
      
      console.log(`✅ Datos cargados: ${facturasData.length} facturas, ${clientesData.length} clientes`);
      
      setFacturas(facturasData);
      setClientes(clientesData);
      setResumen(resumenData);
    } catch (err) {
      console.error('❌ Error al cargar cuentas por cobrar:', err);
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
  const crearFactura = useCallback(async (nuevaFactura: Omit<FacturaPorCobrar, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const tempId = `temp_${Date.now()}`;
    const facturaOptimista: FacturaPorCobrar = {
      ...nuevaFactura,
      id: tempId,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString()
    };

    // Actualización optimista
    setFacturas(prev => [facturaOptimista, ...prev]);

    try {
      const realId = await cuentasPorCobrarService.crearFactura(empresaId, nuevaFactura);
      
      // Actualizar con el ID real
      setFacturas(prev => prev.map(factura => 
        factura.id === tempId 
          ? { ...factura, id: realId }
          : factura
      ));

      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorCobrarService.getResumen(empresaId);
      setResumen(nuevoResumen);

      return realId;
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.filter(factura => factura.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  // Actualizar factura
  const actualizarFactura = useCallback(async (facturaId: string, datos: Partial<FacturaPorCobrar>) => {
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
      await cuentasPorCobrarService.actualizarFactura(empresaId, facturaId, datos);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorCobrarService.getResumen(empresaId);
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
      await cuentasPorCobrarService.eliminarFactura(empresaId, facturaId);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorCobrarService.getResumen(empresaId);
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
  const registrarPago = useCallback(async (facturaId: string, pago: Omit<PagoFactura, 'id' | 'facturaId' | 'fechaCreacion'>) => {
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
      await cuentasPorCobrarService.registrarPago(empresaId, facturaId, pago);
      
      // Actualizar resumen sin recargar toda la página
      const nuevoResumen = await cuentasPorCobrarService.getResumen(empresaId);
      setResumen(nuevoResumen);
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.map(factura => 
        factura.id === facturaId ? facturaOriginal : factura
      ));
      throw error;
    }
  }, [empresaId, facturas]);

  // Crear cliente
  const crearCliente = useCallback(async (nuevoCliente: Omit<Cliente, 'id' | 'fechaCreacion'>) => {
    if (!empresaId) throw new Error('No hay empresa seleccionada');

    const tempId = `temp_${Date.now()}`;
    const clienteOptimista: Cliente = {
      ...nuevoCliente,
      id: tempId,
      empresaId,
      fechaCreacion: new Date()
    };

    // Actualización optimista
    setClientes(prev => [clienteOptimista, ...prev]);

    try {
      const realId = await cuentasPorCobrarService.crearCliente(empresaId, nuevoCliente);
      
      // Actualizar con el ID real
      setClientes(prev => prev.map(cliente => 
        cliente.id === tempId 
          ? { ...cliente, id: realId }
          : cliente
      ));

      return realId;
    } catch (error) {
      // Revertir si hay error
      setClientes(prev => prev.filter(cliente => cliente.id !== tempId));
      throw error;
    }
  }, [empresaId]);

  return {
    // Estado
    facturas,
    clientes,
    resumen,
    loading,
    error,
    
    // Operaciones
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    registrarPago,
    crearCliente,
    
    // Utilidades
    recargarDatos: cargarDatos,
    limpiarError: () => setError(null)
  };
};