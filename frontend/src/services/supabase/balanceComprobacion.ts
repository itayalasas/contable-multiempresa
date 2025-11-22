import { supabase } from '../../config/supabase';
import { PlanCuenta } from '../../types';

interface BalanceComprobacionItem {
  cuenta: PlanCuenta;
  saldoInicialDebe: number;
  saldoInicialHaber: number;
  movimientosDebe: number;
  movimientosHaber: number;
  saldoFinalDebe: number;
  saldoFinalHaber: number;
}

export interface BalanceComprobacionData {
  items: BalanceComprobacionItem[];
  totales: {
    saldoInicialDebe: number;
    saldoInicialHaber: number;
    movimientosDebe: number;
    movimientosHaber: number;
    saldoFinalDebe: number;
    saldoFinalHaber: number;
  };
  fechaInicio?: string;
  fechaFin?: string;
  nivelCuenta?: number;
  fechaGeneracion: Date;
}

export const balanceComprobacionService = {
  async generateBalanceComprobacion(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
    nivelCuenta?: number
  ): Promise<BalanceComprobacionData> {
    try {
      let cuentasQuery = supabase
        .from('plan_cuentas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .order('codigo', { ascending: true });

      if (nivelCuenta && nivelCuenta > 0) {
        cuentasQuery = cuentasQuery.eq('nivel', nivelCuenta);
      }

      const { data: cuentas, error: cuentasError } = await cuentasQuery;

      if (cuentasError) throw cuentasError;
      if (!cuentas) throw new Error('No se encontraron cuentas');

      let asientosQuery = supabase
        .from('asientos_contables')
        .select(`
          id,
          numero,
          fecha,
          descripcion,
          estado,
          movimientos_contables (
            id,
            cuenta_id,
            debito,
            credito
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('estado', 'confirmado')
        .order('fecha', { ascending: true });

      if (fechaInicio) {
        asientosQuery = asientosQuery.gte('fecha', fechaInicio);
      }
      if (fechaFin) {
        asientosQuery = asientosQuery.lte('fecha', fechaFin);
      }

      const { data: asientos, error: asientosError } = await asientosQuery;

      if (asientosError) throw asientosError;

      const saldosIniciales = await this.calcularSaldosIniciales(
        empresaId,
        cuentas,
        fechaInicio
      );

      const movimientosPeriodo = new Map<string, { debe: number; haber: number }>();

      if (asientos) {
        asientos.forEach((asiento: any) => {
          if (asiento.movimientos_contables) {
            asiento.movimientos_contables.forEach((movimiento: any) => {
              if (!movimientosPeriodo.has(movimiento.cuenta_id)) {
                movimientosPeriodo.set(movimiento.cuenta_id, { debe: 0, haber: 0 });
              }

              const mov = movimientosPeriodo.get(movimiento.cuenta_id)!;
              mov.debe += parseFloat(movimiento.debito) || 0;
              mov.haber += parseFloat(movimiento.credito) || 0;
            });
          }
        });
      }

      const items: BalanceComprobacionItem[] = [];
      let totales = {
        saldoInicialDebe: 0,
        saldoInicialHaber: 0,
        movimientosDebe: 0,
        movimientosHaber: 0,
        saldoFinalDebe: 0,
        saldoFinalHaber: 0
      };

      cuentas.forEach((cuenta: any) => {
        const saldoInicial = saldosIniciales.get(cuenta.id) || 0;
        const movimientos = movimientosPeriodo.get(cuenta.id) || { debe: 0, haber: 0 };

        let saldoFinal = saldoInicial;
        if (['ACTIVO', 'GASTO'].includes(cuenta.tipo)) {
          saldoFinal += movimientos.debe - movimientos.haber;
        } else {
          saldoFinal += movimientos.haber - movimientos.debe;
        }

        const saldoInicialDebe = saldoInicial > 0 ? saldoInicial : 0;
        const saldoInicialHaber = saldoInicial < 0 ? Math.abs(saldoInicial) : 0;
        const saldoFinalDebe = saldoFinal > 0 ? saldoFinal : 0;
        const saldoFinalHaber = saldoFinal < 0 ? Math.abs(saldoFinal) : 0;

        if (saldoInicial !== 0 || movimientos.debe > 0 || movimientos.haber > 0 || saldoFinal !== 0) {
          const item: BalanceComprobacionItem = {
            cuenta,
            saldoInicialDebe,
            saldoInicialHaber,
            movimientosDebe: movimientos.debe,
            movimientosHaber: movimientos.haber,
            saldoFinalDebe,
            saldoFinalHaber
          };

          items.push(item);

          totales.saldoInicialDebe += saldoInicialDebe;
          totales.saldoInicialHaber += saldoInicialHaber;
          totales.movimientosDebe += movimientos.debe;
          totales.movimientosHaber += movimientos.haber;
          totales.saldoFinalDebe += saldoFinalDebe;
          totales.saldoFinalHaber += saldoFinalHaber;
        }
      });

      return {
        items,
        totales,
        fechaInicio,
        fechaFin,
        nivelCuenta,
        fechaGeneracion: new Date()
      };

    } catch (error) {
      console.error('Error generando balance de comprobación:', error);
      throw error;
    }
  },

  async calcularSaldosIniciales(
    empresaId: string,
    cuentas: any[],
    fechaInicio?: string
  ): Promise<Map<string, number>> {
    const saldos = new Map<string, number>();

    if (!fechaInicio) {
      return saldos;
    }

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

      const tiposCuenta = new Map<string, string>();
      cuentas.forEach((cuenta: any) => {
        tiposCuenta.set(cuenta.id, cuenta.tipo);
      });

      if (asientos) {
        asientos.forEach((asiento: any) => {
          if (asiento.movimientos_contables) {
            asiento.movimientos_contables.forEach((movimiento: any) => {
              if (!saldos.has(movimiento.cuenta_id)) {
                saldos.set(movimiento.cuenta_id, 0);
              }

              const saldoActual = saldos.get(movimiento.cuenta_id)!;
              const tipoCuenta = tiposCuenta.get(movimiento.cuenta_id);
              const debe = parseFloat(movimiento.debito) || 0;
              const haber = parseFloat(movimiento.credito) || 0;

              if (['ACTIVO', 'GASTO'].includes(tipoCuenta || '')) {
                saldos.set(movimiento.cuenta_id, saldoActual + debe - haber);
              } else {
                saldos.set(movimiento.cuenta_id, saldoActual + haber - debe);
              }
            });
          }
        });
      }

      return saldos;
    } catch (error) {
      console.error('Error calculando saldos iniciales:', error);
      return saldos;
    }
  },

  exportarCSV(data: BalanceComprobacionData, empresaNombre: string): void {
    const headers = [
      'Código',
      'Nombre de la Cuenta',
      'Saldo Inicial Debe',
      'Saldo Inicial Haber',
      'Movimientos Debe',
      'Movimientos Haber',
      'Saldo Final Debe',
      'Saldo Final Haber'
    ];

    const rows = data.items.map(item => [
      item.cuenta.codigo,
      item.cuenta.nombre,
      item.saldoInicialDebe.toFixed(2),
      item.saldoInicialHaber.toFixed(2),
      item.movimientosDebe.toFixed(2),
      item.movimientosHaber.toFixed(2),
      item.saldoFinalDebe.toFixed(2),
      item.saldoFinalHaber.toFixed(2)
    ]);

    rows.push([
      '',
      'TOTALES',
      data.totales.saldoInicialDebe.toFixed(2),
      data.totales.saldoInicialHaber.toFixed(2),
      data.totales.movimientosDebe.toFixed(2),
      data.totales.movimientosHaber.toFixed(2),
      data.totales.saldoFinalDebe.toFixed(2),
      data.totales.saldoFinalHaber.toFixed(2)
    ]);

    const csvContent = [
      `Balance de Comprobación - ${empresaNombre}`,
      `Período: ${data.fechaInicio ? new Date(data.fechaInicio).toLocaleDateString('es-PE') : 'Inicio'} - ${data.fechaFin ? new Date(data.fechaFin).toLocaleDateString('es-PE') : 'Fin'}`,
      `Generado: ${data.fechaGeneracion.toLocaleString('es-PE')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_comprobacion_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportarExcel(data: BalanceComprobacionData, empresaNombre: string): void {
    let content = `Balance de Comprobación\n`;
    content += `${empresaNombre}\n`;
    content += `Período: ${data.fechaInicio ? new Date(data.fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} hasta ${data.fechaFin ? new Date(data.fechaFin).toLocaleDateString('es-PE') : 'la fecha actual'}\n`;
    content += `Generado: ${data.fechaGeneracion.toLocaleString('es-PE')}\n`;
    if (data.nivelCuenta) {
      content += `Nivel de cuenta: ${data.nivelCuenta}\n`;
    }
    content += `\n`;

    const headers = [
      'Código',
      'Nombre de la Cuenta',
      'Saldo Inicial Debe',
      'Saldo Inicial Haber',
      'Movimientos Debe',
      'Movimientos Haber',
      'Saldo Final Debe',
      'Saldo Final Haber'
    ];
    content += headers.join('\t') + '\n';

    data.items.forEach(item => {
      content += [
        item.cuenta.codigo,
        item.cuenta.nombre,
        item.saldoInicialDebe.toFixed(2),
        item.saldoInicialHaber.toFixed(2),
        item.movimientosDebe.toFixed(2),
        item.movimientosHaber.toFixed(2),
        item.saldoFinalDebe.toFixed(2),
        item.saldoFinalHaber.toFixed(2)
      ].join('\t') + '\n';
    });

    content += '\n';
    content += [
      '',
      'TOTALES',
      data.totales.saldoInicialDebe.toFixed(2),
      data.totales.saldoInicialHaber.toFixed(2),
      data.totales.movimientosDebe.toFixed(2),
      data.totales.movimientosHaber.toFixed(2),
      data.totales.saldoFinalDebe.toFixed(2),
      data.totales.saldoFinalHaber.toFixed(2)
    ].join('\t') + '\n';

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_comprobacion_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportarPDF(data: BalanceComprobacionData, empresaNombre: string): void {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Balance de Comprobación</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .period {
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          .number {
            text-align: right;
          }
          .totals {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${empresaNombre}</div>
          <div class="report-title">BALANCE DE COMPROBACIÓN</div>
          <div class="period">
            Período: ${data.fechaInicio ? new Date(data.fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'}
            hasta ${data.fechaFin ? new Date(data.fechaFin).toLocaleDateString('es-PE') : 'la fecha actual'}
          </div>
          ${data.nivelCuenta ? `<div class="period">Nivel de cuenta: ${data.nivelCuenta}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2">Código</th>
              <th rowspan="2">Nombre de la Cuenta</th>
              <th colspan="2">Saldo Inicial</th>
              <th colspan="2">Movimientos</th>
              <th colspan="2">Saldo Final</th>
            </tr>
            <tr>
              <th>Debe</th>
              <th>Haber</th>
              <th>Debe</th>
              <th>Haber</th>
              <th>Debe</th>
              <th>Haber</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.cuenta.codigo}</td>
                <td>${item.cuenta.nombre}</td>
                <td class="number">${item.saldoInicialDebe > 0 ? item.saldoInicialDebe.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
                <td class="number">${item.saldoInicialHaber > 0 ? item.saldoInicialHaber.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
                <td class="number">${item.movimientosDebe > 0 ? item.movimientosDebe.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
                <td class="number">${item.movimientosHaber > 0 ? item.movimientosHaber.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
                <td class="number">${item.saldoFinalDebe > 0 ? item.saldoFinalDebe.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
                <td class="number">${item.saldoFinalHaber > 0 ? item.saldoFinalHaber.toLocaleString('es-PE', {minimumFractionDigits: 2}) : '-'}</td>
              </tr>
            `).join('')}
            <tr class="totals">
              <td colspan="2">TOTALES</td>
              <td class="number">${data.totales.saldoInicialDebe.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
              <td class="number">${data.totales.saldoInicialHaber.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
              <td class="number">${data.totales.movimientosDebe.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
              <td class="number">${data.totales.movimientosHaber.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
              <td class="number">${data.totales.saldoFinalDebe.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
              <td class="number">${data.totales.saldoFinalHaber.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          Generado el ${data.fechaGeneracion.toLocaleString('es-PE')} | ${data.items.length} cuentas incluidas
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');

    if (newWindow) {
      newWindow.onload = () => {
        setTimeout(() => {
          newWindow.print();
        }, 500);
      };
    }
  }
};
