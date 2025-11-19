import { supabase } from '../../config/supabase';
import type { Cliente, FacturaPorCobrar, PagoFactura } from '../../types/cuentasPorCobrar';

export const cuentasPorCobrarSupabaseService = {
  async getClientes(empresaId: string): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(cliente => ({
      ...cliente,
      empresaId: cliente.empresa_id,
      fechaCreacion: new Date(cliente.fecha_creacion),
      limiteCredito: cliente.limite_credito,
      diasCredito: cliente.dias_credito,
    }));
  },

  async createCliente(cliente: Omit<Cliente, 'id' | 'fechaCreacion'>): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: cliente.nombre,
        razon_social: cliente.razonSocial,
        tipo_documento: cliente.tipoDocumento,
        numero_documento: cliente.numeroDocumento,
        email: cliente.email,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        contacto: cliente.contacto,
        activo: cliente.activo,
        empresa_id: cliente.empresaId,
        limite_credito: cliente.limiteCredito,
        dias_credito: cliente.diasCredito,
        observaciones: cliente.observaciones,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      empresaId: data.empresa_id,
      fechaCreacion: new Date(data.fecha_creacion),
      limiteCredito: data.limite_credito,
      diasCredito: data.dias_credito,
    };
  },

  async getFacturas(empresaId: string): Promise<FacturaPorCobrar[]> {
    const { data, error } = await supabase
      .from('facturas_por_cobrar')
      .select(`
        *,
        cliente:clientes (*),
        items_factura_cobrar (*)
      `)
      .eq('empresa_id', empresaId)
      .order('fecha_emision', { ascending: false });

    if (error) throw error;

    return data.map(factura => ({
      id: factura.id,
      numero: factura.numero,
      tipoDocumento: factura.tipo_documento as any,
      clienteId: factura.cliente_id,
      cliente: {
        ...factura.cliente,
        empresaId: factura.cliente.empresa_id,
        fechaCreacion: new Date(factura.cliente.fecha_creacion),
        limiteCredito: factura.cliente.limite_credito,
        diasCredito: factura.cliente.dias_credito,
      },
      fechaEmision: factura.fecha_emision,
      fechaVencimiento: factura.fecha_vencimiento,
      descripcion: factura.descripcion,
      montoSubtotal: factura.monto_subtotal,
      montoImpuestos: factura.monto_impuestos,
      montoTotal: factura.monto_total,
      montoPagado: factura.monto_pagado,
      saldoPendiente: factura.saldo_pendiente,
      estado: factura.estado as any,
      moneda: factura.moneda,
      items: factura.items_factura_cobrar.map((item: any) => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario,
        descuento: item.descuento,
        impuesto: item.impuesto,
        total: item.total,
      })),
      observaciones: factura.observaciones,
      referencia: factura.referencia,
      condicionesPago: factura.condiciones_pago,
      empresaId: factura.empresa_id,
      creadoPor: factura.creado_por,
      fechaCreacion: factura.fecha_creacion,
      fechaModificacion: factura.fecha_modificacion,
    }));
  },

  async createFactura(factura: Omit<FacturaPorCobrar, 'id' | 'cliente' | 'fechaCreacion'>): Promise<FacturaPorCobrar> {
    const { data: facturaData, error: facturaError } = await supabase
      .from('facturas_por_cobrar')
      .insert({
        numero: factura.numero,
        tipo_documento: factura.tipoDocumento,
        cliente_id: factura.clienteId,
        fecha_emision: factura.fechaEmision,
        fecha_vencimiento: factura.fechaVencimiento,
        descripcion: factura.descripcion,
        monto_subtotal: factura.montoSubtotal,
        monto_impuestos: factura.montoImpuestos,
        monto_total: factura.montoTotal,
        monto_pagado: factura.montoPagado,
        saldo_pendiente: factura.saldoPendiente,
        estado: factura.estado,
        moneda: factura.moneda,
        observaciones: factura.observaciones,
        referencia: factura.referencia,
        condiciones_pago: factura.condicionesPago,
        empresa_id: factura.empresaId,
        creado_por: factura.creadoPor,
      })
      .select()
      .single();

    if (facturaError) throw facturaError;

    const items = factura.items.map(item => ({
      factura_id: facturaData.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      descuento: item.descuento || 0,
      impuesto: item.impuesto || 0,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from('items_factura_cobrar')
      .insert(items);

    if (itemsError) throw itemsError;

    const { data: clienteData } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', factura.clienteId)
      .single();

    return {
      ...facturaData,
      tipoDocumento: facturaData.tipo_documento as any,
      clienteId: facturaData.cliente_id,
      cliente: clienteData ? {
        ...clienteData,
        empresaId: clienteData.empresa_id,
        fechaCreacion: new Date(clienteData.fecha_creacion),
        limiteCredito: clienteData.limite_credito,
        diasCredito: clienteData.dias_credito,
      } : {} as Cliente,
      fechaEmision: facturaData.fecha_emision,
      fechaVencimiento: facturaData.fecha_vencimiento,
      montoSubtotal: facturaData.monto_subtotal,
      montoImpuestos: facturaData.monto_impuestos,
      montoTotal: facturaData.monto_total,
      montoPagado: facturaData.monto_pagado,
      saldoPendiente: facturaData.saldo_pendiente,
      estado: facturaData.estado as any,
      items: factura.items,
      condicionesPago: facturaData.condiciones_pago,
      empresaId: facturaData.empresa_id,
      creadoPor: facturaData.creado_por,
      fechaCreacion: facturaData.fecha_creacion,
      fechaModificacion: facturaData.fecha_modificacion,
    };
  },

  async registrarPago(pago: Omit<PagoFactura, 'id' | 'fechaCreacion'>): Promise<void> {
    const { error } = await supabase
      .from('pagos_factura')
      .insert({
        factura_id: pago.facturaId,
        fecha_pago: pago.fechaPago,
        monto: pago.monto,
        tipo_pago: pago.tipoPago,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        creado_por: pago.creadoPor,
      });

    if (error) throw error;

    const { data: factura } = await supabase
      .from('facturas_por_cobrar')
      .select('monto_pagado, monto_total')
      .eq('id', pago.facturaId)
      .single();

    if (factura) {
      const nuevoMontoPagado = factura.monto_pagado + pago.monto;
      const nuevoSaldo = factura.monto_total - nuevoMontoPagado;
      let nuevoEstado = 'PENDIENTE';

      if (nuevoSaldo === 0) {
        nuevoEstado = 'PAGADA';
      } else if (nuevoMontoPagado > 0) {
        nuevoEstado = 'PARCIAL';
      }

      await supabase
        .from('facturas_por_cobrar')
        .update({
          monto_pagado: nuevoMontoPagado,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
          fecha_modificacion: new Date().toISOString(),
        })
        .eq('id', pago.facturaId);
    }
  },

  async getPagos(facturaId: string): Promise<PagoFactura[]> {
    const { data, error } = await supabase
      .from('pagos_factura')
      .select('*')
      .eq('factura_id', facturaId)
      .order('fecha_pago', { ascending: false });

    if (error) throw error;

    return data.map(pago => ({
      id: pago.id,
      facturaId: pago.factura_id,
      fechaPago: pago.fecha_pago,
      monto: pago.monto,
      tipoPago: pago.tipo_pago as any,
      referencia: pago.referencia,
      observaciones: pago.observaciones,
      creadoPor: pago.creado_por,
      fechaCreacion: pago.fecha_creacion,
    }));
  },
};
