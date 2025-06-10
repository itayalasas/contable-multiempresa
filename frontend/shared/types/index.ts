// Tipos compartidos entre frontend y backend

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin_empresa' | 'contador' | 'usuario';
  empresasAsignadas: string[]; // IDs de empresas a las que tiene acceso
  permisos: string[];
  avatar?: string;
  paisId?: string; // País de origen del usuario
  auth0Id?: string;
  fechaCreacion: Date;
  ultimaConexion?: Date;
  activo: boolean;
  configuracion?: {
    idioma: string;
    timezone: string;
    formatoFecha: string;
    formatoMoneda: string;
  };
}

export interface Empresa {
  id: string;
  nombre: string;
  razonSocial: string;
  numeroIdentificacion: string; // RUC, NIT, RFC, etc según el país
  paisId: string; // ID del país
  subdominio?: string;
  direccion: string;
  telefono: string;
  email: string;
  monedaPrincipal: string;
  logo?: string;
  activa: boolean;
  usuariosAsignados: string[]; // IDs de usuarios con acceso
  configuracionContable: ConfiguracionContable;
  fechaCreacion: Date;
  fechaActualizacion?: Date;
  planContableId?: string; // Plan contable específico del país
}

export interface Pais {
  id: string;
  nombre: string;
  codigo: string; // PE, CO, MX, etc.
  codigoISO: string; // PER, COL, MEX, etc.
  monedaPrincipal: string;
  simboloMoneda: string;
  formatoFecha: string;
  separadorDecimal: string;
  separadorMiles: string;
  configuracionTributaria: ConfiguracionTributaria;
  planContableBase: string; // ID del plan contable base del país
  activo: boolean;
  fechaCreacion: Date;
}

export interface ConfiguracionTributaria {
  tiposDocumento: TipoDocumento[];
  impuestos: Impuesto[];
  regimenesTributarios: RegimenTributario[];
  formatoNumeroIdentificacion: string;
  longitudNumeroIdentificacion: number;
  validacionNumeroIdentificacion?: string; // Regex para validación
}

export interface TipoDocumento {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

export interface Impuesto {
  id: string;
  nombre: string;
  codigo: string;
  porcentaje: number;
  tipo: 'IVA' | 'IGV' | 'ISR' | 'RETENCION' | 'OTRO';
  cuentaContableId?: string;
  activo: boolean;
}

export interface RegimenTributario {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface ConfiguracionContable {
  ejercicioFiscal: number;
  fechaInicioEjercicio: Date;
  fechaFinEjercicio: Date;
  metodoCosteo: 'PROMEDIO' | 'FIFO' | 'LIFO' | 'ESPECIFICO';
  tipoInventario: 'PERPETUO' | 'PERIODICO';
  manejaInventario: boolean;
  decimalesMoneda: number;
  decimalesCantidades: number;
  numeracionAutomatica: boolean;
  prefijoAsientos: string;
  longitudNumeracion: number;
  regimenTributario: string;
  configuracionImpuestos: ConfiguracionImpuesto[];
}

export interface ConfiguracionImpuesto {
  impuestoId: string;
  cuentaDebitoId: string;
  cuentaCreditoId: string;
  aplicaAutomaticamente: boolean;
}

export interface PlanCuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
  nivel: number;
  cuentaPadre?: string;
  descripcion?: string;
  saldo?: number;
  activa: boolean;
  paisId: string; // Plan específico por país
  empresaId?: string; // Si es específica de una empresa
  fechaCreacion: Date;
  fechaModificacion: Date;
  configuracion?: {
    manejaAuxiliares: boolean;
    requiereDocumento: boolean;
    requiereTercero: boolean;
    centroCostoObligatorio: boolean;
  };
}

export interface AsientoContable {
  id: string;
  numero: string;
  fecha: string;
  descripcion: string;
  referencia?: string;
  estado: 'borrador' | 'confirmado' | 'anulado';
  movimientos: MovimientoContable[];
  empresaId: string;
  paisId: string;
  creadoPor: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  documentoSoporte?: DocumentoSoporte;
  centroCosto?: string;
  proyecto?: string;
}

export interface MovimientoContable {
  id: string;
  cuentaId: string;
  cuenta: string;
  debito?: number;
  credito?: number;
  descripcion?: string;
  terceroId?: string;
  tercero?: string;
  documentoReferencia?: string;
  centroCosto?: string;
}

export interface DocumentoSoporte {
  tipo: string;
  numero: string;
  fecha: Date;
  tercero?: string;
  valor: number;
  impuestos?: ImpuestoDocumento[];
}

export interface ImpuestoDocumento {
  impuestoId: string;
  base: number;
  porcentaje: number;
  valor: number;
}

// Interfaces para sesión
export interface SesionUsuario {
  usuario: Usuario;
  empresaActual: Empresa | null;
  paisActual: Pais | null;
  empresasDisponibles: Empresa[];
  permisos: string[];
  configuracion: ConfiguracionSesion;
}

export interface ConfiguracionSesion {
  idioma: string;
  timezone: string;
  formatoFecha: string;
  formatoMoneda: string;
  monedaDisplay: string;
  decimales: number;
}