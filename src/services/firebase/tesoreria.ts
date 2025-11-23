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
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';

// Tipos para el módulo de tesorería
export interface CuentaBancaria {
  id: string;
  nombre: string;
  tipo: 'CORRIENTE' | 'AHORRO' | 'EFECTIVO' | 'TARJETA';
  numero: string;
  banco?: string;
  moneda: string;
  saldoActual: number;
  saldoDisponible: number;
  fechaUltimoCierre?: string;
  activa: boolean;
  empresaId: string;
  fechaCreacion: Date;
}

export interface MovimientoTesoreria {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  concepto: string;
  monto: number;
  cuentaId: string;
  cuentaDestinoId?: string;
  referencia?: string;
  estado: 'PENDIENTE' | 'CONCILIADO' | 'ANULADO';
  documentoRelacionado?: {
    tipo: string;
    id: string;
    numero: string;
  };
  empresaId: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface ResumenTesoreria {
  totalCuentas: number;
  saldoTotal: number;
  saldoDisponible: number;
  ingresosDelMes: number;
  egresosDelMes: number;
  movimientosPendientes: number;
  saldoPorMoneda: {
    moneda: string;
    saldo: number;
  }[];
  saldoPorTipoCuenta: {
    tipo: string;
    saldo: number;
  }[];
}

export const tesoreriaService = {
  // Obtener cuentas bancarias
  async getCuentasBancarias(empresaId: string): Promise<CuentaBancaria[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockCuentasBancarias();
      }

      console.log('🔍 Obteniendo cuentas bancarias para empresa:', empresaId);
      
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(cuentasRef, where('activa', '==', true));
      const snapshot = await getDocs(q);
      
      const cuentas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date()
      })) as CuentaBancaria[];
      
      // Ordenar en el cliente para evitar problemas de índices
      const cuentasOrdenadas = cuentas.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${cuentasOrdenadas.length} cuentas bancarias`);
      return cuentasOrdenadas;
    } catch (error) {
      console.error('❌ Error obteniendo cuentas bancarias:', error);
      
      // Devolver datos mock para desarrollo
      console.log('⚠️ Devolviendo datos mock para desarrollo');
      return this.getMockCuentasBancarias();
    }
  },

  // Obtener movimientos de tesorería
  async getMovimientosTesoreria(empresaId: string): Promise<MovimientoTesoreria[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockMovimientosTesoreria();
      }

      console.log('🔍 Obteniendo movimientos de tesorería para empresa:', empresaId);
      
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(movimientosRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      
      const movimientos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString()
      })) as MovimientoTesoreria[];
      
      console.log(`✅ Se encontraron ${movimientos.length} movimientos de tesorería`);
      return movimientos;
    } catch (error) {
      console.error('❌ Error obteniendo movimientos de tesorería:', error);
      
      // Devolver datos mock para desarrollo
      console.log('⚠️ Devolviendo datos mock para desarrollo');
      return this.getMockMovimientosTesoreria();
    }
  },

  // Crear cuenta bancaria
  async crearCuentaBancaria(empresaId: string, cuenta: Omit<CuentaBancaria, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nueva cuenta bancaria:', cuenta.nombre);
      
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      const nuevaCuenta = {
        ...cuenta,
        empresaId,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(cuentasRef, nuevaCuenta);
      console.log(`✅ Cuenta bancaria creada con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando cuenta bancaria:', error);
      throw error;
    }
  },

  // Actualizar cuenta bancaria
  async actualizarCuentaBancaria(empresaId: string, cuentaId: string, datos: Partial<CuentaBancaria>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando cuenta bancaria ${cuentaId}`);
      
      const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', cuentaId);
      await updateDoc(cuentaRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log('✅ Cuenta bancaria actualizada correctamente');
    } catch (error) {
      console.error('❌ Error actualizando cuenta bancaria:', error);
      throw error;
    }
  },

  // Eliminar cuenta bancaria
  async eliminarCuentaBancaria(empresaId: string, cuentaId: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando cuenta bancaria ${cuentaId}`);
      
      // Verificar si hay movimientos asociados a esta cuenta
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      const q = query(
        movimientosRef,
        where('cuentaId', '==', cuentaId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        throw new Error('No se puede eliminar la cuenta porque tiene movimientos asociados');
      }
      
      const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', cuentaId);
      await deleteDoc(cuentaRef);
      
      console.log('✅ Cuenta bancaria eliminada correctamente');
    } catch (error) {
      console.error('❌ Error eliminando cuenta bancaria:', error);
      throw error;
    }
  },

  // Crear movimiento de tesorería
  async crearMovimientoTesoreria(empresaId: string, movimiento: Omit<MovimientoTesoreria, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nuevo movimiento de tesorería:', movimiento.concepto);
      
      // Usar transacción para actualizar saldos de cuentas
      return await runTransaction(db, async (transaction) => {
        // 1. Obtener cuenta(s) involucrada(s)
        const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaId);
        const cuentaDoc = await transaction.get(cuentaRef);
        
        if (!cuentaDoc.exists()) {
          throw new Error('La cuenta no existe');
        }
        
        const cuenta = cuentaDoc.data() as CuentaBancaria;
        
        let cuentaDestino: CuentaBancaria | null = null;
        let cuentaDestinoRef;
        
        if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
          cuentaDestinoRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaDestinoId);
          const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);
          
          if (!cuentaDestinoDoc.exists()) {
            throw new Error('La cuenta destino no existe');
          }
          
          cuentaDestino = cuentaDestinoDoc.data() as CuentaBancaria;
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
      console.error('❌ Error creando movimiento de tesorería:', error);
      throw error;
    }
  },

  // Actualizar movimiento de tesorería
  async actualizarMovimientoTesoreria(empresaId: string, movimientoId: string, datos: Partial<MovimientoTesoreria>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando movimiento de tesorería ${movimientoId}`);
      
      const movimientoRef = doc(db, 'empresas', empresaId, 'movimientosTesoreria', movimientoId);
      await updateDoc(movimientoRef, {
        ...datos,
        fechaModificacion: new Date().toISOString()
      });
      
      console.log('✅ Movimiento de tesorería actualizado correctamente');
    } catch (error) {
      console.error('❌ Error actualizando movimiento de tesorería:', error);
      throw error;
    }
  },

  // Eliminar movimiento de tesorería
  async eliminarMovimientoTesoreria(empresaId: string, movimientoId: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando movimiento de tesorería ${movimientoId}`);
      
      // Usar transacción para revertir saldos
      await runTransaction(db, async (transaction) => {
        // 1. Obtener el movimiento
        const movimientoRef = doc(db, 'empresas', empresaId, 'movimientosTesoreria', movimientoId);
        const movimientoDoc = await transaction.get(movimientoRef);
        
        if (!movimientoDoc.exists()) {
          throw new Error('El movimiento no existe');
        }
        
        const movimiento = movimientoDoc.data() as MovimientoTesoreria;
        
        // 2. Obtener cuenta(s) involucrada(s)
        const cuentaRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaId);
        const cuentaDoc = await transaction.get(cuentaRef);
        
        if (!cuentaDoc.exists()) {
          throw new Error('La cuenta no existe');
        }
        
        const cuenta = cuentaDoc.data() as CuentaBancaria;
        
        let cuentaDestino: CuentaBancaria | null = null;
        let cuentaDestinoRef;
        
        if (movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoId) {
          cuentaDestinoRef = doc(db, 'empresas', empresaId, 'cuentasBancarias', movimiento.cuentaDestinoId);
          const cuentaDestinoDoc = await transaction.get(cuentaDestinoRef);
          
          if (!cuentaDestinoDoc.exists()) {
            throw new Error('La cuenta destino no existe');
          }
          
          cuentaDestino = cuentaDestinoDoc.data() as CuentaBancaria;
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
      
      console.log('✅ Movimiento de tesorería eliminado correctamente');
    } catch (error) {
      console.error('❌ Error eliminando movimiento de tesorería:', error);
      throw error;
    }
  },

  // Obtener resumen de tesorería
  async getResumenTesoreria(empresaId: string): Promise<ResumenTesoreria> {
    try {
      console.log('📊 Generando resumen de tesorería');
      
      // Obtener cuentas y movimientos
      const [cuentas, movimientos] = await Promise.all([
        this.getCuentasBancarias(empresaId),
        this.getMovimientosTesoreria(empresaId)
      ]);
      
      // Calcular saldos totales
      const saldoTotal = cuentas.reduce((sum, cuenta) => sum + cuenta.saldoActual, 0);
      const saldoDisponible = cuentas.reduce((sum, cuenta) => sum + cuenta.saldoDisponible, 0);
      
      // Calcular ingresos y egresos del mes actual
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const movimientosDelMes = movimientos.filter(m => 
        new Date(m.fecha) >= inicioMes && 
        new Date(m.fecha) <= hoy
      );
      
      const ingresosDelMes = movimientosDelMes
        .filter(m => m.tipo === 'INGRESO')
        .reduce((sum, m) => sum + m.monto, 0);
      
      const egresosDelMes = movimientosDelMes
        .filter(m => m.tipo === 'EGRESO')
        .reduce((sum, m) => sum + m.monto, 0);
      
      // Contar movimientos pendientes
      const movimientosPendientes = movimientos.filter(m => m.estado === 'PENDIENTE').length;
      
      // Calcular saldos por moneda
      const saldoPorMoneda = new Map<string, number>();
      cuentas.forEach(cuenta => {
        const saldoActual = saldoPorMoneda.get(cuenta.moneda) || 0;
        saldoPorMoneda.set(cuenta.moneda, saldoActual + cuenta.saldoActual);
      });
      
      // Calcular saldos por tipo de cuenta
      const saldoPorTipoCuenta = new Map<string, number>();
      cuentas.forEach(cuenta => {
        const saldoActual = saldoPorTipoCuenta.get(cuenta.tipo) || 0;
        saldoPorTipoCuenta.set(cuenta.tipo, saldoActual + cuenta.saldoActual);
      });
      
      const resumen: ResumenTesoreria = {
        totalCuentas: cuentas.length,
        saldoTotal,
        saldoDisponible,
        ingresosDelMes,
        egresosDelMes,
        movimientosPendientes,
        saldoPorMoneda: Array.from(saldoPorMoneda.entries()).map(([moneda, saldo]) => ({ moneda, saldo })),
        saldoPorTipoCuenta: Array.from(saldoPorTipoCuenta.entries()).map(([tipo, saldo]) => ({ tipo, saldo }))
      };
      
      console.log('✅ Resumen de tesorería generado correctamente');
      return resumen;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de tesorería:', error);
      return this.getMockResumenTesoreria();
    }
  },

  // Datos mock para desarrollo
  getMockCuentasBancarias(): CuentaBancaria[] {
    return [
      {
        id: '1',
        nombre: 'Cuenta Corriente BCP',
        tipo: 'CORRIENTE',
        numero: '193-1234567-0-00',
        banco: 'BCP',
        moneda: 'PEN',
        saldoActual: 15000,
        saldoDisponible: 14500,
        activa: true,
        empresaId: 'dev-empresa-pe',
        fechaCreacion: new Date('2024-01-01')
      },
      {
        id: '2',
        nombre: 'Caja Chica',
        tipo: 'EFECTIVO',
        numero: 'CAJA-001',
        moneda: 'PEN',
        saldoActual: 2500,
        saldoDisponible: 2500,
        activa: true,
        empresaId: 'dev-empresa-pe',
        fechaCreacion: new Date('2024-01-01')
      },
      {
        id: '3',
        nombre: 'Cuenta Ahorros BBVA',
        tipo: 'AHORRO',
        numero: '0011-0057-0123456789',
        banco: 'BBVA',
        moneda: 'PEN',
        saldoActual: 8000,
        saldoDisponible: 8000,
        activa: true,
        empresaId: 'dev-empresa-pe',
        fechaCreacion: new Date('2024-01-15')
      },
      {
        id: '4',
        nombre: 'Tarjeta Empresarial',
        tipo: 'TARJETA',
        numero: '4557-8801-2345-6789',
        banco: 'Interbank',
        moneda: 'PEN',
        saldoActual: -3500,
        saldoDisponible: 6500,
        activa: true,
        empresaId: 'dev-empresa-pe',
        fechaCreacion: new Date('2024-02-01')
      }
    ];
  },

  getMockMovimientosTesoreria(): MovimientoTesoreria[] {
    return [
      {
        id: '1',
        fecha: '2024-03-01',
        tipo: 'INGRESO',
        concepto: 'Cobro factura F001-00001',
        monto: 1180,
        cuentaId: '1',
        referencia: 'F001-00001',
        estado: 'CONCILIADO',
        documentoRelacionado: {
          tipo: 'FACTURA',
          id: '1',
          numero: 'F001-00001'
        },
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-01T10:00:00Z'
      },
      {
        id: '2',
        fecha: '2024-03-05',
        tipo: 'EGRESO',
        concepto: 'Pago a proveedor',
        monto: 590,
        cuentaId: '1',
        referencia: 'F001-00002',
        estado: 'CONCILIADO',
        documentoRelacionado: {
          tipo: 'FACTURA_PROVEEDOR',
          id: '2',
          numero: 'F001-00002'
        },
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-05T14:30:00Z'
      },
      {
        id: '3',
        fecha: '2024-03-10',
        tipo: 'TRANSFERENCIA',
        concepto: 'Transferencia a caja chica',
        monto: 1000,
        cuentaId: '1',
        cuentaDestinoId: '2',
        estado: 'CONCILIADO',
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-10T09:15:00Z'
      },
      {
        id: '4',
        fecha: '2024-03-15',
        tipo: 'EGRESO',
        concepto: 'Pago de servicios',
        monto: 350,
        cuentaId: '2',
        referencia: 'REC-001',
        estado: 'PENDIENTE',
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-15T11:30:00Z'
      },
      {
        id: '5',
        fecha: '2024-03-20',
        tipo: 'INGRESO',
        concepto: 'Cobro factura F001-00003',
        monto: 2950,
        cuentaId: '3',
        referencia: 'F001-00003',
        estado: 'PENDIENTE',
        documentoRelacionado: {
          tipo: 'FACTURA',
          id: '3',
          numero: 'F001-00003'
        },
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-20T16:45:00Z'
      }
    ];
  },

  getMockResumenTesoreria(): ResumenTesoreria {
    return {
      totalCuentas: 4,
      saldoTotal: 22000,
      saldoDisponible: 21500,
      ingresosDelMes: 4130,
      egresosDelMes: 940,
      movimientosPendientes: 2,
      saldoPorMoneda: [
        {
          moneda: 'PEN',
          saldo: 22000
        }
      ],
      saldoPorTipoCuenta: [
        {
          tipo: 'CORRIENTE',
          saldo: 15000
        },
        {
          tipo: 'AHORRO',
          saldo: 8000
        },
        {
          tipo: 'EFECTIVO',
          saldo: 2500
        },
        {
          tipo: 'TARJETA',
          saldo: -3500
        }
      ]
    };
  }
};