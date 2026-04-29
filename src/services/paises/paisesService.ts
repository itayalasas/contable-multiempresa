import { Pais, ConfiguracionTributaria } from '../../types';
import { paisesSupabaseService } from '../supabase/paises';

export class PaisesService {
  static async getPaisesActivos(): Promise<Pais[]> {
    try {
      console.log('Obteniendo paises desde Supabase');
      const paises = await paisesSupabaseService.getPaisesActivos();
      console.log(`Se encontraron ${paises.length} paises en Supabase`);
      return paises;
    } catch (error) {
      console.error('Error obteniendo paises:', error);
      return [];
    }
  }

  static async getPais(paisId: string): Promise<Pais | null> {
    try {
      console.log(`Buscando pais ${paisId} en Supabase`);
      const pais = await paisesSupabaseService.getPaisById(paisId);
      if (pais) {
        console.log(`Pais ${paisId} encontrado en Supabase`);
      }
      return pais;
    } catch (error) {
      console.error('Error obteniendo pais:', error);
      return null;
    }
  }

  static async getPaisPorCodigo(codigo: string): Promise<Pais | null> {
    try {
      return await paisesSupabaseService.getPaisByCodigo(codigo.toUpperCase());
    } catch (error) {
      console.error('Error obteniendo pais por codigo:', error);
      return null;
    }
  }

  static async crearPais(_paisData: Omit<Pais, 'fechaCreacion'>): Promise<string> {
    throw new Error('La creacion de paises debe gestionarse en Supabase mediante migraciones o seeds controlados.');
  }

  static validarNumeroIdentificacion(_paisId: string, numero: string, pais: Pais): boolean {
    try {
      if (!pais.configuracionTributaria.validacionNumeroIdentificacion) {
        return true;
      }

      const regex = new RegExp(pais.configuracionTributaria.validacionNumeroIdentificacion);
      return regex.test(numero);
    } catch (error) {
      console.error('Error validando numero de identificacion:', error);
      return false;
    }
  }

  static formatearMoneda(cantidad: number, _paisId: string, pais: Pais): string {
    try {
      const opciones: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: pais.monedaPrincipal,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };

      return new Intl.NumberFormat(this.getLocaleFromPais(pais.codigo), opciones).format(cantidad);
    } catch (error) {
      console.error('Error formateando moneda:', error);
      return `${pais.simboloMoneda} ${cantidad.toFixed(2)}`;
    }
  }

  static getLocaleFromPais(codigoPais: string): string {
    const locales: Record<string, string> = {
      PE: 'es-PE',
      CO: 'es-CO',
      MX: 'es-MX',
      AR: 'es-AR',
      CL: 'es-CL',
      EC: 'es-EC',
      BO: 'es-BO',
      UY: 'es-UY',
      PY: 'es-PY',
      VE: 'es-VE',
    };

    return locales[codigoPais] || 'es-ES';
  }

  static async getConfiguracionTributaria(paisId: string): Promise<ConfiguracionTributaria | null> {
    try {
      const pais = await this.getPais(paisId);
      return pais?.configuracionTributaria || null;
    } catch (error) {
      console.error('Error obteniendo configuracion tributaria:', error);
      return null;
    }
  }
}
