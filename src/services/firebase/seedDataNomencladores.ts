import { collection, addDoc, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  TipoDocumentoIdentidad, 
  TipoDocumentoFactura,
  TipoImpuesto,
  FormaPago,
  TipoMovimientoTesoreria,
  TipoMoneda,
  Banco
} from '../../types/nomencladores';
import { NomencladoresService } from './nomencladores';

export class SeedDataNomencladoresService {
  // Verificar si existen nomencladores para un país
  static async existenNomencladores(paisId: string): Promise<boolean> {
    try {
      console.log(`🔍 Verificando nomencladores para país: ${paisId}`);
      
      const tiposDocRef = collection(db, 'tiposDocumentoIdentidad');
      const q = query(tiposDocRef, where('paisId', '==', paisId));
      const snapshot = await getDocs(q);
      
      const existen = !snapshot.empty;
      console.log(`✅ Nomencladores para país ${paisId}: ${existen ? 'Existen' : 'No existen'}`);
      
      return existen;
    } catch (error) {
      console.error('❌ Error verificando nomencladores:', error);
      return false;
    }
  }

  // Insertar todos los nomencladores para un país
  static async insertarNomencladores(paisId: string): Promise<void> {
    try {
      console.log(`🔄 Insertando nomencladores para país: ${paisId}`);
      
      // Verificar si ya existen
      const existen = await this.existenNomencladores(paisId);
      if (existen) {
        console.log(`⚠️ Ya existen nomencladores para el país ${paisId}`);
        return;
      }

      // Crear batch para inserción masiva
      const batch = writeBatch(db);
      
      // 1. Insertar tipos de documento de identidad
      const tiposDocIdentidad = NomencladoresService.getMockTiposDocumentoIdentidad(paisId);
      const tiposDocIdentidadRef = collection(db, 'tiposDocumentoIdentidad');
      
      console.log(`📝 Insertando ${tiposDocIdentidad.length} tipos de documento de identidad`);
      
      tiposDocIdentidad.forEach(tipo => {
        const docRef = doc(tiposDocIdentidadRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: new Date()
        });
      });
      
      // 2. Insertar tipos de documento de factura
      const tiposDocFactura = NomencladoresService.getMockTiposDocumentoFactura(paisId);
      const tiposDocFacturaRef = collection(db, 'tiposDocumentoFactura');
      
      console.log(`📝 Insertando ${tiposDocFactura.length} tipos de documento de factura`);
      
      tiposDocFactura.forEach(tipo => {
        const docRef = doc(tiposDocFacturaRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: new Date()
        });
      });
      
      // 3. Insertar tipos de impuestos
      const tiposImpuesto = NomencladoresService.getMockTiposImpuesto(paisId);
      const tiposImpuestoRef = collection(db, 'tiposImpuesto');
      
      console.log(`📝 Insertando ${tiposImpuesto.length} tipos de impuesto`);
      
      tiposImpuesto.forEach(tipo => {
        const docRef = doc(tiposImpuestoRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: new Date()
        });
      });
      
      // 4. Insertar formas de pago
      const formasPago = NomencladoresService.getMockFormasPago(paisId);
      const formasPagoRef = collection(db, 'formasPago');
      
      console.log(`📝 Insertando ${formasPago.length} formas de pago`);
      
      formasPago.forEach(forma => {
        const docRef = doc(formasPagoRef);
        batch.set(docRef, {
          ...forma,
          fechaCreacion: new Date()
        });
      });
      
      // 5. Insertar tipos de movimiento de tesorería
      const tiposMovimiento = NomencladoresService.getMockTiposMovimientoTesoreria(paisId);
      const tiposMovimientoRef = collection(db, 'tiposMovimientoTesoreria');
      
      console.log(`📝 Insertando ${tiposMovimiento.length} tipos de movimiento de tesorería`);
      
      tiposMovimiento.forEach(tipo => {
        const docRef = doc(tiposMovimientoRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: new Date()
        });
      });
      
      // 6. Insertar tipos de moneda
      const tiposMoneda = NomencladoresService.getMockTiposMoneda(paisId);
      const tiposMonedaRef = collection(db, 'tiposMoneda');
      
      console.log(`📝 Insertando ${tiposMoneda.length} tipos de moneda`);
      
      tiposMoneda.forEach(tipo => {
        const docRef = doc(tiposMonedaRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: new Date()
        });
      });
      
      // 7. Insertar bancos
      const bancos = NomencladoresService.getMockBancos(paisId);
      const bancosRef = collection(db, 'bancos');
      
      console.log(`📝 Insertando ${bancos.length} bancos`);
      
      bancos.forEach(banco => {
        const docRef = doc(bancosRef);
        batch.set(docRef, {
          ...banco,
          fechaCreacion: new Date()
        });
      });
      
      // Ejecutar batch
      await batch.commit();
      
      console.log(`✅ Nomencladores insertados exitosamente para país ${paisId}`);
    } catch (error) {
      console.error('❌ Error insertando nomencladores:', error);
      throw error;
    }
  }

  // Insertar nomencladores para todos los países
  static async insertarNomencladoresTodosPaises(): Promise<void> {
    try {
      console.log('🌎 Insertando nomencladores para todos los países');
      
      const paises = ['peru', 'colombia', 'mexico', 'argentina', 'chile', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'venezuela'];
      
      for (const paisId of paises) {
        await this.insertarNomencladores(paisId);
      }
      
      console.log('✅ Nomencladores insertados para todos los países');
    } catch (error) {
      console.error('❌ Error insertando nomencladores para todos los países:', error);
      throw error;
    }
  }

  // Obtener estadísticas de nomencladores
  static async getEstadisticasNomencladores(): Promise<{
    totalPaises: number;
    totalNomencladores: number;
    porTipo: Record<string, number>;
    porPais: Record<string, number>;
  }> {
    try {
      console.log('📊 Obteniendo estadísticas de nomencladores');
      
      const [
        tiposDocIdentidad,
        tiposDocFactura,
        tiposImpuesto,
        formasPago,
        tiposMovimientoTesoreria,
        tiposMoneda,
        bancos
      ] = await Promise.all([
        getDocs(collection(db, 'tiposDocumentoIdentidad')),
        getDocs(collection(db, 'tiposDocumentoFactura')),
        getDocs(collection(db, 'tiposImpuesto')),
        getDocs(collection(db, 'formasPago')),
        getDocs(collection(db, 'tiposMovimientoTesoreria')),
        getDocs(collection(db, 'tiposMoneda')),
        getDocs(collection(db, 'bancos'))
      ]);
      
      // Contar por país
      const porPais: Record<string, number> = {};
      
      const contarPorPais = (snapshot: any) => {
        snapshot.docs.forEach((doc: any) => {
          const paisId = doc.data().paisId;
          porPais[paisId] = (porPais[paisId] || 0) + 1;
        });
      };
      
      contarPorPais(tiposDocIdentidad);
      contarPorPais(tiposDocFactura);
      contarPorPais(tiposImpuesto);
      contarPorPais(formasPago);
      contarPorPais(tiposMovimientoTesoreria);
      contarPorPais(tiposMoneda);
      contarPorPais(bancos);
      
      const estadisticas = {
        totalPaises: Object.keys(porPais).length,
        totalNomencladores: tiposDocIdentidad.size + tiposDocFactura.size + tiposImpuesto.size + 
                           formasPago.size + tiposMovimientoTesoreria.size + tiposMoneda.size + bancos.size,
        porTipo: {
          tiposDocumentoIdentidad: tiposDocIdentidad.size,
          tiposDocumentoFactura: tiposDocFactura.size,
          tiposImpuesto: tiposImpuesto.size,
          formasPago: formasPago.size,
          tiposMovimientoTesoreria: tiposMovimientoTesoreria.size,
          tiposMoneda: tiposMoneda.size,
          bancos: bancos.size
        },
        porPais
      };
      
      console.log('✅ Estadísticas obtenidas:', estadisticas);
      
      return estadisticas;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalPaises: 0,
        totalNomencladores: 0,
        porTipo: {},
        porPais: {}
      };
    }
  }

  // Crear país con nomencladores básicos
  static async crearPaisConNomencladores(paisData: {
    id: string;
    nombre: string;
    codigo: string;
    codigoISO: string;
    monedaPrincipal: string;
    simboloMoneda: string;
  }): Promise<boolean> {
    try {
      console.log(`🌎 Creando nuevo país: ${paisData.nombre} (${paisData.id})`);
      
      // Verificar si ya existe el país
      const existenNomencladores = await this.existenNomencladores(paisData.id);
      if (existenNomencladores) {
        console.log(`⚠️ Ya existen nomencladores para el país ${paisData.id}`);
        return false;
      }
      
      // Crear nomencladores básicos para el país
      await this.insertarNomencladores(paisData.id);
      
      console.log(`✅ País ${paisData.nombre} creado exitosamente con sus nomencladores básicos`);
      return true;
    } catch (error) {
      console.error('❌ Error creando país con nomencladores:', error);
      throw error;
    }
  }
}