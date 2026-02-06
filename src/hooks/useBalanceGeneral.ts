import { useState, useEffect } from 'react';
import { balanceGeneralService, BalanceGeneral } from '../services/supabase/balanceGeneral';

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

  const exportarPDF = async () => {
    if (!balance) return;
    console.log('Exportar PDF no implementado aún');
  };

  const exportarExcel = async () => {
    if (!balance) return;
    console.log('Exportar Excel no implementado aún');
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
