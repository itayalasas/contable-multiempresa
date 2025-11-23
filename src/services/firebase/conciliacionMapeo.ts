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
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { parse } from 'date-fns';

// Tipos para el mapeo de archivos bancarios
interface MapeoColumna {
  indice: number;
  nombreColumna: string;
  campoDestino: string;
  formato?: string;
  requerido: boolean;
}

interface ConfiguracionMapeo {
  id: string;
  nombre: string;
  bancoId: string;
  nombreBanco: string;
  delimitador: string;
  tieneEncabezado: boolean;
  formatoFecha: string;
  columnaFecha: number;
  columnaDescripcion: number;
  columnaReferencia: number;
  columnaMonto: number;
  columnaTipo: number;
  valorTipoAbono: string;
  valorTipoCargo: string;
  mapeoColumnas: MapeoColumna[];
  activo: boolean;
  empresaId: string;
  creadoPor: string;
  fechaCreacion: Date;
}

interface MovimientoBancarioImportado {
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'CARGO' | 'ABONO';
  cuentaId: string;
  empresaId: string;
}

export class ConciliacionMapeoService {
  // Obtener configuraciones de mapeo
  static async getConfiguraciones(empresaId: string): Promise<ConfiguracionMapeo[]> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('🔍 Obteniendo configuraciones de mapeo para empresa:', empresaId);
      
      const configuracionesRef = collection(db, 'empresas', empresaId, 'configuracionesMapeo');
      const q = query(configuracionesRef, orderBy('nombre'));
      const snapshot = await getDocs(q);
      
      const configuraciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date()
      })) as ConfiguracionMapeo[];
      
      console.log(`✅ Se encontraron ${configuraciones.length} configuraciones de mapeo`);
      return configuraciones;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones de mapeo:', error);
      
      // Intentar obtener desde localStorage como fallback para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          return JSON.parse(configuracionesStr);
        }
      } catch (localError) {
        console.error('Error obteniendo configuraciones desde localStorage:', localError);
      }
      
      return [];
    }
  }

  // Obtener configuración de mapeo por ID
  static async getConfiguracion(empresaId: string, configuracionId: string): Promise<ConfiguracionMapeo | null> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔍 Obteniendo configuración de mapeo ${configuracionId}`);
      
      const configuracionRef = doc(db, 'empresas', empresaId, 'configuracionesMapeo', configuracionId);
      const configuracionDoc = await getDoc(configuracionRef);
      
      if (!configuracionDoc.exists()) {
        console.log(`⚠️ No se encontró la configuración de mapeo ${configuracionId}`);
        return null;
      }
      
      const configuracion = {
        id: configuracionDoc.id,
        ...configuracionDoc.data(),
        fechaCreacion: configuracionDoc.data().fechaCreacion?.toDate() || new Date()
      } as ConfiguracionMapeo;
      
      console.log(`✅ Configuración de mapeo ${configuracionId} obtenida correctamente`);
      return configuracion;
    } catch (error) {
      console.error(`❌ Error obteniendo configuración de mapeo ${configuracionId}:`, error);
      
      // Intentar obtener desde localStorage como fallback para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          const configuraciones = JSON.parse(configuracionesStr);
          return configuraciones.find((c: any) => c.id === configuracionId) || null;
        }
      } catch (localError) {
        console.error('Error obteniendo configuración desde localStorage:', localError);
      }
      
      return null;
    }
  }

  // Guardar configuración de mapeo
  static async guardarConfiguracion(empresaId: string, configuracion: Omit<ConfiguracionMapeo, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Guardando configuración de mapeo:', configuracion.nombre);
      
      const configuracionesRef = collection(db, 'empresas', empresaId, 'configuracionesMapeo');
      const docRef = await addDoc(configuracionesRef, {
        ...configuracion,
        fechaCreacion: Timestamp.now()
      });
      
      console.log(`✅ Configuración de mapeo guardada con ID: ${docRef.id}`);
      
      // Guardar también en localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        const configuraciones = configuracionesStr ? JSON.parse(configuracionesStr) : [];
        
        configuraciones.push({
          ...configuracion,
          id: docRef.id,
          fechaCreacion: new Date()
        });
        
        localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
      } catch (localError) {
        console.error('Error guardando en localStorage:', localError);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error guardando configuración de mapeo:', error);
      
      // Si falla Firebase, intentar guardar solo en localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        const configuraciones = configuracionesStr ? JSON.parse(configuracionesStr) : [];
        
        const id = `config_${Date.now()}`;
        configuraciones.push({
          ...configuracion,
          id,
          fechaCreacion: new Date()
        });
        
        localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
        return id;
      } catch (localError) {
        console.error('Error guardando en localStorage:', localError);
        throw error;
      }
    }
  }

  // Actualizar configuración de mapeo
  static async actualizarConfiguracion(empresaId: string, configuracionId: string, datos: Partial<ConfiguracionMapeo>): Promise<void> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando configuración de mapeo ${configuracionId}`);
      
      const configuracionRef = doc(db, 'empresas', empresaId, 'configuracionesMapeo', configuracionId);
      await updateDoc(configuracionRef, {
        ...datos,
        fechaModificacion: Timestamp.now()
      });
      
      console.log(`✅ Configuración de mapeo ${configuracionId} actualizada correctamente`);
      
      // Actualizar también en localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          const configuraciones = JSON.parse(configuracionesStr);
          const index = configuraciones.findIndex((c: any) => c.id === configuracionId);
          
          if (index >= 0) {
            configuraciones[index] = {
              ...configuraciones[index],
              ...datos
            };
            
            localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
          }
        }
      } catch (localError) {
        console.error('Error actualizando en localStorage:', localError);
      }
    } catch (error) {
      console.error(`❌ Error actualizando configuración de mapeo ${configuracionId}:`, error);
      
      // Si falla Firebase, intentar actualizar solo en localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          const configuraciones = JSON.parse(configuracionesStr);
          const index = configuraciones.findIndex((c: any) => c.id === configuracionId);
          
          if (index >= 0) {
            configuraciones[index] = {
              ...configuraciones[index],
              ...datos
            };
            
            localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(configuraciones));
          }
        }
      } catch (localError) {
        console.error('Error actualizando en localStorage:', localError);
        throw error;
      }
    }
  }

  // Eliminar configuración de mapeo
  static async eliminarConfiguracion(empresaId: string, configuracionId: string): Promise<void> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando configuración de mapeo ${configuracionId}`);
      
      const configuracionRef = doc(db, 'empresas', empresaId, 'configuracionesMapeo', configuracionId);
      await deleteDoc(configuracionRef);
      
      console.log(`✅ Configuración de mapeo ${configuracionId} eliminada correctamente`);
      
      // Eliminar también de localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          const configuraciones = JSON.parse(configuracionesStr);
          const nuevasConfiguraciones = configuraciones.filter((c: any) => c.id !== configuracionId);
          localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(nuevasConfiguraciones));
        }
      } catch (localError) {
        console.error('Error eliminando de localStorage:', localError);
      }
    } catch (error) {
      console.error(`❌ Error eliminando configuración de mapeo ${configuracionId}:`, error);
      
      // Si falla Firebase, intentar eliminar solo de localStorage para desarrollo
      try {
        const configuracionesStr = localStorage.getItem(`mapeo_configuraciones_${empresaId}`);
        if (configuracionesStr) {
          const configuraciones = JSON.parse(configuracionesStr);
          const nuevasConfiguraciones = configuraciones.filter((c: any) => c.id !== configuracionId);
          localStorage.setItem(`mapeo_configuraciones_${empresaId}`, JSON.stringify(nuevasConfiguraciones));
        }
      } catch (localError) {
        console.error('Error eliminando de localStorage:', localError);
        throw error;
      }
    }
  }

  // Procesar archivo de extracto bancario según configuración
  static async procesarArchivoExtracto(
    file: File,
    cuentaId: string,
    empresaId: string,
    configuracionId?: string
  ): Promise<MovimientoBancarioImportado[]> {
    try {
      console.log('🔄 Procesando archivo de extracto bancario');
      
      // Si hay configuración de mapeo, usarla
      let configuracion: ConfiguracionMapeo | null = null;
      
      if (configuracionId) {
        configuracion = await this.getConfiguracion(empresaId, configuracionId);
      }
      
      // Leer el contenido del archivo
      const fileContent = await this.readFileContent(file);
      
      // Procesar según configuración o formato automático
      if (configuracion) {
        return this.procesarConConfiguracion(fileContent, configuracion, cuentaId, empresaId);
      } else {
        // Intentar detectar formato automáticamente
        return this.procesarAutomatico(fileContent, cuentaId, empresaId);
      }
    } catch (error) {
      console.error('❌ Error procesando archivo de extracto bancario:', error);
      throw error;
    }
  }

  // Leer contenido del archivo
  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Error al leer el archivo'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsText(file);
    });
  }

  // Procesar archivo según configuración específica
  private static procesarConConfiguracion(
    fileContent: string,
    configuracion: ConfiguracionMapeo,
    cuentaId: string,
    empresaId: string
  ): MovimientoBancarioImportado[] {
    console.log('🔍 Procesando archivo con configuración específica:', configuracion.nombre);
    
    // Determinar delimitador
    let delimiterChar = ',';
    switch (configuracion.delimitador) {
      case ',': delimiterChar = ','; break;
      case ';': delimiterChar = ';'; break;
      case '\t': delimiterChar = '\t'; break;
      case '|': delimiterChar = '|'; break;
      default: delimiterChar = ',';
    }
    
    // Dividir en líneas y filtrar líneas vacías
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Si tiene encabezado, omitir la primera línea
    const dataLines = configuracion.tieneEncabezado ? lines.slice(1) : lines;
    
    // Procesar cada línea
    const movimientos: MovimientoBancarioImportado[] = [];
    
    for (const line of dataLines) {
      try {
        // Parsear línea según delimitador
        const fields = this.parseLine(line, delimiterChar);
        
        // Extraer campos según configuración
        const fechaStr = fields[configuracion.columnaFecha] || '';
        const descripcion = fields[configuracion.columnaDescripcion] || '';
        const referencia = fields[configuracion.columnaReferencia] || '';
        const montoStr = fields[configuracion.columnaMonto] || '0';
        const tipoStr = fields[configuracion.columnaTipo] || '';
        
        // Parsear fecha según formato
        let fecha = new Date();
        try {
          fecha = parse(fechaStr, configuracion.formatoFecha, new Date());
        } catch (error) {
          console.warn('Error parseando fecha:', fechaStr, error);
        }
        
        // Parsear monto (limpiar caracteres no numéricos excepto punto y coma)
        const montoLimpio = montoStr.replace(/[^\d.,\-+]/g, '').replace(',', '.');
        const monto = Math.abs(parseFloat(montoLimpio) || 0);
        
        // Determinar tipo (CARGO o ABONO)
        let tipo: 'CARGO' | 'ABONO' = 'ABONO';
        
        // Si el monto es negativo o contiene un signo menos, es un cargo
        if (montoLimpio.includes('-') || parseFloat(montoLimpio) < 0) {
          tipo = 'CARGO';
        } 
        // Si no, verificar por el valor en la columna de tipo
        else if (tipoStr) {
          const tipoNormalizado = tipoStr.toUpperCase().trim();
          
          if (tipoNormalizado.includes(configuracion.valorTipoCargo.toUpperCase()) || 
              tipoNormalizado === 'D' || tipoNormalizado === 'DEBITO' || 
              tipoNormalizado === 'CARGO' || tipoNormalizado === '-') {
            tipo = 'CARGO';
          } else if (tipoNormalizado.includes(configuracion.valorTipoAbono.toUpperCase()) || 
                     tipoNormalizado === 'C' || tipoNormalizado === 'CREDITO' || 
                     tipoNormalizado === 'ABONO' || tipoNormalizado === '+') {
            tipo = 'ABONO';
          }
        }
        
        // Crear movimiento
        const movimiento: MovimientoBancarioImportado = {
          fecha: fecha.toISOString().split('T')[0],
          descripcion,
          referencia,
          monto,
          tipo,
          cuentaId,
          empresaId
        };
        
        movimientos.push(movimiento);
      } catch (error) {
        console.warn('Error procesando línea:', line, error);
        // Continuar con la siguiente línea
      }
    }
    
    console.log(`✅ Procesados ${movimientos.length} movimientos de ${dataLines.length} líneas`);
    return movimientos;
  }

  // Parsear línea considerando campos entre comillas
  private static parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        fields.push(field);
        field = '';
      } else {
        field += char;
      }
    }
    
    // Agregar el último campo
    fields.push(field);
    
    // Limpiar comillas de los campos
    return fields.map(f => f.replace(/^"(.*)"$/, '$1').trim());
  }

  // Procesar archivo automáticamente (detectar formato)
  private static procesarAutomatico(
    fileContent: string,
    cuentaId: string,
    empresaId: string
  ): MovimientoBancarioImportado[] {
    console.log('🔍 Procesando archivo con detección automática de formato');
    
    // Intentar detectar delimitador
    const delimitadores = [',', ';', '\t', '|'];
    let mejorDelimitador = ',';
    let maxColumnas = 0;
    
    for (const delimitador of delimitadores) {
      const primeraLinea = fileContent.split('\n')[0];
      const columnas = this.parseLine(primeraLinea, delimitador).length;
      
      if (columnas > maxColumnas) {
        maxColumnas = columnas;
        mejorDelimitador = delimitador;
      }
    }
    
    console.log(`🔍 Delimitador detectado: "${mejorDelimitador}" (${maxColumnas} columnas)`);
    
    // Dividir en líneas
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Asumir que tiene encabezado
    const tieneEncabezado = this.detectarEncabezado(lines[0], mejorDelimitador);
    const dataLines = tieneEncabezado ? lines.slice(1) : lines;
    
    // Intentar detectar índices de columnas importantes
    const indices = this.detectarIndicesColumnas(lines[0], mejorDelimitador, tieneEncabezado);
    
    // Procesar cada línea
    const movimientos: MovimientoBancarioImportado[] = [];
    
    for (const line of dataLines) {
      try {
        // Parsear línea
        const fields = this.parseLine(line, mejorDelimitador);
        
        // Extraer campos según índices detectados
        const fechaStr = indices.fecha >= 0 && fields[indices.fecha] ? fields[indices.fecha] : '';
        const descripcion = indices.descripcion >= 0 && fields[indices.descripcion] ? fields[indices.descripcion] : '';
        const referencia = indices.referencia >= 0 && fields[indices.referencia] ? fields[indices.referencia] : '';
        const montoStr = indices.monto >= 0 && fields[indices.monto] ? fields[indices.monto] : '0';
        
        // Intentar determinar tipo
        let tipo: 'CARGO' | 'ABONO' = 'ABONO';
        
        // Si hay columna de tipo, usarla
        if (indices.tipo >= 0 && fields[indices.tipo]) {
          const tipoStr = fields[indices.tipo].toUpperCase().trim();
          
          if (tipoStr === 'D' || tipoStr === 'DEBITO' || tipoStr === 'CARGO' || 
              tipoStr === '-' || tipoStr === 'DEBIT' || tipoStr === 'WITHDRAWAL') {
            tipo = 'CARGO';
          } else if (tipoStr === 'C' || tipoStr === 'CREDITO' || tipoStr === 'ABONO' || 
                     tipoStr === '+' || tipoStr === 'CREDIT' || tipoStr === 'DEPOSIT') {
            tipo = 'ABONO';
          }
        }
        
        // Si no se pudo determinar por columna de tipo, intentar por el signo del monto
        const montoLimpio = montoStr.replace(/[^\d.,\-+]/g, '').replace(',', '.');
        if (montoLimpio.includes('-') || parseFloat(montoLimpio) < 0) {
          tipo = 'CARGO';
        }
        
        // Parsear fecha (intentar varios formatos comunes)
        let fecha = new Date();
        const formatosFecha = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM-dd-yyyy'];
        
        for (const formato of formatosFecha) {
          try {
            fecha = parse(fechaStr, formato, new Date());
            if (fecha.toString() !== 'Invalid Date') break;
          } catch (error) {
            // Intentar con el siguiente formato
          }
        }
        
        // Parsear monto
        const monto = Math.abs(parseFloat(montoLimpio) || 0);
        
        // Crear movimiento
        const movimiento: MovimientoBancarioImportado = {
          fecha: fecha.toISOString().split('T')[0],
          descripcion,
          referencia,
          monto,
          tipo,
          cuentaId,
          empresaId
        };
        
        movimientos.push(movimiento);
      } catch (error) {
        console.warn('Error procesando línea:', line, error);
        // Continuar con la siguiente línea
      }
    }
    
    console.log(`✅ Procesados ${movimientos.length} movimientos de ${dataLines.length} líneas`);
    return movimientos;
  }

  // Detectar si la primera línea es un encabezado
  private static detectarEncabezado(primeraLinea: string, delimitador: string): boolean {
    const campos = this.parseLine(primeraLinea, delimitador);
    
    // Verificar si algún campo parece un encabezado
    const posiblesEncabezados = ['fecha', 'description', 'monto', 'importe', 'referencia', 'tipo', 'date', 'amount', 'reference', 'type'];
    
    for (const campo of campos) {
      const campoLower = campo.toLowerCase();
      for (const encabezado of posiblesEncabezados) {
        if (campoLower.includes(encabezado)) {
          return true;
        }
      }
    }
    
    // Si no se detectó encabezado, verificar si el primer campo parece una fecha
    const primerCampo = campos[0].trim();
    const regexFecha = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/;
    
    return !regexFecha.test(primerCampo);
  }

  // Detectar índices de columnas importantes
  private static detectarIndicesColumnas(
    primeraLinea: string, 
    delimitador: string,
    tieneEncabezado: boolean
  ): { fecha: number; descripcion: number; referencia: number; monto: number; tipo: number } {
    const campos = this.parseLine(primeraLinea, delimitador);
    
    // Inicializar con valores por defecto
    const indices = {
      fecha: 0,
      descripcion: 1,
      referencia: 2,
      monto: 3,
      tipo: -1 // -1 indica que no se encontró
    };
    
    // Si tiene encabezado, intentar detectar por nombres
    if (tieneEncabezado) {
      for (let i = 0; i < campos.length; i++) {
        const campo = campos[i].toLowerCase().trim();
        
        if (campo.includes('fecha') || campo.includes('date')) {
          indices.fecha = i;
        } else if (campo.includes('descrip') || campo.includes('concept') || campo.includes('detalle')) {
          indices.descripcion = i;
        } else if (campo.includes('ref') || campo.includes('document') || campo.includes('num')) {
          indices.referencia = i;
        } else if (campo.includes('monto') || campo.includes('importe') || campo.includes('amount') || 
                  campo.includes('valor') || campo.includes('value')) {
          indices.monto = i;
        } else if (campo.includes('tipo') || campo.includes('type') || campo.includes('deb') || 
                  campo.includes('cred') || campo.includes('sign')) {
          indices.tipo = i;
        }
      }
    } 
    // Si no tiene encabezado, usar heurística para detectar
    else {
      // Buscar columna que parezca fecha
      for (let i = 0; i < campos.length; i++) {
        const campo = campos[i].trim();
        const regexFecha = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/;
        
        if (regexFecha.test(campo)) {
          indices.fecha = i;
          break;
        }
      }
      
      // Buscar columna que parezca monto
      for (let i = 0; i < campos.length; i++) {
        const campo = campos[i].trim();
        const regexMonto = /^[\-\+]?\d+[,\.]?\d*$/;
        
        if (regexMonto.test(campo.replace(/[^\d.,\-+]/g, ''))) {
          indices.monto = i;
          break;
        }
      }
      
      // Asignar descripción y referencia basado en posiciones relativas
      if (indices.fecha === 0) {
        indices.descripcion = 1;
        indices.referencia = 2;
      } else {
        indices.descripcion = 0;
        indices.referencia = 1;
      }
    }
    
    return indices;
  }
}