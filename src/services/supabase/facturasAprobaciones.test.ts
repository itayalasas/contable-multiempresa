import { describe, expect, it } from 'vitest';
import { construirPayloadActualizacionFactura } from './facturas';

describe('facturas aprobaciones', () => {
  it('construye el payload completo de modificacion con items y totales recalculados', () => {
    const payload = construirPayloadActualizacionFactura({
      empresa_id: 'empresa-1',
      cliente_id: 'cliente-1',
      tipo_documento: 'e-factura',
      fecha_emision: '2026-04-26',
      fecha_vencimiento: '2026-05-10',
      moneda: 'UYU',
      observaciones: 'Ajuste por correccion',
      items: [
        {
          descripcion: 'Servicio mensual',
          cantidad: 2,
          precio_unitario: 100,
          descuento_porcentaje: 10,
          tasa_iva: 0.22,
        },
      ],
    });

    expect(payload.cliente_id).toBe('cliente-1');
    expect(payload.subtotal).toBe('180.00');
    expect(payload.total_iva).toBe('39.60');
    expect(payload.total).toBe('219.60');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      numero_linea: 1,
      descripcion: 'Servicio mensual',
      descuento_monto: '20.00',
      subtotal: '180.00',
      monto_iva: '39.60',
      total: '219.60',
    });
  });
});
