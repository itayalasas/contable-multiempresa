import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { FacturaPorPagar, Proveedor, PagoProveedor, ResumenCuentasPorPagar } from '../../types/cuentasPorPagar';
import { AsientosAutomaticosService } from './asientosAutomaticos';

export const cuentasPorPagarService = {
  // Obtener facturas por pagar
  async getFacturas(empresaId: string): Promise<FacturaPorPagar[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockFacturas();
      }

      console.log('🔍 Obteniendo facturas por pagar para empresa:', empresaId);
      
      const facturasRef = collection(db, 'empresas', empresaId, 'facturasPorPagar');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(facturasRef, orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      
      const facturas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString(),
        fechaModificacion: doc.data().fechaModificacion
      })) as FacturaPorPagar[];

      // Obtener proveedores para enriquecer las facturas
      const proveedores = await this.getProveedores(empresaId);
      const proveedoresMap = new Map(proveedores.map(p => [p.id, p]));

      const facturasEnriquecidas = facturas.map(factura => ({
        ...factura,
        proveedor: proveedoresMap.get(factura.proveedorId) || {
          id: factura.proveedorId,
          nombre: 'Proveedor no encontrado',
          numeroDocumento: '',
          tipoDocumento: 'RUC',
          activo: false,
          fechaCreacion: new Date(),
          empresaId
        }
      }));
      
      console.log(`✅ Se encontraron ${facturasEnriquecidas.length} facturas`);
      return facturasEnriquecidas;
    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      
      // Devolver datos mock para desarrollo
      console.log('⚠️ Devolviendo datos mock para desarrollo');
      return this.getMockFacturas();
    }
  },

  // Obtener proveedores
  async getProveedores(empresaId: string): Promise<Proveedor[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockProveedores();
      }

      console.log('🔍 Obteniendo proveedores para empresa:', empresaId);
      
      const proveedoresRef = collection(db, 'empresas', empresaId, 'proveedores');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(proveedoresRef, where('activo', '==', true));
      const snapshot = await getDocs(q);
      
      const proveedores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date()
      })) as Proveedor[];
      
      // Ordenar en el cliente para evitar problemas de índices
      const proveedoresOrdenados = proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${proveedoresOrdenados.length} proveedores`);
      return proveedoresOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo proveedores:', error);
      
      // Devolver datos mock para desarrollo
      console.log('⚠️ Devolviendo datos mock para desarrollo');
      return this.getMockProveedores();
    }
  },

  // Crear factura
  async crearFactura(empresaId: string, factura: Omit<FacturaPorPagar, 'id' | 'fechaCreacion' | 'fechaModificacion'>): Promise<string> {
    try {
      // Asegurar autenticación antes de intentar crear la factura
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nueva factura:', factura.numero);
      
      const facturasRef = collection(db, 'empresas', empresaId, 'facturasPorPagar');
      const nuevaFactura = {
        ...factura,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        creadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
      };
      
      const docRef = await addDoc(facturasRef, nuevaFactura);
      console.log(`✅ Factura creada con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando factura:', error);
      throw error;
    }
  },

  // Actualizar factura
  async actualizarFactura(empresaId: string, facturaId: string, datos: Partial<FacturaPorPagar>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando factura ${facturaId}`);
      
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorPagar', facturaId);
      await updateDoc(facturaRef, {
        ...datos,
        fechaModificacion: new Date().toISOString()
      });
      
      console.log('✅ Factura actualizada correctamente');
    } catch (error) {
      console.error('❌ Error actualizando factura:', error);
      throw error;
    }
  },

  // Eliminar factura
  async eliminarFactura(empresaId: string, facturaId: string): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🗑️ Eliminando factura ${facturaId}`);
      
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorPagar', facturaId);
      await deleteDoc(facturaRef);
      
      console.log('✅ Factura eliminada correctamente');
    } catch (error) {
      console.error('❌ Error eliminando factura:', error);
      throw error;
    }
  },

  // Registrar pago
  async registrarPago(empresaId: string, facturaId: string, pago: Omit<PagoProveedor, 'id' | 'facturaId' | 'fechaCreacion'>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`💰 Registrando pago para factura ${facturaId}`);
      
      // Usar transacción para garantizar consistencia
      await runTransaction(db, async (transaction) => {
        // PRIMERO: Realizar todas las lecturas
        const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorPagar', facturaId);
        const facturaDoc = await transaction.get(facturaRef);
        
        if (!facturaDoc.exists()) {
          throw new Error('La factura no existe');
        }
        
        const facturaData = facturaDoc.data() as FacturaPorPagar;
        
        // SEGUNDO: Realizar todas las escrituras
        // Crear el pago
        const pagosRef = collection(db, 'empresas', empresaId, 'pagosCuentasPorPagar');
        const nuevoPagoRef = doc(pagosRef);
        
        const nuevoPago = {
          ...pago,
          facturaId,
          fechaCreacion: new Date().toISOString(),
          creadoPor: FirebaseAuthService.getCurrentUserId() || 'sistema'
        };
        
        transaction.set(nuevoPagoRef, nuevoPago);
        
        // Actualizar la factura
        const nuevoMontoPagado = facturaData.montoPagado + pago.monto;
        const nuevoSaldoPendiente = facturaData.montoTotal - nuevoMontoPagado;
        
        let nuevoEstado = facturaData.estado;
        if (nuevoSaldoPendiente <= 0) {
          nuevoEstado = 'PAGADA';
        } else if (nuevoMontoPagado > 0) {
          nuevoEstado = 'PARCIAL';
        }
        
        transaction.update(facturaRef, {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: Math.max(0, nuevoSaldoPendiente),
          estado: nuevoEstado,
          fechaModificacion: new Date().toISOString()
        });
      });
      
      // Obtener la factura completa para generar el asiento
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorPagar', facturaId);
      const facturaDoc = await getDoc(facturaRef);
      
      if (facturaDoc.exists()) {
        const facturaData = facturaDoc.data() as FacturaPorPagar;
        
        // Generar asiento contable automático
        try {
          await AsientosAutomaticosService.generarAsientoPagoPagar(
            empresaId,
            facturaData,
            {
              ...pago,
              id: 'temp',
              facturaId,
              fechaCreacion: new Date().toISOString()
            }
          );
          console.log('✅ Asiento contable generado automáticamente');
        } catch (asientoError) {
          console.error('⚠️ Error generando asiento automático:', asientoError);
          // No interrumpir el flujo si falla la generación del asiento
        }
      }
      
      console.log('✅ Pago registrado correctamente');
    } catch (error) {
      console.error('❌ Error registrando pago:', error);
      throw error;
    }
  },

  // Crear proveedor
  async crearProveedor(empresaId: string, proveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('👤 Creando nuevo proveedor:', proveedor.nombre);
      
      const proveedoresRef = collection(db, 'empresas', empresaId, 'proveedores');
      const nuevoProveedor = {
        ...proveedor,
        empresaId,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(proveedoresRef, nuevoProveedor);
      console.log(`✅ Proveedor creado con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando proveedor:', error);
      throw error;
    }
  },

  // Obtener resumen
  async getResumen(empresaId: string): Promise<ResumenCuentasPorPagar> {
    try {
      console.log('📊 Generando resumen de cuentas por pagar');
      
      const facturas = await this.getFacturas(empresaId);
      const proveedores = await this.getProveedores(empresaId);
      
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const resumen: ResumenCuentasPorPagar = {
        totalFacturas: facturas.length,
        totalPorPagar: facturas.reduce((sum, f) => sum + f.saldoPendiente, 0),
        totalVencido: 0,
        totalPorVencer: 0,
        facturasPendientes: facturas.filter(f => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL').length,
        facturasVencidas: 0,
        facturasDelMes: facturas.filter(f => new Date(f.fechaCreacion) >= inicioMes).length,
        promedioPago: 30, // Calcular basado en datos reales
        vencimiento0a30: 0,
        vencimiento31a60: 0,
        vencimiento61a90: 0,
        vencimientoMas90: 0,
        proveedoresConDeuda: 0,
        proveedoresMayorDeuda: []
      };

      // Calcular vencimientos y totales
      facturas.forEach(factura => {
        if (factura.saldoPendiente > 0) {
          const diasVencimiento = Math.floor((hoy.getTime() - new Date(factura.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24));
          
          if (diasVencimiento > 0) {
            resumen.totalVencido += factura.saldoPendiente;
            resumen.facturasVencidas++;
            
            if (diasVencimiento <= 30) {
              resumen.vencimiento0a30 += factura.saldoPendiente;
            } else if (diasVencimiento <= 60) {
              resumen.vencimiento31a60 += factura.saldoPendiente;
            } else if (diasVencimiento <= 90) {
              resumen.vencimiento61a90 += factura.saldoPendiente;
            } else {
              resumen.vencimientoMas90 += factura.saldoPendiente;
            }
          } else {
            resumen.totalPorVencer += factura.saldoPendiente;
          }
        }
      });

      // Proveedores con mayor deuda
      const deudaPorProveedor = new Map<string, number>();
      facturas.forEach(factura => {
        if (factura.saldoPendiente > 0) {
          const deudaActual = deudaPorProveedor.get(factura.proveedorId) || 0;
          deudaPorProveedor.set(factura.proveedorId, deudaActual + factura.saldoPendiente);
        }
      });

      resumen.proveedoresConDeuda = deudaPorProveedor.size;
      
      const proveedoresConDeuda = Array.from(deudaPorProveedor.entries())
        .map(([proveedorId, deuda]) => ({
          proveedor: proveedores.find(p => p.id === proveedorId)!,
          deuda
        }))
        .filter(item => item.proveedor)
        .sort((a, b) => b.deuda - a.deuda)
        .slice(0, 5);

      resumen.proveedoresMayorDeuda = proveedoresConDeuda.map(item => item.proveedor);
      
      console.log('✅ Resumen generado correctamente');
      return resumen;
    } catch (error) {
      console.error('❌ Error obteniendo resumen:', error);
      return this.getMockResumen();
    }
  },

  // Datos mock para desarrollo
  getMockFacturas(): FacturaPorPagar[] {
    const mockProveedores = this.getMockProveedores();
    
    return [
      {
        id: '1',
        numero: 'F001-00001',
        tipoDocumento: 'FACTURA',
        proveedorId: '1',
        proveedor: mockProveedores[0],
        fechaEmision: '2024-01-15',
        fechaVencimiento: '2024-02-14',
        descripcion: 'Compra de materiales de oficina',
        montoSubtotal: 1000,
        montoImpuestos: 180,
        montoTotal: 1180,
        montoPagado: 0,
        saldoPendiente: 1180,
        estado: 'VENCIDA',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Papel A4 (Caja x10)',
            cantidad: 5,
            precioUnitario: 50,
            total: 250
          },
          {
            id: '2',
            descripcion: 'Tóner impresora',
            cantidad: 3,
            precioUnitario: 250,
            total: 750
          }
        ],
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        numero: 'F001-00002',
        tipoDocumento: 'FACTURA',
        proveedorId: '2',
        proveedor: mockProveedores[1],
        fechaEmision: '2024-01-20',
        fechaVencimiento: '2024-02-19',
        descripcion: 'Servicios de mantenimiento',
        montoSubtotal: 2500,
        montoImpuestos: 450,
        montoTotal: 2950,
        montoPagado: 1000,
        saldoPendiente: 1950,
        estado: 'PARCIAL',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Mantenimiento preventivo',
            cantidad: 1,
            precioUnitario: 2500,
            total: 2500
          }
        ],
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-01-20T14:30:00Z'
      },
      {
        id: '3',
        numero: 'F001-00003',
        tipoDocumento: 'FACTURA',
        proveedorId: '1',
        proveedor: mockProveedores[0],
        fechaEmision: '2024-02-05',
        fechaVencimiento: '2024-03-06',
        descripcion: 'Compra de equipos informáticos',
        montoSubtotal: 8000,
        montoImpuestos: 1440,
        montoTotal: 9440,
        montoPagado: 9440,
        saldoPendiente: 0,
        estado: 'PAGADA',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Laptop HP ProBook',
            cantidad: 2,
            precioUnitario: 4000,
            total: 8000
          }
        ],
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-02-05T09:15:00Z'
      },
      {
        id: '4',
        numero: 'F001-00004',
        tipoDocumento: 'FACTURA',
        proveedorId: '3',
        proveedor: {
          id: '3',
          nombre: 'Servicios Generales EIRL',
          tipoDocumento: 'RUC',
          numeroDocumento: '20567890123',
          activo: true,
          fechaCreacion: new Date('2024-01-10'),
          empresaId: 'dev-empresa-pe'
        },
        fechaEmision: '2024-02-15',
        fechaVencimiento: '2024-03-16',
        descripcion: 'Servicios de limpieza mensual',
        montoSubtotal: 1500,
        montoImpuestos: 270,
        montoTotal: 1770,
        montoPagado: 0,
        saldoPendiente: 1770,
        estado: 'PENDIENTE',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Servicio de limpieza integral',
            cantidad: 1,
            precioUnitario: 1500,
            total: 1500
          }
        ],
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-02-15T11:30:00Z'
      },
      {
        id: '5',
        numero: 'F001-00005',
        tipoDocumento: 'FACTURA',
        proveedorId: '2',
        proveedor: mockProveedores[1],
        fechaEmision: '2024-03-01',
        fechaVencimiento: '2024-03-31',
        descripcion: 'Servicios de consultoría',
        montoSubtotal: 5000,
        montoImpuestos: 900,
        montoTotal: 5900,
        montoPagado: 2000,
        saldoPendiente: 3900,
        estado: 'PARCIAL',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Consultoría en procesos',
            cantidad: 1,
            precioUnitario: 3000,
            total: 3000
          },
          {
            id: '2',
            descripcion: 'Implementación de mejoras',
            cantidad: 1,
            precioUnitario: 2000,
            total: 2000
          }
        ],
        empresaId: 'dev-empresa-pe',
        creadoPor: 'dev-user-123',
        fechaCreacion: '2024-03-01T16:45:00Z'
      }
    ];
  },

  getMockProveedores(): Proveedor[] {
    return [
      {
        id: '1',
        nombre: 'Distribuidora Comercial SAC',
        razonSocial: 'Distribuidora Comercial Sociedad Anónima Cerrada',
        tipoDocumento: 'RUC',
        numeroDocumento: '20123456789',
        email: 'ventas@distribuidoracomercial.com',
        telefono: '+51 1 234-5678',
        direccion: 'Av. Industrial 123, Lima',
        contacto: 'Juan Pérez',
        activo: true,
        fechaCreacion: new Date('2024-01-01'),
        empresaId: 'dev-empresa-pe',
        condicionesPago: 'Crédito 30 días',
        diasCredito: 30
      },
      {
        id: '2',
        nombre: 'Servicios Técnicos EIRL',
        razonSocial: 'Servicios Técnicos Empresa Individual de Responsabilidad Limitada',
        tipoDocumento: 'RUC',
        numeroDocumento: '20987654321',
        email: 'contacto@serviciostecnicos.com',
        telefono: '+51 1 987-6543',
        direccion: 'Jr. Tecnología 456, Lima',
        contacto: 'María García',
        activo: true,
        fechaCreacion: new Date('2024-01-05'),
        empresaId: 'dev-empresa-pe',
        condicionesPago: 'Crédito 45 días',
        diasCredito: 45
      },
      {
        id: '3',
        nombre: 'Servicios Generales EIRL',
        tipoDocumento: 'RUC',
        numeroDocumento: '20567890123',
        email: 'info@serviciosgenerales.com',
        telefono: '+51 1 345-6789',
        direccion: 'Av. Principal 789, Callao',
        contacto: 'Carlos Rodríguez',
        activo: true,
        fechaCreacion: new Date('2024-01-10'),
        empresaId: 'dev-empresa-pe',
        condicionesPago: 'Crédito 30 días',
        diasCredito: 30
      },
      {
        id: '4',
        nombre: 'Suministros Industriales SAC',
        tipoDocumento: 'RUC',
        numeroDocumento: '20345678901',
        email: 'ventas@suministrosindustriales.com',
        telefono: '+51 1 456-7890',
        direccion: 'Av. Industrial 567, Callao',
        contacto: 'Ana López',
        activo: true,
        fechaCreacion: new Date('2024-01-15'),
        empresaId: 'dev-empresa-pe',
        condicionesPago: 'Contado',
        diasCredito: 0
      },
      {
        id: '5',
        nombre: 'Transportes Rápidos SAC',
        tipoDocumento: 'RUC',
        numeroDocumento: '20678901234',
        email: 'operaciones@transportesrapidos.com',
        telefono: '+51 1 567-8901',
        direccion: 'Av. Transporte 890, Lima',
        contacto: 'Pedro Martínez',
        activo: true,
        fechaCreacion: new Date('2024-01-20'),
        empresaId: 'dev-empresa-pe',
        condicionesPago: 'Crédito 15 días',
        diasCredito: 15
      }
    ];
  },

  getMockResumen(): ResumenCuentasPorPagar {
    return {
      totalFacturas: 5,
      totalPorPagar: 8800,
      totalVencido: 1180,
      totalPorVencer: 7620,
      facturasPendientes: 3,
      facturasVencidas: 1,
      facturasDelMes: 2,
      promedioPago: 35,
      vencimiento0a30: 1180,
      vencimiento31a60: 0,
      vencimiento61a90: 0,
      vencimientoMas90: 0,
      proveedoresConDeuda: 3,
      proveedoresMayorDeuda: this.getMockProveedores().slice(0, 3)
    };
  }
};