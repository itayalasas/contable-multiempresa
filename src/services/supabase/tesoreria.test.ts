import { describe, expect, it } from 'vitest';
import { tesoreriaSupabaseService } from './tesoreria';

describe('tesoreria y asientos automáticos', () => {
  it('genera asiento automatico para pagos y cobros configurados', () => {
    expect(tesoreriaSupabaseService.shouldAutoGenerateAsiento({
      cuentaBancariaId: '1',
      tipoMovimiento: 'EGRESO',
      fecha: '2026-04-25',
      monto: 100,
      descripcion: 'Pago proveedor',
      referencia: null,
      beneficiario: null,
      categoria: 'PAGO_PROVEEDOR',
      cuentaDestinoId: null,
      documentoSoporte: null,
      empresaId: 'e1',
      creadoPor: 'u1',
    })).toBe(true);
  });
});
