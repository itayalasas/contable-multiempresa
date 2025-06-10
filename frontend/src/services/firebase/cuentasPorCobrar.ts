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
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { FacturaPorCobrar, Cliente, PagoFactura, ResumenCuentasPorCobrar } from '../../types/cuentasPorCobrar';
import { AsientosAutomaticosService } from './asientosAutomaticos';

export const cuentasPorCobrarService = {
  // Obtener facturas por cobrar
  async getFacturas(empresaId: string): Promise<FacturaPorCobrar[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockFacturas();
      }

      console.log('🔍 Obteniendo facturas por cobrar para empresa:', empresaId);
      
      const facturasRef = collection(db, 'empresas', empresaId, 'facturasPorCobrar');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(facturasRef, orderBy('fechaCreacion', 'desc'));
      const snapshot = await getDocs(q);
      
      const facturas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion || new Date().toISOString(),
        fechaModificacion: doc.data().fechaModificacion
      })) as FacturaPorCobrar[];

      // Obtener clientes para enriquecer las facturas
      const clientes = await this.getClientes(empresaId);
      const clientesMap = new Map(clientes.map(c => [c.id, c]));

      const facturasEnriquecidas = facturas.map(factura => ({
        ...factura,
        cliente: clientesMap.get(factura.clienteId) || {
          id: factura.clienteId,
          nombre: 'Cliente no encontrado',
          numeroDocumento: '',
          tipoDocumento: 'DNI' as const,
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

  // Obtener clientes
  async getClientes(empresaId: string): Promise<Cliente[]> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        console.log('No se pudo autenticar con Firebase, usando datos mock');
        return this.getMockClientes();
      }

      console.log('🔍 Obteniendo clientes para empresa:', empresaId);
      
      const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
      
      // Usar query más simple para evitar problemas de índices
      const q = query(clientesRef, where('activo', '==', true));
      const snapshot = await getDocs(q);
      
      const clientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date()
      })) as Cliente[];
      
      // Ordenar en el cliente para evitar problemas de índices
      const clientesOrdenados = clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      console.log(`✅ Se encontraron ${clientesOrdenados.length} clientes`);
      return clientesOrdenados;
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      
      // Devolver datos mock para desarrollo
      console.log('⚠️ Devolviendo datos mock para desarrollo');
      return this.getMockClientes();
    }
  },

  // Crear factura
  async crearFactura(empresaId: string, factura: Omit<FacturaPorCobrar, 'id' | 'fechaCreacion' | 'fechaModificacion'>): Promise<string> {
    try {
      // Asegurar autenticación antes de intentar crear la factura
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('📝 Creando nueva factura:', factura.numero);
      
      const facturasRef = collection(db, 'empresas', empresaId, 'facturasPorCobrar');
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
  async actualizarFactura(empresaId: string, facturaId: string, datos: Partial<FacturaPorCobrar>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`🔄 Actualizando factura ${facturaId}`);
      
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorCobrar', facturaId);
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
      
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorCobrar', facturaId);
      await deleteDoc(facturaRef);
      
      console.log('✅ Factura eliminada correctamente');
    } catch (error) {
      console.error('❌ Error eliminando factura:', error);
      throw error;
    }
  },

  // Registrar pago
  async registrarPago(empresaId: string, facturaId: string, pago: Omit<PagoFactura, 'id' | 'facturaId' | 'fechaCreacion'>): Promise<void> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log(`💰 Registrando pago para factura ${facturaId}`);
      
      // Usar transacción para garantizar consistencia
      await runTransaction(db, async (transaction) => {
        // PRIMERO: Realizar todas las lecturas
        const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorCobrar', facturaId);
        const facturaDoc = await transaction.get(facturaRef);
        
        if (!facturaDoc.exists()) {
          throw new Error('La factura no existe');
        }
        
        const facturaData = facturaDoc.data() as FacturaPorCobrar;
        
        // SEGUNDO: Realizar todas las escrituras
        // Crear el pago
        const pagosRef = collection(db, 'empresas', empresaId, 'pagosCuentasPorCobrar');
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
      const facturaRef = doc(db, 'empresas', empresaId, 'facturasPorCobrar', facturaId);
      const facturaDoc = await getDoc(facturaRef);
      
      if (facturaDoc.exists()) {
        const facturaData = facturaDoc.data() as FacturaPorCobrar;
        
        // Generar asiento contable automático
        try {
          await AsientosAutomaticosService.generarAsientoPagoCobrar(
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

  // Crear cliente
  async crearCliente(empresaId: string, cliente: Omit<Cliente, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('👤 Creando nuevo cliente:', cliente.nombre);
      
      const clientesRef = collection(db, 'empresas', empresaId, 'clientes');
      const nuevoCliente = {
        ...cliente,
        empresaId,
        fechaCreacion: Timestamp.now()
      };
      
      const docRef = await addDoc(clientesRef, nuevoCliente);
      console.log(`✅ Cliente creado con ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  },

  // Obtener resumen
  async getResumen(empresaId: string): Promise<ResumenCuentasPorCobrar> {
    try {
      console.log('📊 Generando resumen de cuentas por cobrar');
      
      const facturas = await this.getFacturas(empresaId);
      const clientes = await this.getClientes(empresaId);
      
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      const resumen: ResumenCuentasPorCobrar = {
        totalFacturas: facturas.length,
        totalPorCobrar: facturas.reduce((sum, f) => sum + f.saldoPendiente, 0),
        totalVencido: 0,
        totalPorVencer: 0,
        facturasPendientes: facturas.filter(f => f.estado === 'PENDIENTE' || f.estado === 'PARCIAL').length,
        facturasVencidas: 0,
        facturasDelMes: facturas.filter(f => new Date(f.fechaCreacion) >= inicioMes).length,
        promedioCobranza: 30, // Calcular basado en datos reales
        vencimiento0a30: 0,
        vencimiento31a60: 0,
        vencimiento61a90: 0,
        vencimientoMas90: 0,
        clientesConDeuda: 0,
        clientesMayorDeuda: []
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

      // Clientes con mayor deuda
      const deudaPorCliente = new Map<string, number>();
      facturas.forEach(factura => {
        if (factura.saldoPendiente > 0) {
          const deudaActual = deudaPorCliente.get(factura.clienteId) || 0;
          deudaPorCliente.set(factura.clienteId, deudaActual + factura.saldoPendiente);
        }
      });

      resumen.clientesConDeuda = deudaPorCliente.size;
      
      const clientesConDeuda = Array.from(deudaPorCliente.entries())
        .map(([clienteId, deuda]) => ({
          cliente: clientes.find(c => c.id === clienteId)!,
          deuda
        }))
        .filter(item => item.cliente)
        .sort((a, b) => b.deuda - a.deuda)
        .slice(0, 5);

      resumen.clientesMayorDeuda = clientesConDeuda.map(item => item.cliente);
      
      console.log('✅ Resumen generado correctamente');
      return resumen;
    } catch (error) {
      console.error('❌ Error obteniendo resumen:', error);
      return this.getMockResumen();
    }
  },

  // Datos mock para desarrollo
  getMockFacturas(): FacturaPorCobrar[] {
    const mockClientes = this.getMockClientes();
    
    return [
      {
        id: '1',
        numero: 'F001-00001',
        tipoDocumento: 'FACTURA',
        clienteId: '1',
        cliente: mockClientes[0],
        fechaEmision: '2024-01-15',
        fechaVencimiento: '2024-02-14',
        descripcion: 'Servicios de consultoría',
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
            descripcion: 'Consultoría empresarial',
            cantidad: 1,
            precioUnitario: 1000,
            total: 1000
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
        clienteId: '2',
        cliente: mockClientes[1],
        fechaEmision: '2024-01-20',
        fechaVencimiento: '2024-02-19',
        descripcion: 'Desarrollo de software',
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
            descripcion: 'Desarrollo web',
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
        clienteId: '1',
        cliente: mockClientes[0],
        fechaEmision: '2024-02-05',
        fechaVencimiento: '2024-03-06',
        descripcion: 'Mantenimiento de sistemas',
        montoSubtotal: 800,
        montoImpuestos: 144,
        montoTotal: 944,
        montoPagado: 944,
        saldoPendiente: 0,
        estado: 'PAGADA',
        moneda: 'PEN',
        items: [
          {
            id: '1',
            descripcion: 'Mantenimiento mensual',
            cantidad: 1,
            precioUnitario: 800,
            total: 800
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
        clienteId: '3',
        cliente: {
          id: '3',
          nombre: 'Distribuidora Nacional EIRL',
          tipoDocumento: 'RUC',
          numeroDocumento: '20567890123',
          activo: true,
          fechaCreacion: new Date('2024-01-10'),
          empresaId: 'dev-empresa-pe'
        },
        fechaEmision: '2024-02-15',
        fechaVencimiento: '2024-03-16',
        descripcion: 'Servicios de marketing digital',
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
            descripcion: 'Campaña en redes sociales',
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
        clienteId: '2',
        cliente: mockClientes[1],
        fechaEmision: '2024-03-01',
        fechaVencimiento: '2024-03-31',
        descripcion: 'Implementación de sistema ERP',
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
            descripcion: 'Licencia ERP',
            cantidad: 1,
            precioUnitario: 3000,
            total: 3000
          },
          {
            id: '2',
            descripcion: 'Implementación y configuración',
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

  getMockClientes(): Cliente[] {
    return [
      {
        id: '1',
        nombre: 'Empresa ABC SAC',
        razonSocial: 'Empresa ABC Sociedad Anónima Cerrada',
        tipoDocumento: 'RUC',
        numeroDocumento: '20123456789',
        email: 'contacto@empresaabc.com',
        telefono: '+51 1 234-5678',
        direccion: 'Av. Principal 123, Lima',
        contacto: 'Juan Pérez',
        activo: true,
        fechaCreacion: new Date('2024-01-01'),
        empresaId: 'dev-empresa-pe',
        limiteCredito: 10000,
        diasCredito: 30
      },
      {
        id: '2',
        nombre: 'Comercial XYZ EIRL',
        razonSocial: 'Comercial XYZ Empresa Individual de Responsabilidad Limitada',
        tipoDocumento: 'RUC',
        numeroDocumento: '20987654321',
        email: 'ventas@comercialxyz.com',
        telefono: '+51 1 987-6543',
        direccion: 'Jr. Comercio 456, Lima',
        contacto: 'María García',
        activo: true,
        fechaCreacion: new Date('2024-01-05'),
        empresaId: 'dev-empresa-pe',
        limiteCredito: 15000,
        diasCredito: 45
      },
      {
        id: '3',
        nombre: 'Distribuidora Nacional EIRL',
        tipoDocumento: 'RUC',
        numeroDocumento: '20567890123',
        email: 'info@distribuidoranacional.com',
        telefono: '+51 1 345-6789',
        direccion: 'Av. Industrial 789, Callao',
        contacto: 'Carlos Rodríguez',
        activo: true,
        fechaCreacion: new Date('2024-01-10'),
        empresaId: 'dev-empresa-pe',
        limiteCredito: 20000,
        diasCredito: 60
      },
      {
        id: '4',
        nombre: 'Consultores Asociados SAC',
        tipoDocumento: 'RUC',
        numeroDocumento: '20345678901',
        email: 'contacto@consultoresasociados.com',
        telefono: '+51 1 456-7890',
        direccion: 'Av. Arequipa 567, Miraflores',
        contacto: 'Ana López',
        activo: true,
        fechaCreacion: new Date('2024-01-15'),
        empresaId: 'dev-empresa-pe',
        limiteCredito: 8000,
        diasCredito: 30
      },
      {
        id: '5',
        nombre: 'Importadora Global SAC',
        tipoDocumento: 'RUC',
        numeroDocumento: '20678901234',
        email: 'ventas@importadoraglobal.com',
        telefono: '+51 1 567-8901',
        direccion: 'Av. Argentina 890, Callao',
        contacto: 'Pedro Martínez',
        activo: true,
        fechaCreacion: new Date('2024-01-20'),
        empresaId: 'dev-empresa-pe',
        limiteCredito: 25000,
        diasCredito: 45
      }
    ];
  },

  getMockResumen(): ResumenCuentasPorCobrar {
    return {
      totalFacturas: 5,
      totalPorCobrar: 8800,
      totalVencido: 1180,
      totalPorVencer: 7620,
      facturasPendientes: 3,
      facturasVencidas: 1,
      facturasDelMes: 2,
      promedioCobranza: 35,
      vencimiento0a30: 1180,
      vencimiento31a60: 0,
      vencimiento61a90: 0,
      vencimientoMas90: 0,
      clientesConDeuda: 3,
      clientesMayorDeuda: this.getMockClientes().slice(0, 3)
    };
  }
};