import { supabase } from '../../config/supabase';
import type {
  TipoDocumentoIdentidad,
  TipoDocumentoFactura,
  TipoImpuesto,
  FormaPago,
  TipoMovimientoTesoreria,
  TipoMoneda,
  Banco
} from '../../types/nomencladores';

export const nomencladoresSupabaseService = {
  async getTiposDocumentoIdentidad(paisId: string): Promise<TipoDocumentoIdentidad[]> {
    const { data, error } = await supabase
      .from('tipo_documento_identidad')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      activo: item.activo
    }));
  },

  async getTiposDocumentoFactura(paisId: string): Promise<TipoDocumentoFactura[]> {
    const { data, error } = await supabase
      .from('tipo_documento_factura')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      activo: item.activo,
      requiereImpuesto: item.requiere_impuesto || false,
      requiereCliente: item.requiere_cliente || false,
      afectaInventario: item.afecta_inventario || false,
      afectaContabilidad: item.afecta_contabilidad || false,
      prefijo: item.prefijo,
      formato: item.formato
    }));
  },

  async getTiposImpuesto(paisId: string): Promise<TipoImpuesto[]> {
    const { data, error } = await supabase
      .from('tipo_impuesto')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      porcentaje: item.porcentaje,
      tipo: item.tipo,
      activo: item.activo
    }));
  },

  async getFormasPago(paisId: string): Promise<FormaPago[]> {
    const { data, error } = await supabase
      .from('forma_pago')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      requiereCuenta: item.requiere_cuenta || false,
      diasPlazo: item.dias_plazo,
      activo: item.activo
    }));
  },

  async getTiposMovimiento(paisId: string): Promise<TipoMovimientoTesoreria[]> {
    const { data, error } = await supabase
      .from('tipo_movimiento_tesoreria')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      tipo: item.tipo,
      afectaCaja: item.afecta_caja || false,
      afectaBanco: item.afecta_banco || false,
      activo: item.activo
    }));
  },

  async getTiposMoneda(paisId: string): Promise<TipoMoneda[]> {
    const { data, error } = await supabase
      .from('tipo_moneda')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      simbolo: item.simbolo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      esPrincipal: item.es_principal || false,
      activo: item.activo
    }));
  },

  async getBancos(paisId: string): Promise<Banco[]> {
    const { data, error } = await supabase
      .from('bancos')
      .select('*')
      .eq('pais_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      descripcion: item.descripcion,
      paisId: item.pais_id,
      swift: item.swift,
      activo: item.activo
    }));
  }
};
