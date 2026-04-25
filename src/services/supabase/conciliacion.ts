import * as XLSX from 'xlsx';
import { supabase } from '../../config/supabase';

interface ConciliacionObservacion {
  referencia?: string;
  movimientoContableId?: string;
  raw?: Record<string, unknown>;
}

export interface MovimientoBancarioConciliacion {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'CARGO' | 'ABONO';
  conciliado: boolean;
  cuentaId: string;
  conciliacionId: string;
  movimientoContableId?: string;
}

export interface MovimientoContableConciliacion {
  id: string;
  fecha: string;
  asientoNumero: string;
  descripcion: string;
  referencia?: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  conciliado: boolean;
  cuentaId: string;
  movimientoBancarioId?: string;
}

export interface ResumenConciliacion {
  totalMovimientosBancarios: number;
  totalMovimientosContables: number;
  movimientosBancariosConciliados: number;
  movimientosContablesConciliados: number;
  movimientosPendientes: number;
  diferenciaTotal: number;
}

export interface MovimientoImportado {
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'CARGO' | 'ABONO';
}

const DATE_KEYS = ['fecha', 'date', 'fecha_operacion', 'fecha movimiento', 'fecha_movimiento'];
const DESCRIPTION_KEYS = ['descripcion', 'detalle', 'concepto', 'movimiento', 'description'];
const REFERENCE_KEYS = ['referencia', 'ref', 'documento', 'nro', 'numero', 'operacion', 'operation'];
const AMOUNT_KEYS = ['monto', 'importe', 'amount', 'total'];
const DEBIT_KEYS = ['debito', 'debito u$s', 'cargo', 'withdrawal', 'egreso'];
const CREDIT_KEYS = ['credito', 'credito u$s', 'abono', 'deposito', 'ingreso'];

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeReference(value: unknown): string {
  return String(value ?? '').trim();
}

function parseDateValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      return date.toISOString().split('T')[0];
    }
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseAmountValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const cleaned = text
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCell(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const entry = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizedAlias);
    if (entry && entry[1] !== undefined && entry[1] !== null && String(entry[1]).trim() !== '') {
      return entry[1];
    }
  }
  return undefined;
}

function parseObservacion(value: string | null): ConciliacionObservacion {
  if (!value) return {};
  try {
    return JSON.parse(value) as ConciliacionObservacion;
  } catch {
    return { referencia: value };
  }
}

function serializeObservacion(value: ConciliacionObservacion): string {
  return JSON.stringify(value);
}

export function detectBankMovementType(amount: number, description?: string): 'CARGO' | 'ABONO' {
  if (amount < 0) return 'CARGO';
  const normalized = normalizeHeader(description || '');
  if (/(debito|cargo|egreso|retiro|withdrawal|comision)/.test(normalized)) {
    return 'CARGO';
  }
  return 'ABONO';
}

export function parseImportedBankRows(rows: Record<string, unknown>[]): MovimientoImportado[] {
  return rows
    .map((row) => {
      const fecha = parseDateValue(getCell(row, DATE_KEYS));
      const descripcion = String(getCell(row, DESCRIPTION_KEYS) ?? '').trim();
      const referencia = normalizeReference(getCell(row, REFERENCE_KEYS));

      const explicitAmount = parseAmountValue(getCell(row, AMOUNT_KEYS));
      const debit = parseAmountValue(getCell(row, DEBIT_KEYS));
      const credit = parseAmountValue(getCell(row, CREDIT_KEYS));

      let signedAmount = explicitAmount ?? 0;
      if (explicitAmount === null) {
        const creditAmount = credit ?? 0;
        const debitAmount = debit ?? 0;
        signedAmount = creditAmount - debitAmount;
      }

      const monto = Math.abs(signedAmount);
      const tipo = detectBankMovementType(signedAmount, descripcion);

      if (!fecha || !descripcion || monto <= 0) {
        return null;
      }

      return {
        fecha,
        descripcion,
        referencia,
        monto,
        tipo,
      };
    })
    .filter((item): item is MovimientoImportado => item !== null);
}

export function buildResumenConciliacion(
  movimientosBancarios: MovimientoBancarioConciliacion[],
  movimientosContables: MovimientoContableConciliacion[],
): ResumenConciliacion {
  const totalBanco = movimientosBancarios.reduce((sum, item) => {
    return sum + (item.tipo === 'ABONO' ? item.monto : -item.monto);
  }, 0);

  const totalContable = movimientosContables.reduce((sum, item) => {
    return sum + (item.tipo === 'INGRESO' ? item.monto : item.tipo === 'EGRESO' ? -item.monto : 0);
  }, 0);

  const movimientosBancariosConciliados = movimientosBancarios.filter((item) => item.conciliado).length;
  const movimientosContablesConciliados = movimientosContables.filter((item) => item.conciliado).length;

  return {
    totalMovimientosBancarios: movimientosBancarios.length,
    totalMovimientosContables: movimientosContables.length,
    movimientosBancariosConciliados,
    movimientosContablesConciliados,
    movimientosPendientes:
      (movimientosBancarios.length - movimientosBancariosConciliados)
      + (movimientosContables.length - movimientosContablesConciliados),
    diferenciaTotal: Math.round((totalBanco - totalContable) * 100) / 100,
  };
}

async function actualizarEstadoCabecera(conciliacionId: string) {
  const { data: items, error } = await supabase
    .from('movimientos_conciliacion')
    .select('tipo, conciliado')
    .eq('conciliacion_id', conciliacionId);

  if (error) throw error;

  const bancoPendientes = (items || []).some((item) => item.tipo === 'BANCO' && !item.conciliado);
  const estado = bancoPendientes ? 'EN_PROCESO' : 'CONCILIADO';

  const { error: updateError } = await supabase
    .from('conciliacion_bancaria')
    .update({
      estado,
      fecha_conciliacion: estado === 'CONCILIADO' ? new Date().toISOString() : null,
    })
    .eq('id', conciliacionId);

  if (updateError) throw updateError;
}

export const conciliacionSupabaseService = {
  async getMovimientosBancarios(
    empresaId: string,
    cuentaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<MovimientoBancarioConciliacion[]> {
    let query = supabase
      .from('movimientos_conciliacion')
      .select(`
        id,
        conciliacion_id,
        fecha,
        descripcion,
        monto,
        observaciones,
        conciliado,
        conciliacion_bancaria!inner(
          id,
          empresa_id,
          cuenta_bancaria_id,
          fecha_inicio,
          fecha_fin
        )
      `)
      .eq('tipo', 'BANCO')
      .eq('conciliacion_bancaria.empresa_id', empresaId)
      .order('fecha', { ascending: false });

    if (cuentaId) {
      query = query.eq('conciliacion_bancaria.cuenta_bancaria_id', cuentaId);
    }
    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => {
      const observacion = parseObservacion(item.observaciones);
      return {
        id: item.id,
        fecha: item.fecha,
        descripcion: item.descripcion,
        referencia: observacion.referencia || '',
        monto: Number(item.monto || 0),
        tipo: detectBankMovementType(Number(item.monto || 0), item.descripcion),
        conciliado: !!item.conciliado,
        cuentaId: item.conciliacion_bancaria.cuenta_bancaria_id,
        conciliacionId: item.conciliacion_id,
        movimientoContableId: observacion.movimientoContableId,
      };
    });
  },

  async getMovimientosContables(
    empresaId: string,
    cuentaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<MovimientoContableConciliacion[]> {
    let query = supabase
      .from('movimientos_tesoreria')
      .select(`
        id,
        fecha,
        descripcion,
        referencia,
        monto,
        tipo_movimiento,
        cuenta_bancaria_id,
        estado_conciliacion,
        metadata,
        asiento_contable_id,
        asientos_contables (
          numero
        )
      `)
      .eq('empresa_id', empresaId)
      .eq('eliminado', false)
      .order('fecha', { ascending: false });

    if (cuentaId) {
      query = query.eq('cuenta_bancaria_id', cuentaId);
    }
    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      fecha: item.fecha,
      asientoNumero: item.asientos_contables?.numero || item.asiento_contable_id || 'Sin asiento',
      descripcion: item.descripcion,
      referencia: item.referencia || '',
      monto: Number(item.monto || 0),
      tipo: item.tipo_movimiento,
      conciliado: item.estado_conciliacion === 'CONCILIADO',
      cuentaId: item.cuenta_bancaria_id,
      movimientoBancarioId: item.metadata?.conciliacion_bancaria_id || undefined,
    }));
  },

  async getResumen(
    empresaId: string,
    cuentaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<ResumenConciliacion> {
    const [movimientosBancarios, movimientosContables] = await Promise.all([
      this.getMovimientosBancarios(empresaId, cuentaId, fechaInicio, fechaFin),
      this.getMovimientosContables(empresaId, cuentaId, fechaInicio, fechaFin),
    ]);

    return buildResumenConciliacion(movimientosBancarios, movimientosContables);
  },

  async conciliarMovimientos(
    movimientoBancarioId: string,
    movimientoContableId: string,
  ): Promise<void> {
    const { data: banco, error: bancoError } = await supabase
      .from('movimientos_conciliacion')
      .select('conciliacion_id, observaciones')
      .eq('id', movimientoBancarioId)
      .single();

    if (bancoError) throw bancoError;

    const observacion = parseObservacion(banco.observaciones);

    const { error: updateBancoError } = await supabase
      .from('movimientos_conciliacion')
      .update({
        conciliado: true,
        observaciones: serializeObservacion({
          ...observacion,
          movimientoContableId,
        }),
      })
      .eq('id', movimientoBancarioId);

    if (updateBancoError) throw updateBancoError;

    const { error: updateContableError } = await supabase
      .from('movimientos_tesoreria')
      .update({
        estado_conciliacion: 'CONCILIADO',
        metadata: {
          conciliacion_bancaria_id: movimientoBancarioId,
        },
      })
      .eq('id', movimientoContableId);

    if (updateContableError) throw updateContableError;

    await actualizarEstadoCabecera(banco.conciliacion_id);
  },

  async revertirConciliacion(
    movimientoBancarioId: string,
    movimientoContableId: string,
  ): Promise<void> {
    const { data: banco, error: bancoError } = await supabase
      .from('movimientos_conciliacion')
      .select('conciliacion_id, observaciones')
      .eq('id', movimientoBancarioId)
      .single();

    if (bancoError) throw bancoError;

    const observacion = parseObservacion(banco.observaciones);
    delete observacion.movimientoContableId;

    const { error: updateBancoError } = await supabase
      .from('movimientos_conciliacion')
      .update({
        conciliado: false,
        observaciones: serializeObservacion(observacion),
      })
      .eq('id', movimientoBancarioId);

    if (updateBancoError) throw updateBancoError;

    const { error: updateContableError } = await supabase
      .from('movimientos_tesoreria')
      .update({
        estado_conciliacion: 'PENDIENTE',
        metadata: {},
      })
      .eq('id', movimientoContableId);

    if (updateContableError) throw updateContableError;

    await actualizarEstadoCabecera(banco.conciliacion_id);
  },

  async importarExtractoBancario(params: {
    empresaId: string;
    cuentaId: string;
    usuarioId: string;
    file: File;
  }): Promise<number> {
    const buffer = await params.file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      raw: true,
      defval: '',
    });

    const movimientos = parseImportedBankRows(rows);
    if (movimientos.length === 0) {
      throw new Error('No se encontraron movimientos válidos en el archivo.');
    }

    const fechas = movimientos.map((item) => item.fecha).sort();
    const fechaInicio = fechas[0];
    const fechaFin = fechas[fechas.length - 1];

    const { data: conciliacion, error: conciliacionError } = await supabase
      .from('conciliacion_bancaria')
      .insert({
        empresa_id: params.empresaId,
        cuenta_bancaria_id: params.cuentaId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        saldo_inicial_banco: 0,
        saldo_final_banco: 0,
        saldo_inicial_contable: 0,
        saldo_final_contable: 0,
        diferencia: 0,
        estado: 'EN_PROCESO',
        creado_por: params.usuarioId,
      })
      .select('id')
      .single();

    if (conciliacionError) throw conciliacionError;

    const payload = movimientos.map((movimiento) => ({
      conciliacion_id: conciliacion.id,
      fecha: movimiento.fecha,
      descripcion: movimiento.descripcion,
      monto: movimiento.tipo === 'ABONO' ? movimiento.monto : -movimiento.monto,
      tipo: 'BANCO',
      conciliado: false,
      observaciones: serializeObservacion({
        referencia: movimiento.referencia,
      }),
    }));

    const { error: insertError } = await supabase
      .from('movimientos_conciliacion')
      .insert(payload);

    if (insertError) throw insertError;

    return movimientos.length;
  },
};
