export function formatearFechaDGI(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function redondearDecimales(valor: unknown, decimales = 2): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const factor = 10 ** decimales;
  return Math.round((numero + Number.EPSILON) * factor) / factor;
}

export function determinarIndicadorFacturacion(tasaIva: string | number | null): number {
  if (!tasaIva || parseFloat(tasaIva.toString()) === 0) return 1;
  const tasa = parseFloat(tasaIva.toString());
  if (tasa === 0.10) return 2;
  if (tasa === 0.22) return 3;
  return 4;
}
