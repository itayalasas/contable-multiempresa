import { supabase } from '../../config/supabase';
import type { Proveedor, FacturaPorPagar, PagoProveedor } from '../../types/cuentasPorPagar';

export const cuentasPorPagarSupabaseService = {
  async getProveedores(empresaId: string): Promise<Proveedor[]> {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('razon_social');

    if (error) throw error;

    return data.map(proveedor => ({
      id: proveedor.id,
      nombre: proveedor.nombre_comercial || proveedor.razon_social,
      razonSocial: proveedor.razon_social,
      tipoDocumento: proveedor.tipo_documento,
      numeroDocumento: proveedor.numero_documento,
      email: proveedor.email,
      telefono: proveedor.telefono,
      direccion: proveedor.direccion,
      ciudad: proveedor.ciudad,
      departamento: proveedor.departamento,
      codigoPostal: proveedor.codigo_postal,
      contacto: proveedor.contacto,
      activo: proveedor.activo,
      empresaId: proveedor.empresa_id,
      paisId: proveedor.pais_id,
      fechaCreacion: new Date(proveedor.fecha_creacion),
      condicionesPago: proveedor.condiciones_pago,
      diasCredito: proveedor.dias_credito || proveedor.dias_pago,
      cuentaBancaria: proveedor.cuenta_bancaria,
      observaciones: proveedor.observaciones,
      banco: proveedor.banco,
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

  async getResumen(empresaId: string): Promise<any> {
    const { data, error } = await supabase
      .from('facturas_por_pagar')
      .select('estado, monto_total, monto_pagado, saldo_pendiente, fecha_vencimiento')
      .eq('empresa_id', empresaId);

    if (error) throw error;

    const totalPorPagar = data.reduce((sum, f) => sum + (parseFloat(f.saldo_pendiente) || 0), 0);
    const totalPagado = data.reduce((sum, f) => sum + (parseFloat(f.monto_pagado) || 0), 0);
    const facturasPendientes = data.filter(f => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL').length;

    const hoy = new Date();
    const vencidas = data.filter(f => {
      const vencimiento = new Date(f.fecha_vencimiento);
      return vencimiento < hoy && (f.estado === 'PENDIENTE' || f.estado === 'PARCIAL');
    });

    return {
      totalPorPagar,
      totalPagado,
      facturasPendientes,
      facturasVencidas: vencidas.length,
      montoVencido: vencidas.reduce((sum, f) => sum + (parseFloat(f.saldo_pendiente) || 0), 0),
    };
  },

  async actualizarFactura(empresaId: string, facturaId: string, datos: Partial<FacturaPorPagar>): Promise<void> {
    const updateData: any = {};

    if (datos.estado) updateData.estado = datos.estado;
    if (datos.montoPagado !== undefined) updateData.monto_pagado = datos.montoPagado;
    if (datos.saldoPendiente !== undefined) updateData.saldo_pendiente = datos.saldoPendiente;
    if (datos.observaciones) updateData.observaciones = datos.observaciones;

    updateData.fecha_modificacion = new Date().toISOString();

    const { error } = await supabase
      .from('facturas_por_pagar')
      .update(updateData)
      .eq('id', facturaId)
      .eq('empresa_id', empresaId);

    if (error) throw error;
  },

  async eliminarFactura(empresaId: string, facturaId: string): Promise<void> {
    const { error } = await supabase
      .from('facturas_por_pagar')
      .delete()
      .eq('id', facturaId)
      .eq('empresa_id', empresaId);

    if (error) throw error;
  },

  async crearFactura(empresaId: string, factura: Omit<FacturaPorPagar, 'id' | 'proveedor' | 'fechaCreacion'>): Promise<string> {
    const { data, error } = await supabase
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
        monto_pagado: factura.montoPagado || 0,
        saldo_pendiente: factura.saldoPendiente || factura.montoTotal,
        estado: factura.estado,
        moneda: factura.moneda || 'UYU',
        observaciones: factura.observaciones,
        referencia: factura.referencia,
        condiciones_pago: factura.condicionesPago,
        empresa_id: empresaId,
        creado_por: factura.creadoPor,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async crearProveedor(empresaId: string, proveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>): Promise<string> {
    const { data, error } = await supabase
      .from('proveedores')
      .insert({
        nombre_comercial: proveedor.nombre,
        razon_social: proveedor.razonSocial,
        numero_documento: proveedor.numeroDocumento,
        email: proveedor.email,
        telefono: proveedor.telefono,
        direccion: proveedor.direccion,
        activo: proveedor.activo !== false,
        empresa_id: empresaId,
        pais_id: proveedor.paisId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async registrarPago(empresaId: string, facturaId: string, pago: Omit<PagoProveedor, 'id' | 'facturaId' | 'fechaCreacion'>): Promise<void> {
    const pagoCompleto: Omit<PagoProveedor, 'id' | 'fechaCreacion'> = {
      ...pago,
      facturaId,
    };

    const { error } = await supabase
      .from('pagos_proveedor')
      .insert({
        factura_id: pagoCompleto.facturaId,
        fecha_pago: pagoCompleto.fechaPago,
        monto: pagoCompleto.monto,
        tipo_pago: pagoCompleto.tipoPago,
        referencia: pagoCompleto.referencia,
        observaciones: pagoCompleto.observaciones,
        creado_por: pagoCompleto.creadoPor,
        banco: pagoCompleto.banco,
        numero_cuenta: pagoCompleto.numeroCuenta,
        numero_operacion: pagoCompleto.numeroOperacion,
      });

    if (error) throw error;

    const { data: factura } = await supabase
      .from('facturas_por_pagar')
      .select('monto_pagado, monto_total')
      .eq('id', pagoCompleto.facturaId)
      .single();

    if (factura) {
      const nuevoMontoPagado = factura.monto_pagado + pagoCompleto.monto;
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
        .eq('id', pagoCompleto.facturaId);
    }
  },
};
