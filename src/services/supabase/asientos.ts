import { supabase } from '../../config/supabase';
import type { AsientoContable, MovimientoContable } from '../../types';
import { periodosContablesService } from './periodosContables';

export const asientosSupabaseService = {
  async getAsientosByEmpresa(empresaId: string, limit?: number): Promise<AsientoContable[]> {
    let query = supabase
      .from('asientos_contables')
      .select(`
        *,
        movimientos_contables (*)
      `)
      .eq('empresa_id', empresaId)
      .eq('ocultar_en_listados', false)
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(asiento => ({
      id: asiento.id,
      numero: asiento.numero,
      fecha: asiento.fecha,
      descripcion: asiento.descripcion,
      referencia: asiento.referencia,
      estado: asiento.estado as 'borrador' | 'confirmado' | 'anulado',
      movimientos: asiento.movimientos_contables.map((mov: any) => ({
        id: mov.id,
        cuentaId: mov.cuenta_id,
        cuenta: mov.cuenta,
        debito: mov.debito,
        credito: mov.credito,
        descripcion: mov.descripcion,
        terceroId: mov.tercero_id,
        tercero: mov.tercero,
        documentoReferencia: mov.documento_referencia,
        centroCosto: mov.centro_costo,
      })),
      empresaId: asiento.empresa_id,
      paisId: asiento.pais_id,
      creadoPor: asiento.creado_por,
      fechaCreacion: asiento.fecha_creacion,
      fechaModificacion: asiento.fecha_modificacion,
      documentoSoporte: asiento.documento_soporte,
      centroCosto: asiento.centro_costo,
      proyecto: asiento.proyecto,
    }));
  },

  async getAsientosByEmpresaFechas(
    empresaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<AsientoContable[]> {
    const { data, error } = await supabase
      .from('asientos_contables')
      .select(`
        *,
        movimientos_contables (*)
      `)
      .eq('empresa_id', empresaId)
      .eq('ocultar_en_listados', false)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false });

    if (error) throw error;

    return data.map(asiento => ({
      id: asiento.id,
      numero: asiento.numero,
      fecha: asiento.fecha,
      descripcion: asiento.descripcion,
      referencia: asiento.referencia,
      estado: asiento.estado as 'borrador' | 'confirmado' | 'anulado',
      movimientos: asiento.movimientos_contables.map((mov: any) => ({
        id: mov.id,
        cuentaId: mov.cuenta_id,
        cuenta: mov.cuenta,
        debito: mov.debito,
        credito: mov.credito,
        descripcion: mov.descripcion,
        terceroId: mov.tercero_id,
        tercero: mov.tercero,
        documentoReferencia: mov.documento_referencia,
        centroCosto: mov.centro_costo,
      })),
      empresaId: asiento.empresa_id,
      paisId: asiento.pais_id,
      creadoPor: asiento.creado_por,
      fechaCreacion: asiento.fecha_creacion,
      fechaModificacion: asiento.fecha_modificacion,
      documentoSoporte: asiento.documento_soporte,
      centroCosto: asiento.centro_costo,
      proyecto: asiento.proyecto,
    }));
  },

  async getAsientoById(asientoId: string): Promise<AsientoContable | null> {
    const { data, error } = await supabase
      .from('asientos_contables')
      .select(`
        *,
        movimientos_contables (*)
      `)
      .eq('id', asientoId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      numero: data.numero,
      fecha: data.fecha,
      descripcion: data.descripcion,
      referencia: data.referencia,
      estado: data.estado as 'borrador' | 'confirmado' | 'anulado',
      movimientos: data.movimientos_contables.map((mov: any) => ({
        id: mov.id,
        cuentaId: mov.cuenta_id,
        cuenta: mov.cuenta,
        debito: mov.debito,
        credito: mov.credito,
        descripcion: mov.descripcion,
        terceroId: mov.tercero_id,
        tercero: mov.tercero,
        documentoReferencia: mov.documento_referencia,
        centroCosto: mov.centro_costo,
      })),
      empresaId: data.empresa_id,
      paisId: data.pais_id,
      creadoPor: data.creado_por,
      fechaCreacion: data.fecha_creacion,
      fechaModificacion: data.fecha_modificacion,
      documentoSoporte: data.documento_soporte,
      centroCosto: data.centro_costo,
      proyecto: data.proyecto,
    };
  },

  async createAsiento(asiento: Omit<AsientoContable, 'id' | 'fechaCreacion'>): Promise<AsientoContable> {
    const periodoAbierto = await periodosContablesService.validarFechaEnPeriodoAbierto(
      asiento.empresaId,
      asiento.fecha
    );

    if (!periodoAbierto) {
      throw new Error('No se puede crear un asiento en un período cerrado. Por favor, selecciona una fecha en un período abierto.');
    }

    const { data: asientoData, error: asientoError } = await supabase
      .from('asientos_contables')
      .insert({
        numero: asiento.numero,
        fecha: asiento.fecha,
        descripcion: asiento.descripcion,
        referencia: asiento.referencia,
        estado: asiento.estado,
        empresa_id: asiento.empresaId,
        pais_id: asiento.paisId,
        creado_por: asiento.creadoPor,
        documento_soporte: asiento.documentoSoporte,
        centro_costo: asiento.centroCosto,
        proyecto: asiento.proyecto,
      })
      .select()
      .single();

    if (asientoError) {
      if (asientoError.message.includes('periodo cerrado')) {
        throw new Error('El período contable está cerrado. No se pueden crear asientos en este período.');
      }
      throw asientoError;
    }

    const movimientos = asiento.movimientos.map(mov => ({
      asiento_id: asientoData.id,
      cuenta_id: mov.cuentaId,
      cuenta: mov.cuenta,
      debito: mov.debito || 0,
      credito: mov.credito || 0,
      descripcion: mov.descripcion,
      tercero_id: mov.terceroId,
      tercero: mov.tercero,
      documento_referencia: mov.documentoReferencia,
      centro_costo: mov.centroCosto,
    }));

    const { data: movimientosData, error: movimientosError } = await supabase
      .from('movimientos_contables')
      .insert(movimientos)
      .select();

    if (movimientosError) throw movimientosError;

    return {
      id: asientoData.id,
      numero: asientoData.numero,
      fecha: asientoData.fecha,
      descripcion: asientoData.descripcion,
      referencia: asientoData.referencia,
      estado: asientoData.estado as 'borrador' | 'confirmado' | 'anulado',
      movimientos: movimientosData.map(mov => ({
        id: mov.id,
        cuentaId: mov.cuenta_id,
        cuenta: mov.cuenta,
        debito: mov.debito,
        credito: mov.credito,
        descripcion: mov.descripcion,
        terceroId: mov.tercero_id,
        tercero: mov.tercero,
        documentoReferencia: mov.documento_referencia,
        centroCosto: mov.centro_costo,
      })),
      empresaId: asientoData.empresa_id,
      paisId: asientoData.pais_id,
      creadoPor: asientoData.creado_por,
      fechaCreacion: asientoData.fecha_creacion,
      fechaModificacion: asientoData.fecha_modificacion,
      documentoSoporte: asientoData.documento_soporte,
      centroCosto: asientoData.centro_costo,
      proyecto: asientoData.proyecto,
    };
  },

  async updateAsiento(asientoId: string, updates: Partial<AsientoContable>): Promise<void> {
    if (updates.fecha && updates.empresaId) {
      const periodoAbierto = await periodosContablesService.validarFechaEnPeriodoAbierto(
        updates.empresaId,
        updates.fecha
      );

      if (!periodoAbierto) {
        throw new Error('No se puede modificar un asiento en un período cerrado.');
      }
    }

    const updateData: any = { fecha_modificacion: new Date().toISOString() };

    if (updates.fecha) updateData.fecha = updates.fecha;
    if (updates.descripcion) updateData.descripcion = updates.descripcion;
    if (updates.referencia !== undefined) updateData.referencia = updates.referencia;
    if (updates.estado) updateData.estado = updates.estado;
    if (updates.documentoSoporte) updateData.documento_soporte = updates.documentoSoporte;
    if (updates.centroCosto !== undefined) updateData.centro_costo = updates.centroCosto;
    if (updates.proyecto !== undefined) updateData.proyecto = updates.proyecto;

    // Actualizar asiento principal
    const { error } = await supabase
      .from('asientos_contables')
      .update(updateData)
      .eq('id', asientoId);

    if (error) throw error;

    // Si se actualizan los movimientos, eliminar los anteriores y crear los nuevos
    if (updates.movimientos && updates.movimientos.length > 0) {
      // 1. Eliminar movimientos anteriores
      const { error: deleteError } = await supabase
        .from('movimientos_contables')
        .delete()
        .eq('asiento_id', asientoId);

      if (deleteError) throw deleteError;

      // 2. Obtener información de las cuentas para el campo "cuenta"
      const cuentaIds = updates.movimientos.map(m => m.cuentaId);
      const { data: cuentas, error: cuentasError } = await supabase
        .from('plan_cuentas')
        .select('id, codigo, nombre')
        .in('id', cuentaIds);

      if (cuentasError) throw cuentasError;

      // Crear un mapa de cuenta_id -> nombre completo
      const cuentasMap = new Map(
        cuentas?.map(c => [c.id, `${c.codigo} - ${c.nombre}`]) || []
      );

      // 3. Crear nuevos movimientos
      const movimientosData = updates.movimientos.map((mov) => ({
        asiento_id: asientoId,
        cuenta_id: mov.cuentaId,
        cuenta: mov.cuenta || cuentasMap.get(mov.cuentaId) || '', // Usar cuenta del map si no viene en mov
        debito: mov.debito || 0,
        credito: mov.credito || 0,
        descripcion: mov.descripcion || '',
        tercero_id: mov.terceroId || null,
        tercero: mov.tercero || null,
        documento_referencia: mov.documentoReferencia || null,
        centro_costo: mov.centroCosto || null,
      }));

      const { error: insertError } = await supabase
        .from('movimientos_contables')
        .insert(movimientosData);

      if (insertError) throw insertError;
    }
  },

  async deleteAsiento(asientoId: string): Promise<void> {
    const { error } = await supabase
      .from('asientos_contables')
      .delete()
      .eq('id', asientoId);

    if (error) throw error;
  },

  async confirmarAsiento(asientoId: string): Promise<void> {
    const { error } = await supabase
      .from('asientos_contables')
      .update({
        estado: 'confirmado',
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', asientoId);

    if (error) throw error;
  },

  async anularAsiento(asientoId: string): Promise<void> {
    const { error } = await supabase
      .from('asientos_contables')
      .update({
        estado: 'anulado',
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', asientoId);

    if (error) throw error;
  },

  async getSiguienteNumero(empresaId: string, prefijo: string): Promise<string> {
    const { data, error } = await supabase
      .from('asientos_contables')
      .select('numero')
      .eq('empresa_id', empresaId)
      .like('numero', `${prefijo}%`)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return `${prefijo}-000001`;
    }

    const ultimoNumero = parseInt(data.numero.split('-')[1]);
    const siguienteNumero = (ultimoNumero + 1).toString().padStart(6, '0');
    return `${prefijo}-${siguienteNumero}`;
  },
};
