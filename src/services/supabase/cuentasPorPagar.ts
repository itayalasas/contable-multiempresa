import { supabase } from '../../config/supabase';
import type { Proveedor, FacturaPorPagar, PagoProveedor } from '../../types/cuentasPorPagar';

export const cuentasPorPagarSupabaseService = {
  async getProveedores(empresaId: string): Promise<Proveedor[]> {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(proveedor => ({
      ...proveedor,
      empresaId: proveedor.empresa_id,
      fechaCreacion: new Date(proveedor.fecha_creacion),
      condicionesPago: proveedor.condiciones_pago,
      diasCredito: proveedor.dias_credito,
      cuentaBancaria: proveedor.cuenta_bancaria,
    }));
  },

  async createProveedor(proveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>): Promise<Proveedor> {
    const { data, error } = await supabase
      .from('proveedores')
      .insert({
        nombre: proveedor.nombre,
        razon_social: proveedor.razonSocial,
        tipo_documento: proveedor.tipoDocumento,
        numero_documento: proveedor.numeroDocumento,
        email: proveedor.email,
        telefono: proveedor.telefono,
        direccion: proveedor.direccion,
        contacto: proveedor.contacto,
        activo: proveedor.activo,
        empresa_id: proveedor.empresaId,
        condiciones_pago: proveedor.condicionesPago,
        dias_credito: proveedor.diasCredito,
        observaciones: proveedor.observaciones,
        cuenta_bancaria: proveedor.cuentaBancaria,
        banco: proveedor.banco,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      empresaId: data.empresa_id,
      fechaCreacion: new Date(data.fecha_creacion),
      condicionesPago: data.condiciones_pago,
      diasCredito: data.dias_credito,
      cuentaBancaria: data.cuenta_bancaria,
    };
  },

  async getFacturas(empresaId: string): Promise<FacturaPorPagar[]> {
    const { data, error } = await supabase
      .from('facturas_por_pagar')
      .select(`
        *,
        proveedor:proveedores (*),
        items_factura_pagar (*)
      `)
      .eq('empresa_id', empresaId)
      .order('fecha_emision', { ascending: false });

    if (error) throw error;

    return data.map(factura => ({
      id: factura.id,
      numero: factura.numero,
      tipoDocumento: factura.tipo_documento as any,
      proveedorId: factura.proveedor_id,
      proveedor: {
        ...factura.proveedor,
        empresaId: factura.proveedor.empresa_id,
        fechaCreacion: new Date(factura.proveedor.fecha_creacion),
        condicionesPago: factura.proveedor.condiciones_pago,
        diasCredito: factura.proveedor.dias_credito,
        cuentaBancaria: factura.proveedor.cuenta_bancaria,
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
      items: factura.items_factura_pagar.map((item: any) => ({
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

  async createFactura(factura: Omit<FacturaPorPagar, 'id' | 'proveedor' | 'fechaCreacion'>): Promise<FacturaPorPagar> {
    const { data: facturaData, error: facturaError } = await supabase
      .from('facturas_por_pagar')
      .insert({
        numero: factura.numero,
        tipo_documento: factura.tipoDocumento,
        proveedor_id: factura.proveedorId,
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
      .from('items_factura_pagar')
      .insert(items);

    if (itemsError) throw itemsError;

    const { data: proveedorData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', factura.proveedorId)
      .single();

    return {
      ...facturaData,
      tipoDocumento: facturaData.tipo_documento as any,
      proveedorId: facturaData.proveedor_id,
      proveedor: proveedorData ? {
        ...proveedorData,
        empresaId: proveedorData.empresa_id,
        fechaCreacion: new Date(proveedorData.fecha_creacion),
        condicionesPago: proveedorData.condiciones_pago,
        diasCredito: proveedorData.dias_credito,
        cuentaBancaria: proveedorData.cuenta_bancaria,
      } : {} as Proveedor,
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

  async registrarPago(pago: Omit<PagoProveedor, 'id' | 'fechaCreacion'>): Promise<void> {
    const { error } = await supabase
      .from('pagos_proveedor')
      .insert({
        factura_id: pago.facturaId,
        fecha_pago: pago.fechaPago,
        monto: pago.monto,
        tipo_pago: pago.tipoPago,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        creado_por: pago.creadoPor,
        banco: pago.banco,
        numero_cuenta: pago.numeroCuenta,
        numero_operacion: pago.numeroOperacion,
      });

    if (error) throw error;

    const { data: factura } = await supabase
      .from('facturas_por_pagar')
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
        .from('facturas_por_pagar')
        .update({
          monto_pagado: nuevoMontoPagado,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
          fecha_modificacion: new Date().toISOString(),
        })
        .eq('id', pago.facturaId);
    }
  },

  async getPagos(facturaId: string): Promise<PagoProveedor[]> {
    const { data, error } = await supabase
      .from('pagos_proveedor')
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
      banco: pago.banco,
      numeroCuenta: pago.numero_cuenta,
      numeroOperacion: pago.numero_operacion,
    }));
  },
};
