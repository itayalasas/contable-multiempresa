import { supabase } from '../../config/supabase';
import { PlanCuenta } from '../../types';

interface MovimientoLibroMayor {
  id: string;
  fecha: string;
  asientoNumero: string;
  descripcion: string;
  referencia?: string;
  debe: number;
  haber: number;
  saldo: number;
  asientoId: string;
}

export interface LibroMayorData {
  cuenta: PlanCuenta;
  saldoInicial: number;
  movimientos: MovimientoLibroMayor[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

export const libroMayorService = {
  async getLibroMayorCuenta(
    empresaId: string,
    cuentaId: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<LibroMayorData | null> {
    try {
      const { data: cuenta, error: cuentaError } = await supabase
        .from('plan_cuentas')
        .select('*')
        .eq('id', cuentaId)
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (cuentaError || !cuenta) {
        throw new Error('Cuenta no encontrada');
      }

      let query = supabase
        .from('asientos_contables')
        .select(`
          id,
          numero,
          fecha,
          descripcion,
          referencia,
          estado,
          movimientos_contables (
            id,
            cuenta_id,
            debito,
            credito,
            descripcion
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'confirmado')
        .order('fecha', { ascending: true })
        .order('numero', { ascending: true });

      if (fechaInicio) {
        query = query.gte('fecha', fechaInicio);
      }
      if (fechaFin) {
        query = query.lte('fecha', fechaFin);
      }

      const { data: asientos, error: asientosError } = await query;

      if (asientosError) {
        throw asientosError;
      }

      const movimientos: MovimientoLibroMayor[] = [];
      let saldoAcumulado = 0;
      let totalDebe = 0;
      let totalHaber = 0;

      let saldoInicial = 0;
      if (fechaInicio) {
        saldoInicial = await this.calcularSaldoInicial(
          empresaId,
          cuentaId,
          fechaInicio,
          cuenta.tipo
        );
        saldoAcumulado = saldoInicial;
      }

      if (asientos) {
        asientos.forEach((asiento: any) => {
          if (asiento.movimientos_contables) {
            asiento.movimientos_contables.forEach((movimiento: any) => {
              if (movimiento.cuenta_id === cuentaId) {
                const debe = parseFloat(movimiento.debito) || 0;
                const haber = parseFloat(movimiento.credito) || 0;

                if (['ACTIVO', 'GASTO'].includes(cuenta.tipo)) {
                  saldoAcumulado += debe - haber;
                } else {
                  saldoAcumulado += haber - debe;
                }

                totalDebe += debe;
                totalHaber += haber;

                movimientos.push({
                  id: `${asiento.id}_${movimiento.id}`,
                  fecha: asiento.fecha,
                  asientoNumero: asiento.numero,
                  descripcion: movimiento.descripcion || asiento.descripcion,
                  referencia: asiento.referencia || '',
                  debe,
                  haber,
                  saldo: saldoAcumulado,
                  asientoId: asiento.id
                });
              }
            });
          }
        });
      }

      return {
        cuenta,
        saldoInicial,
        movimientos,
        totalDebe,
        totalHaber,
        saldoFinal: saldoAcumulado
      };

    } catch (error) {
      console.error('Error obteniendo libro mayor:', error);
      throw error;
    }
  },

  async calcularSaldoInicial(
    empresaId: string,
    cuentaId: string,
    fechaInicio: string,
    tipoCuenta: string
  ): Promise<number> {
    try {
      const { data: asientos, error } = await supabase
        .from('asientos_contables')
        .select(`
          id,
          movimientos_contables (
            cuenta_id,
            debito,
            credito
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'confirmado')
        .lt('fecha', fechaInicio);

      if (error) throw error;

      let saldo = 0;

      if (asientos) {
        asientos.forEach((asiento: any) => {
          if (asiento.movimientos_contables) {
            asiento.movimientos_contables.forEach((movimiento: any) => {
              if (movimiento.cuenta_id === cuentaId) {
                const debe = parseFloat(movimiento.debito) || 0;
                const haber = parseFloat(movimiento.credito) || 0;

                if (['ACTIVO', 'GASTO'].includes(tipoCuenta)) {
                  saldo += debe - haber;
                } else {
                  saldo += haber - debe;
                }
              }
            });
          }
        });
      }

      return saldo;
    } catch (error) {
      console.error('Error calculando saldo inicial:', error);
      return 0;
    }
  },

  exportarCSV(data: LibroMayorData, fechaInicio?: string, fechaFin?: string): void {
    const headers = [
      'Fecha',
      'Asiento',
      'Descripción',
      'Referencia',
      'Debe',
      'Haber',
      'Saldo'
    ];

    const rows = data.movimientos.map(mov => [
      new Date(mov.fecha).toLocaleDateString('es-PE'),
      mov.asientoNumero,
      mov.descripcion,
      mov.referencia || '',
      mov.debe.toFixed(2),
      mov.haber.toFixed(2),
      mov.saldo.toFixed(2)
    ]);

    if (data.saldoInicial !== 0) {
      rows.unshift([
        fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : '',
        'SALDO INICIAL',
        'Saldo inicial del período',
        '',
        '',
        '',
        data.saldoInicial.toFixed(2)
      ]);
    }

    rows.push([
      '',
      'TOTALES',
      '',
      '',
      data.totalDebe.toFixed(2),
      data.totalHaber.toFixed(2),
      data.saldoFinal.toFixed(2)
    ]);

    const csvContent = [
      `Libro Mayor - ${data.cuenta.codigo} ${data.cuenta.nombre}`,
      `Período: ${fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : 'Inicio'} - ${fechaFin ? new Date(fechaFin).toLocaleDateString('es-PE') : 'Fin'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `libro_mayor_${data.cuenta.codigo}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportarExcel(data: LibroMayorData, fechaInicio?: string, fechaFin?: string): void {
    const headers = [
      'Fecha',
      'Número de Asiento',
      'Descripción',
      'Referencia',
      'Debe',
      'Haber',
      'Saldo Acumulado'
    ];

    let csvContent = `Libro Mayor\n`;
    csvContent += `Cuenta: ${data.cuenta.codigo} - ${data.cuenta.nombre}\n`;
    csvContent += `Tipo: ${data.cuenta.tipo}\n`;
    csvContent += `Período: ${fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} hasta ${fechaFin ? new Date(fechaFin).toLocaleDateString('es-PE') : 'la fecha actual'}\n`;
    csvContent += `Generado: ${new Date().toLocaleString('es-PE')}\n\n`;

    csvContent += headers.join('\t') + '\n';

    if (data.saldoInicial !== 0) {
      csvContent += [
        fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-PE') : '',
        'SALDO INICIAL',
        'Saldo inicial del período',
        '',
        '',
        '',
        data.saldoInicial.toFixed(2)
      ].join('\t') + '\n';
    }

    data.movimientos.forEach(mov => {
      csvContent += [
        new Date(mov.fecha).toLocaleDateString('es-PE'),
        mov.asientoNumero,
        mov.descripcion,
        mov.referencia || '',
        mov.debe.toFixed(2),
        mov.haber.toFixed(2),
        mov.saldo.toFixed(2)
      ].join('\t') + '\n';
    });

    csvContent += '\n';
    csvContent += [
      '',
      'TOTALES',
      '',
      '',
      data.totalDebe.toFixed(2),
      data.totalHaber.toFixed(2),
      data.saldoFinal.toFixed(2)
    ].join('\t') + '\n';

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `libro_mayor_${data.cuenta.codigo}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
