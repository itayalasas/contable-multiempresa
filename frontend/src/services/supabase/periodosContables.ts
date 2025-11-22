import { supabase } from '../../config/supabase';

export interface EjercicioFiscal {
  id: string;
  empresa_id: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'abierto' | 'cerrado' | 'cerrado_definitivo';
  descripcion?: string;
  moneda?: string;
  resultado_ejercicio?: number;
  fecha_cierre?: string;
  cerrado_por?: string;
  fecha_creacion?: string;
  fecha_modificacion?: string;
}

export interface PeriodoContable {
  id: string;
  ejercicio_id: string;
  empresa_id: string;
  numero_periodo: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'abierto' | 'cerrado' | 'cerrado_definitivo';
  permite_asientos: boolean;
  fecha_cierre?: string;
  cerrado_por?: string;
  fecha_reapertura?: string;
  reabierto_por?: string;
  motivo_reapertura?: string;
  total_debitos?: number;
  total_creditos?: number;
  cantidad_asientos?: number;
  fecha_creacion?: string;
  fecha_modificacion?: string;
}

export interface CierreContable {
  id: string;
  periodo_id?: string;
  ejercicio_id?: string;
  empresa_id: string;
  tipo_cierre: 'PERIODO' | 'EJERCICIO';
  accion: 'CIERRE' | 'REAPERTURA';
  fecha_accion: string;
  usuario_id: string;
  motivo?: string;
  observaciones?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  total_debitos?: number;
  total_creditos?: number;
  cantidad_asientos?: number;
  fecha_creacion?: string;
}

export const periodosContablesService = {
  async getEjercicioActual(empresaId: string): Promise<EjercicioFiscal | null> {
    const { data, error } = await supabase
      .from('ejercicios_fiscales')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('estado', 'abierto')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getEjerciciosFiscales(empresaId: string): Promise<EjercicioFiscal[]> {
    const { data, error } = await supabase
      .from('ejercicios_fiscales')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('anio', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createEjercicioFiscal(ejercicio: Partial<EjercicioFiscal>): Promise<EjercicioFiscal> {
    const { data, error } = await supabase
      .from('ejercicios_fiscales')
      .insert({
        ...ejercicio,
        fecha_creacion: new Date().toISOString(),
        fecha_modificacion: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await this.crearPeriodosMensuales(data.id, data.empresa_id, data.fecha_inicio, data.fecha_fin);
    }

    return data;
  },

  async crearPeriodosMensuales(
    ejercicioId: string,
    empresaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<void> {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const periodos: Partial<PeriodoContable>[] = [];

    let numeroPeriodo = 1;
    let fechaActual = new Date(inicio);

    while (fechaActual <= fin) {
      const mesInicio = new Date(fechaActual);
      const mesFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);

      if (mesFin > fin) {
        mesFin.setTime(fin.getTime());
      }

      const nombreMes = mesInicio.toLocaleString('es', { month: 'long', year: 'numeric' });

      periodos.push({
        ejercicio_id: ejercicioId,
        empresa_id: empresaId,
        numero_periodo: numeroPeriodo,
        nombre: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
        fecha_inicio: mesInicio.toISOString().split('T')[0],
        fecha_fin: mesFin.toISOString().split('T')[0],
        estado: 'abierto',
        permite_asientos: true,
        total_debitos: 0,
        total_creditos: 0,
        cantidad_asientos: 0
      });

      fechaActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1);
      numeroPeriodo++;
    }

    const { error } = await supabase
      .from('periodos_contables')
      .insert(periodos);

    if (error) throw error;
  },

  async getPeriodosContables(ejercicioId: string): Promise<PeriodoContable[]> {
    const { data, error } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('ejercicio_id', ejercicioId)
      .order('numero_periodo', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPeriodoActual(empresaId: string): Promise<PeriodoContable | null> {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('empresa_id', empresaId)
      .lte('fecha_inicio', hoy)
      .gte('fecha_fin', hoy)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async cerrarPeriodo(
    periodoId: string,
    usuarioId: string,
    motivo?: string,
    observaciones?: string
  ): Promise<void> {
    const { data: periodo, error: periodoError } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('id', periodoId)
      .single();

    if (periodoError) throw periodoError;
    if (!periodo) throw new Error('Periodo no encontrado');

    if (periodo.estado === 'cerrado' || periodo.estado === 'cerrado_definitivo') {
      throw new Error('El periodo ya está cerrado');
    }

    const { data: asientosNoConfirmados, error: asientosError } = await supabase
      .from('asientos_contables')
      .select('id')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin)
      .neq('estado', 'confirmado');

    if (asientosError) throw asientosError;

    if (asientosNoConfirmados && asientosNoConfirmados.length > 0) {
      throw new Error(`Hay ${asientosNoConfirmados.length} asiento(s) no confirmado(s) en este periodo`);
    }

    const { data: asientosConfirmados } = await supabase
      .from('asientos_contables')
      .select('id')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin)
      .eq('estado', 'confirmado');

    const { data: movimientos } = await supabase
      .from('movimientos_contables')
      .select('debito, credito')
      .in('asiento_id', asientosConfirmados?.map(a => a.id) || []);

    let totalDebitos = 0;
    let totalCreditos = 0;

    if (movimientos) {
      movimientos.forEach(mov => {
        totalDebitos += parseFloat(mov.debito) || 0;
        totalCreditos += parseFloat(mov.credito) || 0;
      });
    }

    const cantidadAsientos = asientosConfirmados ? asientosConfirmados.length : 0;

    const { error: updateError } = await supabase
      .from('periodos_contables')
      .update({
        estado: 'cerrado',
        permite_asientos: false,
        fecha_cierre: new Date().toISOString(),
        cerrado_por: usuarioId,
        total_debitos: totalDebitos,
        total_creditos: totalCreditos,
        cantidad_asientos: cantidadAsientos,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', periodoId);

    if (updateError) throw updateError;

    const { error: cierreError } = await supabase
      .from('cierres_contables')
      .insert({
        periodo_id: periodoId,
        empresa_id: periodo.empresa_id,
        tipo_cierre: 'PERIODO',
        accion: 'CIERRE',
        usuario_id: usuarioId,
        motivo: motivo,
        observaciones: observaciones,
        estado_anterior: periodo.estado,
        estado_nuevo: 'cerrado',
        total_debitos: totalDebitos,
        total_creditos: totalCreditos,
        cantidad_asientos: cantidadAsientos
      });

    if (cierreError) throw cierreError;
  },

  async reabrirPeriodo(
    periodoId: string,
    usuarioId: string,
    motivo: string,
    observaciones?: string
  ): Promise<void> {
    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de reapertura es obligatorio');
    }

    const { data: periodo, error: periodoError } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('id', periodoId)
      .single();

    if (periodoError) throw periodoError;
    if (!periodo) throw new Error('Periodo no encontrado');

    if (periodo.estado === 'cerrado_definitivo') {
      throw new Error('No se puede reabrir un periodo con cierre definitivo');
    }

    if (periodo.estado === 'abierto') {
      throw new Error('El periodo ya está abierto');
    }

    const { error: updateError } = await supabase
      .from('periodos_contables')
      .update({
        estado: 'abierto',
        permite_asientos: true,
        fecha_reapertura: new Date().toISOString(),
        reabierto_por: usuarioId,
        motivo_reapertura: motivo,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', periodoId);

    if (updateError) throw updateError;

    const { error: cierreError } = await supabase
      .from('cierres_contables')
      .insert({
        periodo_id: periodoId,
        empresa_id: periodo.empresa_id,
        tipo_cierre: 'PERIODO',
        accion: 'REAPERTURA',
        usuario_id: usuarioId,
        motivo: motivo,
        observaciones: observaciones,
        estado_anterior: periodo.estado,
        estado_nuevo: 'abierto'
      });

    if (cierreError) throw cierreError;
  },

  async cerrarEjercicio(
    ejercicioId: string,
    usuarioId: string,
    motivo?: string,
    observaciones?: string
  ): Promise<void> {
    const { data: ejercicio, error: ejercicioError } = await supabase
      .from('ejercicios_fiscales')
      .select('*')
      .eq('id', ejercicioId)
      .single();

    if (ejercicioError) throw ejercicioError;
    if (!ejercicio) throw new Error('Ejercicio no encontrado');

    const { data: periodos, error: periodosError } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('ejercicio_id', ejercicioId)
      .neq('estado', 'cerrado');

    if (periodosError) throw periodosError;

    if (periodos && periodos.length > 0) {
      throw new Error('Todos los periodos deben estar cerrados antes de cerrar el ejercicio');
    }

    const { error: updateError } = await supabase
      .from('ejercicios_fiscales')
      .update({
        estado: 'cerrado',
        fecha_cierre: new Date().toISOString(),
        cerrado_por: usuarioId,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', ejercicioId);

    if (updateError) throw updateError;

    const { error: cierreError } = await supabase
      .from('cierres_contables')
      .insert({
        ejercicio_id: ejercicioId,
        empresa_id: ejercicio.empresa_id,
        tipo_cierre: 'EJERCICIO',
        accion: 'CIERRE',
        usuario_id: usuarioId,
        motivo: motivo,
        observaciones: observaciones,
        estado_anterior: ejercicio.estado,
        estado_nuevo: 'cerrado'
      });

    if (cierreError) throw cierreError;
  },

  async getHistorialCierres(empresaId: string, periodoId?: string): Promise<CierreContable[]> {
    let query = supabase
      .from('cierres_contables')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_accion', { ascending: false });

    if (periodoId) {
      query = query.eq('periodo_id', periodoId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async updatePeriodo(periodoId: string, updates: Partial<PeriodoContable>): Promise<PeriodoContable> {
    const { data, error } = await supabase
      .from('periodos_contables')
      .update({
        ...updates,
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', periodoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async validarFechaEnPeriodoAbierto(empresaId: string, fecha: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('periodos_contables')
      .select('estado')
      .eq('empresa_id', empresaId)
      .lte('fecha_inicio', fecha)
      .gte('fecha_fin', fecha)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    return data.estado === 'abierto';
  },

  async getDiasRestantesPeriodoActual(empresaId: string): Promise<number> {
    const periodo = await this.getPeriodoActual(empresaId);

    if (!periodo) return 0;

    const hoy = new Date();
    const fechaFin = new Date(periodo.fecha_fin);
    const diferencia = fechaFin.getTime() - hoy.getTime();
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    return dias > 0 ? dias : 0;
  }
};
