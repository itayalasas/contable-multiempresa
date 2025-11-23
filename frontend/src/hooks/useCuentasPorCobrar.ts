import { useState, useEffect, useCallback } from 'react';
import { FacturaPorCobrar, Cliente, PagoFactura, ResumenCuentasPorCobrar } from '../types/cuentasPorCobrar';
import { cuentasPorCobrarSupabaseService as cuentasPorCobrarService } from '../services/supabase/cuentasPorCobrar';

export const useCuentasPorCobrar = (empresaId: string | undefined) => {
  const [facturas, setFacturas] = useState<FacturaPorCobrar[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<ResumenCuentasPorCobrar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calcular resumen desde las facturas
  const calcularResumen = useCallback((facturas: FacturaPorCobrar[]): ResumenCuentasPorCobrar => {
    const totalPorCobrar = facturas.reduce((sum, f) => sum + f.saldoPendiente, 0);
    const totalVencido = facturas
      .filter(f => f.estado === 'VENCIDA')
      .reduce((sum, f) => sum + f.saldoPendiente, 0);
    const totalParcial = facturas
      .filter(f => f.estado === 'PARCIAL')
      .reduce((sum, f) => sum + f.saldoPendiente, 0);
    const totalPendiente = facturas
      .filter(f => f.estado === 'PENDIENTE')
      .reduce((sum, f) => sum + f.saldoPendiente, 0);

    return {
      totalPorCobrar,
      totalVencido,
      totalParcial,
      totalPendiente,
      cantidadFacturas: facturas.length,
      cantidadVencidas: facturas.filter(f => f.estado === 'VENCIDA').length,
    };
  }, []);

  // Cargar datos inicialmente
  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando datos de cuentas por cobrar...');

      const [facturasData, clientesData] = await Promise.all([
        cuentasPorCobrarService.getFacturas(empresaId),
        cuentasPorCobrarService.getClientes(empresaId)
      ]);

      console.log(`✅ Datos cargados: ${facturasData.length} facturas, ${clientesData.length} clientes`);

      setFacturas(facturasData);
      setClientes(clientesData);
      setResumen(calcularResumen(facturasData));
    } catch (err) {
      console.error('❌ Error al cargar cuentas por cobrar:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId, calcularResumen]);

  // Cargar datos cuando cambie la empresa
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Crear factura con actualización optimista
  const crearFactura = useCallback(async (nuevaFactura: Omit<FacturaPorCobrar, 'id' | 'fechaCreacion' | 'fechaModificacion'>) => {
    throw new Error('Las facturas deben crearse desde el módulo de Facturas de Venta');
  }, [empresaId]);

  // Actualizar factura
  const actualizarFactura = useCallback(async (facturaId: string, datos: Partial<FacturaPorCobrar>) => {
    throw new Error('Las facturas deben modificarse desde el módulo de Facturas de Venta');
  }, [empresaId, facturas]);

  // Eliminar factura
  const eliminarFactura = useCallback(async (facturaId: string) => {
    throw new Error('Las facturas deben eliminarse desde el módulo de Facturas de Venta');
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
      await cuentasPorCobrarService.registrarPago(pago);

      // Recargar datos para obtener el estado actualizado
      await cargarDatos();
    } catch (error) {
      // Revertir si hay error
      setFacturas(prev => prev.map(factura => 
        factura.id === facturaId ? facturaOriginal : factura
      ));
      throw error;
    }
  }, [empresaId, facturas, cargarDatos]);

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
      const clienteCreado = await cuentasPorCobrarService.createCliente(nuevoCliente);

      // Actualizar con el cliente real
      setClientes(prev => prev.map(cliente =>
        cliente.id === tempId
          ? clienteCreado
          : cliente
      ));

      return clienteCreado.id;
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