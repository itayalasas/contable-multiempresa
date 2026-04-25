import { describe, expect, it } from 'vitest';
import { buildResumenConciliacion, detectBankMovementType, parseImportedBankRows } from './conciliacion';

describe('conciliacion helpers', () => {
  it('detecta cargos y abonos correctamente', () => {
    expect(detectBankMovementType(-1200, 'cargo banco')).toBe('CARGO');
    expect(detectBankMovementType(3500, 'deposito cliente')).toBe('ABONO');
  });

  it('parsea filas importadas con débito y crédito', () => {
    const rows = [
      { Fecha: '25/04/2026', Descripcion: 'Deposito', Credito: '1.250,50', Referencia: 'DEP-1' },
      { Fecha: '26/04/2026', Descripcion: 'Comision', Debito: '250,00', Referencia: 'COM-1' },
    ];

    const parsed = parseImportedBankRows(rows);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].tipo).toBe('ABONO');
    expect(parsed[1].tipo).toBe('CARGO');
  });

  it('construye resumen de conciliacion', () => {
    const resumen = buildResumenConciliacion(
      [
        { id: '1', fecha: '2026-04-25', descripcion: 'Depósito', referencia: '', monto: 1000, tipo: 'ABONO', conciliado: true, cuentaId: 'c1', conciliacionId: 'cc1' },
        { id: '2', fecha: '2026-04-25', descripcion: 'Cargo', referencia: '', monto: 250, tipo: 'CARGO', conciliado: false, cuentaId: 'c1', conciliacionId: 'cc1' },
      ],
      [
        { id: '3', fecha: '2026-04-25', asientoNumero: 'A-1', descripcion: 'Cobro', monto: 1000, tipo: 'INGRESO', conciliado: true, cuentaId: 'c1' },
      ],
    );

    expect(resumen.movimientosPendientes).toBe(1);
    expect(resumen.diferenciaTotal).toBe(-250);
  });
});
