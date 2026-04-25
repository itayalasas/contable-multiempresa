import { describe, expect, it } from 'vitest';
import { evaluarCierrePeriodo } from './cierreValidacion';

describe('cierre de periodo', () => {
  it('marca cierre invalido cuando hay pendientes criticos', () => {
    const resultado = evaluarCierrePeriodo({
      asientosBorrador: 1,
      asientosDescuadrados: 0,
      diferenciaDebitosCreditos: 0,
      facturasVentaSinContabilizar: 2,
      facturasCompraSinContabilizar: 0,
      facturasConError: 0,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toHaveLength(2);
  });
});
