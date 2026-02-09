import { useState, useEffect } from 'react';
import { balanceGeneralService, BalanceGeneral, CuentaBalance } from '../services/supabase/balanceGeneral';

export function useBalanceGeneral(empresaId: string | undefined) {
  const [balance, setBalance] = useState<BalanceGeneral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodosCerrados, setPeriodosCerrados] = useState<any[]>([]);

  useEffect(() => {
    cargarPeriodosCerrados();
  }, [empresaId]);

  const cargarPeriodosCerrados = async () => {
    if (!empresaId) return;
    try {
      const periodos = await balanceGeneralService.obtenerPeriodosCerrados(empresaId);
      setPeriodosCerrados(periodos);
    } catch (err: any) {
      console.error('Error al cargar periodos:', err);
    }
  };

  const cargarBalance = async (fechaCorte?: string, periodoId?: string) => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await balanceGeneralService.obtenerBalance(
        empresaId,
        fechaCorte,
        periodoId
      );
      setBalance(data);
    } catch (err: any) {
      console.error('Error al cargar balance general:', err);
      setError(err.message || 'Error al cargar balance general');
    } finally {
      setLoading(false);
    }
  };

  const formatearNumero = (valor: number) => {
    const numero = Number.isFinite(valor) ? valor : 0;
    return numero.toFixed(2);
  };

  const flattenCuentas = (cuentas: CuentaBalance[], nivel: number = 0) => {
    const filas: Array<{ cuenta: string; saldo: number; nivel: number }> = [];

    cuentas.forEach((cuenta) => {
      const saldo = Math.abs(Number(cuenta.saldo_final) || 0);
      filas.push({
        cuenta: `${cuenta.codigo} - ${cuenta.nombre}`,
        saldo,
        nivel
      });

      if (cuenta.subcuentas && cuenta.subcuentas.length > 0) {
        filas.push(...flattenCuentas(cuenta.subcuentas, nivel + 1));
      }
    });

    return filas;
  };

  const construirSeccion = (titulo: string, cuentas: CuentaBalance[]) => {
    const filas = flattenCuentas(cuentas);
    return {
      titulo,
      filas
    };
  };

  const construirSecciones = () => {
    if (!balance) return [] as Array<{ titulo: string; filas: Array<{ cuenta: string; saldo: number; nivel: number }> }>;

    return [
      construirSeccion('ACTIVO CORRIENTE', balance.activo_corriente),
      construirSeccion('ACTIVO NO CORRIENTE', balance.activo_no_corriente),
      construirSeccion('PASIVO CORRIENTE', balance.pasivo_corriente),
      construirSeccion('PASIVO NO CORRIENTE', balance.pasivo_no_corriente),
      construirSeccion('PATRIMONIO', balance.patrimonio)
    ];
  };

  const exportarPDF = async () => {
    if (!balance) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 40;
    const marginRight = 40;
    const maxWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
    let y = 40;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Balance General', marginLeft, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha de corte: ${balance.fecha_corte}`, marginLeft, y);
    y += 16;

    const secciones = construirSecciones();

    const escribirLinea = (textoIzq: string, textoDer?: string, esTitulo?: boolean) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 40;
      }

      doc.setFont('helvetica', esTitulo ? 'bold' : 'normal');
      doc.text(textoIzq, marginLeft, y, { maxWidth });
      if (textoDer) {
        doc.text(textoDer, doc.internal.pageSize.getWidth() - marginRight, y, { align: 'right' });
      }
      y += 14;
    };

    secciones.forEach((seccion) => {
      if (seccion.filas.length === 0) return;
      y += 6;
      escribirLinea(seccion.titulo, undefined, true);
      seccion.filas.forEach((fila) => {
        const indent = '  '.repeat(fila.nivel);
        escribirLinea(`${indent}${fila.cuenta}`, formatearNumero(fila.saldo));
      });
    });

    y += 10;
    escribirLinea('TOTAL ACTIVO', formatearNumero(balance.total_activo), true);
    escribirLinea('TOTAL PASIVO', formatearNumero(balance.total_pasivo), true);
    escribirLinea('TOTAL PATRIMONIO', formatearNumero(balance.total_patrimonio), true);
    escribirLinea('TOTAL PASIVO + PATRIMONIO', formatearNumero(balance.total_pasivo_patrimonio), true);

    doc.save(`balance_general_${balance.fecha_corte}.pdf`);
  };

  const exportarExcel = async () => {
    if (!balance) return;
    const xlsx = await import('xlsx');
    const rows: Array<(string | number)[]> = [];

    rows.push(['Balance General']);
    rows.push(['Fecha de corte', balance.fecha_corte]);
    rows.push([]);

    const secciones = construirSecciones();
    secciones.forEach((seccion) => {
      if (seccion.filas.length === 0) return;
      rows.push([seccion.titulo]);
      rows.push(['Cuenta', 'Saldo']);
      seccion.filas.forEach((fila) => {
        const indent = '  '.repeat(fila.nivel);
        rows.push([`${indent}${fila.cuenta}`, fila.saldo]);
      });
      rows.push([]);
    });

    rows.push(['TOTAL ACTIVO', balance.total_activo]);
    rows.push(['TOTAL PASIVO', balance.total_pasivo]);
    rows.push(['TOTAL PATRIMONIO', balance.total_patrimonio]);
    rows.push(['TOTAL PASIVO + PATRIMONIO', balance.total_pasivo_patrimonio]);
    rows.push(['DIFERENCIA', balance.diferencia]);

    const sheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Balance General');
    xlsx.writeFile(workbook, `balance_general_${balance.fecha_corte}.xlsx`);
  };

  return {
    balance,
    loading,
    error,
    periodosCerrados,
    cargarBalance,
    exportarPDF,
    exportarExcel
  };
}
