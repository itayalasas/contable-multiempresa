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
    console.log('cerrarPeriodo - Inicio', { periodoId, usuarioId });

    const { data: periodo, error: periodoError } = await supabase
      .from('periodos_contables')
      .select('*')
      .eq('id', periodoId)
      .single();

    if (periodoError) {
      console.error('Error obteniendo período:', periodoError);
      throw periodoError;
    }
    if (!periodo) throw new Error('Periodo no encontrado');

    console.log('Período obtenido:', periodo);

    if (periodo.estado === 'cerrado' || periodo.estado === 'cerrado_definitivo') {
      throw new Error('El periodo ya está cerrado');
    }

    console.log('Validando facturas de venta...');
    const { data: facturasVentaSinAsiento } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura, fecha_emision, estado, total')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin)
      .neq('estado', 'anulada')
      .or('asiento_generado.is.null,asiento_generado.eq.false');

    if (facturasVentaSinAsiento && facturasVentaSinAsiento.length > 0) {
      const numeros = facturasVentaSinAsiento.map(f => `${f.numero_factura} (${f.estado})`).join(', ');
      const totalSinContabilizar = facturasVentaSinAsiento.reduce((sum, f) => sum + parseFloat(f.total || '0'), 0);
      throw new Error(
        `Hay ${facturasVentaSinAsiento.length} factura(s) de venta sin contabilizar por un total de $${totalSinContabilizar.toFixed(2)}: ${numeros}. ` +
        'Todas las facturas deben tener su asiento contable generado antes de cerrar el período.'
      );
    }

    console.log('Validando facturas con errores...');
    const { data: facturasConError } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura, fecha_emision, asiento_error')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin)
      .not('asiento_error', 'is', null);

    if (facturasConError && facturasConError.length > 0) {
      const errores = facturasConError.map(f => `${f.numero_factura}: ${f.asiento_error}`).join('; ');
      throw new Error(
        `Hay ${facturasConError.length} factura(s) con errores en la contabilización: ${errores}. ` +
        'Corrige los errores antes de cerrar el período.'
      );
    }

    console.log('Validando facturas de compra...');
    const { data: facturasCompraSinAsiento } = await supabase
      .from('facturas_compra')
      .select('id, numero_factura, fecha_emision')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin)
      .or('asiento_generado.is.null,asiento_generado.eq.false');

    if (facturasCompraSinAsiento && facturasCompraSinAsiento.length > 0) {
      const numeros = facturasCompraSinAsiento.map(f => f.numero_factura).join(', ');
      throw new Error(
        `Hay ${facturasCompraSinAsiento.length} factura(s) de compra sin contabilizar: ${numeros}. ` +
        'Todas las facturas deben estar contabilizadas antes de cerrar el período.'
      );
    }

    console.log('Todas las facturas están contabilizadas correctamente');

    // Validar que los totales cuadren entre facturas y asientos
    console.log('Validando cuadratura de totales...');

    // Obtener total de facturas de venta del período
    const { data: totalFacturasVenta } = await supabase
      .from('facturas_venta')
      .select('total')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin)
      .neq('estado', 'anulada');

    const sumaFacturasVenta = totalFacturasVenta?.reduce((sum, f) => sum + parseFloat(f.total || '0'), 0) || 0;

    // Obtener asientos confirmados del período
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

    const totalDebitos = movimientos?.reduce((sum, m) => sum + parseFloat(m.debito || '0'), 0) || 0;
    const totalCreditos = movimientos?.reduce((sum, m) => sum + parseFloat(m.credito || '0'), 0) || 0;

    console.log('📊 Cuadratura:', {
      facturas_venta: sumaFacturasVenta.toFixed(2),
      asientos_debitos: totalDebitos.toFixed(2),
      asientos_creditos: totalCreditos.toFixed(2),
    });

    // Verificar que débitos = créditos (cuadratura básica)
    const diferencia = Math.abs(totalDebitos - totalCreditos);
    if (diferencia > 0.01) {
      throw new Error(
        `Los asientos contables no cuadran. Débitos: $${totalDebitos.toFixed(2)}, Créditos: $${totalCreditos.toFixed(2)}. ` +
        `Diferencia: $${diferencia.toFixed(2)}. Revisa y corrige los asientos antes de cerrar.`
      );
    }

    console.log('✅ Cuadratura de asientos correcta (débitos = créditos)');

    // Validar comisiones pendientes usando la función de validación
    console.log('Validando comisiones pendientes...');
    const { data: validacionComisiones, error: validacionError } = await supabase
      .rpc('tiene_comisiones_pendientes_en_periodo', {
        p_empresa_id: periodo.empresa_id,
        p_fecha_inicio: periodo.fecha_inicio,
        p_fecha_fin: periodo.fecha_fin
      });

    if (validacionError) {
      console.error('Error validando comisiones:', validacionError);
      throw new Error('Error al validar comisiones: ' + validacionError.message);
    }

    if (validacionComisiones && validacionComisiones.length > 0) {
      const resultado = validacionComisiones[0];

      if (resultado.hay_pendientes) {
        const detalles: string[] = [];

        if (resultado.cantidad_pendientes > 0) {
          detalles.push(
            `${resultado.cantidad_pendientes} comisión(es) pendiente(s) de facturar`
          );
        }

        if (resultado.cantidad_facturadas_sin_pagar > 0) {
          detalles.push(
            `${resultado.cantidad_facturadas_sin_pagar} comisión(es) facturada(s) sin pagar`
          );
        }

        if (resultado.cantidad_sin_asiento > 0) {
          detalles.push(
            `${resultado.cantidad_sin_asiento} factura(s) de comisión sin asiento contable`
          );
        }

        throw new Error(
          `No se puede cerrar el período: ${detalles.join(', ')}. ` +
          'Ve a Compras > Comisiones Partners para resolver estos pendientes.'
        );
      }
    }

    console.log('✅ Todas las comisiones están procesadas correctamente');

    // NUEVA VALIDACIÓN: Tesorería
    console.log('Validando tesorería del período...');
    const { data: validacionTesoreria, error: tesoreriaError } = await supabase
      .rpc('validar_tesoreria_periodo', {
        p_empresa_id: periodo.empresa_id,
        p_fecha_inicio: periodo.fecha_inicio,
        p_fecha_fin: periodo.fecha_fin
      });

    if (tesoreriaError) {
      console.error('Error validando tesorería:', tesoreriaError);
      throw new Error('Error al validar tesorería: ' + tesoreriaError.message);
    }

    if (validacionTesoreria && validacionTesoreria.length > 0) {
      const resultado = validacionTesoreria[0];

      if (!resultado.valido) {
        const errores: string[] = [];

        if (resultado.movimientos_sin_asiento > 0) {
          errores.push(
            `${resultado.movimientos_sin_asiento} movimiento(s) de tesorería sin asiento contable`
          );
        }

        if (resultado.cuentas_descuadradas > 0) {
          const detalles = resultado.detalles?.cuentas_problema || [];
          const cuentasDescuadradas = detalles.map((c: any) =>
            `${c.nombre} (${c.numero_cuenta}): Saldo actual $${c.saldo_actual} vs Calculado $${c.saldo_calculado}, Diferencia: $${c.diferencia}`
          ).join('; ');

          errores.push(
            `${resultado.cuentas_descuadradas} cuenta(s) bancaria(s) descuadrada(s): ${cuentasDescuadradas}`
          );
        }

        throw new Error(
          `No se puede cerrar el período - Problemas en Tesorería: ${errores.join('. ')}. ` +
          'Verifica que todos los movimientos bancarios estén contabilizados y los saldos cuadren.'
        );
      }
    }

    console.log('✅ Tesorería validada correctamente');

    // Validar que no hay asientos sin confirmar
    const { data: asientosNoConfirmados, error: asientosError } = await supabase
      .from('asientos_contables')
      .select('id, numero, descripcion')
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin)
      .neq('estado', 'confirmado');

    if (asientosError) throw asientosError;

    if (asientosNoConfirmados && asientosNoConfirmados.length > 0) {
      const numeros = asientosNoConfirmados.map(a => a.numero).join(', ');
      throw new Error(
        `Hay ${asientosNoConfirmados.length} asiento(s) no confirmado(s) en este período: ${numeros}. ` +
        'Todos los asientos deben estar confirmados antes de cerrar.'
      );
    }

    // Reutilizar los totales ya calculados en la validación de cuadratura
    const cantidadAsientos = asientosConfirmados ? asientosConfirmados.length : 0;

    // Generar snapshots de saldos bancarios
    console.log('Generando snapshots de saldos bancarios...');
    const { data: snapshotsResult, error: snapshotsError } = await supabase
      .rpc('generar_snapshots_saldos_periodo', {
        p_periodo_id: periodoId,
        p_empresa_id: periodo.empresa_id,
        p_fecha_inicio: periodo.fecha_inicio,
        p_fecha_fin: periodo.fecha_fin
      });

    if (snapshotsError) {
      console.error('Error generando snapshots:', snapshotsError);
      throw new Error('Error al generar snapshots de saldos: ' + snapshotsError.message);
    }

    const snapshotsCreados = snapshotsResult || 0;
    console.log(`✅ ${snapshotsCreados} snapshot(s) de saldos bancarios generados`);

    // Actualizar el período
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
        tesoreria_cerrada: true,
        fecha_cierre_tesoreria: new Date().toISOString(),
        fecha_modificacion: new Date().toISOString()
      })
      .eq('id', periodoId);

    if (updateError) throw updateError;

    // Ocultar facturas de venta del período cerrado
    console.log('Ocultando facturas de venta del período...');
    await supabase
      .from('facturas_venta')
      .update({
        ocultar_en_listados: true,
        periodo_contable_id: periodoId
      })
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin);

    // Ocultar facturas de compra del período cerrado
    console.log('Ocultando facturas de compra del período...');
    await supabase
      .from('facturas_compra')
      .update({
        ocultar_en_listados: true,
        periodo_contable_id: periodoId
      })
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha_emision', periodo.fecha_inicio)
      .lte('fecha_emision', periodo.fecha_fin);

    // Ocultar comisiones del período cerrado
    console.log('Ocultando comisiones del período...');
    await supabase
      .from('comisiones_partners')
      .update({
        ocultar_en_listados: true,
        periodo_contable_id: periodoId
      })
      .eq('empresa_id', periodo.empresa_id)
      .gte('fecha', periodo.fecha_inicio)
      .lte('fecha', periodo.fecha_fin);

    console.log('✅ Registros del período ocultados correctamente');

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

    // Si el período ya está abierto, solo sincronizamos los registros
    const yaEstabaAbierto = periodo.estado === 'abierto';

    if (!yaEstabaAbierto) {
      // Solo actualizar el período si estaba cerrado
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
    }

    // Usar función de base de datos para mostrar todos los registros
    console.log('Mostrando todos los registros del período...');
    const { data: resultado, error: mostrarError } = await supabase
      .rpc('mostrar_registros_periodo', { periodo_id_param: periodoId });

    if (mostrarError) {
      console.error('Error mostrando registros:', mostrarError);
      // Fallback: intentar actualizar manualmente
      await Promise.all([
        supabase
          .from('facturas_venta')
          .update({ ocultar_en_listados: false })
          .eq('periodo_contable_id', periodoId),
        supabase
          .from('facturas_compra')
          .update({ ocultar_en_listados: false })
          .eq('periodo_contable_id', periodoId),
        supabase
          .from('comisiones_partners')
          .update({ ocultar_en_listados: false })
          .eq('periodo_contable_id', periodoId)
      ]);
    } else if (resultado && resultado.length > 0) {
      const stats = resultado[0];
      console.log('✅ Registros mostrados:', {
        facturas_venta: stats.facturas_venta_actualizadas,
        facturas_compra: stats.facturas_compra_actualizadas,
        comisiones: stats.comisiones_actualizadas
      });
    }

    console.log('✅ Registros del período mostrados correctamente');

    // Registrar en historial solo si realmente se reabrió el período
    if (!yaEstabaAbierto) {
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
    } else {
      console.log('ℹ️ Período ya estaba abierto, solo se sincronizaron los registros');
    }
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
  },

  async validarCierreSecuencial(periodoId: string): Promise<{
    valido: boolean;
    mensaje: string;
    periodosAbiertosAnteriores: number;
  }> {
    const { data, error } = await supabase
      .rpc('validar_cierre_secuencial', { p_periodo_id: periodoId });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        valido: false,
        mensaje: 'Error al validar el cierre secuencial',
        periodosAbiertosAnteriores: 0
      };
    }

    const resultado = data[0];
    return {
      valido: resultado.valido,
      mensaje: resultado.mensaje,
      periodosAbiertosAnteriores: resultado.periodos_abiertos_anteriores
    };
  },

  async validarEjercicioParaCierre(ejercicioId: string): Promise<{
    valido: boolean;
    mensaje: string;
    periodosTotales: number;
    periodosCerrados: number;
    periodosAbiertos: number;
  }> {
    const { data, error } = await supabase
      .rpc('validar_ejercicio_para_cierre', { p_ejercicio_id: ejercicioId });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        valido: false,
        mensaje: 'Error al validar el ejercicio',
        periodosTotales: 0,
        periodosCerrados: 0,
        periodosAbiertos: 0
      };
    }

    const resultado = data[0];
    return {
      valido: resultado.valido,
      mensaje: resultado.mensaje,
      periodosTotales: resultado.periodos_totales,
      periodosCerrados: resultado.periodos_cerrados,
      periodosAbiertos: resultado.periodos_abiertos
    };
  },

  async cerrarEjercicioFiscal(
    ejercicioId: string,
    usuarioId: string,
    motivo?: string,
    observaciones?: string
  ): Promise<{
    success: boolean;
    mensaje: string;
    periodosCerrados: number;
  }> {
    const { data, error } = await supabase
      .rpc('cerrar_ejercicio_fiscal', {
        p_ejercicio_id: ejercicioId,
        p_usuario_id: usuarioId,
        p_motivo: motivo,
        p_observaciones: observaciones
      });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('No se pudo cerrar el ejercicio fiscal');
    }

    const resultado = data[0];

    if (!resultado.success) {
      throw new Error(resultado.mensaje);
    }

    return {
      success: resultado.success,
      mensaje: resultado.mensaje,
      periodosCerrados: resultado.periodos_cerrados
    };
  },

  async reabrirEjercicioFiscal(
    ejercicioId: string,
    usuarioId: string,
    motivo: string,
    observaciones?: string
  ): Promise<{
    success: boolean;
    mensaje: string;
  }> {
    if (!motivo || motivo.trim() === '') {
      throw new Error('El motivo de reapertura es obligatorio');
    }

    const { data, error } = await supabase
      .rpc('reabrir_ejercicio_fiscal', {
        p_ejercicio_id: ejercicioId,
        p_usuario_id: usuarioId,
        p_motivo: motivo,
        p_observaciones: observaciones
      });

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('No se pudo reabrir el ejercicio fiscal');
    }

    const resultado = data[0];

    if (!resultado.success) {
      throw new Error(resultado.mensaje);
    }

    return {
      success: resultado.success,
      mensaje: resultado.mensaje
    };
  }
};
