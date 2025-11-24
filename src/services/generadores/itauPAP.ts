/**
 * Generador de archivos para Banco Itaú - PAP (Pago Automático a Proveedores)
 * Formato: TXT de longitud fija
 * Especificación: Itaú Uruguay
 */

export interface PagoProveedorPAP {
  rutProveedor: string;
  tipoCuenta: 'CA' | 'CC' | 'ITAU_PAGOS'; // CA=Caja Ahorro, CC=Cuenta Corriente
  numeroCuenta: string;
  importe: number;
  concepto: string;
  fechaValor: Date;
  moneda: 'UYU' | 'USD';
}

export interface ConfiguracionItauPAP {
  rutEmpresa: string;
  nombreEmpresa: string;
  numeroLote: number;
  fechaProceso: Date;
  moneda: 'UYU' | 'USD';
}

export class GeneradorItauPAP {
  private static LONGITUD_LINEA = 120;

  /**
   * Genera el archivo completo PAP para Itaú
   */
  static generarArchivo(
    config: ConfiguracionItauPAP,
    pagos: PagoProveedorPAP[]
  ): string {
    const lineas: string[] = [];

    // 1. Registro Cabecera
    lineas.push(this.generarCabecera(config));

    // 2. Registros Detalle (uno por cada pago)
    pagos.forEach(pago => {
      lineas.push(this.generarDetalle(pago, config.fechaProceso));
    });

    // 3. Registro Totales
    const montoTotal = pagos.reduce((sum, p) => sum + p.importe, 0);
    lineas.push(this.generarTotales(pagos.length, montoTotal));

    return lineas.join('\n');
  }

  /**
   * Genera el registro de cabecera (Tipo 1)
   */
  private static generarCabecera(config: ConfiguracionItauPAP): string {
    let linea = '';

    // Tipo Registro (pos 1, len 1)
    linea += '1';

    // RUT Empresa sin guiones (pos 2-12, len 11)
    linea += this.pad(this.limpiarRUT(config.rutEmpresa), 11, '0', 'left');

    // Fecha Proceso AAAAMMDD (pos 13-20, len 8)
    linea += this.formatearFecha(config.fechaProceso);

    // Nº Lote (pos 21-26, len 6)
    linea += this.pad(config.numeroLote.toString(), 6, '0', 'left');

    // Nombre Empresa (pos 27-56, len 30)
    linea += this.pad(this.limpiarTexto(config.nombreEmpresa), 30, ' ', 'right');

    // Moneda (pos 57-59, len 3)
    linea += config.moneda;

    // Relleno (pos 60-120, len 61)
    linea += ' '.repeat(61);

    return linea;
  }

  /**
   * Genera un registro de detalle (Tipo 2)
   */
  private static generarDetalle(pago: PagoProveedorPAP, fechaProceso: Date): string {
    let linea = '';

    // Tipo Registro (pos 1, len 1)
    linea += '2';

    // RUT Proveedor (pos 2-12, len 11)
    linea += this.pad(this.limpiarRUT(pago.rutProveedor), 11, '0', 'left');

    // Tipo Cuenta (pos 13, len 1)
    const tipoCuenta = {
      'CA': '1',
      'CC': '2',
      'ITAU_PAGOS': '3'
    }[pago.tipoCuenta];
    linea += tipoCuenta;

    // Nº Cuenta (pos 14-31, len 18)
    linea += this.pad(pago.numeroCuenta, 18, '0', 'left');

    // Importe (pos 32-44, len 13) - Sin decimales, multiplicado por 100
    const importeSinDecimales = Math.round(pago.importe * 100);
    linea += this.pad(importeSinDecimales.toString(), 13, '0', 'left');

    // Concepto/Referencia (pos 45-74, len 30)
    linea += this.pad(this.limpiarTexto(pago.concepto), 30, ' ', 'right');

    // Fecha Valor (pos 75-82, len 8)
    linea += this.formatearFecha(pago.fechaValor);

    // Moneda (pos 83-85, len 3)
    linea += pago.moneda;

    // Relleno (pos 86-120, len 35)
    linea += ' '.repeat(35);

    return linea;
  }

  /**
   * Genera el registro de totales (Tipo 3)
   */
  private static generarTotales(cantidadPagos: number, montoTotal: number): string {
    let linea = '';

    // Tipo Registro (pos 1, len 1)
    linea += '3';

    // Cantidad de registros tipo 2 (pos 2-7, len 6)
    linea += this.pad(cantidadPagos.toString(), 6, '0', 'left');

    // Importe total (pos 8-20, len 13) - Sin decimales
    const totalSinDecimales = Math.round(montoTotal * 100);
    linea += this.pad(totalSinDecimales.toString(), 13, '0', 'left');

    // Relleno (pos 21-120, len 100)
    linea += ' '.repeat(100);

    return linea;
  }

  /**
   * Limpia el RUT quitando puntos y guiones
   */
  private static limpiarRUT(rut: string): string {
    return rut.replace(/[.-]/g, '');
  }

  /**
   * Limpia texto para el archivo: sin acentos, mayúsculas, sin caracteres especiales
   */
  private static limpiarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^A-Z0-9 ]/g, '') // Solo letras, números y espacios
      .trim();
  }

  /**
   * Formatea fecha a AAAAMMDD
   */
  private static formatearFecha(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}${mes}${dia}`;
  }

  /**
   * Rellena una cadena con caracteres a la izquierda o derecha
   */
  private static pad(
    texto: string,
    longitud: number,
    caracter: string,
    direccion: 'left' | 'right'
  ): string {
    const textoLimitado = texto.substring(0, longitud);
    const relleno = caracter.repeat(Math.max(0, longitud - textoLimitado.length));

    return direccion === 'left'
      ? relleno + textoLimitado
      : textoLimitado + relleno;
  }

  /**
   * Valida que el archivo cumpla con las especificaciones
   */
  static validarArchivo(contenido: string): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const lineas = contenido.split('\n');

    if (lineas.length < 3) {
      errores.push('El archivo debe tener al menos 3 líneas (cabecera, detalle, totales)');
      return { valido: false, errores };
    }

    // Validar cabecera
    const cabecera = lineas[0];
    if (cabecera[0] !== '1') {
      errores.push('La primera línea debe ser un registro tipo 1 (cabecera)');
    }
    if (cabecera.length !== this.LONGITUD_LINEA) {
      errores.push(`La cabecera debe tener ${this.LONGITUD_LINEA} caracteres`);
    }

    // Validar detalles
    const cantidadDetalles = lineas.length - 2;
    for (let i = 1; i < lineas.length - 1; i++) {
      const detalle = lineas[i];
      if (detalle[0] !== '2') {
        errores.push(`La línea ${i + 1} debe ser un registro tipo 2 (detalle)`);
      }
      if (detalle.length !== this.LONGITUD_LINEA) {
        errores.push(`El detalle en línea ${i + 1} debe tener ${this.LONGITUD_LINEA} caracteres`);
      }
    }

    // Validar totales
    const totales = lineas[lineas.length - 1];
    if (totales[0] !== '3') {
      errores.push('La última línea debe ser un registro tipo 3 (totales)');
    }
    if (totales.length !== this.LONGITUD_LINEA) {
      errores.push(`Los totales deben tener ${this.LONGITUD_LINEA} caracteres`);
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Genera el nombre del archivo según formato Itaú
   */
  static generarNombreArchivo(
    rutEmpresa: string,
    numeroLote: number,
    fecha: Date
  ): string {
    const fechaStr = this.formatearFecha(fecha);
    const rutLimpio = this.limpiarRUT(rutEmpresa);
    const loteStr = String(numeroLote).padStart(6, '0');

    return `PAP_${rutLimpio}_${fechaStr}_${loteStr}.txt`;
  }
}
