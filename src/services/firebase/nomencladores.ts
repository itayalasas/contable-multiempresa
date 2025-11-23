import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { 
  TipoDocumentoIdentidad, 
  TipoDocumentoFactura,
  TipoImpuesto,
  FormaPago,
  TipoMovimientoTesoreria,
  TipoMoneda,
  Banco
} from '../../types/nomencladores';

export class NomencladoresService {
  // Obtener tipos de documentos de identidad por país
  static async getTiposDocumentoIdentidad(paisId: string): Promise<TipoDocumentoIdentidad[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo tipos de documento de identidad para país: ${paisId}`);
      
      const tiposDocRef = collection(db, 'tiposDocumentoIdentidad');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        tiposDocRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron tipos de documento para el país, usando datos mock');
        return this.getMockTiposDocumentoIdentidad(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const tiposMap = new Map<string, TipoDocumentoIdentidad>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!tiposMap.has(data.codigo)) {
          tiposMap.set(data.codigo, {
            id,
            ...data
          } as TipoDocumentoIdentidad);
        }
      });
      
      const tipos = Array.from(tiposMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const tiposOrdenados = tipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${tiposOrdenados.length} tipos de documento de identidad`);
      return tiposOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo tipos de documento de identidad:', error);
      throw error;
    }
  }

  // Obtener tipos de documentos de factura por país
  static async getTiposDocumentoFactura(paisId: string): Promise<TipoDocumentoFactura[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo tipos de documento de factura para país: ${paisId}`);
      
      const tiposDocRef = collection(db, 'tiposDocumentoFactura');
      
      // Usar query más simple para evitar problemas de índices compuestos
      const q = query(
        tiposDocRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron tipos de documento de factura para el país, usando datos mock');
        return this.getMockTiposDocumentoFactura(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const tiposMap = new Map<string, TipoDocumentoFactura>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!tiposMap.has(data.codigo)) {
          tiposMap.set(data.codigo, {
            id,
            ...data
          } as TipoDocumentoFactura);
        }
      });
      
      const tipos = Array.from(tiposMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const tiposOrdenados = tipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${tiposOrdenados.length} tipos de documento de factura`);
      return tiposOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo tipos de documento de factura:', error);
      throw error;
    }
  }

  // Obtener tipos de impuestos
  static async getTiposImpuesto(paisId: string): Promise<TipoImpuesto[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo tipos de impuesto para país: ${paisId}`);
      
      const tiposImpuestoRef = collection(db, 'tiposImpuesto');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        tiposImpuestoRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron tipos de impuesto para el país, usando datos mock');
        return this.getMockTiposImpuesto(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const tiposMap = new Map<string, TipoImpuesto>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!tiposMap.has(data.codigo)) {
          tiposMap.set(data.codigo, {
            id,
            ...data
          } as TipoImpuesto);
        }
      });
      
      const tipos = Array.from(tiposMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const tiposOrdenados = tipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${tiposOrdenados.length} tipos de impuesto`);
      return tiposOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo tipos de impuesto:', error);
      throw error;
    }
  }

  // Obtener formas de pago
  static async getFormasPago(paisId: string): Promise<FormaPago[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo formas de pago para país: ${paisId}`);
      
      const formasPagoRef = collection(db, 'formasPago');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        formasPagoRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron formas de pago para el país, usando datos mock');
        return this.getMockFormasPago(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const formasMap = new Map<string, FormaPago>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!formasMap.has(data.codigo)) {
          formasMap.set(data.codigo, {
            id,
            ...data
          } as FormaPago);
        }
      });
      
      const formas = Array.from(formasMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const formasOrdenadas = formas.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${formasOrdenadas.length} formas de pago`);
      return formasOrdenadas;
    } catch (error) {
      console.error('❌ Error obteniendo formas de pago:', error);
      throw error;
    }
  }

  // Obtener tipos de movimiento de tesorería
  static async getTiposMovimientoTesoreria(paisId: string): Promise<TipoMovimientoTesoreria[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo tipos de movimiento de tesorería para país: ${paisId}`);
      
      const tiposMovimientoRef = collection(db, 'tiposMovimientoTesoreria');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        tiposMovimientoRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron tipos de movimiento de tesorería para el país, usando datos mock');
        return this.getMockTiposMovimientoTesoreria(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const tiposMap = new Map<string, TipoMovimientoTesoreria>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!tiposMap.has(data.codigo)) {
          tiposMap.set(data.codigo, {
            id,
            ...data
          } as TipoMovimientoTesoreria);
        }
      });
      
      const tipos = Array.from(tiposMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const tiposOrdenados = tipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${tiposOrdenados.length} tipos de movimiento de tesorería`);
      return tiposOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo tipos de movimiento de tesorería:', error);
      throw error;
    }
  }

  // Obtener tipos de moneda por país
  static async getTiposMoneda(paisId: string): Promise<TipoMoneda[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo tipos de moneda para país: ${paisId}`);
      
      const tiposMonedaRef = collection(db, 'tiposMoneda');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        tiposMonedaRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron tipos de moneda para el país, usando datos mock');
        return this.getMockTiposMoneda(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const tiposMap = new Map<string, TipoMoneda>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!tiposMap.has(data.codigo)) {
          tiposMap.set(data.codigo, {
            id,
            ...data
          } as TipoMoneda);
        }
      });
      
      const tipos = Array.from(tiposMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const tiposOrdenados = tipos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${tiposOrdenados.length} tipos de moneda`);
      return tiposOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo tipos de moneda:', error);
      throw error;
    }
  }

  // Obtener bancos por país
  static async getBancos(paisId: string): Promise<Banco[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo bancos para país: ${paisId}`);
      
      const bancosRef = collection(db, 'bancos');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(
        bancosRef,
        where('paisId', '==', paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No se encontraron bancos para el país, usando datos mock');
        return this.getMockBancos(paisId);
      }
      
      // Mapear documentos a objetos y eliminar duplicados
      const bancosMap = new Map<string, Banco>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        
        // Solo agregar si no existe o si tiene un ID diferente
        if (!bancosMap.has(data.codigo)) {
          bancosMap.set(data.codigo, {
            id,
            ...data
          } as Banco);
        }
      });
      
      const bancos = Array.from(bancosMap.values());
      
      // Ordenar en el cliente para evitar problemas de índices
      const bancosOrdenados = bancos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${bancosOrdenados.length} bancos`);
      return bancosOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo bancos:', error);
      throw error;
    }
  }

  // NUEVAS FUNCIONES CRUD PARA NOMENCLADORES

  // Crear tipo de moneda
  static async crearTipoMoneda(tipoMoneda: Omit<TipoMoneda, 'id'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`📝 Creando nuevo tipo de moneda: ${tipoMoneda.nombre}`);
      
      const tiposMonedaRef = collection(db, 'tiposMoneda');
      
      // Verificar si ya existe un tipo de moneda con el mismo código
      const q = query(
        tiposMonedaRef,
        where('codigo', '==', tipoMoneda.codigo),
        where('paisId', '==', tipoMoneda.paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error(`Ya existe un tipo de moneda con el código ${tipoMoneda.codigo}`);
      }
      
      const nuevoTipoMoneda = {
        ...tipoMoneda,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(tiposMonedaRef, nuevoTipoMoneda);
      console.log(`✅ Tipo de moneda creado con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando tipo de moneda:', error);
      throw error;
    }
  }

  // Actualizar tipo de moneda
  static async actualizarTipoMoneda(id: string, datos: Partial<TipoMoneda>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando tipo de moneda: ${id}`);
      
      const tipoMonedaRef = doc(db, 'tiposMoneda', id);
      
      // Verificar si existe
      const tipoMonedaDoc = await getDoc(tipoMonedaRef);
      if (!tipoMonedaDoc.exists()) {
        throw new Error(`No existe un tipo de moneda con el ID ${id}`);
      }
      
      await updateDoc(tipoMonedaRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log(`✅ Tipo de moneda actualizado correctamente`);
    } catch (error) {
      console.error('❌ Error actualizando tipo de moneda:', error);
      throw error;
    }
  }

  // Eliminar tipo de moneda
  static async eliminarTipoMoneda(id: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando tipo de moneda: ${id}`);
      
      const tipoMonedaRef = doc(db, 'tiposMoneda', id);
      
      // Verificar si existe
      const tipoMonedaDoc = await getDoc(tipoMonedaRef);
      if (!tipoMonedaDoc.exists()) {
        throw new Error(`No existe un tipo de moneda con el ID ${id}`);
      }
      
      await deleteDoc(tipoMonedaRef);
      
      console.log(`✅ Tipo de moneda eliminado correctamente`);
    } catch (error) {
      console.error('❌ Error eliminando tipo de moneda:', error);
      throw error;
    }
  }

  // Crear banco
  static async crearBanco(banco: Omit<Banco, 'id'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`📝 Creando nuevo banco: ${banco.nombre}`);
      
      const bancosRef = collection(db, 'bancos');
      
      // Verificar si ya existe un banco con el mismo código
      const q = query(
        bancosRef,
        where('codigo', '==', banco.codigo),
        where('paisId', '==', banco.paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error(`Ya existe un banco con el código ${banco.codigo}`);
      }
      
      const nuevoBanco = {
        ...banco,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(bancosRef, nuevoBanco);
      console.log(`✅ Banco creado con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando banco:', error);
      throw error;
    }
  }

  // Actualizar banco
  static async actualizarBanco(id: string, datos: Partial<Banco>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando banco: ${id}`);
      
      const bancoRef = doc(db, 'bancos', id);
      
      // Verificar si existe
      const bancoDoc = await getDoc(bancoRef);
      if (!bancoDoc.exists()) {
        throw new Error(`No existe un banco con el ID ${id}`);
      }
      
      await updateDoc(bancoRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log(`✅ Banco actualizado correctamente`);
    } catch (error) {
      console.error('❌ Error actualizando banco:', error);
      throw error;
    }
  }

  // Eliminar banco
  static async eliminarBanco(id: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando banco: ${id}`);
      
      const bancoRef = doc(db, 'bancos', id);
      
      // Verificar si existe
      const bancoDoc = await getDoc(bancoRef);
      if (!bancoDoc.exists()) {
        throw new Error(`No existe un banco con el ID ${id}`);
      }
      
      await deleteDoc(bancoRef);
      
      console.log(`✅ Banco eliminado correctamente`);
    } catch (error) {
      console.error('❌ Error eliminando banco:', error);
      throw error;
    }
  }

  // Crear tipo de movimiento de tesorería
  static async crearTipoMovimientoTesoreria(tipoMovimiento: Omit<TipoMovimientoTesoreria, 'id'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`📝 Creando nuevo tipo de movimiento de tesorería: ${tipoMovimiento.nombre}`);
      
      const tiposMovimientoRef = collection(db, 'tiposMovimientoTesoreria');
      
      // Verificar si ya existe un tipo de movimiento con el mismo código
      const q = query(
        tiposMovimientoRef,
        where('codigo', '==', tipoMovimiento.codigo),
        where('paisId', '==', tipoMovimiento.paisId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error(`Ya existe un tipo de movimiento con el código ${tipoMovimiento.codigo}`);
      }
      
      const nuevoTipoMovimiento = {
        ...tipoMovimiento,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(tiposMovimientoRef, nuevoTipoMovimiento);
      console.log(`✅ Tipo de movimiento creado con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando tipo de movimiento de tesorería:', error);
      throw error;
    }
  }

  // Actualizar tipo de movimiento de tesorería
  static async actualizarTipoMovimientoTesoreria(id: string, datos: Partial<TipoMovimientoTesoreria>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando tipo de movimiento de tesorería: ${id}`);
      
      const tipoMovimientoRef = doc(db, 'tiposMovimientoTesoreria', id);
      
      // Verificar si existe
      const tipoMovimientoDoc = await getDoc(tipoMovimientoRef);
      if (!tipoMovimientoDoc.exists()) {
        throw new Error(`No existe un tipo de movimiento con el ID ${id}`);
      }
      
      await updateDoc(tipoMovimientoRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log(`✅ Tipo de movimiento actualizado correctamente`);
    } catch (error) {
      console.error('❌ Error actualizando tipo de movimiento de tesorería:', error);
      throw error;
    }
  }

  // Eliminar tipo de movimiento de tesorería
  static async eliminarTipoMovimientoTesoreria(id: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando tipo de movimiento de tesorería: ${id}`);
      
      const tipoMovimientoRef = doc(db, 'tiposMovimientoTesoreria', id);
      
      // Verificar si existe
      const tipoMovimientoDoc = await getDoc(tipoMovimientoRef);
      if (!tipoMovimientoDoc.exists()) {
        throw new Error(`No existe un tipo de movimiento con el ID ${id}`);
      }
      
      await deleteDoc(tipoMovimientoRef);
      
      console.log(`✅ Tipo de movimiento eliminado correctamente`);
    } catch (error) {
      console.error('❌ Error eliminando tipo de movimiento de tesorería:', error);
      throw error;
    }
  }

  // Inicializar nomencladores para un país
  static async inicializarNomencladores(paisId: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, saltando inicialización');
        return;
      }

      // Verificar si ya existen nomencladores para este país
      const tiposDocIdentidadRef = collection(db, 'tiposDocumentoIdentidad');
      const q = query(tiposDocIdentidadRef, where('paisId', '==', paisId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`Ya existen nomencladores para el país ${paisId}`);
        return;
      }

      console.log(`🔄 Inicializando nomencladores para país: ${paisId}`);

      // Crear lote para inserción masiva
      const batch = writeBatch(db);
      
      // Insertar tipos de documento de identidad
      const tiposDocIdentidad = this.getMockTiposDocumentoIdentidad(paisId);
      tiposDocIdentidad.forEach(tipo => {
        const docRef = doc(tiposDocIdentidadRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar tipos de documento de factura
      const tiposDocFacturaRef = collection(db, 'tiposDocumentoFactura');
      const tiposDocFactura = this.getMockTiposDocumentoFactura(paisId);
      tiposDocFactura.forEach(tipo => {
        const docRef = doc(tiposDocFacturaRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar tipos de impuestos
      const tiposImpuestoRef = collection(db, 'tiposImpuesto');
      const tiposImpuesto = this.getMockTiposImpuesto(paisId);
      tiposImpuesto.forEach(tipo => {
        const docRef = doc(tiposImpuestoRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar formas de pago
      const formasPagoRef = collection(db, 'formasPago');
      const formasPago = this.getMockFormasPago(paisId);
      formasPago.forEach(forma => {
        const docRef = doc(formasPagoRef);
        batch.set(docRef, {
          ...forma,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar tipos de movimiento de tesorería
      const tiposMovimientoRef = collection(db, 'tiposMovimientoTesoreria');
      const tiposMovimiento = this.getMockTiposMovimientoTesoreria(paisId);
      tiposMovimiento.forEach(tipo => {
        const docRef = doc(tiposMovimientoRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar tipos de moneda
      const tiposMonedaRef = collection(db, 'tiposMoneda');
      const tiposMoneda = this.getMockTiposMoneda(paisId);
      tiposMoneda.forEach(tipo => {
        const docRef = doc(tiposMonedaRef);
        batch.set(docRef, {
          ...tipo,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Insertar bancos
      const bancosRef = collection(db, 'bancos');
      const bancos = this.getMockBancos(paisId);
      bancos.forEach(banco => {
        const docRef = doc(bancosRef);
        batch.set(docRef, {
          ...banco,
          fechaCreacion: Timestamp.now()
        });
      });
      
      // Ejecutar batch
      await batch.commit();
      console.log(`✅ Nomencladores inicializados para el país ${paisId}`);
    } catch (error) {
      console.error('❌ Error inicializando nomencladores:', error);
      throw error;
    }
  }

  // Datos mock para desarrollo
  static getMockTiposDocumentoIdentidad(paisId: string): TipoDocumentoIdentidad[] {
    switch (paisId) {
      case 'peru':
        return [
          { id: 'dni', nombre: 'DNI', codigo: '1', descripcion: 'Documento Nacional de Identidad', paisId, activo: true },
          { id: 'ruc', nombre: 'RUC', codigo: '6', descripcion: 'Registro Único de Contribuyentes', paisId, activo: true },
          { id: 'ce', nombre: 'Carnet de Extranjería', codigo: '4', descripcion: 'Carnet de Extranjería', paisId, activo: true },
          { id: 'pasaporte', nombre: 'Pasaporte', codigo: '7', descripcion: 'Pasaporte', paisId, activo: true }
        ];
      case 'colombia':
        return [
          { id: 'cc', nombre: 'Cédula de Ciudadanía', codigo: '13', descripcion: 'Cédula de Ciudadanía', paisId, activo: true },
          { id: 'nit', nombre: 'NIT', codigo: '31', descripcion: 'Número de Identificación Tributaria', paisId, activo: true },
          { id: 'ce', nombre: 'Cédula de Extranjería', codigo: '22', descripcion: 'Cédula de Extranjería', paisId, activo: true },
          { id: 'pasaporte', nombre: 'Pasaporte', codigo: '41', descripcion: 'Pasaporte', paisId, activo: true }
        ];
      case 'mexico':
        return [
          { id: 'rfc', nombre: 'RFC', codigo: 'RFC', descripcion: 'Registro Federal de Contribuyentes', paisId, activo: true },
          { id: 'curp', nombre: 'CURP', codigo: 'CURP', descripcion: 'Clave Única de Registro de Población', paisId, activo: true },
          { id: 'ine', nombre: 'INE', codigo: 'INE', descripcion: 'Instituto Nacional Electoral', paisId, activo: true }
        ];
      case 'argentina':
        return [
          { id: 'cuit', nombre: 'CUIT', codigo: '80', descripcion: 'Clave Única de Identificación Tributaria', paisId, activo: true },
          { id: 'cuil', nombre: 'CUIL', codigo: '86', descripcion: 'Código Único de Identificación Laboral', paisId, activo: true },
          { id: 'dni', nombre: 'DNI', codigo: '96', descripcion: 'Documento Nacional de Identidad', paisId, activo: true }
        ];
      case 'chile':
        return [
          { id: 'rut', nombre: 'RUT', codigo: 'RUT', descripcion: 'Rol Único Tributario', paisId, activo: true },
          { id: 'pasaporte', nombre: 'Pasaporte', codigo: 'PAS', descripcion: 'Pasaporte', paisId, activo: true }
        ];
      default:
        return [
          { id: 'doc', nombre: 'Documento de Identidad', codigo: '1', descripcion: 'Documento de Identidad', paisId, activo: true },
          { id: 'tax', nombre: 'Identificación Tributaria', codigo: '2', descripcion: 'Identificación Tributaria', paisId, activo: true }
        ];
    }
  }

  static getMockTiposDocumentoFactura(paisId: string): TipoDocumentoFactura[] {
    switch (paisId) {
      case 'peru':
        return [
          { 
            id: 'FACTURA', 
            nombre: 'Factura', 
            codigo: '01', 
            descripcion: 'Factura Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'F',
            formato: 'F###-########'
          },
          { 
            id: 'BOLETA', 
            nombre: 'Boleta', 
            codigo: '03', 
            descripcion: 'Boleta de Venta Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: false,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'B',
            formato: 'B###-########'
          },
          { 
            id: 'NOTA_CREDITO', 
            nombre: 'Nota de Crédito', 
            codigo: '07', 
            descripcion: 'Nota de Crédito Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'NC',
            formato: 'NC##-########'
          },
          { 
            id: 'NOTA_DEBITO', 
            nombre: 'Nota de Débito', 
            codigo: '08', 
            descripcion: 'Nota de Débito Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'ND',
            formato: 'ND##-########'
          }
        ];
      case 'colombia':
        return [
          { 
            id: 'FACTURA', 
            nombre: 'Factura Electrónica', 
            codigo: 'FE', 
            descripcion: 'Factura Electrónica de Venta', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'FE',
            formato: 'FE##########'
          },
          { 
            id: 'NOTA_CREDITO', 
            nombre: 'Nota Crédito', 
            codigo: 'NC', 
            descripcion: 'Nota Crédito Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'NC',
            formato: 'NC##########'
          },
          { 
            id: 'NOTA_DEBITO', 
            nombre: 'Nota Débito', 
            codigo: 'ND', 
            descripcion: 'Nota Débito Electrónica', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'ND',
            formato: 'ND##########'
          }
        ];
      case 'mexico':
        return [
          { 
            id: 'FACTURA', 
            nombre: 'CFDI', 
            codigo: 'I', 
            descripcion: 'Comprobante Fiscal Digital por Internet', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'CFDI',
            formato: 'CFDI-########'
          },
          { 
            id: 'NOTA_CREDITO', 
            nombre: 'Nota de Crédito', 
            codigo: 'E', 
            descripcion: 'Nota de Crédito CFDI', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'NC',
            formato: 'NC-########'
          }
        ];
      default:
        return [
          { 
            id: 'FACTURA', 
            nombre: 'Factura', 
            codigo: 'F', 
            descripcion: 'Factura Estándar', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'F',
            formato: 'F-########'
          },
          { 
            id: 'NOTA_CREDITO', 
            nombre: 'Nota de Crédito', 
            codigo: 'NC', 
            descripcion: 'Nota de Crédito', 
            paisId, 
            activo: true,
            requiereImpuesto: true,
            requiereCliente: true,
            afectaInventario: true,
            afectaContabilidad: true,
            prefijo: 'NC',
            formato: 'NC-########'
          }
        ];
    }
  }

  static getMockTiposImpuesto(paisId: string): TipoImpuesto[] {
    switch (paisId) {
      case 'peru':
        return [
          { id: 'igv', nombre: 'IGV', codigo: '1000', porcentaje: 18, tipo: 'IGV', paisId, activo: true },
          { id: 'igv_exonerado', nombre: 'Exonerado', codigo: '9997', porcentaje: 0, tipo: 'IGV', paisId, activo: true },
          { id: 'igv_inafecto', nombre: 'Inafecto', codigo: '9998', porcentaje: 0, tipo: 'IGV', paisId, activo: true }
        ];
      case 'colombia':
        return [
          { id: 'iva', nombre: 'IVA', codigo: '01', porcentaje: 19, tipo: 'IVA', paisId, activo: true },
          { id: 'iva_reducido', nombre: 'IVA Reducido', codigo: '02', porcentaje: 5, tipo: 'IVA', paisId, activo: true },
          { id: 'iva_excluido', nombre: 'Excluido', codigo: '03', porcentaje: 0, tipo: 'IVA', paisId, activo: true }
        ];
      case 'mexico':
        return [
          { id: 'iva', nombre: 'IVA', codigo: '002', porcentaje: 16, tipo: 'IVA', paisId, activo: true },
          { id: 'iva_frontera', nombre: 'IVA Frontera', codigo: '003', porcentaje: 8, tipo: 'IVA', paisId, activo: true },
          { id: 'isr', nombre: 'ISR', codigo: '001', porcentaje: 10, tipo: 'ISR', paisId, activo: true }
        ];
      default:
        return [
          { id: 'impuesto', nombre: 'Impuesto Estándar', codigo: '01', porcentaje: 15, tipo: 'IVA', paisId, activo: true },
          { id: 'exento', nombre: 'Exento', codigo: '02', porcentaje: 0, tipo: 'IVA', paisId, activo: true }
        ];
    }
  }

  static getMockFormasPago(paisId: string): FormaPago[] {
    return [
      { 
        id: 'efectivo', 
        nombre: 'Efectivo', 
        codigo: '01', 
        descripcion: 'Pago en efectivo', 
        paisId, 
        activo: true,
        requiereBanco: false,
        requiereReferencia: false,
        requiereFecha: false
      },
      { 
        id: 'transferencia', 
        nombre: 'Transferencia Bancaria', 
        codigo: '02', 
        descripcion: 'Transferencia entre cuentas bancarias', 
        paisId, 
        activo: true,
        requiereBanco: true,
        requiereReferencia: true,
        requiereFecha: true
      },
      { 
        id: 'cheque', 
        nombre: 'Cheque', 
        codigo: '03', 
        descripcion: 'Pago con cheque', 
        paisId, 
        activo: true,
        requiereBanco: true,
        requiereReferencia: true,
        requiereFecha: true
      },
      { 
        id: 'tarjeta', 
        nombre: 'Tarjeta de Crédito/Débito', 
        codigo: '04', 
        descripcion: 'Pago con tarjeta', 
        paisId, 
        activo: true,
        requiereBanco: false,
        requiereReferencia: true,
        requiereFecha: false
      }
    ];
  }

  // Tipos de movimiento de tesorería
  static getMockTiposMovimientoTesoreria(paisId: string): TipoMovimientoTesoreria[] {
    switch (paisId) {
      case 'peru':
        return [
          {
            id: 'INGRESO',
            nombre: 'Ingreso',
            codigo: 'ING',
            descripcion: 'Entrada de dinero a la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'EGRESO',
            nombre: 'Egreso',
            codigo: 'EGR',
            descripcion: 'Salida de dinero de la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'TRANSFERENCIA',
            nombre: 'Transferencia',
            codigo: 'TRF',
            descripcion: 'Movimiento entre cuentas propias',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'COMISION',
            nombre: 'Comisión Bancaria',
            codigo: 'COM',
            descripcion: 'Comisiones cobradas por el banco',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          },
          {
            id: 'INTERES',
            nombre: 'Interés',
            codigo: 'INT',
            descripcion: 'Intereses generados por la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          }
        ];
      case 'colombia':
        return [
          {
            id: 'INGRESO',
            nombre: 'Ingreso',
            codigo: 'ING',
            descripcion: 'Entrada de dinero a la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'EGRESO',
            nombre: 'Egreso',
            codigo: 'EGR',
            descripcion: 'Salida de dinero de la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'TRANSFERENCIA',
            nombre: 'Transferencia',
            codigo: 'TRF',
            descripcion: 'Movimiento entre cuentas propias',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'COMISION',
            nombre: 'Comisión Bancaria',
            codigo: 'COM',
            descripcion: 'Comisiones cobradas por el banco',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          },
          {
            id: 'INTERES',
            nombre: 'Interés',
            codigo: 'INT',
            descripcion: 'Intereses generados por la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'GMF',
            nombre: 'GMF (4x1000)',
            codigo: 'GMF',
            descripcion: 'Gravamen a los Movimientos Financieros',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          }
        ];
      case 'mexico':
        return [
          {
            id: 'INGRESO',
            nombre: 'Ingreso',
            codigo: 'ING',
            descripcion: 'Entrada de dinero a la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'EGRESO',
            nombre: 'Egreso',
            codigo: 'EGR',
            descripcion: 'Salida de dinero de la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'TRANSFERENCIA',
            nombre: 'Transferencia',
            codigo: 'TRF',
            descripcion: 'Movimiento entre cuentas propias',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'COMISION',
            nombre: 'Comisión Bancaria',
            codigo: 'COM',
            descripcion: 'Comisiones cobradas por el banco',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          },
          {
            id: 'INTERES',
            nombre: 'Interés',
            codigo: 'INT',
            descripcion: 'Intereses generados por la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'ISR',
            nombre: 'Retención ISR',
            codigo: 'ISR',
            descripcion: 'Retención de ISR',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          }
        ];
      default:
        return [
          {
            id: 'INGRESO',
            nombre: 'Ingreso',
            codigo: 'ING',
            descripcion: 'Entrada de dinero a la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'EGRESO',
            nombre: 'Egreso',
            codigo: 'EGR',
            descripcion: 'Salida de dinero de la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'TRANSFERENCIA',
            nombre: 'Transferencia',
            codigo: 'TRF',
            descripcion: 'Movimiento entre cuentas propias',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          },
          {
            id: 'COMISION',
            nombre: 'Comisión Bancaria',
            codigo: 'COM',
            descripcion: 'Comisiones cobradas por el banco',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: true
          },
          {
            id: 'INTERES',
            nombre: 'Interés',
            codigo: 'INT',
            descripcion: 'Intereses generados por la cuenta',
            paisId,
            activo: true,
            afectaSaldo: true,
            requiereReferencia: false
          }
        ];
    }
  }

  // Tipos de moneda por país
  static getMockTiposMoneda(paisId: string): TipoMoneda[] {
    switch (paisId) {
      case 'peru':
        return [
          { id: 'PEN', nombre: 'Soles', codigo: 'PEN', simbolo: 'S/', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: false }
        ];
      case 'colombia':
        return [
          { id: 'COP', nombre: 'Pesos Colombianos', codigo: 'COP', simbolo: '$', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: 'US$', paisId, activo: true, esPrincipal: false }
        ];
      case 'mexico':
        return [
          { id: 'MXN', nombre: 'Pesos Mexicanos', codigo: 'MXN', simbolo: '$', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: 'US$', paisId, activo: true, esPrincipal: false }
        ];
      case 'argentina':
        return [
          { id: 'ARS', nombre: 'Pesos Argentinos', codigo: 'ARS', simbolo: '$', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: 'US$', paisId, activo: true, esPrincipal: false }
        ];
      case 'chile':
        return [
          { id: 'CLP', nombre: 'Pesos Chilenos', codigo: 'CLP', simbolo: '$', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: 'US$', paisId, activo: true, esPrincipal: false },
          { id: 'UF', nombre: 'Unidad de Fomento', codigo: 'CLF', simbolo: 'UF', paisId, activo: true, esPrincipal: false }
        ];
      case 'ecuador':
        return [
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: true }
        ];
      case 'bolivia':
        return [
          { id: 'BOB', nombre: 'Bolivianos', codigo: 'BOB', simbolo: 'Bs', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: false }
        ];
      case 'uruguay':
        return [
          { id: 'UYU', nombre: 'Pesos Uruguayos', codigo: 'UYU', simbolo: '$U', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: 'US$', paisId, activo: true, esPrincipal: false }
        ];
      case 'paraguay':
        return [
          { id: 'PYG', nombre: 'Guaraníes', codigo: 'PYG', simbolo: '₲', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: false }
        ];
      case 'venezuela':
        return [
          { id: 'VES', nombre: 'Bolívares Soberanos', codigo: 'VES', simbolo: 'Bs.S', paisId, activo: true, esPrincipal: true },
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: false }
        ];
      default:
        return [
          { id: 'USD', nombre: 'Dólares Americanos', codigo: 'USD', simbolo: '$', paisId, activo: true, esPrincipal: true },
          { id: 'EUR', nombre: 'Euros', codigo: 'EUR', simbolo: '€', paisId, activo: true, esPrincipal: false }
        ];
    }
  }

  // Bancos por país
  static getMockBancos(paisId: string): Banco[] {
    switch (paisId) {
      case 'peru':
        return [
          { id: 'bcp', nombre: 'Banco de Crédito del Perú', codigo: 'BCP', paisId, activo: true },
          { id: 'bbva', nombre: 'BBVA', codigo: 'BBVA', paisId, activo: true },
          { id: 'interbank', nombre: 'Interbank', codigo: 'IBK', paisId, activo: true },
          { id: 'scotiabank', nombre: 'Scotiabank', codigo: 'SBP', paisId, activo: true },
          { id: 'banbif', nombre: 'BanBif', codigo: 'BIF', paisId, activo: true }
        ];
      case 'colombia':
        return [
          { id: 'bancolombia', nombre: 'Bancolombia', codigo: 'BCL', paisId, activo: true },
          { id: 'davivienda', nombre: 'Davivienda', codigo: 'DAV', paisId, activo: true },
          { id: 'bbva', nombre: 'BBVA Colombia', codigo: 'BBVA', paisId, activo: true },
          { id: 'bogota', nombre: 'Banco de Bogotá', codigo: 'BOG', paisId, activo: true },
          { id: 'occidente', nombre: 'Banco de Occidente', codigo: 'OCC', paisId, activo: true }
        ];
      case 'mexico':
        return [
          { id: 'bbva', nombre: 'BBVA México', codigo: 'BBVA', paisId, activo: true },
          { id: 'banamex', nombre: 'Citibanamex', codigo: 'BANA', paisId, activo: true },
          { id: 'santander', nombre: 'Santander', codigo: 'SAN', paisId, activo: true },
          { id: 'banorte', nombre: 'Banorte', codigo: 'BNT', paisId, activo: true },
          { id: 'hsbc', nombre: 'HSBC México', codigo: 'HSBC', paisId, activo: true }
        ];
      case 'argentina':
        return [
          { id: 'nacion', nombre: 'Banco de la Nación Argentina', codigo: 'BNA', paisId, activo: true },
          { id: 'provincia', nombre: 'Banco Provincia', codigo: 'BAPRO', paisId, activo: true },
          { id: 'galicia', nombre: 'Banco Galicia', codigo: 'GAL', paisId, activo: true },
          { id: 'santander', nombre: 'Santander Argentina', codigo: 'SAN', paisId, activo: true },
          { id: 'bbva', nombre: 'BBVA Argentina', codigo: 'BBVA', paisId, activo: true }
        ];
      case 'chile':
        return [
          { id: 'santander', nombre: 'Santander Chile', codigo: 'SAN', paisId, activo: true },
          { id: 'estado', nombre: 'Banco Estado', codigo: 'EST', paisId, activo: true },
          { id: 'chile', nombre: 'Banco de Chile', codigo: 'BCH', paisId, activo: true },
          { id: 'bci', nombre: 'BCI', codigo: 'BCI', paisId, activo: true },
          { id: 'scotiabank', nombre: 'Scotiabank Chile', codigo: 'SCO', paisId, activo: true }
        ];
      default:
        return [
          { id: 'banco1', nombre: 'Banco Principal', codigo: 'BP', paisId, activo: true },
          { id: 'banco2', nombre: 'Banco Secundario', codigo: 'BS', paisId, activo: true },
          { id: 'banco3', nombre: 'Banco Internacional', codigo: 'BI', paisId, activo: true }
        ];
    }
  }
}