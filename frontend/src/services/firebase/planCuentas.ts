import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { PlanCuenta } from '../../types';

export const obtenerPlanCuentas = async (empresaId: string): Promise<PlanCuenta[]> => {
  try {
    // Asegurar autenticación antes de cualquier operación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
    const q = query(cuentasRef, orderBy('codigo'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
      fechaModificacion: doc.data().fechaModificacion?.toDate() || new Date()
    })) as PlanCuenta[];
  } catch (error) {
    console.error('Error al obtener plan de cuentas:', error);
    
    // Si es un error de permisos, dar instrucciones específicas
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      throw new Error('Error de permisos en Firebase. Verifica las reglas de Firestore y la autenticación.');
    }
    
    throw new Error('No se pudo obtener el plan de cuentas: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
};

export const crearCuenta = async (empresaId: string, cuenta: Omit<PlanCuenta, 'id' | 'fechaCreacion' | 'fechaModificacion'>): Promise<string> => {
  try {
    // Asegurar autenticación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
    
    // Verificar que no exista una cuenta con el mismo código
    const existeQuery = query(cuentasRef, where('codigo', '==', cuenta.codigo));
    const existeSnapshot = await getDocs(existeQuery);
    
    if (!existeSnapshot.empty) {
      throw new Error('Ya existe una cuenta con este código');
    }
    
    const nuevaCuenta = {
      ...cuenta,
      fechaCreacion: Timestamp.now(),
      fechaModificacion: Timestamp.now(),
      saldo: cuenta.saldo || 0,
      activa: cuenta.activa !== undefined ? cuenta.activa : true,
      creadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
    };
    
    const docRef = await addDoc(cuentasRef, nuevaCuenta);
    return docRef.id;
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    throw error;
  }
};

export const actualizarCuenta = async (empresaId: string, cuentaId: string, datos: Partial<PlanCuenta>): Promise<void> => {
  try {
    // Asegurar autenticación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentaRef = doc(db, 'empresas', empresaId, 'cuentas', cuentaId);
    
    const datosActualizacion = {
      ...datos,
      fechaModificacion: Timestamp.now(),
      modificadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
    };
    
    // Remover campos que no deben actualizarse
    delete datosActualizacion.id;
    delete datosActualizacion.fechaCreacion;
    
    await updateDoc(cuentaRef, datosActualizacion);
  } catch (error) {
    console.error('Error al actualizar cuenta:', error);
    throw new Error('No se pudo actualizar la cuenta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
};

export const eliminarCuenta = async (empresaId: string, cuentaId: string): Promise<void> => {
  try {
    // Asegurar autenticación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentaRef = doc(db, 'empresas', empresaId, 'cuentas', cuentaId);
    await deleteDoc(cuentaRef);
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    throw new Error('No se pudo eliminar la cuenta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
};

const obtenerCuentasPorTipo = async (empresaId: string, tipo: string): Promise<PlanCuenta[]> => {
  try {
    // Asegurar autenticación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
    const q = query(
      cuentasRef, 
      where('tipo', '==', tipo),
      where('activa', '==', true),
      orderBy('codigo')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
      fechaModificacion: doc.data().fechaModificacion?.toDate() || new Date()
    })) as PlanCuenta[];
  } catch (error) {
    console.error('Error al obtener cuentas por tipo:', error);
    throw new Error('No se pudieron obtener las cuentas por tipo');
  }
};

const buscarCuentas = async (empresaId: string, termino: string): Promise<PlanCuenta[]> => {
  try {
    // Asegurar autenticación
    const isAuth = await FirebaseAuthService.ensureAuthenticated();
    if (!isAuth) {
      throw new Error('No se pudo autenticar con Firebase');
    }
    
    const cuentasRef = collection(db, 'empresas', empresaId, 'cuentas');
    const snapshot = await getDocs(cuentasRef);
    
    const cuentas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
      fechaModificacion: doc.data().fechaModificacion?.toDate() || new Date()
    })) as PlanCuenta[];
    
    // Filtrar por código o nombre que contenga el término de búsqueda
    return cuentas.filter(cuenta => 
      cuenta.codigo.toLowerCase().includes(termino.toLowerCase()) ||
      cuenta.nombre.toLowerCase().includes(termino.toLowerCase())
    );
  } catch (error) {
    console.error('Error al buscar cuentas:', error);
    throw new Error('No se pudieron buscar las cuentas');
  }
};