import { supabase } from '../../config/supabase';
import type { PlanCuenta } from '../../types';

export const planCuentasSupabaseService = {
  async getCuentasByEmpresa(empresaId: string): Promise<PlanCuenta[]> {
    const { data, error } = await supabase
      .from('plan_cuentas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw error;

    return data.map(cuenta => ({
      id: cuenta.id,
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo as 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO',
      nivel: cuenta.nivel,
      cuentaPadre: cuenta.cuenta_padre,
      descripcion: cuenta.descripcion,
      saldo: cuenta.saldo,
      activa: cuenta.activa,
      paisId: cuenta.pais_id,
      empresaId: cuenta.empresa_id,
      fechaCreacion: new Date(cuenta.fecha_creacion),
      fechaModificacion: new Date(cuenta.fecha_modificacion),
      configuracion: cuenta.configuracion,
    }));
  },

  async getCuentasActivas(empresaId: string): Promise<PlanCuenta[]> {
    const { data, error } = await supabase
      .from('plan_cuentas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('codigo');

    if (error) throw error;

    return data.map(cuenta => ({
      id: cuenta.id,
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo as 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO',
      nivel: cuenta.nivel,
      cuentaPadre: cuenta.cuenta_padre,
      descripcion: cuenta.descripcion,
      saldo: cuenta.saldo,
      activa: cuenta.activa,
      paisId: cuenta.pais_id,
      empresaId: cuenta.empresa_id,
      fechaCreacion: new Date(cuenta.fecha_creacion),
      fechaModificacion: new Date(cuenta.fecha_modificacion),
      configuracion: cuenta.configuracion,
    }));
  },

  async createCuenta(cuenta: Omit<PlanCuenta, 'id' | 'fechaCreacion' | 'fechaModificacion'>): Promise<PlanCuenta> {
    const { data, error } = await supabase
      .from('plan_cuentas')
      .insert({
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        nivel: cuenta.nivel,
        cuenta_padre: cuenta.cuentaPadre,
        descripcion: cuenta.descripcion,
        saldo: cuenta.saldo || 0,
        activa: cuenta.activa,
        pais_id: cuenta.paisId,
        empresa_id: cuenta.empresaId,
        configuracion: cuenta.configuracion,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      codigo: data.codigo,
      nombre: data.nombre,
      tipo: data.tipo as 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO',
      nivel: data.nivel,
      cuentaPadre: data.cuenta_padre,
      descripcion: data.descripcion,
      saldo: data.saldo,
      activa: data.activa,
      paisId: data.pais_id,
      empresaId: data.empresa_id,
      fechaCreacion: new Date(data.fecha_creacion),
      fechaModificacion: new Date(data.fecha_modificacion),
      configuracion: data.configuracion,
    };
  },

  async updateCuenta(cuentaId: string, updates: Partial<PlanCuenta>): Promise<void> {
    const updateData: any = { fecha_modificacion: new Date().toISOString() };

    if (updates.nombre) updateData.nombre = updates.nombre;
    if (updates.descripcion !== undefined) updateData.descripcion = updates.descripcion;
    if (updates.activa !== undefined) updateData.activa = updates.activa;
    if (updates.saldo !== undefined) updateData.saldo = updates.saldo;
    if (updates.configuracion) updateData.configuracion = updates.configuracion;

    const { error } = await supabase
      .from('plan_cuentas')
      .update(updateData)
      .eq('id', cuentaId);

    if (error) throw error;
  },

  async deleteCuenta(cuentaId: string): Promise<void> {
    const { error } = await supabase
      .from('plan_cuentas')
      .update({
        activa: false,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', cuentaId);

    if (error) throw error;
  },

  async updateSaldo(cuentaId: string, nuevoSaldo: number): Promise<void> {
    const { error } = await supabase
      .from('plan_cuentas')
      .update({
        saldo: nuevoSaldo,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', cuentaId);

    if (error) throw error;
  },
};
