import { describe, expect, it } from 'vitest';
import { calcularTotalesFactura } from './facturas';

describe('facturacion', () => {
  it('calcula subtotales e iva con descuento', () => {
    const resultado = calcularTotalesFactura([
      { descripcion: 'Servicio', cantidad: 2, precio_unitario: 100, descuento_porcentaje: 10, tasa_iva: 0.22 },
    ]);

    expect(resultado.subtotal).toBeCloseTo(180);
    expect(resultado.totalIva).toBeCloseTo(39.6);
    expect(resultado.total).toBeCloseTo(219.6);
  });
});
