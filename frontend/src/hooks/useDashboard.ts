import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '../services/firebase/dashboard';
import { dashboardService } from '../services/firebase/dashboard';

export const useDashboard = (empresaId: string | undefined) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar estadísticas del dashboard
  const cargarStats = useCallback(async () => {
    if (!empresaId) {
      setStats(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando estadísticas del dashboard...');
      
      const dashboardStats = await dashboardService.getDashboardStats(empresaId);
      setStats(dashboardStats);
      
      console.log('✅ Estadísticas del dashboard cargadas exitosamente');
    } catch (err) {
      console.error('❌ Error al cargar estadísticas del dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Cargar estadísticas cuando cambie la empresa
  useEffect(() => {
    cargarStats();
  }, [cargarStats]);

  // Recargar estadísticas manualmente
  const recargarStats = useCallback(() => {
    cargarStats();
  }, [cargarStats]);

  return {
    // Estado
    stats,
    loading,
    error,
    
    // Utilidades
    recargarStats,
    limpiarError: () => setError(null)
  };
};