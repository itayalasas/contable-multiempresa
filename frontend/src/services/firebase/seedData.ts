import { collection, addDoc, doc, setDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PlanCuenta } from '../../types';

// Plan de cuentas base según PCGE (Plan Contable General Empresarial - Perú)
const planCuentasBase: Omit<PlanCuenta, 'id' | 'empresaId' | 'fechaCreacion' | 'fechaModificacion'>[] = [
  // CLASE 1: ACTIVO
  { codigo: '10', nombre: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '101', nombre: 'Caja', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '10', paisId: 'peru', activa: true },
  { codigo: '1011', nombre: 'Caja MN', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '101', paisId: 'peru', activa: true },
  { codigo: '1012', nombre: 'Caja ME', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '101', paisId: 'peru', activa: true },
  { codigo: '104', nombre: 'Cuentas corrientes en instituciones financieras', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '10', paisId: 'peru', activa: true },
  { codigo: '1041', nombre: 'Cuentas corrientes operativas', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '104', paisId: 'peru', activa: true },
  
  { codigo: '12', nombre: 'CUENTAS POR COBRAR COMERCIALES - TERCEROS', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '12', paisId: 'peru', activa: true },
  { codigo: '1211', nombre: 'No emitidas', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '121', paisId: 'peru', activa: true },
  { codigo: '1212', nombre: 'Emitidas en cartera', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '121', paisId: 'peru', activa: true },
  
  { codigo: '20', nombre: 'MERCADERÍAS', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '201', nombre: 'Mercaderías manufacturadas', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '20', paisId: 'peru', activa: true },
  
  { codigo: '33', nombre: 'INMUEBLES, MAQUINARIA Y EQUIPO', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '331', nombre: 'Terrenos', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true },
  { codigo: '333', nombre: 'Maquinarias y equipos de explotación', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true },
  { codigo: '334', nombre: 'Unidades de transporte', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true },
  
  // CLASE 4: PASIVO
  { codigo: '40', nombre: 'TRIBUTOS, CONTRAPRESTACIONES Y APORTES AL SISTEMA DE PENSIONES Y DE SALUD POR PAGAR', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '401', nombre: 'Gobierno central', tipo: 'PASIVO', nivel: 2, cuentaPadre: '40', paisId: 'peru', activa: true },
  { codigo: '4011', nombre: 'Impuesto general a las ventas', tipo: 'PASIVO', nivel: 3, cuentaPadre: '401', paisId: 'peru', activa: true },
  { codigo: '40111', nombre: 'IGV - Cuenta propia', tipo: 'PASIVO', nivel: 4, cuentaPadre: '4011', paisId: 'peru', activa: true },
  
  { codigo: '42', nombre: 'CUENTAS POR PAGAR COMERCIALES - TERCEROS', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '421', nombre: 'Facturas, boletas y otros comprobantes por pagar', tipo: 'PASIVO', nivel: 2, cuentaPadre: '42', paisId: 'peru', activa: true },
  { codigo: '4212', nombre: 'Emitidas', tipo: 'PASIVO', nivel: 3, cuentaPadre: '421', paisId: 'peru', activa: true },
  
  { codigo: '46', nombre: 'CUENTAS POR PAGAR DIVERSAS - TERCEROS', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '465', nombre: 'Pasivos por compra de activo inmovilizado', tipo: 'PASIVO', nivel: 2, cuentaPadre: '46', paisId: 'peru', activa: true },
  
  // CLASE 5: PATRIMONIO
  { codigo: '50', nombre: 'CAPITAL', tipo: 'PATRIMONIO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '501', nombre: 'Capital social', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '50', paisId: 'peru', activa: true },
  { codigo: '5011', nombre: 'Acciones', tipo: 'PATRIMONIO', nivel: 3, cuentaPadre: '501', paisId: 'peru', activa: true },
  
  { codigo: '59', nombre: 'RESULTADOS ACUMULADOS', tipo: 'PATRIMONIO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '591', nombre: 'Utilidades no distribuidas', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '59', paisId: 'peru', activa: true },
  { codigo: '592', nombre: 'Pérdidas acumuladas', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '59', paisId: 'peru', activa: true },
  
  // CLASE 7: INGRESOS
  { codigo: '70', nombre: 'VENTAS', tipo: 'INGRESO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '701', nombre: 'Mercaderías', tipo: 'INGRESO', nivel: 2, cuentaPadre: '70', paisId: 'peru', activa: true },
  { codigo: '7011', nombre: 'Mercaderías manufacturadas', tipo: 'INGRESO', nivel: 3, cuentaPadre: '701', paisId: 'peru', activa: true },
  
  { codigo: '75', nombre: 'OTROS INGRESOS DE GESTIÓN', tipo: 'INGRESO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '751', nombre: 'Servicios en beneficio del personal', tipo: 'INGRESO', nivel: 2, cuentaPadre: '75', paisId: 'peru', activa: true },
  { codigo: '759', nombre: 'Otros ingresos de gestión', tipo: 'INGRESO', nivel: 2, cuentaPadre: '75', paisId: 'peru', activa: true },
  
  // CLASE 6: GASTOS
  { codigo: '60', nombre: 'COMPRAS', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '601', nombre: 'Mercaderías', tipo: 'GASTO', nivel: 2, cuentaPadre: '60', paisId: 'peru', activa: true },
  { codigo: '6011', nombre: 'Mercaderías manufacturadas', tipo: 'GASTO', nivel: 3, cuentaPadre: '601', paisId: 'peru', activa: true },
  
  { codigo: '63', nombre: 'GASTOS DE SERVICIOS PRESTADOS POR TERCEROS', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '631', nombre: 'Transporte, correos y gastos de viaje', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true },
  { codigo: '634', nombre: 'Mantenimiento y reparaciones', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true },
  { codigo: '636', nombre: 'Servicios básicos', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true },
  { codigo: '6361', nombre: 'Energía eléctrica', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true },
  { codigo: '6362', nombre: 'Gas', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true },
  { codigo: '6363', nombre: 'Agua', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true },
  { codigo: '6364', nombre: 'Teléfono', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true },
  { codigo: '6365', nombre: 'Internet', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true },
  
  { codigo: '65', nombre: 'OTROS GASTOS DE GESTIÓN', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true },
  { codigo: '651', nombre: 'Seguros', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true },
  { codigo: '656', nombre: 'Suministros', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true },
  { codigo: '659', nombre: 'Otros gastos de gestión', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true }
];

export class SeedDataService {
  // Inicializar plan de cuentas base
  static async initializePlanCuentas(empresaId: string): Promise<void> {
    try {
      console.log(`Inicializando plan de cuentas para empresa ${empresaId}...`);
      
      // Verificar si ya existe plan de cuentas
      const cuentasRef = collection(db, `empresas/${empresaId}/cuentas`);
      const existingCuentas = await getDocs(cuentasRef);
      
      if (existingCuentas.size > 0) {
        console.log('Plan de cuentas ya existe para esta empresa');
        return;
      }

      // Crear plan de cuentas en lotes para mejor rendimiento
      const batch = writeBatch(db);
      
      planCuentasBase.forEach((cuenta) => {
        const cuentaRef = doc(cuentasRef);
        batch.set(cuentaRef, {
          ...cuenta,
          empresaId,
          fechaCreacion: new Date(),
          fechaModificacion: new Date(),
          creadoPor: 'sistema'
        });
      });

      await batch.commit();
      console.log(`Plan de cuentas inicializado para empresa ${empresaId} - ${planCuentasBase.length} cuentas creadas`);
    } catch (error) {
      console.error('Error inicializando plan de cuentas:', error);
      throw error;
    }
  }

  // Crear asientos de apertura
  static async createAsientosApertura(empresaId: string, saldosIniciales: { [codigoCuenta: string]: number }): Promise<void> {
    try {
      console.log(`Creando asientos de apertura para empresa ${empresaId}...`);
      
      const asientosRef = collection(db, `empresas/${empresaId}/asientos`);
      const cuentasRef = collection(db, `empresas/${empresaId}/cuentas`);
      
      // Obtener cuentas para mapear códigos a IDs
      const cuentasSnapshot = await getDocs(cuentasRef);
      const cuentasMap = new Map();
      cuentasSnapshot.forEach(doc => {
        const cuenta = doc.data();
        cuentasMap.set(cuenta.codigo, { id: doc.id, ...cuenta });
      });

      const detalles = [];
      let totalDebe = 0;
      let totalHaber = 0;

      // Crear detalles del asiento de apertura
      Object.entries(saldosIniciales).forEach(([codigo, saldo]) => {
        const cuenta = cuentasMap.get(codigo);
        if (cuenta && saldo !== 0) {
          const detalle = {
            id: `det_${detalles.length + 1}`,
            cuentaId: cuenta.id,
            cuenta: `${cuenta.codigo} - ${cuenta.nombre}`,
            debe: 0,
            haber: 0,
            descripcion: 'Saldo inicial'
          };

          // Determinar si va al debe o haber según el tipo de cuenta
          if (['ACTIVO', 'GASTO'].includes(cuenta.tipo)) {
            detalle.debe = Math.abs(saldo);
            totalDebe += Math.abs(saldo);
          } else {
            detalle.haber = Math.abs(saldo);
            totalHaber += Math.abs(saldo);
          }

          detalles.push(detalle);
        }
      });

      // Crear asiento de apertura
      const asientoApertura = {
        numero: 'ASI-000',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: 'Asiento de apertura - Saldos iniciales',
        referencia: 'APERTURA',
        total: totalDebe,
        estado: 'confirmado',
        movimientos: detalles,
        empresaId,
        paisId: 'peru',
        creadoPor: 'sistema',
        fechaCreacion: new Date().toISOString()
      };

      await addDoc(asientosRef, asientoApertura);
      console.log('Asiento de apertura creado exitosamente');
    } catch (error) {
      console.error('Error creando asiento de apertura:', error);
      throw error;
    }
  }

  // Configuración inicial completa de empresa
  static async setupEmpresa(empresaId: string, configuracion?: {
    saldosIniciales?: { [codigoCuenta: string]: number };
    configuracionContable?: any;
  }): Promise<void> {
    try {
      console.log(`Configurando empresa ${empresaId}...`);
      
      // 1. Inicializar plan de cuentas
      await this.initializePlanCuentas(empresaId);

      // 2. Crear configuración contable
      const configRef = doc(db, `empresas/${empresaId}/configuracion/contabilidad`);
      await setDoc(configRef, {
        moneda: 'PEN',
        decimales: 2,
        ejercicioFiscal: new Date().getFullYear(),
        metodoCosteo: 'PROMEDIO',
        tipoInventario: 'PERPETUO',
        ...configuracion?.configuracionContable,
        fechaCreacion: new Date()
      });

      // 3. Crear asientos de apertura si se proporcionan saldos
      if (configuracion?.saldosIniciales) {
        await this.createAsientosApertura(empresaId, configuracion.saldosIniciales);
      }

      console.log(`Empresa ${empresaId} configurada exitosamente`);
    } catch (error) {
      console.error('Error configurando empresa:', error);
      throw error;
    }
  }

  // Insertar datos de prueba completos
  static async insertTestData(empresaId: string): Promise<void> {
    try {
      console.log(`Insertando datos de prueba para empresa ${empresaId}...`);
      
      // 1. Inicializar plan de cuentas
      await this.initializePlanCuentas(empresaId);
      
      // 2. Crear saldos iniciales de ejemplo
      const saldosIniciales = {
        '1011': 5000,    // Caja MN
        '1041': 15000,   // Cuentas corrientes
        '501': 20000     // Capital social
      };
      
      // 3. Crear asientos de apertura
      await this.createAsientosApertura(empresaId, saldosIniciales);
      
      // 4. Crear algunos asientos de ejemplo
      await this.createAsientosEjemplo(empresaId);
      
      console.log('Datos de prueba insertados exitosamente');
    } catch (error) {
      console.error('Error insertando datos de prueba:', error);
      throw error;
    }
  }

  // Crear asientos de ejemplo
  private static async createAsientosEjemplo(empresaId: string): Promise<void> {
    try {
      const asientosRef = collection(db, `empresas/${empresaId}/asientos`);
      const cuentasRef = collection(db, `empresas/${empresaId}/cuentas`);
      
      // Obtener cuentas
      const cuentasSnapshot = await getDocs(cuentasRef);
      const cuentasMap = new Map();
      cuentasSnapshot.forEach(doc => {
        const cuenta = doc.data();
        cuentasMap.set(cuenta.codigo, { id: doc.id, ...cuenta });
      });

      // Asiento de venta
      const asientoVenta = {
        numero: 'ASI-001',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: 'Venta de mercadería al contado',
        referencia: 'VENTA-001',
        estado: 'confirmado',
        movimientos: [
          {
            id: 'det_1',
            cuentaId: cuentasMap.get('1011')?.id,
            cuenta: '1011 - Caja MN',
            debe: 1180,
            haber: 0,
            descripcion: 'Cobro de venta'
          },
          {
            id: 'det_2',
            cuentaId: cuentasMap.get('7011')?.id,
            cuenta: '7011 - Mercaderías manufacturadas',
            debe: 0,
            haber: 1000,
            descripcion: 'Venta de mercadería'
          },
          {
            id: 'det_3',
            cuentaId: cuentasMap.get('40111')?.id,
            cuenta: '40111 - IGV - Cuenta propia',
            debe: 0,
            haber: 180,
            descripcion: 'IGV de la venta'
          }
        ],
        empresaId,
        paisId: 'peru',
        creadoPor: 'sistema',
        fechaCreacion: new Date().toISOString()
      };

      await addDoc(asientosRef, asientoVenta);

      // Asiento de compra
      const asientoCompra = {
        numero: 'ASI-002',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: 'Compra de mercadería al crédito',
        referencia: 'COMPRA-001',
        estado: 'confirmado',
        movimientos: [
          {
            id: 'det_1',
            cuentaId: cuentasMap.get('6011')?.id,
            cuenta: '6011 - Mercaderías manufacturadas',
            debe: 500,
            haber: 0,
            descripcion: 'Compra de mercadería'
          },
          {
            id: 'det_2',
            cuentaId: cuentasMap.get('40111')?.id,
            cuenta: '40111 - IGV - Cuenta propia',
            debe: 90,
            haber: 0,
            descripcion: 'IGV de la compra'
          },
          {
            id: 'det_3',
            cuentaId: cuentasMap.get('4212')?.id,
            cuenta: '4212 - Emitidas',
            debe: 0,
            haber: 590,
            descripcion: 'Deuda por compra'
          }
        ],
        empresaId,
        paisId: 'peru',
        creadoPor: 'sistema',
        fechaCreacion: new Date().toISOString()
      };

      await addDoc(asientosRef, asientoCompra);
      
      console.log('Asientos de ejemplo creados');
    } catch (error) {
      console.error('Error creando asientos de ejemplo:', error);
      throw error;
    }
  }
}