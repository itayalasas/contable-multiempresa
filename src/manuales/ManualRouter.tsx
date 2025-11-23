import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ManualIndex from './index';
import AsientosContablesManual from './contabilidad/AsientosContablesManual';
import PlanCuentasManual from './contabilidad/PlanCuentasManual';
import TesoreriaManual from './finanzas/TesoreriaManual';
import ConciliacionBancariaManual from './finanzas/ConciliacionBancariaManual';

export const ManualRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ManualIndex />} />
      <Route path="/contabilidad/asientos" element={<AsientosContablesManual />} />
      <Route path="/contabilidad/plan-cuentas" element={<PlanCuentasManual />} />
      <Route path="/finanzas/tesoreria" element={<TesoreriaManual />} />
      <Route path="/finanzas/conciliacion" element={<ConciliacionBancariaManual />} />
      {/* Redireccionar rutas no encontradas al índice del manual */}
      <Route path="*" element={<Navigate to="/manuales\" replace />} />
    </Routes>
  );
};

