import { describe, expect, it } from 'vitest';
import { buildEstadoResultados, buildFlujoEfectivo } from './reportesFinancieros';

describe('reportes financieros', () => {
  it('calcula estado de resultados desde movimientos', () => {
    const data = buildEstadoResultados([
      { debito: 0, credito: 1200, plan_cuentas: { codigo: '7011', nombre: 'Ventas', tipo: 'INGRESO' } },
      { debito: 300, credito: 0, plan_cuentas: { codigo: '6011', nombre: 'Gastos admin', tipo: 'GASTO' } },
    ]);

    expect(data.totalIngresos).toBe(1200);
    expect(data.totalGastos).toBe(300);
    expect(data.resultadoNeto).toBe(900);
  });

  it('calcula flujo de efectivo desde tesoreria', () => {
    const data = buildFlujoEfectivo([
      { tipo_movimiento: 'INGRESO', monto: 1500 },
      { tipo_movimiento: 'EGRESO', monto: 400 },
      { tipo_movimiento: 'TRANSFERENCIA', monto: 100 },
    ]);

    expect(data.ingresosOperativos).toBe(1500);
    expect(data.egresosOperativos).toBe(400);
    expect(data.flujoNeto).toBe(1100);
  });
});
