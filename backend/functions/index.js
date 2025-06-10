import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar la aplicación de Firebase
initializeApp();
const db = getFirestore();

// Función para obtener datos de empresas
export const getEmpresas = onRequest({ cors: true }, async (req, res) => {
  try {
    const empresasRef = db.collection('empresas');
    const snapshot = await empresasRef.get();
    
    const empresas = [];
    snapshot.forEach(doc => {
      empresas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(empresas);
  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para obtener datos de nomencladores
export const getNomencladores = onRequest({ cors: true }, async (req, res) => {
  try {
    const { paisId } = req.query;
    
    if (!paisId) {
      return res.status(400).json({ error: 'Se requiere el parámetro paisId' });
    }
    
    const tiposDocRef = db.collection('tiposDocumentoIdentidad');
    const snapshot = await tiposDocRef.where('paisId', '==', paisId).get();
    
    const nomencladores = [];
    snapshot.forEach(doc => {
      nomencladores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(nomencladores);
  } catch (error) {
    console.error('Error obteniendo nomencladores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para crear un nuevo país con sus nomencladores
export const crearPais = onRequest({ cors: true }, async (req, res) => {
  try {
    const paisData = req.body;
    
    if (!paisData || !paisData.id || !paisData.nombre || !paisData.codigo) {
      return res.status(400).json({ error: 'Datos incompletos para crear país' });
    }
    
    // Crear el país en Firestore
    await db.collection('paises').doc(paisData.id).set({
      ...paisData,
      fechaCreacion: new Date()
    });
    
    // Crear nomencladores básicos para el país
    // (Esta parte se implementaría según la lógica de negocio)
    
    res.status(201).json({ 
      success: true, 
      message: `País ${paisData.nombre} creado exitosamente`,
      paisId: paisData.id
    });
  } catch (error) {
    console.error('Error creando país:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});