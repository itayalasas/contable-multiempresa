export type EstadoFactura = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA';
export type TipoDocumento = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type TipoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'OTRO';

export interface Proveedor {
  id: string;
  nombre: string;
  razonSocial?: string;
  tipoDocumento: string;
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  contacto?: string;
  activo: boolean;
  fechaCreacion: Date;
  empresaId: string;
  // Información adicional
  condicionesPago?: string;
  diasCredito?: number;
  observaciones?: string;
  cuentaBancaria?: string;
  banco?: string;
}

export interface FacturaPorPagar {
  id: string;
  numero: string;
  tipoDocumento: TipoDocumento;
  proveedorId: string;
  proveedor: Proveedor;
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

export interface PagoProveedor {
  id: string;
  facturaId: string;
  fechaPago: string;
  monto: number;
  tipoPago: TipoPago;
  referencia?: string;
  observaciones?: string;
  creadoPor: string;
  fechaCreacion: string;
  banco?: string;
  numeroCuenta?: string;
  numeroOperacion?: string;
}

export interface ResumenCuentasPorPagar {
  totalFacturas: number;
  totalPorPagar: number;
  totalVencido: number;
  totalPorVencer: number;
  facturasPendientes: number;
  facturasVencidas: number;
  facturasDelMes: number;
  promedioPago: number; // días promedio de pago
  // Por rangos de vencimiento
  vencimiento0a30: number;
  vencimiento31a60: number;
  vencimiento61a90: number;
  vencimientoMas90: number;
  // Por proveedor
  proveedoresConDeuda: number;
  proveedoresMayorDeuda: Proveedor[];
}