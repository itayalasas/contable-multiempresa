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
  writeBatch,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';

// Tipos para el módulo de conciliación bancaria
export interface MovimientoBancario {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'CARGO' | 'ABONO';
  conciliado: boolean;
  cuentaId: string;
  movimientoContableId?: string;
  fechaConciliacion?: string;
  usuarioConciliacion?: string;
  empresaId: string;
  fechaCreacion: string;
}

export interface MovimientoContable {
  id: string;
  fecha: string;
  asientoNumero: string;
  descripcion: string;
  referencia?: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  conciliado: boolean;
  cuentaId: string;
  movimientoBancarioId?: string;
  fechaConciliacion?: string;
  usuarioConciliacion?: string;
  empresaId: string;
  fechaCreacion: string;
}

interface ConciliacionBancaria {
  id: string;
  cuentaId: string;
  fechaInicio: string;
  fechaFin: string;
  saldoInicial: number;
  saldoFinal: number;
  saldoSegunBanco: number;
  diferencia: number;
  estado: 'BORRADOR' | 'FINALIZADA';
  observaciones?: string;
  empresaId: string;
  creadoPor: string;
  fechaCreacion: string;
  fechaModificacion?: string;
}

export interface ResumenConciliacion {
  totalMovimientosBancarios: number;
  totalMovimientosContables: number;
  movimientosBancariosConciliados: number;
  movimientosContablesConciliados: number;
  movimientosPendientes: number;
  diferenciaTotal: number;
}

export class ConciliacionFirebaseService {
  // Cargar datos mock en Firebase para testing
  static async cargarDatosMockEnFirebase(empresaId: string): Promise<boolean> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('🔄 Cargando datos mock de conciliación bancaria en Firebase para empresa:', empresaId);
      
      // Obtener datos mock
      const movimientosBancarios = this.getMockMovimientosBancarios(empresaId);
      const movimientosContables = this.getMockMovimientosContables(empresaId);
      
      // Usar batch para operaciones masivas
      const batch = writeBatch(db);
      
      // 1. Cargar movimientos bancarios
      console.log(`📝 Insertando ${movimientosBancarios.length} movimientos bancarios...`);
      
      const movBancariosRef = collection(db, 'empresas', empresaId, 'movimientosBancarios');
      
      // Verificar si ya existen movimientos bancarios
      const movBancariosExistentes = await getDocs(movBancariosRef);
      if (movBancariosExistentes.size > 0) {
        console.log('⚠️ Ya existen movimientos bancarios en Firebase, omitiendo carga...');
      } else {
        // Insertar movimientos bancarios
        for (const movimiento of movimientosBancarios) {
          const nuevoMovimiento = {
            ...movimiento,
            empresaId,
            fechaCreacion: new Date().toISOString()
          };
          
          const docRef = doc(movBancariosRef);
          batch.set(docRef, nuevoMovimiento);
        }
      }
      
      // 2. Cargar movimientos contables
      console.log(`📝 Insertando ${movimientosContables.length} movimientos contables...`);
      
      const movContablesRef = collection(db, 'empresas', empresaId, 'movimientosContables');
      
      // Verificar si ya existen movimientos contables
      const movContablesExistentes = await getDocs(movContablesRef);
      if (movContablesExistentes.size > 0) {
        console.log('⚠️ Ya existen movimientos contables en Firebase, omitiendo carga...');
      } else {
        // Insertar movimientos contables
        for (const movimiento of movimientosContables) {
          const nuevoMovimiento = {
            ...movimiento,
            empresaId,
            fechaCreacion: new Date().toISOString()
          };
          
          const docRef = doc(movContablesRef);
          batch.set(docRef, nuevoMovimiento);
        }
      }
      
      // Ejecutar batch
      await batch.commit();
      
      console.log('✅ Datos mock de conciliación bancaria cargados exitosamente en Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error cargando datos mock en Firebase:', error);
      throw error;
    }
  }

  // Obtener movimientos bancarios desde Firebase
  static async getMovimientosBancarios(empresaId: string, cuentaId?: string, fechaInicio?: string, fechaFin?: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockMovimientosBancarios(empresaId);
      }

      console.log('🔍 Obteniendo movimientos bancarios desde Firebase para empresa:', empresaId);
      
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosBancarios');
      
      // Construir query con filtros
      let q = query(movimientosRef);
      
      if (cuentaId) {
        q = query(q, where('cuentaId', '==', cuentaId));
      }
      
      if (fechaInicio) {
        q = query(q, where('fecha', '>=', fechaInicio));
      }
      
      if (fechaFin) {
        q = query(q, where('fecha', '<=', fechaFin));
      }
      
      // Ordenar por fecha descendente
      q = query(q, orderBy('fecha', 'desc'));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ No se encontraron movimientos bancarios en Firebase, usando datos mock');
        return this.getMockMovimientosBancarios(empresaId);
      }
      
      const movimientos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString()
      }));
      
      console.log(`✅ Se encontraron ${movimientos.length} movimientos bancarios en Firebase`);
      return movimientos;
    } catch (error) {
      console.error('❌ Error obteniendo movimientos bancarios desde Firebase:', error);
      console.log('⚠️ Devolviendo datos mock como fallback');
      return this.getMockMovimientosBancarios(empresaId);
    }
  }

  // Obtener movimientos contables desde Firebase
  static async getMovimientosContables(empresaId: string, cuentaId?: string, fechaInicio?: string, fechaFin?: string) {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockMovimientosContables(empresaId);
      }

      console.log('🔍 Obteniendo movimientos contables desde Firebase para empresa:', empresaId);
      
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosContables');
      
      // Construir query con filtros
      let q = query(movimientosRef);
      
      if (cuentaId) {
        q = query(q, where('cuentaId', '==', cuentaId));
      }
      
      if (fechaInicio) {
        q = query(q, where('fecha', '>=', fechaInicio));
      }
      
      if (fechaFin) {
        q = query(q, where('fecha', '<=', fechaFin));
      }
      
      // Ordenar por fecha descendente
      q = query(q, orderBy('fecha', 'desc'));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ No se encontraron movimientos contables en Firebase, usando datos mock');
        return this.getMockMovimientosContables(empresaId);
      }
      
      const movimientos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString()
      }));
      
      console.log(`✅ Se encontraron ${movimientos.length} movimientos contables en Firebase`);
      return movimientos;
    } catch (error) {
      console.error('❌ Error obteniendo movimientos contables desde Firebase:', error);
      console.log('⚠️ Devolviendo datos mock como fallback');
      return this.getMockMovimientosContables(empresaId);
    }
  }

  // Conciliar movimientos en Firebase
  static async conciliarMovimientos(
    empresaId: string, 
    movimientoBancarioId: string, 
    movimientoContableId: string
  ): Promise<boolean> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Conciliando movimientos en Firebase: ${movimientoBancarioId} con ${movimientoContableId}`);
      
      // Usar transacción para garantizar consistencia
      await runTransaction(db, async (transaction) => {
        // 1. Obtener movimiento bancario
        const movBancarioRef = doc(db, 'empresas', empresaId, 'movimientosBancarios', movimientoBancarioId);
        const movBancarioDoc = await transaction.get(movBancarioRef);
        
        if (!movBancarioDoc.exists()) {
          throw new Error('El movimiento bancario no existe');
        }
        
        // 2. Obtener movimiento contable
        const movContableRef = doc(db, 'empresas', empresaId, 'movimientosContables', movimientoContableId);
        const movContableDoc = await transaction.get(movContableRef);
        
        if (!movContableDoc.exists()) {
          throw new Error('El movimiento contable no existe');
        }
        
        // 3. Verificar que no estén ya conciliados
        const movBancario = movBancarioDoc.data();
        const movContable = movContableDoc.data();
        
        if (movBancario.conciliado) {
          throw new Error('El movimiento bancario ya está conciliado');
        }
        
        if (movContable.conciliado) {
          throw new Error('El movimiento contable ya está conciliado');
        }
        
        // 4. Actualizar movimiento bancario
        transaction.update(movBancarioRef, {
          conciliado: true,
          movimientoContableId: movimientoContableId,
          fechaConciliacion: new Date().toISOString(),
          usuarioConciliacion: FirebaseAuthService.getCurrentUserId() || 'sistema'
        });
        
        // 5. Actualizar movimiento contable
        transaction.update(movContableRef, {
          conciliado: true,
          movimientoBancarioId: movimientoBancarioId,
          fechaConciliacion: new Date().toISOString(),
          usuarioConciliacion: FirebaseAuthService.getCurrentUserId() || 'sistema'
        });
      });
      
      console.log('✅ Movimientos conciliados correctamente en Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error conciliando movimientos en Firebase:', error);
      throw error;
    }
  }

  // Revertir conciliación en Firebase
  static async revertirConciliacion(
    empresaId: string, 
    movimientoBancarioId: string, 
    movimientoContableId: string
  ): Promise<boolean> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Revertiendo conciliación en Firebase: ${movimientoBancarioId} con ${movimientoContableId}`);
      
      // Usar transacción para garantizar consistencia
      await runTransaction(db, async (transaction) => {
        // 1. Obtener movimiento bancario
        const movBancarioRef = doc(db, 'empresas', empresaId, 'movimientosBancarios', movimientoBancarioId);
        const movBancarioDoc = await transaction.get(movBancarioRef);
        
        if (!movBancarioDoc.exists()) {
          throw new Error('El movimiento bancario no existe');
        }
        
        // 2. Obtener movimiento contable
        const movContableRef = doc(db, 'empresas', empresaId, 'movimientosContables', movimientoContableId);
        const movContableDoc = await transaction.get(movContableRef);
        
        if (!movContableDoc.exists()) {
          throw new Error('El movimiento contable no existe');
        }
        
        // 3. Verificar que estén conciliados entre sí
        const movBancario = movBancarioDoc.data();
        const movContable = movContableDoc.data();
        
        if (!movBancario.conciliado || movBancario.movimientoContableId !== movimientoContableId) {
          throw new Error('El movimiento bancario no está conciliado con este movimiento contable');
        }
        
        if (!movContable.conciliado || movContable.movimientoBancarioId !== movimientoBancarioId) {
          throw new Error('El movimiento contable no está conciliado con este movimiento bancario');
        }
        
        // 4. Actualizar movimiento bancario
        transaction.update(movBancarioRef, {
          conciliado: false,
          movimientoContableId: null,
          fechaConciliacion: null,
          usuarioConciliacion: null
        });
        
        // 5. Actualizar movimiento contable
        transaction.update(movContableRef, {
          conciliado: false,
          movimientoBancarioId: null,
          fechaConciliacion: null,
          usuarioConciliacion: null
        });
      });
      
      console.log('✅ Conciliación revertida correctamente en Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error revertiendo conciliación en Firebase:', error);
      throw error;
    }
  }

  // Importar extracto bancario en Firebase
  static async importarExtractoBancario(
    empresaId: string,
    cuentaId: string,
    movimientos: Omit<MovimientoBancario, 'id' | 'fechaCreacion'>[]
  ): Promise<number> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`📝 Importando extracto bancario en Firebase para cuenta ${cuentaId}`);
      
      // Usar batch para operaciones masivas
      const batch = writeBatch(db);
      
      // Insertar movimientos bancarios
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosBancarios');
      
      for (const movimiento of movimientos) {
        const nuevoMovimiento = {
          ...movimiento,
          cuentaId,
          empresaId,
          conciliado: false,
          fechaCreacion: new Date().toISOString(),
          creadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
        };
        
        const docRef = doc(movimientosRef);
        batch.set(docRef, nuevoMovimiento);
      }
      
      // Ejecutar batch
      await batch.commit();
      
      console.log(`✅ Extracto bancario importado correctamente: ${movimientos.length} movimientos`);
      return movimientos.length;
    } catch (error) {
      console.error('❌ Error importando extracto bancario en Firebase:', error);
      throw error;
    }
  }

  // Obtener resumen de conciliación
  static async getResumenConciliacion(empresaId: string, cuentaId?: string): Promise<ResumenConciliacion> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockResumenConciliacion();
      }

      console.log('📊 Generando resumen de conciliación desde Firebase');
      
      // Obtener movimientos bancarios y contables
      const [movimientosBancarios, movimientosContables] = await Promise.all([
        this.getMovimientosBancarios(empresaId, cuentaId),
        this.getMovimientosContables(empresaId, cuentaId)
      ]);
      
      // Calcular estadísticas
      const totalMovimientosBancarios = movimientosBancarios.length;
      const totalMovimientosContables = movimientosContables.length;
      
      const movimientosBancariosConciliados = movimientosBancarios.filter(m => m.conciliado).length;
      const movimientosContablesConciliados = movimientosContables.filter(m => m.conciliado).length;
      
      const movimientosPendientes = 
        (totalMovimientosBancarios - movimientosBancariosConciliados) + 
        (totalMovimientosContables - movimientosContablesConciliados);
      
      // Calcular diferencia total
      const totalBancario = movimientosBancarios.reduce((sum, m) => {
        return sum + (m.tipo === 'ABONO' ? m.monto : -m.monto);
      }, 0);
      
      const totalContable = movimientosContables.reduce((sum, m) => {
        return sum + (m.tipo === 'INGRESO' ? m.monto : -m.monto);
      }, 0);
      
      const diferenciaTotal = totalBancario - totalContable;
      
      const resumen: ResumenConciliacion = {
        totalMovimientosBancarios,
        totalMovimientosContables,
        movimientosBancariosConciliados,
        movimientosContablesConciliados,
        movimientosPendientes,
        diferenciaTotal
      };
      
      console.log('✅ Resumen de conciliación generado correctamente');
      return resumen;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de conciliación desde Firebase:', error);
      console.log('⚠️ Devolviendo datos mock como fallback');
      return this.getMockResumenConciliacion();
    }
  }

  // Datos mock para desarrollo
  static getMockMovimientosBancarios(empresaId: string): MovimientoBancario[] {
    return [
      {
        id: '1',
        fecha: '2024-03-01',
        descripcion: 'DEPOSITO EN EFECTIVO',
        referencia: 'DEP-001',
        monto: 5000,
        tipo: 'ABONO',
        conciliado: true,
        cuentaId: '1', // Cuenta Corriente BCP
        movimientoContableId: '1',
        fechaConciliacion: '2024-03-05T10:00:00Z',
        usuarioConciliacion: 'dev-user-123',
        empresaId,
        fechaCreacion: '2024-03-01T10:00:00Z'
      },
      {
        id: '2',
        fecha: '2024-03-05',
        descripcion: 'PAGO FACTURA PROVEEDOR XYZ',
        referencia: 'CHQ-1001',
        monto: 1500,
        tipo: 'CARGO',
        conciliado: true,
        cuentaId: '1', // Cuenta Corriente BCP
        movimientoContableId: '2',
        fechaConciliacion: '2024-03-10T14:30:00Z',
        usuarioConciliacion: 'dev-user-123',
        empresaId,
        fechaCreacion: '2024-03-05T14:30:00Z'
      },
      {
        id: '3',
        fecha: '2024-03-10',
        descripcion: 'TRANSFERENCIA RECIBIDA',
        referencia: 'TRF-2345',
        monto: 3000,
        tipo: 'ABONO',
        conciliado: false,
        cuentaId: '1', // Cuenta Corriente BCP
        empresaId,
        fechaCreacion: '2024-03-10T09:15:00Z'
      },
      {
        id: '4',
        fecha: '2024-03-15',
        descripcion: 'COMISIÓN BANCARIA',
        referencia: 'COM-123',
        monto: 25,
        tipo: 'CARGO',
        conciliado: false,
        cuentaId: '1', // Cuenta Corriente BCP
        empresaId,
        fechaCreacion: '2024-03-15T11:30:00Z'
      },
      {
        id: '5',
        fecha: '2024-03-20',
        descripcion: 'PAGO CLIENTE ABC',
        referencia: 'DEP-002',
        monto: 2500,
        tipo: 'ABONO',
        conciliado: false,
        cuentaId: '3', // Cuenta Ahorros BBVA
        empresaId,
        fechaCreacion: '2024-03-20T16:45:00Z'
      }
    ];
  }

  static getMockMovimientosContables(empresaId: string): MovimientoContable[] {
    return [
      {
        id: '1',
        fecha: '2024-03-01',
        asientoNumero: 'ASI-001',
        descripcion: 'Ingreso de efectivo',
        monto: 5000,
        tipo: 'INGRESO',
        conciliado: true,
        cuentaId: '1', // Cuenta Corriente BCP
        movimientoBancarioId: '1',
        fechaConciliacion: '2024-03-05T10:00:00Z',
        usuarioConciliacion: 'dev-user-123',
        empresaId,
        fechaCreacion: '2024-03-01T10:30:00Z'
      },
      {
        id: '2',
        fecha: '2024-03-05',
        asientoNumero: 'ASI-002',
        descripcion: 'Pago a proveedor',
        referencia: 'F001-00123',
        monto: 1500,
        tipo: 'EGRESO',
        conciliado: true,
        cuentaId: '1', // Cuenta Corriente BCP
        movimientoBancarioId: '2',
        fechaConciliacion: '2024-03-10T14:30:00Z',
        usuarioConciliacion: 'dev-user-123',
        empresaId,
        fechaCreacion: '2024-03-05T15:00:00Z'
      },
      {
        id: '3',
        fecha: '2024-03-08',
        asientoNumero: 'ASI-003',
        descripcion: 'Pago de servicios',
        referencia: 'REC-456',
        monto: 350,
        tipo: 'EGRESO',
        conciliado: false,
        cuentaId: '1', // Cuenta Corriente BCP
        empresaId,
        fechaCreacion: '2024-03-08T09:45:00Z'
      },
      {
        id: '4',
        fecha: '2024-03-12',
        asientoNumero: 'ASI-004',
        descripcion: 'Cobro factura cliente',
        referencia: 'F001-00045',
        monto: 3000,
        tipo: 'INGRESO',
        conciliado: false,
        cuentaId: '1', // Cuenta Corriente BCP
        empresaId,
        fechaCreacion: '2024-03-12T11:20:00Z'
      },
      {
        id: '5',
        fecha: '2024-03-18',
        asientoNumero: 'ASI-005',
        descripcion: 'Transferencia entre cuentas',
        monto: 2000,
        tipo: 'TRANSFERENCIA',
        conciliado: false,
        cuentaId: '1', // Cuenta Corriente BCP
        empresaId,
        fechaCreacion: '2024-03-18T14:15:00Z'
      }
    ];
  }

  static getMockResumenConciliacion(): ResumenConciliacion {
    return {
      totalMovimientosBancarios: 5,
      totalMovimientosContables: 5,
      movimientosBancariosConciliados: 2,
      movimientosContablesConciliados: 2,
      movimientosPendientes: 6,
      diferenciaTotal: 3625 // Diferencia entre movimientos bancarios y contables
    };
  }
}