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
  // Obtener movimientos del libro mayor para una cuenta específica
  async getLibroMayorCuenta(
    empresaId: string, 
    cuentaId: string, 
    fechaInicio?: string, 
    fechaFin?: string
  ): Promise<LibroMayorData | null> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      // Obtener información de la cuenta
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
      const cuentasSnapshot = await getDocs(query(cuentasRef, where('__name__', '==', cuentaId)));
      
      if (cuentasSnapshot.empty) {
        throw new Error('Cuenta no encontrada');
      }

      const cuenta = {
        id: cuentasSnapshot.docs[0].id,
        ...cuentasSnapshot.docs[0].data()
      } as PlanCuenta;

      // Construir query para asientos
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      let asientosQuery = query(
        asientosRef,
        where('estado', '==', 'confirmado'),
        orderBy('fecha', 'asc'),
        orderBy('numero', 'asc')
      );

      // Aplicar filtros de fecha si se proporcionan
      if (fechaInicio) {
        asientosQuery = query(asientosQuery, where('fecha', '>=', fechaInicio));
      }
      if (fechaFin) {
        asientosQuery = query(asientosQuery, where('fecha', '<=', fechaFin));
      }

      const asientosSnapshot = await getDocs(asientosQuery);
      
      // Procesar movimientos
      const movimientos: MovimientoLibroMayor[] = [];
      let saldoAcumulado = 0;
      let totalDebe = 0;
      let totalHaber = 0;

      // Calcular saldo inicial (movimientos antes del período)
      let saldoInicial = 0;
      if (fechaInicio) {
        saldoInicial = await this.calcularSaldoInicial(empresaId, cuentaId, fechaInicio, cuenta.tipo);
        saldoAcumulado = saldoInicial;
      }

      asientosSnapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        
        // Buscar movimientos de esta cuenta en el asiento
        asiento.movimientos.forEach(movimiento => {
          if (movimiento.cuentaId === cuentaId) {
            const debe = movimiento.debito || 0;
            const haber = movimiento.credito || 0;
            
            // Calcular saldo según naturaleza de la cuenta
            if (['ACTIVO', 'GASTO'].includes(cuenta.tipo)) {
              saldoAcumulado += debe - haber;
            } else {
              saldoAcumulado += haber - debe;
            }

            totalDebe += debe;
            totalHaber += haber;

            movimientos.push({
              id: `${doc.id}_${movimiento.id}`,
              fecha: asiento.fecha,
              asientoNumero: asiento.numero,
              descripcion: movimiento.descripcion || asiento.descripcion,
              referencia: asiento.referencia,
              debe,
              haber,
              saldo: saldoAcumulado,
              asientoId: doc.id
            });
          }
        });
      });

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

  // Calcular saldo inicial antes de una fecha
  async calcularSaldoInicial(
    empresaId: string, 
    cuentaId: string, 
    fechaInicio: string, 
    tipoCuenta: string
  ): Promise<number> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const asientosQuery = query(
        asientosRef,
        where('fecha', '<', fechaInicio),
        where('estado', '==', 'confirmado')
      );

      const asientosSnapshot = await getDocs(asientosQuery);
      let saldo = 0;

      asientosSnapshot.docs.forEach(doc => {
        const asiento = doc.data() as AsientoContable;
        
        asiento.movimientos.forEach(movimiento => {
          if (movimiento.cuentaId === cuentaId) {
            const debe = movimiento.debito || 0;
            const haber = movimiento.credito || 0;
            
            // Calcular según naturaleza de la cuenta
            if (['ACTIVO', 'GASTO'].includes(tipoCuenta)) {
              saldo += debe - haber;
            } else {
              saldo += haber - debe;
            }
          }
        });
      });

      return saldo;
    } catch (error) {
      console.error('Error calculando saldo inicial:', error);
      return 0;
    }
  },

  // Exportar libro mayor a CSV
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

    // Agregar fila de saldo inicial si existe
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

    // Agregar fila de totales
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

  // Exportar libro mayor a Excel (formato CSV mejorado)
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

    // Headers
    csvContent += headers.join('\t') + '\n';

    // Saldo inicial
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

    // Movimientos
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

    // Totales
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