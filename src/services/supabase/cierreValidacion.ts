export interface CierreMetricas {
  asientosBorrador: number;
  asientosDescuadrados: number;
  diferenciaDebitosCreditos: number;
  facturasVentaSinContabilizar: number;
  facturasCompraSinContabilizar: number;
  facturasConError: number;
}

export interface CierreResultado {
  valido: boolean;
  errores: string[];
}

export function evaluarCierrePeriodo(metricas: CierreMetricas): CierreResultado {
  const errores: string[] = [];

  if (metricas.asientosBorrador > 0) {
    errores.push(`Hay ${metricas.asientosBorrador} asientos en borrador.`);
  }
  if (metricas.asientosDescuadrados > 0) {
    errores.push(`Hay ${metricas.asientosDescuadrados} asientos descuadrados.`);
  }
  if (Math.abs(metricas.diferenciaDebitosCreditos) > 0.01) {
    errores.push('Los débitos y créditos del período no cuadran.');
  }
  if (metricas.facturasVentaSinContabilizar > 0) {
    errores.push(`Hay ${metricas.facturasVentaSinContabilizar} facturas de venta sin contabilizar.`);
  }
  if (metricas.facturasCompraSinContabilizar > 0) {
    errores.push(`Hay ${metricas.facturasCompraSinContabilizar} facturas de compra sin contabilizar.`);
  }
  if (metricas.facturasConError > 0) {
    errores.push(`Hay ${metricas.facturasConError} facturas con error contable.`);
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
