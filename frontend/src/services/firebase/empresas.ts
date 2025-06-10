import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Empresa } from '../../types';

class EmpresasFirebaseService {
  private collectionName = 'empresas';

  // Obtener todas las empresas
  async getEmpresas(): Promise<Empresa[]> {
    try {
      const empresasRef = collection(db, this.collectionName);
      const q = query(empresasRef, orderBy('nombre'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        fechaActualizacion: doc.data().fechaActualizacion?.toDate()
      })) as Empresa[];
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      throw error;
    }
  }

  // Obtener empresas por usuario - MODIFICADO: Ahora devuelve TODAS las empresas sin filtrar por usuario
  async getEmpresasByUsuario(usuarioId: string): Promise<Empresa[]> {
    try {
      console.log('🔄 Obteniendo TODAS las empresas disponibles');
      
      // Obtener todas las empresas sin filtrar por usuario
      const empresasRef = collection(db, this.collectionName);
      const q = query(empresasRef, orderBy('nombre'));
      
      const querySnapshot = await getDocs(q);
      
      const empresas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        fechaActualizacion: doc.data().fechaActualizacion?.toDate()
      })) as Empresa[];
      
      console.log(`✅ Se encontraron ${empresas.length} empresas en total`);
      
      return empresas;
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      throw error;
    }
  }

  // Obtener empresas por país
  async getEmpresasByPais(paisId: string): Promise<Empresa[]> {
    try {
      const empresasRef = collection(db, this.collectionName);
      
      // Si no se especifica país, devolver todas las empresas
      if (!paisId) {
        const q = query(empresasRef, orderBy('nombre'));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
          fechaActualizacion: doc.data().fechaActualizacion?.toDate()
        })) as Empresa[];
      }
      
      // Filtrar por país
      const q = query(
        empresasRef,
        where('paisId', '==', paisId),
        orderBy('nombre')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        fechaActualizacion: doc.data().fechaActualizacion?.toDate()
      })) as Empresa[];
    } catch (error) {
      console.error('Error obteniendo empresas por país:', error);
      throw error;
    }
  }

  // Obtener empresa por ID
  async getEmpresa(empresaId: string): Promise<Empresa | null> {
    try {
      const empresaRef = doc(db, this.collectionName, empresaId);
      const empresaSnap = await getDoc(empresaRef);
      
      if (empresaSnap.exists()) {
        const data = empresaSnap.data();
        return {
          id: empresaSnap.id,
          ...data,
          fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
          fechaActualizacion: data.fechaActualizacion?.toDate()
        } as Empresa;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo empresa:', error);
      throw error;
    }
  }

  // Crear nueva empresa
  async crearEmpresa(empresa: Omit<Empresa, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<string> {
    try {
      const empresasRef = collection(db, this.collectionName);
      const nuevaEmpresa = {
        ...empresa,
        fechaCreacion: Timestamp.now(),
        fechaActualizacion: Timestamp.now()
      };
      
      const docRef = await addDoc(empresasRef, nuevaEmpresa);
      return docRef.id;
    } catch (error) {
      console.error('Error creando empresa:', error);
      throw error;
    }
  }

  // Actualizar empresa
  async actualizarEmpresa(empresaId: string, datos: Partial<Empresa>): Promise<void> {
    try {
      const empresaRef = doc(db, this.collectionName, empresaId);
      const datosActualizacion = {
        ...datos,
        fechaActualizacion: Timestamp.now()
      };
      
      // Remover campos que no deben actualizarse
      delete datosActualizacion.id;
      delete datosActualizacion.fechaCreacion;
      
      await updateDoc(empresaRef, datosActualizacion);
    } catch (error) {
      console.error('Error actualizando empresa:', error);
      throw error;
    }
  }

  // Eliminar empresa
  async eliminarEmpresa(empresaId: string): Promise<void> {
    try {
      const empresaRef = doc(db, this.collectionName, empresaId);
      await deleteDoc(empresaRef);
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      throw error;
    }
  }

  // Verificar si existen empresas
  async existenEmpresas(): Promise<boolean> {
    try {
      const empresasRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(empresasRef);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando existencia de empresas:', error);
      return false;
    }
  }
}

export const empresasFirebaseService = new EmpresasFirebaseService();