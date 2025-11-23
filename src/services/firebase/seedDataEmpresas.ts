import { collection, addDoc, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Empresa } from '../../types';

// Empresas de prueba para diferentes países y sectores
const empresasPrueba: Omit<Empresa, 'id' | 'fechaCreacion' | 'fechaActualizacion'>[] = [
  // PERÚ
  {
    nombre: 'TechSolutions Perú SAC',
    razonSocial: 'TechSolutions Perú Sociedad Anónima Cerrada',
    numeroIdentificacion: '20123456789',
    paisId: 'peru',
    subdominio: 'techsolutions-pe',
    direccion: 'Av. Javier Prado 123, San Isidro, Lima',
    telefono: '+51 1 234-5678',
    email: 'contacto@techsolutions.pe',
    monedaPrincipal: 'PEN',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'TSP',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },
  {
    nombre: 'Comercial Lima EIRL',
    razonSocial: 'Comercial Lima Empresa Individual de Responsabilidad Limitada',
    numeroIdentificacion: '20987654321',
    paisId: 'peru',
    subdominio: 'comercial-lima',
    direccion: 'Jr. de la Unión 456, Cercado de Lima',
    telefono: '+51 1 987-6543',
    email: 'ventas@comerciallima.pe',
    monedaPrincipal: 'PEN',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'FIFO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'CL',
      longitudNumeracion: 6,
      regimenTributario: 'mype',
      configuracionImpuestos: []
    }
  },

  // COLOMBIA
  {
    nombre: 'Innovación Digital SAS',
    razonSocial: 'Innovación Digital Sociedad por Acciones Simplificada',
    numeroIdentificacion: '900123456-1',
    paisId: 'colombia',
    subdominio: 'innovacion-digital',
    direccion: 'Carrera 7 # 123-45, Zona Rosa, Bogotá',
    telefono: '+57 1 234-5678',
    email: 'info@innovaciondigital.co',
    monedaPrincipal: 'COP',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: false,
      decimalesMoneda: 0,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'ID',
      longitudNumeracion: 6,
      regimenTributario: 'comun',
      configuracionImpuestos: []
    }
  },
  {
    nombre: 'Distribuidora Caribe Ltda',
    razonSocial: 'Distribuidora Caribe Limitada',
    numeroIdentificacion: '800987654-3',
    paisId: 'colombia',
    subdominio: 'distribuidora-caribe',
    direccion: 'Calle 72 # 10-34, Barranquilla',
    telefono: '+57 5 345-6789',
    email: 'ventas@distribuidoracaribe.co',
    monedaPrincipal: 'COP',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 0,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'DC',
      longitudNumeracion: 6,
      regimenTributario: 'simplificado',
      configuracionImpuestos: []
    }
  },

  // MÉXICO
  {
    nombre: 'Soluciones Empresariales SA de CV',
    razonSocial: 'Soluciones Empresariales Sociedad Anónima de Capital Variable',
    numeroIdentificacion: 'SEE123456789',
    paisId: 'mexico',
    subdominio: 'soluciones-empresariales',
    direccion: 'Av. Reforma 456, Polanco, Ciudad de México',
    telefono: '+52 55 1234-5678',
    email: 'contacto@solucionesempresariales.mx',
    monedaPrincipal: 'MXN',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: false,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'SE',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },
  {
    nombre: 'Comercializadora del Norte SC',
    razonSocial: 'Comercializadora del Norte Sociedad Civil',
    numeroIdentificacion: 'CDN987654321',
    paisId: 'mexico',
    subdominio: 'comercializadora-norte',
    direccion: 'Av. Universidad 789, Monterrey, Nuevo León',
    telefono: '+52 81 987-6543',
    email: 'ventas@comercializadoranorte.mx',
    monedaPrincipal: 'MXN',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'FIFO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'CN',
      longitudNumeracion: 6,
      regimenTributario: 'incorporacion_fiscal',
      configuracionImpuestos: []
    }
  },

  // ARGENTINA
  {
    nombre: 'Tecnología Buenos Aires SA',
    razonSocial: 'Tecnología Buenos Aires Sociedad Anónima',
    numeroIdentificacion: '30123456789',
    paisId: 'argentina',
    subdominio: 'tech-buenosaires',
    direccion: 'Av. Corrientes 1234, CABA, Buenos Aires',
    telefono: '+54 11 4567-8901',
    email: 'info@techbuenosaires.ar',
    monedaPrincipal: 'ARS',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: false,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'TBA',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },

  // CHILE
  {
    nombre: 'Servicios Integrales Chile SpA',
    razonSocial: 'Servicios Integrales Chile Sociedad por Acciones',
    numeroIdentificacion: '76123456-7',
    paisId: 'chile',
    subdominio: 'servicios-chile',
    direccion: 'Av. Providencia 567, Providencia, Santiago',
    telefono: '+56 2 2345-6789',
    email: 'contacto@servicioschile.cl',
    monedaPrincipal: 'CLP',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 0,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'SIC',
      longitudNumeracion: 6,
      regimenTributario: 'primera_categoria',
      configuracionImpuestos: []
    }
  },

  // ECUADOR
  {
    nombre: 'Comercial Quito Cía. Ltda.',
    razonSocial: 'Comercial Quito Compañía Limitada',
    numeroIdentificacion: '1792345678001',
    paisId: 'ecuador',
    subdominio: 'comercial-quito',
    direccion: 'Av. Amazonas 890, Quito',
    telefono: '+593 2 234-5678',
    email: 'ventas@comercialquito.ec',
    monedaPrincipal: 'USD',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'CQ',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },

  // BOLIVIA
  {
    nombre: 'Industrias La Paz SRL',
    razonSocial: 'Industrias La Paz Sociedad de Responsabilidad Limitada',
    numeroIdentificacion: '1023456789',
    paisId: 'bolivia',
    subdominio: 'industrias-lapaz',
    direccion: 'Av. 16 de Julio 123, La Paz',
    telefono: '+591 2 234-5678',
    email: 'info@industriaslapaz.bo',
    monedaPrincipal: 'BOB',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'ILP',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },

  // URUGUAY
  {
    nombre: 'Servicios Montevideo SA',
    razonSocial: 'Servicios Montevideo Sociedad Anónima',
    numeroIdentificacion: '210123456789',
    paisId: 'uruguay',
    subdominio: 'servicios-montevideo',
    direccion: 'Av. 18 de Julio 456, Montevideo',
    telefono: '+598 2 234-5678',
    email: 'contacto@serviciosmontevideo.uy',
    monedaPrincipal: 'UYU',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: false,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'SM',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },

  // PARAGUAY
  {
    nombre: 'Comercial Asunción SRL',
    razonSocial: 'Comercial Asunción Sociedad de Responsabilidad Limitada',
    numeroIdentificacion: '80123456-7',
    paisId: 'paraguay',
    subdominio: 'comercial-asuncion',
    direccion: 'Av. Mariscal López 789, Asunción',
    telefono: '+595 21 234-567',
    email: 'ventas@comercialasuncion.py',
    monedaPrincipal: 'PYG',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 0,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'CA',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  },

  // VENEZUELA
  {
    nombre: 'Distribuidora Caracas CA',
    razonSocial: 'Distribuidora Caracas Compañía Anónima',
    numeroIdentificacion: 'J-12345678-9',
    paisId: 'venezuela',
    subdominio: 'distribuidora-caracas',
    direccion: 'Av. Francisco de Miranda 321, Caracas',
    telefono: '+58 212 234-5678',
    email: 'info@distribuidoracaracas.ve',
    monedaPrincipal: 'VES',
    activa: true,
    usuariosAsignados: ['dev-user-123'],
    configuracionContable: {
      ejercicioFiscal: 2024,
      fechaInicioEjercicio: new Date(2024, 0, 1),
      fechaFinEjercicio: new Date(2024, 11, 31),
      metodoCosteo: 'PROMEDIO',
      tipoInventario: 'PERPETUO',
      manejaInventario: true,
      decimalesMoneda: 2,
      decimalesCantidades: 2,
      numeracionAutomatica: true,
      prefijoAsientos: 'DC',
      longitudNumeracion: 6,
      regimenTributario: 'general',
      configuracionImpuestos: []
    }
  }
];

export class SeedDataEmpresasService {
  // Insertar empresas de prueba
  static async insertEmpresasPrueba(): Promise<void> {
    try {
      console.log('🏢 Insertando empresas de prueba...');
      
      // Verificar si ya existen empresas
      const empresasRef = collection(db, 'empresas');
      const existingEmpresas = await getDocs(empresasRef);
      
      if (existingEmpresas.size > 0) {
        console.log('✅ Ya existen empresas en la base de datos');
        return;
      }

      // Crear empresas en lotes para mejor rendimiento
      const batch = writeBatch(db);
      
      empresasPrueba.forEach((empresa, index) => {
        const empresaRef = doc(empresasRef);
        batch.set(empresaRef, {
          ...empresa,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          creadoPor: 'sistema',
          orden: index + 1 // Para mantener orden consistente
        });
      });

      await batch.commit();
      console.log(`🎉 Empresas de prueba insertadas exitosamente: ${empresasPrueba.length} empresas creadas`);
      
      // Log detallado de las empresas creadas
      console.log('📋 Empresas creadas por país:');
      const empresasPorPais = empresasPrueba.reduce((acc, empresa) => {
        acc[empresa.paisId] = (acc[empresa.paisId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(empresasPorPais).forEach(([pais, cantidad]) => {
        console.log(`   • ${pais}: ${cantidad} empresa${cantidad > 1 ? 's' : ''}`);
      });
      
    } catch (error) {
      console.error('❌ Error insertando empresas de prueba:', error);
      throw error;
    }
  }

  // Verificar si existen empresas
  static async existenEmpresas(): Promise<boolean> {
    try {
      const empresasRef = collection(db, 'empresas');
      const snapshot = await getDocs(empresasRef);
      const existe = snapshot.size > 0;
      
      console.log(`🔍 Verificando empresas existentes: ${existe ? 'SÍ' : 'NO'} (${snapshot.size} encontradas)`);
      return existe;
    } catch (error) {
      console.error('❌ Error verificando empresas:', error);
      return false;
    }
  }

  // Obtener estadísticas de empresas de prueba
  static getEstadisticasEmpresasPrueba() {
    const estadisticas = {
      total: empresasPrueba.length,
      porPais: empresasPrueba.reduce((acc, empresa) => {
        acc[empresa.paisId] = (acc[empresa.paisId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sectores: {
        tecnologia: empresasPrueba.filter(e => 
          e.nombre.toLowerCase().includes('tech') || 
          e.nombre.toLowerCase().includes('digital') ||
          e.nombre.toLowerCase().includes('soluciones')
        ).length,
        comercial: empresasPrueba.filter(e => 
          e.nombre.toLowerCase().includes('comercial') || 
          e.nombre.toLowerCase().includes('distribuidora')
        ).length,
        servicios: empresasPrueba.filter(e => 
          e.nombre.toLowerCase().includes('servicios')
        ).length,
        industrial: empresasPrueba.filter(e => 
          e.nombre.toLowerCase().includes('industrias')
        ).length
      }
    };

    return estadisticas;
  }
}