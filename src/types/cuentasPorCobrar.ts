export type EstadoFactura = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA';
export type TipoDocumento = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type TipoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'OTRO';

export interface Cliente {
  id: string;
  nombre: string;
  razonSocial?: string;
  tipoDocumento: 'DNI' | 'RUC' | 'PASAPORTE' | 'CARNET_EXTRANJERIA';
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  contacto?: string;
  activo: boolean;
  fechaCreacion: Date;
  empresaId: string;
  // Información adicional
  limiteCredito?: number;
  diasCredito?: number;
  observaciones?: string;
}

export interface FacturaPorCobrar {
  id: string;
  numero: string;
  tipoDocumento: TipoDocumento;
  clienteId: string;
  cliente: Cliente;
  fechaEmision: string;
  fechaVencimiento: string;
  descripcion?: string;
  montoSubtotal: number;
  montoImpuestos: number;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  estado: EstadoFactura;
  moneda: string;
  // Detalles de la factura
  items: ItemFactura[];
  // Información adicional
  observaciones?: string;
  referencia?: string;
  condicionesPago?: string;
  // Metadatos
  empresaId: string;
  creadoPor: string;
  fechaCreacion: string;
  fechaModificacion?: string;
}

export interface ItemFactura {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  impuesto?: number;
  total: number;
}

export interface PagoFactura {
  id: string;
  facturaId: string;
  fechaPago: string;
  monto: number;
  tipoPago: TipoPago;
  referencia?: string;
  observaciones?: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface ResumenCuentasPorCobrar {
  totalFacturas: number;
  totalPorCobrar: number;
  totalVencido: number;
  totalPorVencer: number;
  facturasPendientes: number;
  facturasVencidas: number;
  facturasDelMes: number;
  promedioCobranza: number; // días promedio de cobranza
  // Por rangos de vencimiento
  vencimiento0a30: number;
  vencimiento31a60: number;
  vencimiento61a90: number;
  vencimientoMas90: number;
  // Por cliente
  clientesConDeuda: number;
  clientesMayorDeuda: Cliente[];
}

interface FiltrosCuentasPorCobrar {
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: string;
  estado?: EstadoFactura;
  tipoDocumento?: TipoDocumento;
  montoMinimo?: number;
  montoMaximo?: number;
  soloVencidas?: boolean;
}

interface ReporteCuentasPorCobrar {
  resumen: ResumenCuentasPorCobrar;
  facturas: FacturaPorCobrar[];
  antiguedadSaldos: {
    cliente: Cliente;
    totalDeuda: number;
    vencimiento0a30: number;
    vencimiento31a60: number;
    vencimiento61a90: number;
    vencimientoMas90: number;
  }[];
  fechaGeneracion: Date;
}