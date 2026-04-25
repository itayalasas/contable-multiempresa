import { describe, expect, it } from 'vitest';
import { determinarIndicadorFacturacion, formatearFechaDGI, redondearDecimales } from './helpers';

describe('helpers DGI', () => {
  it('formatea fechas para DGI', () => {
    expect(formatearFechaDGI('2026-04-25T10:00:00.000Z')).toBe('25/04/2026');
  });

  it('redondea decimales de forma estable', () => {
    expect(redondearDecimales(10.555, 2)).toBe(10.56);
  });

  it('determina indicador de facturacion por IVA', () => {
    expect(determinarIndicadorFacturacion(0)).toBe(1);
    expect(determinarIndicadorFacturacion(0.1)).toBe(2);
    expect(determinarIndicadorFacturacion(0.22)).toBe(3);
  });
});
