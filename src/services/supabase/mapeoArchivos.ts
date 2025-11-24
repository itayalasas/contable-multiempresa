import { supabase } from '../../config/supabase';

export interface MapeoArchivoBancario {
  id: string;
  empresaId: string;
  nombre: string;
  bancoId: string;
  bancoNombre: string;
  formatoArchivo: string;
  delimitador: string;
  formatoFecha: string;
  tieneEncabezado: boolean;
  tieneTotales: boolean;
  codificacion: string;
  configCampos: any;
  rutEmpresa?: string;
  cuentaDebito?: string;
  tipoCuentaDebito?: string;
  activo: boolean;
  creadoPor?: string;
  fechaCreacion: string;
  fechaModificacion?: string;
}

export interface LotePagoBancario {
  id: string;
  empresaId: string;
  mapeoConfigId: string;
  numeroLote: string;
  fechaProceso: string;
  fechaValor?: string;
  cantidadPagos: number;
  montoTotal: number;
  moneda: string;
  estado: 'GENERADO' | 'DESCARGADO' | 'CARGADO_BANCO' | 'PROCESADO' | 'ERROR';
  nombreArchivo?: string;
  contenidoArchivo?: string;
  generadoPor?: string;
  fechaGeneracion: string;
  fechaDescarga?: string;
  observaciones?: string;
}

export interface PagoLote {
  id: string;
  loteId: string;
  pagoId: string;
  tipoPago: 'PROVEEDOR' | 'CLIENTE' | 'PARTNER';
  monto: number;
  beneficiario: string;
  rutBeneficiario?: string;
  cuentaBeneficiario?: string;
  tipoCuentaBeneficiario?: string;
  concepto?: string;
  fechaCreacion: string;
}

export const mapeoArchivosSupabaseService = {
  async getMapeos(empresaId: string): Promise<MapeoArchivoBancario[]> {
    const { data, error } = await supabase
      .from('mapeo_archivos_bancarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('banco_nombre');

    if (error) throw error;

    return data.map(mapeo => ({
      id: mapeo.id,
      empresaId: mapeo.empresa_id,
      nombre: mapeo.nombre,
      bancoId: mapeo.banco_id,
      bancoNombre: mapeo.banco_nombre,
      formatoArchivo: mapeo.formato_archivo,
      delimitador: mapeo.delimitador,
      formatoFecha: mapeo.formato_fecha,
      tieneEncabezado: mapeo.tiene_encabezado,
      tieneTotales: mapeo.tiene_totales,
      codificacion: mapeo.codificacion,
      configCampos: mapeo.config_campos,
      rutEmpresa: mapeo.rut_empresa,
      cuentaDebito: mapeo.cuenta_debito,
      tipoCuentaDebito: mapeo.tipo_cuenta_debito,
      activo: mapeo.activo,
      creadoPor: mapeo.creado_por,
      fechaCreacion: mapeo.fecha_creacion,
      fechaModificacion: mapeo.fecha_modificacion,
    }));
  },

  async getMapeo(id: string): Promise<MapeoArchivoBancario> {
    const { data, error } = await supabase
      .from('mapeo_archivos_bancarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      empresaId: data.empresa_id,
      nombre: data.nombre,
      bancoId: data.banco_id,
      bancoNombre: data.banco_nombre,
      formatoArchivo: data.formato_archivo,
      delimitador: data.delimitador,
      formatoFecha: data.formato_fecha,
      tieneEncabezado: data.tiene_encabezado,
      tieneTotales: data.tiene_totales,
      codificacion: data.codificacion,
      configCampos: data.config_campos,
      rutEmpresa: data.rut_empresa,
      cuentaDebito: data.cuenta_debito,
      tipoCuentaDebito: data.tipo_cuenta_debito,
      activo: data.activo,
      creadoPor: data.creado_por,
      fechaCreacion: data.fecha_creacion,
      fechaModificacion: data.fecha_modificacion,
    };
  },

  async createMapeo(mapeo: Omit<MapeoArchivoBancario, 'id' | 'fechaCreacion'>): Promise<MapeoArchivoBancario> {
    const { data, error } = await supabase
      .from('mapeo_archivos_bancarios')
      .insert({
        empresa_id: mapeo.empresaId,
        nombre: mapeo.nombre,
        banco_id: mapeo.bancoId,
        banco_nombre: mapeo.bancoNombre,
        formato_archivo: mapeo.formatoArchivo,
        delimitador: mapeo.delimitador,
        formato_fecha: mapeo.formatoFecha,
        tiene_encabezado: mapeo.tieneEncabezado,
        tiene_totales: mapeo.tieneTotales,
        codificacion: mapeo.codificacion,
        config_campos: mapeo.configCampos,
        rut_empresa: mapeo.rutEmpresa,
        cuenta_debito: mapeo.cuentaDebito,
        tipo_cuenta_debito: mapeo.tipoCuentaDebito,
        activo: mapeo.activo,
        creado_por: mapeo.creadoPor,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      empresaId: data.empresa_id,
      nombre: data.nombre,
      bancoId: data.banco_id,
      bancoNombre: data.banco_nombre,
      formatoArchivo: data.formato_archivo,
      delimitador: data.delimitador,
      formatoFecha: data.formato_fecha,
      tieneEncabezado: data.tiene_encabezado,
      tieneTotales: data.tiene_totales,
      codificacion: data.codificacion,
      configCampos: data.config_campos,
      rutEmpresa: data.rut_empresa,
      cuentaDebito: data.cuenta_debito,
      tipoCuentaDebito: data.tipo_cuenta_debito,
      activo: data.activo,
      creadoPor: data.creado_por,
      fechaCreacion: data.fecha_creacion,
      fechaModificacion: data.fecha_modificacion,
    };
  },

  async updateMapeo(id: string, updates: Partial<MapeoArchivoBancario>): Promise<void> {
    const updateData: any = {
      fecha_modificacion: new Date().toISOString(),
    };

    if (updates.nombre) updateData.nombre = updates.nombre;
    if (updates.rutEmpresa !== undefined) updateData.rut_empresa = updates.rutEmpresa;
    if (updates.cuentaDebito !== undefined) updateData.cuenta_debito = updates.cuentaDebito;
    if (updates.tipoCuentaDebito !== undefined) updateData.tipo_cuenta_debito = updates.tipoCuentaDebito;
    if (updates.configCampos !== undefined) updateData.config_campos = updates.configCampos;
    if (updates.activo !== undefined) updateData.activo = updates.activo;

    const { error } = await supabase
      .from('mapeo_archivos_bancarios')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  },

  async getLotes(empresaId: string, estado?: string): Promise<LotePagoBancario[]> {
    let query = supabase
      .from('lotes_pago_bancario')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_proceso', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(lote => ({
      id: lote.id,
      empresaId: lote.empresa_id,
      mapeoConfigId: lote.mapeo_config_id,
      numeroLote: lote.numero_lote,
      fechaProceso: lote.fecha_proceso,
      fechaValor: lote.fecha_valor,
      cantidadPagos: lote.cantidad_pagos,
      montoTotal: lote.monto_total,
      moneda: lote.moneda,
      estado: lote.estado,
      nombreArchivo: lote.nombre_archivo,
      contenidoArchivo: lote.contenido_archivo,
      generadoPor: lote.generado_por,
      fechaGeneracion: lote.fecha_generacion,
      fechaDescarga: lote.fecha_descarga,
      observaciones: lote.observaciones,
    }));
  },

  async createLote(lote: Omit<LotePagoBancario, 'id' | 'fechaGeneracion'>): Promise<LotePagoBancario> {
    const { data, error } = await supabase
      .from('lotes_pago_bancario')
      .insert({
        empresa_id: lote.empresaId,
        mapeo_config_id: lote.mapeoConfigId,
        numero_lote: lote.numeroLote,
        fecha_proceso: lote.fechaProceso,
        fecha_valor: lote.fechaValor,
        cantidad_pagos: lote.cantidadPagos,
        monto_total: lote.montoTotal,
        moneda: lote.moneda,
        estado: lote.estado,
        nombre_archivo: lote.nombreArchivo,
        contenido_archivo: lote.contenidoArchivo,
        generado_por: lote.generadoPor,
        observaciones: lote.observaciones,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      empresaId: data.empresa_id,
      mapeoConfigId: data.mapeo_config_id,
      numeroLote: data.numero_lote,
      fechaProceso: data.fecha_proceso,
      fechaValor: data.fecha_valor,
      cantidadPagos: data.cantidad_pagos,
      montoTotal: data.monto_total,
      moneda: data.moneda,
      estado: data.estado,
      nombreArchivo: data.nombre_archivo,
      contenidoArchivo: data.contenido_archivo,
      generadoPor: data.generado_por,
      fechaGeneracion: data.fecha_generacion,
      fechaDescarga: data.fecha_descarga,
      observaciones: data.observaciones,
    };
  },

  async updateLoteEstado(loteId: string, estado: string, observaciones?: string): Promise<void> {
    const updateData: any = { estado };

    if (observaciones) {
      updateData.observaciones = observaciones;
    }

    if (estado === 'DESCARGADO') {
      updateData.fecha_descarga = new Date().toISOString();
    }

    const { error } = await supabase
      .from('lotes_pago_bancario')
      .update(updateData)
      .eq('id', loteId);

    if (error) throw error;
  },

  async addPagosALote(loteId: string, pagos: Omit<PagoLote, 'id' | 'loteId' | 'fechaCreacion'>[]): Promise<void> {
    const pagosData = pagos.map(pago => ({
      lote_id: loteId,
      pago_id: pago.pagoId,
      tipo_pago: pago.tipoPago,
      monto: pago.monto,
      beneficiario: pago.beneficiario,
      rut_beneficiario: pago.rutBeneficiario,
      cuenta_beneficiario: pago.cuentaBeneficiario,
      tipo_cuenta_beneficiario: pago.tipoCuentaBeneficiario,
      concepto: pago.concepto,
    }));

    const { error } = await supabase
      .from('pagos_lote')
      .insert(pagosData);

    if (error) throw error;
  },

  async getPagosLote(loteId: string): Promise<PagoLote[]> {
    const { data, error } = await supabase
      .from('pagos_lote')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha_creacion');

    if (error) throw error;

    return data.map(pago => ({
      id: pago.id,
      loteId: pago.lote_id,
      pagoId: pago.pago_id,
      tipoPago: pago.tipo_pago,
      monto: pago.monto,
      beneficiario: pago.beneficiario,
      rutBeneficiario: pago.rut_beneficiario,
      cuentaBeneficiario: pago.cuenta_beneficiario,
      tipoCuentaBeneficiario: pago.tipo_cuenta_beneficiario,
      concepto: pago.concepto,
      fechaCreacion: pago.fecha_creacion,
    }));
  },
};
