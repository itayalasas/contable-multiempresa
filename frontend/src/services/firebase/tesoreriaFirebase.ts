import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  runTransaction,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { tesoreriaService } from './tesoreria';
import { NomencladoresService } from './nomencladores';

// Servicio para operaciones de Tesorería con Firebase
export class TesoreriaFirebaseService {
  // Cargar datos mock en Firebase para testing
  static async cargarDatosMockEnFirebase(empresaId: string): Promise<boolean> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('🔄 Cargando datos mock de tesorería en Firebase para empresa:', empresaId);
      
      // Obtener datos mock
      const cuentasMock = tesoreriaService.getMockCuentasBancarias();
      const movimientosMock = tesoreriaService.getMockMovimientosTesoreria();
      
      // Usar batch para operaciones masivas
      const batch = writeBatch(db);
      
      // 1. Cargar cuentas bancarias
      console.log(`📝 Insertando ${cuentasMock.length} cuentas bancarias...`);
      
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      
      // Verificar si ya existen cuentas
      const cuentasExistentes = await getDocs(cuentasRef);
      if (cuentasExistentes.size > 0) {
        console.log('⚠️ Ya existen cuentas bancarias en Firebase, omitiendo carga...');
      } else {
        // Insertar cuentas
        for (const cuenta of cuentasMock) {
          const nuevaCuenta = {
            ...cuenta,
            empresaId,
            fechaCreacion: Timestamp.now()
          };
          
          const docRef = doc(cuentasRef);
          batch.set(docRef, nuevaCuenta);
        }
      }
      
      // 2. Cargar movimientos de tesorería
      console.log(`📝 Insertando ${movimientosMock.length} movimientos de tesorería...`);
      
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      
      // Verificar si ya existen movimientos
      const movimientosExistentes = await getDocs(movimientosRef);
      if (movimientosExistentes.size > 0) {
        console.log('⚠️ Ya existen movimientos de tesorería en Firebase, omitiendo carga...');
      } else {
        // Insertar movimientos
        for (const movimiento of movimientosMock) {
          const nuevoMovimiento = {
            ...movimiento,
            empresaId,
            fechaCreacion: new Date().toISOString()
          };
          
          const docRef = doc(movimientosRef);
          batch.set(docRef, nuevoMovimiento);
        }
      }
      
      // 3. Cargar nomencladores de tesorería si no existen
      const paisId = 'peru'; // Por defecto Perú, pero debería venir de la empresa
      
      // 3.1 Cargar tipos de movimiento de tesorería
      console.log(`📝 Verificando tipos de movimiento de tesorería para país ${paisId}...`);
      const tiposMovimientoRef = collection(db, 'tiposMovimientoTesoreria');
      const tiposMovimientoQuery = query(tiposMovimientoRef, where('paisId', '==', paisId));
      const tiposMovimientoSnapshot = await getDocs(tiposMovimientoQuery);
      
      if (tiposMovimientoSnapshot.empty) {
        console.log(`📝 Insertando tipos de movimiento de tesorería para país ${paisId}...`);
        const tiposMovimiento = NomencladoresService.getMockTiposMovimientoTesoreria(paisId);
        
        for (const tipo of tiposMovimiento) {
          const docRef = doc(tiposMovimientoRef);
          batch.set(docRef, {
            ...tipo,
            fechaCreacion: Timestamp.now()
          });
        }
      } else {
        console.log('⚠️ Ya existen tipos de movimiento de tesorería, omitiendo carga...');
      }
      
      // 3.2 Cargar tipos de moneda
      console.log(`📝 Verificando tipos de moneda para país ${paisId}...`);
      const tiposMonedaRef = collection(db, 'tiposMoneda');
      const tiposMonedaQuery = query(tiposMonedaRef, where('paisId', '==', paisId));
      const tiposMonedaSnapshot = await getDocs(tiposMonedaQuery);
      
      if (tiposMonedaSnapshot.empty) {
        console.log(`📝 Insertando tipos de moneda para país ${paisId}...`);
        const tiposMoneda = NomencladoresService.getMockTiposMoneda(paisId);
        
        for (const tipo of tiposMoneda) {
          const docRef = doc(tiposMonedaRef);
          batch.set(docRef, {
            ...tipo,
            fechaCreacion: Timestamp.now()
          });
        }
      } else {
        console.log('⚠️ Ya existen tipos de moneda, omitiendo carga...');
      }
      
      // 3.3 Cargar bancos
      console.log(`📝 Verificando bancos para país ${paisId}...`);
      const bancosRef = collection(db, 'bancos');
      const bancosQuery = query(bancosRef, where('paisId', '==', paisId));
      const bancosSnapshot = await getDocs(bancosQuery);
      
      if (bancosSnapshot.empty) {
        console.log(`📝 Insertando bancos para país ${paisId}...`);
        const bancos = NomencladoresService.getMockBancos(paisId);
        
        for (const banco of bancos) {
          const docRef = doc(bancosRef);
          batch.set(docRef, {
            ...banco,
            fechaCreacion: Timestamp.now()
          });
        }
      } else {
        console.log('⚠️ Ya existen bancos, omitiendo carga...');
      }
      
      // Ejecutar batch
      await batch.commit();
      
      console.log('✅ Datos mock de tesorería cargados exitosamente en Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error cargando datos mock en Firebase:', error);
      throw error;
    }
  }

  // Obtener cuentas bancarias desde Firebase
  static async getCuentasBancarias(empresaId: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return tesoreriaService.getMockCuentasBancarias();
      }

      console.log('🔍 Obteniendo cuentas bancarias desde Firebase para empresa:', empresaId);
      
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      const q = query(cuentasRef, where('activa', '==', true));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ No se encontraron cuentas bancarias en Firebase, usando datos mock');
        return tesoreriaService.getMockCuentasBancarias();
      }
      
      const cuentas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date()
      }));
      
      console.log(`✅ Se encontraron ${cuentas.length} cuentas bancarias en Firebase`);
      return cuentas;
    } catch (error) {
      console.error('❌ Error obteniendo cuentas bancarias desde Firebase:', error);
      console.log('⚠️ Devolviendo datos mock como fallback');
      return tesoreriaService.getMockCuentasBancarias();
    }
  }

  // Obtener movimientos de tesorería desde Firebase
  static async getMovimientosTesoreria(empresaId: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return tesoreriaService.getMockMovimientosTesoreria();
      }

      console.log('🔍 Obteniendo movimientos de tesorería desde Firebase para empresa:', empresaId);
      
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      const q = query(movimientosRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ No se encontraron movimientos de tesorería en Firebase, usando datos mock');
        return tesoreriaService.getMockMovimientosTesoreria();
      }
      
      const movimientos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString()
      }));
      
      console.log(`✅ Se encontraron ${movimientos.length} movimientos de tesorería en Firebase`);
      return movimientos;
    } catch (error) {
      console.error('❌ Error obteniendo movimientos de tesorería desde Firebase:', error);
      console.log('⚠️ Devolviendo datos mock como fallback');
      return tesoreriaService.getMockMovimientosTesoreria();
    }
  }

  // Crear cuenta bancaria en Firebase
  static async crearCuentaBancaria(empresaId: string, cuenta: any) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nueva cuenta bancaria en Firebase:', cuenta.nombre);
      
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      const nuevaCuenta = {
        ...cuenta,
        empresaId,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(cuentasRef, nuevaCuenta);
      console.log(`✅ Cuenta bancaria creada en Firebase con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando cuenta bancaria en Firebase:', error);
      throw error;
    }
  }

  // Actualizar cuenta bancaria en Firebase
  static async actualizarCuentaBancaria(empresaId: string, cuentaId: string, datos: any) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando cuenta bancaria ${cuentaId} en Firebase`);
      
      // Verificar si la cuenta existe
      const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', cuentaId);
      const cuentaDoc = await getDoc(cuentaRef);
      
      if (!cuentaDoc.exists()) {
        throw new Error(`La cuenta bancaria con ID ${cuentaId} no existe`);
      }
      
      await updateDoc(cuentaRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log('✅ Cuenta bancaria actualizada correctamente en Firebase');
    } catch (error) {
      console.error('❌ Error actualizando cuenta bancaria en Firebase:', error);
      throw error;
    }
  }

  // Eliminar cuenta bancaria en Firebase
  static async eliminarCuentaBancaria(empresaId: string, cuentaId: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando cuenta bancaria ${cuentaId} en Firebase`);
      
      // Verificar si hay movimientos asociados a esta cuenta
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      const q = query(movimientosRef, where('cuentaId', '==', cuentaId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error('No se puede eliminar la cuenta porque tiene movimientos asociados');
      }
      
      const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', cuentaId);
      await deleteDoc(cuentaRef);
      
      console.log('✅ Cuenta bancaria eliminada correctamente de Firebase');
    } catch (error) {
      console.error('❌ Error eliminando cuenta bancaria de Firebase:', error);
      throw error;
    }
  }

  // Crear movimiento de tesorería en Firebase
  static async crearMovimientoTesoreria(empresaId: string, movimiento: any) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nuevo movimiento de tesorería en Firebase:', movimiento.concepto);
      
      // Usar transacción para actualizar saldos de cuentas
      return await runTransaction(db, async (transaction) => {
        // 1. Obtener cuenta(s) involucrada(s)
        const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaId);
        const cuentaDoc = await transaction.get(cuentaRef);
        
        if (!cuentaDoc.exists()) {
          throw new Error('La cuenta no existe');
        }
        
        const cuenta = cuentaDoc.data();
        
        let cuentaDestino = null;
        let cuentaDestinoRef;
        
        if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
          cuentaDestinoRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaDestinoId);
          const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);
          
          if (!cuentaDestinoDoc.exists()) {
            throw new Error('La cuenta destino no existe');
          }
          
          cuentaDestino = cuentaDestinoDoc.data();
        }
        
        // 2. Actualizar saldos según tipo de movimiento
        let nuevoSaldoCuenta = cuenta.saldoActual;
        let nuevoSaldoDisponibleCuenta = cuenta.saldoDisponible;
        
        switch (movimiento.tipo) {
          case 'INGRESO':
            nuevoSaldoCuenta += movimiento.monto;
            nuevoSaldoDisponibleCuenta += movimiento.monto;
            break;
          case 'EGRESO':
            nuevoSaldoCuenta -= movimiento.monto;
            nuevoSaldoDisponibleCuenta -= movimiento.monto;
            break;
          case 'TRANSFERENCIA':
            nuevoSaldoCuenta -= movimiento.monto;
            nuevoSaldoDisponibleCuenta -= movimiento.monto;
            break;
        }
        
        // 3. Actualizar cuenta origen
        transaction.update(cuentaRef, {
          saldoActual: nuevoSaldoCuenta,
          saldoDisponible: nuevoSaldoDisponibleCuenta,
          fechaModificacion: Timestamp.now()
        });
        
        // 4. Actualizar cuenta destino si es transferencia
        if (movimiento.tipo === 'TRANSFERENCIA' && cuentaDestino && cuentaDestinoRef) {
          const nuevoSaldoDestino = cuentaDestino.saldoActual + movimiento.monto;
          const nuevoSaldoDisponibleDestino = cuentaDestino.saldoDisponible + movimiento.monto;
          
          transaction.update(cuentaDestinoRef, {
            saldoActual: nuevoSaldoDestino,
            saldoDisponible: nuevoSaldoDisponibleDestino,
            fechaModificacion: Timestamp.now()
          });
        }
        
        // 5. Crear el movimiento
        const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
        const nuevoMovimientoRef = doc(movimientosRef);
        
        const nuevoMovimiento = {
          ...movimiento,
          fechaCreacion: new Date().toISOString(),
          creadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
        };
        
        transaction.set(nuevoMovimientoRef, nuevoMovimiento);
        
        return nuevoMovimientoRef.id;
      });
    } catch (error) {
      console.error('❌ Error creando movimiento de tesorería en Firebase:', error);
      throw error;
    }
  }

  // Actualizar movimiento de tesorería en Firebase
  static async actualizarMovimientoTesoreria(empresaId: string, movimientoId: string, datos: any) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando movimiento de tesorería ${movimientoId} en Firebase`);
      
      const movimientoRef = doc(db, 'empresas', empresaId, 'movimientosTesoreria', movimientoId);
      await updateDoc(movimientoRef, {
        ...datos,
        fechaModificacion: new Date().toISOString()
      });
      
      console.log('✅ Movimiento de tesorería actualizado correctamente en Firebase');
    } catch (error) {
      console.error('❌ Error actualizando movimiento de tesorería en Firebase:', error);
      throw error;
    }
  }

  // Eliminar movimiento de tesorería en Firebase
  static async eliminarMovimientoTesoreria(empresaId: string, movimientoId: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando movimiento de tesorería ${movimientoId} en Firebase`);
      
      // Usar transacción para revertir saldos
      await runTransaction(db, async (transaction) => {
        // 1. Obtener el movimiento
        const movimientoRef = doc(db, 'empresas', empresaId, 'movimientosTesoreria', movimientoId);
        const movimientoDoc = await transaction.get(movimientoRef);
        
        if (!movimientoDoc.exists()) {
          throw new Error('El movimiento no existe');
        }
        
        const movimiento = movimientoDoc.data();
        
        // 2. Obtener cuenta(s) involucrada(s)
        const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaId);
        const cuentaDoc = await transaction.get(cuentaRef);
        
        if (!cuentaDoc.exists()) {
          throw new Error('La cuenta no existe');
        }
        
        const cuenta = cuentaDoc.data();
        
        let cuentaDestino = null;
        let cuentaDestinoRef;
        
        if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
          cuentaDestinoRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaDestinoId);
          const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);
          
          if (!cuentaDestinoDoc.exists()) {
            throw new Error('La cuenta destino no existe');
          }
          
          cuentaDestino = cuentaDestinoDoc.data();
        }
        
        // 3. Revertir saldos según tipo de movimiento
        let nuevoSaldoCuenta = cuenta.saldoActual;
        let nuevoSaldoDisponibleCuenta = cuenta.saldoDisponible;
        
        switch (movimiento.tipo) {
          case 'INGRESO':
            nuevoSaldoCuenta -= movimiento.monto;
            nuevoSaldoDisponibleCuenta -= movimiento.monto;
            break;
          case 'EGRESO':
            nuevoSaldoCuenta += movimiento.monto;
            nuevoSaldoDisponibleCuenta += movimiento.monto;
            break;
          case 'TRANSFERENCIA':
            nuevoSaldoCuenta += movimiento.monto;
            nuevoSaldoDisponibleCuenta += movimiento.monto;
            break;
        }
        
        // 4. Actualizar cuenta origen
        transaction.update(cuentaRef, {
          saldoActual: nuevoSaldoCuenta,
          saldoDisponible: nuevoSaldoDisponibleCuenta,
          fechaModificacion: Timestamp.now()
        });
        
        // 5. Actualizar cuenta destino si es transferencia
        if (movimiento.tipo === 'TRANSFERENCIA' && cuentaDestino && cuentaDestinoRef) {
          const nuevoSaldoDestino = cuentaDestino.saldoActual - movimiento.monto;
          const nuevoSaldoDisponibleDestino = cuentaDestino.saldoDisponible - movimiento.monto;
          
          transaction.update(cuentaDestinoRef, {
            saldoActual: nuevoSaldoDestino,
            saldoDisponible: nuevoSaldoDisponibleDestino,
            fechaModificacion: Timestamp.now()
          });
        }
        
        // 6. Eliminar el movimiento
        transaction.delete(movimientoRef);
      });
      
      console.log('✅ Movimiento de tesorería eliminado correctamente de Firebase');
    } catch (error) {
      console.error('❌ Error eliminando movimiento de tesorería de Firebase:', error);
      throw error;
    }
  }
}