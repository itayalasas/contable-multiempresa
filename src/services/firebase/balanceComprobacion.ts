import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { AsientoContable, PlanCuenta } from '../../types';

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
  // Generar balance de comprobación
  async generateBalanceComprobacion(
    empresaId: string,
    fechaInicio?: string,
    fechaFin?: string,
    nivelCuenta?: number
  ): Promise<BalanceComprobacionData> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      // Obtener todas las cuentas activas
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
      let cuentasQuery = query(
        cuentasRef,
        where('activa', '==', true),
        orderBy('codigo', 'asc')
      );

      // Filtrar por nivel si se especifica
      if (nivelCuenta && nivelCuenta > 0) {
        cuentasQuery = query(cuentasQuery, where('nivel', '==', nivelCuenta));
      }

      const cuentasSnapshot = await getDocs(cuentasQuery);
      const cuentas = cuentasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlanCuenta[];

      // Obtener asientos del período
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      let asientosQuery = query(
        asientosRef,
        where('estado', '==', 'confirmado'),
        orderBy('fecha', 'asc')
      );

      // Aplicar filtros de fecha
      if (fechaInicio) {
        asientosQuery = query(asientosQuery, where('fecha', '>=', fechaInicio));
      }
      if (fechaFin) {
        asientosQuery = query(asientosQuery, where('fecha', '<=', fechaFin));
      }

      const asientosSnapshot = await getDocs(asientosQuery);
      const asientos = asientosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AsientoContable[];

      // Calcular saldos iniciales (antes del período)
      const saldosIniciales = await this.calcularSaldosIniciales(
        empresaId, 
        cuentas, 
        fechaInicio
      );

      // Procesar movimientos del período
      const movimientosPeriodo = new Map<string, { debe: number; haber: number }>();
      
      asientos.forEach(asiento => {
        asiento.movimientos.forEach(movimiento => {
          if (!movimientosPeriodo.has(movimiento.cuentaId)) {
            movimientosPeriodo.set(movimiento.cuentaId, { debe: 0, haber: 0 });
          }
          
          const mov = movimientosPeriodo.get(movimiento.cuentaId)!;
          mov.debe += movimiento.debito || 0;
          mov.haber += movimiento.credito || 0;
        });
      });

      // Generar items del balance
      const items: BalanceComprobacionItem[] = [];
      let totales = {
        saldoInicialDebe: 0,
        saldoInicialHaber: 0,
        movimientosDebe: 0,
        movimientosHaber: 0,
        saldoFinalDebe: 0,
        saldoFinalHaber: 0
      };

      cuentas.forEach(cuenta => {
        const saldoInicial = saldosIniciales.get(cuenta.id) || 0;
        const movimientos = movimientosPeriodo.get(cuenta.id) || { debe: 0, haber: 0 };
        
        // Calcular saldos según naturaleza de la cuenta
        let saldoFinal = saldoInicial;
        if (['ACTIVO', 'GASTO'].includes(cuenta.tipo)) {
          saldoFinal += movimientos.debe - movimientos.haber;
        } else {
          saldoFinal += movimientos.haber - movimientos.debe;
        }

        // Determinar presentación de saldos (debe/haber)
        const saldoInicialDebe = saldoInicial > 0 ? saldoInicial : 0;
        const saldoInicialHaber = saldoInicial < 0 ? Math.abs(saldoInicial) : 0;
        const saldoFinalDebe = saldoFinal > 0 ? saldoFinal : 0;
        const saldoFinalHaber = saldoFinal < 0 ? Math.abs(saldoFinal) : 0;

        // Solo incluir cuentas con movimientos o saldos
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

          // Acumular totales
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

  // Calcular saldos iniciales antes del período
  async calcularSaldosIniciales(
    empresaId: string,
    cuentas: PlanCuenta[],
    fechaInicio?: string
  ): Promise<Map<string, number>> {
    const saldos = new Map<string, number>();

    if (!fechaInicio) {
      return saldos; // Sin fecha inicio, no hay saldos iniciales
    }

    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const asientosQuery = query(
        asientosRef,
        where('fecha', '<', fechaInicio),
        where('estado', '==', 'confirmado')
      );

      const asientosSnapshot = await getDocs(asientosQuery);
      
      // Crear mapa de tipos de cuenta para cálculo rápido
      const tiposCuenta = new Map<string, string>();
      cuentas.forEach(cuenta => {
        tiposCuenta.set(cuenta.id, cuenta.tipo);
      });

      asientosSnapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        
        asiento.movimientos.forEach(movimiento => {
          if (!saldos.has(movimiento.cuentaId)) {
            saldos.set(movimiento.cuentaId, 0);
          }
          
          const saldoActual = saldos.get(movimiento.cuentaId)!;
          const tipoCuenta = tiposCuenta.get(movimiento.cuentaId);
          const debe = movimiento.debito || 0;
          const haber = movimiento.credito || 0;
          
          // Calcular según naturaleza de la cuenta
          if (['ACTIVO', 'GASTO'].includes(tipoCuenta || '')) {
            saldos.set(movimiento.cuentaId, saldoActual + debe - haber);
          } else {
            saldos.set(movimiento.cuentaId, saldoActual + haber - debe);
          }
        });
      });

      return saldos;
    } catch (error) {
      console.error('Error calculando saldos iniciales:', error);
      return saldos;
    }
  },

  // Exportar a CSV
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

    // Agregar fila de totales
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
  

  // Exportar a Excel (formato empresarial)
  exportarExcel(data: BalanceComprobacionData, empresaNombre: string): void {
    let content = `Balance de Comprobación\n`;
    content += `${empresaNombre}\n`;
    content += `Período: ${data.fechaInicio ? new Date(data.fechaInicio).toLocaleDateString('es-PE') : 'Desde el inicio'} hasta ${data.fechaFin ? new Date(data.fechaFin).toLocaleDateString('es-PE') : 'la fecha actual'}\n`;
    content += `Generado: ${data.fechaGeneracion.toLocaleString('es-PE')}\n`;
    if (data.nivelCuenta) {
      content += `Nivel de cuenta: ${data.nivelCuenta}\n`;
    }
    content += `\n`;

    // Headers
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

    // Datos
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

    // Totales
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

  // Exportar a PDF (formato empresarial)
  exportarPDF(data: BalanceComprobacionData, empresaNombre: string): void {
    // Crear contenido HTML para PDF
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

    // Crear y descargar PDF
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