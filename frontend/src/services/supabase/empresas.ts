import { supabase } from '../../config/supabase';
import type { Empresa } from '../../types';

export const empresasSupabaseService = {
  async getEmpresasByUsuario(usuarioId: string): Promise<Empresa[]> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .contains('usuarios_asignados', [usuarioId])
      .eq('activa', true)
      .order('nombre');

    if (error) throw error;

    return data.map(empresa => ({
      ...empresa,
      fechaCreacion: new Date(empresa.fecha_creacion),
      fechaActualizacion: empresa.fecha_actualizacion ? new Date(empresa.fecha_actualizacion) : undefined,
      configuracionContable: {
        ...empresa.configuracion_contable,
        fechaInicioEjercicio: new Date(empresa.configuracion_contable.fecha_inicio_ejercicio),
        fechaFinEjercicio: new Date(empresa.configuracion_contable.fecha_fin_ejercicio),
      },
    }));
  },

  async getEmpresaById(empresaId: string): Promise<Empresa | null> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaActualizacion: data.fecha_actualizacion ? new Date(data.fecha_actualizacion) : undefined,
      configuracionContable: {
        ...data.configuracion_contable,
        fechaInicioEjercicio: new Date(data.configuracion_contable.fecha_inicio_ejercicio),
        fechaFinEjercicio: new Date(data.configuracion_contable.fecha_fin_ejercicio),
      },
    };
  },

  async createEmpresa(empresa: Omit<Empresa, 'id' | 'fechaCreacion'>): Promise<Empresa> {
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        nombre: empresa.nombre,
        razon_social: empresa.razonSocial,
        numero_identificacion: empresa.numeroIdentificacion,
        pais_id: empresa.paisId,
        subdominio: empresa.subdominio,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        email: empresa.email,
        moneda_principal: empresa.monedaPrincipal,
        logo: empresa.logo,
        activa: empresa.activa,
        usuarios_asignados: empresa.usuariosAsignados,
        plan_contable_id: empresa.planContableId,
        configuracion_contable: {
          ejercicio_fiscal: empresa.configuracionContable.ejercicioFiscal,
          fecha_inicio_ejercicio: empresa.configuracionContable.fechaInicioEjercicio,
          fecha_fin_ejercicio: empresa.configuracionContable.fechaFinEjercicio,
          metodo_costeo: empresa.configuracionContable.metodoCosteo,
          tipo_inventario: empresa.configuracionContable.tipoInventario,
          maneja_inventario: empresa.configuracionContable.manejaInventario,
          decimales_moneda: empresa.configuracionContable.decimalesMoneda,
          decimales_cantidades: empresa.configuracionContable.decimalesCantidades,
          numeracion_automatica: empresa.configuracionContable.numeracionAutomatica,
          prefijo_asientos: empresa.configuracionContable.prefijoAsientos,
          longitud_numeracion: empresa.configuracionContable.longitudNumeracion,
          regimen_tributario: empresa.configuracionContable.regimenTributario,
          configuracion_impuestos: empresa.configuracionContable.configuracionImpuestos,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaActualizacion: data.fecha_actualizacion ? new Date(data.fecha_actualizacion) : undefined,
      configuracionContable: {
        ...data.configuracion_contable,
        fechaInicioEjercicio: new Date(data.configuracion_contable.fecha_inicio_ejercicio),
        fechaFinEjercicio: new Date(data.configuracion_contable.fecha_fin_ejercicio),
      },
    };
  },

  async updateEmpresa(empresaId: string, updates: Partial<Empresa>): Promise<void> {
    const updateData: any = {};

    if (updates.nombre) updateData.nombre = updates.nombre;
    if (updates.razonSocial) updateData.razon_social = updates.razonSocial;
    if (updates.numeroIdentificacion) updateData.numero_identificacion = updates.numeroIdentificacion;
    if (updates.direccion) updateData.direccion = updates.direccion;
    if (updates.telefono) updateData.telefono = updates.telefono;
    if (updates.email) updateData.email = updates.email;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.activa !== undefined) updateData.activa = updates.activa;
    if (updates.usuariosAsignados) updateData.usuarios_asignados = updates.usuariosAsignados;

    if (updates.configuracionContable) {
      updateData.configuracion_contable = {
        ejercicio_fiscal: updates.configuracionContable.ejercicioFiscal,
        fecha_inicio_ejercicio: updates.configuracionContable.fechaInicioEjercicio,
        fecha_fin_ejercicio: updates.configuracionContable.fechaFinEjercicio,
        metodo_costeo: updates.configuracionContable.metodoCosteo,
        tipo_inventario: updates.configuracionContable.tipoInventario,
        maneja_inventario: updates.configuracionContable.manejaInventario,
        decimales_moneda: updates.configuracionContable.decimalesMoneda,
        decimales_cantidades: updates.configuracionContable.decimalesCantidades,
        numeracion_automatica: updates.configuracionContable.numeracionAutomatica,
        prefijo_asientos: updates.configuracionContable.prefijoAsientos,
        longitud_numeracion: updates.configuracionContable.longitudNumeracion,
        regimen_tributario: updates.configuracionContable.regimenTributario,
        configuracion_impuestos: updates.configuracionContable.configuracionImpuestos,
      };
    }

    updateData.fecha_actualizacion = new Date().toISOString();

    const { error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', empresaId);

    if (error) throw error;
  },

  async deleteEmpresa(empresaId: string): Promise<void> {
    const { error } = await supabase
      .from('empresas')
      .update({ activa: false, fecha_actualizacion: new Date().toISOString() })
      .eq('id', empresaId);

    if (error) throw error;
  },
};
