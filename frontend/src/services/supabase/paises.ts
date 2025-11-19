import { supabase } from '../../config/supabase';
import type { Pais } from '../../types';

export const paisesSupabaseService = {
  async getPaisById(paisId: string): Promise<Pais | null> {
    const { data, error } = await supabase
      .from('paises')
      .select('*')
      .eq('id', paisId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      nombre: data.nombre,
      codigo: data.codigo,
      codigoISO: data.codigo_iso,
      monedaPrincipal: data.moneda_principal,
      simboloMoneda: data.simbolo_moneda,
      formatoFecha: data.formato_fecha || 'DD/MM/YYYY',
      separadorDecimal: data.separador_decimal || '.',
      separadorMiles: data.separador_miles || ',',
      formatoNumeroIdentificacion: data.formato_numero_identificacion,
      longitudNumeroIdentificacion: data.longitud_numero_identificacion,
      validacionNumeroIdentificacion: data.validacion_numero_identificacion,
      planContableBase: data.plan_contable_base,
      activo: data.activo,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaActualizacion: data.fecha_actualizacion ? new Date(data.fecha_actualizacion) : undefined,
    };
  },

  async getPaisesActivos(): Promise<Pais[]> {
    const { data, error } = await supabase
      .from('paises')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    return data.map(pais => ({
      id: pais.id,
      nombre: pais.nombre,
      codigo: pais.codigo,
      codigoISO: pais.codigo_iso,
      monedaPrincipal: pais.moneda_principal,
      simboloMoneda: pais.simbolo_moneda,
      formatoFecha: pais.formato_fecha || 'DD/MM/YYYY',
      separadorDecimal: pais.separador_decimal || '.',
      separadorMiles: pais.separador_miles || ',',
      formatoNumeroIdentificacion: pais.formato_numero_identificacion,
      longitudNumeroIdentificacion: pais.longitud_numero_identificacion,
      validacionNumeroIdentificacion: pais.validacion_numero_identificacion,
      planContableBase: pais.plan_contable_base,
      activo: pais.activo,
      fechaCreacion: new Date(pais.fecha_creacion),
      fechaActualizacion: pais.fecha_actualizacion ? new Date(pais.fecha_actualizacion) : undefined,
    }));
  },

  async getPaisByCodigo(codigo: string): Promise<Pais | null> {
    const { data, error } = await supabase
      .from('paises')
      .select('*')
      .eq('codigo', codigo.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      nombre: data.nombre,
      codigo: data.codigo,
      codigoISO: data.codigo_iso,
      monedaPrincipal: data.moneda_principal,
      simboloMoneda: data.simbolo_moneda,
      formatoFecha: data.formato_fecha || 'DD/MM/YYYY',
      separadorDecimal: data.separador_decimal || '.',
      separadorMiles: data.separador_miles || ',',
      formatoNumeroIdentificacion: data.formato_numero_identificacion,
      longitudNumeroIdentificacion: data.longitud_numero_identificacion,
      validacionNumeroIdentificacion: data.validacion_numero_identificacion,
      planContableBase: data.plan_contable_base,
      activo: data.activo,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaActualizacion: data.fecha_actualizacion ? new Date(data.fecha_actualizacion) : undefined,
    };
  },

  async getPaisByNombre(nombre: string): Promise<Pais | null> {
    const { data, error } = await supabase
      .from('paises')
      .select('*')
      .eq('nombre', nombre)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      nombre: data.nombre,
      codigo: data.codigo,
      codigoISO: data.codigo_iso,
      monedaPrincipal: data.moneda_principal,
      simboloMoneda: data.simbolo_moneda,
      formatoFecha: data.formato_fecha || 'DD/MM/YYYY',
      separadorDecimal: data.separador_decimal || '.',
      separadorMiles: data.separador_miles || ',',
      formatoNumeroIdentificacion: data.formato_numero_identificacion,
      longitudNumeroIdentificacion: data.longitud_numero_identificacion,
      validacionNumeroIdentificacion: data.validacion_numero_identificacion,
      planContableBase: data.plan_contable_base,
      activo: data.activo,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaActualizacion: data.fecha_actualizacion ? new Date(data.fecha_actualizacion) : undefined,
    };
  },
};
