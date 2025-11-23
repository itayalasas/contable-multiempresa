import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AsientoContable } from '../../types';

export const asientosService = {
  async getAsientos(empresaId: string): Promise<AsientoContable[]> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const q = query(asientosRef, orderBy('numero', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AsientoContable[];
    } catch (error) {
      console.error('Error getting asientos:', error);
      throw error;
    }
  },

  async createAsiento(empresaId: string, asiento: Omit<AsientoContable, 'id'>): Promise<string> {
    try {
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const docRef = await addDoc(asientosRef, {
        ...asiento,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating asiento:', error);
      throw error;
    }
  },

  async updateAsiento(empresaId: string, asientoId: string, asiento: Partial<AsientoContable>): Promise<void> {
    try {
      const asientoRef = doc(db, 'empresas', empresaId, 'asientos', asientoId);
      await updateDoc(asientoRef, {
        ...asiento,
        fechaModificacion: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating asiento:', error);
      throw error;
    }
  },

  async deleteAsiento(empresaId: string, asientoId: string): Promise<void> {
    try {
      const asientoRef = doc(db, 'empresas', empresaId, 'asientos', asientoId);
      await deleteDoc(asientoRef);
    } catch (error) {
      console.error('Error deleting asiento:', error);
      throw error;
    }
  }
};