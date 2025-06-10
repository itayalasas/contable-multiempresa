// Tipos de documentos de identidad por país
export interface TipoDocumentoIdentidad {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  activo: boolean;
}

// Tipos de documentos de factura por país
export interface TipoDocumentoFactura {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  activo: boolean;
  // Configuración específica
  requiereImpuesto: boolean;
  requiereCliente: boolean;
  afectaInventario: boolean;
  afectaContabilidad: boolean;
  prefijo?: string;
  formato?: string;
}

// Tipos de impuestos por país
export interface TipoImpuesto {
  id: string;
  nombre: string;
  codigo: string;
  porcentaje: number;
  tipo: 'IVA' | 'IGV' | 'ISR' | 'RETENCION' | 'OTRO';
  paisId: string;
  activo: boolean;
  cuentaContableId?: string;
}

// Tipos de monedas por país
export interface TipoMoneda {
  id: string;
  nombre: string;
  codigo: string;
  simbolo: string;
  paisId: string;
  activo: boolean;
  esPrincipal: boolean;
}

// Formas de pago por país
export interface FormaPago {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  activo: boolean;
  requiereBanco: boolean;
  requiereReferencia: boolean;
  requiereFecha: boolean;
}

// Tipos de movimiento de tesorería
export interface TipoMovimientoTesoreria {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  activo: boolean;
  afectaSaldo: boolean;
  requiereReferencia?: boolean;
  requiereDocumento?: boolean;
}

// Bancos por país
export interface Banco {
  id: string;
  nombre: string;
  codigo: string;
  paisId: string;
  activo: boolean;
}

// Unidades de medida
interface UnidadMedida {
  id: string;
  nombre: string;
  codigo: string;
  simbolo: string;
  paisId: string;
  activo: boolean;
}

// Categorías de productos/servicios
interface CategoriaProducto {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  paisId: string;
  activo: boolean;
  cuentaContableId?: string;
}