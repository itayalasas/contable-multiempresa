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
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const totalPorCobrar = facturas.reduce((sum, f) => sum + f.saldoPendiente, 0);
    const totalVencido = facturas
      .filter(f => f.estado === 'VENCIDA')
      .reduce((sum, f) => sum + f.saldoPendiente, 0);
    const totalPorVencer = facturas
      .filter(f => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL')
      .reduce((sum, f) => sum + f.saldoPendiente, 0);

    const facturasVencidas = facturas.filter(f => f.estado === 'VENCIDA').length;
    const facturasPendientes = facturas.filter(f => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL').length;
    const facturasDelMes = facturas.filter(f => new Date(f.fechaEmision) >= inicioMes).length;

    // Calcular rangos de vencimiento
    const vencimiento0a30 = facturas.filter(f => {
      const diasVencidos = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return diasVencidos >= 0 && diasVencidos <= 30 && f.saldoPendiente > 0;
    }).reduce((sum, f) => sum + f.saldoPendiente, 0);

    const vencimiento31a60 = facturas.filter(f => {
      const diasVencidos = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return diasVencidos > 30 && diasVencidos <= 60 && f.saldoPendiente > 0;
    }).reduce((sum, f) => sum + f.saldoPendiente, 0);

    const vencimiento61a90 = facturas.filter(f => {
      const diasVencidos = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return diasVencidos > 60 && diasVencidos <= 90 && f.saldoPendiente > 0;
    }).reduce((sum, f) => sum + f.saldoPendiente, 0);

    const vencimientoMas90 = facturas.filter(f => {
      const diasVencidos = Math.floor((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
      return diasVencidos > 90 && f.saldoPendiente > 0;
    }).reduce((sum, f) => sum + f.saldoPendiente, 0);

    // Calcular promedio de cobranza (días entre emisión y pago completo)
    const facturasPagadas = facturas.filter(f => f.estado === 'PAGADA' && f.fechaModificacion);
    const promedioCobranza = facturasPagadas.length > 0
      ? Math.round(facturasPagadas.reduce((sum, f) => {
          const diasCobranza = Math.floor((new Date(f.fechaModificacion!).getTime() - new Date(f.fechaEmision).getTime()) / (1000 * 60 * 60 * 24));
          return sum + diasCobranza;
        }, 0) / facturasPagadas.length)
      : 0;

    // Clientes con deuda
    const clientesUnicos = new Set(facturas.filter(f => f.saldoPendiente > 0).map(f => f.clienteId));
    const clientesConDeuda = clientesUnicos.size;

    return {
      totalFacturas: facturas.length,
      totalPorCobrar,
      totalVencido,
      totalPorVencer,
      facturasPendientes,
      facturasVencidas,
      facturasDelMes,
      promedioCobranza,
      vencimiento0a30,
      vencimiento31a60,
      vencimiento61a90,
      vencimientoMas90,
      clientesConDeuda,
      clientesMayorDeuda: [],
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
      // Construir objeto de pago completo con facturaId
      const pagoCompleto = {
        ...pago,
        facturaId
      };

      await cuentasPorCobrarService.registrarPago(pagoCompleto);

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