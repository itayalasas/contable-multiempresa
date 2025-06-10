import { 
  collection, 
  addDoc,
  getDocs,
  Timestamp,
  runTransaction,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FirebaseAuthService } from '../../config/firebaseAuth';
import { AsientoContable, MovimientoContable } from '../../types';
import { PagoFactura } from '../../types/cuentasPorCobrar';
import { PagoProveedor } from '../../types/cuentasPorPagar';
import { FacturaPorCobrar } from '../../types/cuentasPorCobrar';
import { FacturaPorPagar } from '../../types/cuentasPorPagar';

/**
 * Servicio para la generación automática de asientos contables
 * basados en operaciones de cuentas por cobrar y cuentas por pagar
 */
export class AsientosAutomaticosService {
  
  /**
   * Genera un asiento contable automático al registrar un pago de cliente
   * @param empresaId ID de la empresa
   * @param factura Factura por cobrar
   * @param pago Datos del pago registrado
   * @returns ID del asiento contable generado
   */
  static async generarAsientoPagoCobrar(
    empresaId: string,
    factura: FacturaPorCobrar,
    pago: PagoFactura
  ): Promise<string> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('🔄 Generando asiento contable automático para pago de cliente:', pago.monto);
      
      // Determinar cuentas contables según el tipo de pago
      const cuentaDebitoId = this.obtenerCuentaDebitoPorTipoPago(pago.tipoPago);
      
      // Cuenta de crédito (Cuentas por Cobrar)
      const cuentaCreditoId = '1212'; // Cuentas por cobrar - Emitidas en cartera
      
      // Crear movimientos del asiento
      const movimientos: MovimientoContable[] = [
        {
          id: '1',
          cuentaId: cuentaDebitoId,
          cuenta: this.obtenerNombreCuenta(cuentaDebitoId),
          debito: pago.monto,
          credito: 0,
          descripcion: `Cobro factura ${factura.numero}`
        },
        {
          id: '2',
          cuentaId: cuentaCreditoId,
          cuenta: this.obtenerNombreCuenta(cuentaCreditoId),
          debito: 0,
          credito: pago.monto,
          descripcion: `Cobro factura ${factura.numero}`
        }
      ];
      
      // Crear asiento contable
      const asientoData: Omit<AsientoContable, 'id'> = {
        numero: await this.generarNumeroAsiento(empresaId),
        fecha: pago.fechaPago,
        descripcion: `Cobro factura ${factura.numero} - ${factura.cliente.nombre}`,
        referencia: pago.referencia || factura.numero,
        estado: 'confirmado',
        movimientos,
        empresaId,
        paisId: 'peru', // Obtener de la empresa
        creadoPor: pago.creadoPor,
        fechaCreacion: new Date().toISOString()
      };
      
      // Guardar asiento en Firestore
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const docRef = await addDoc(asientosRef, asientoData);
      
      // Crear movimiento de tesorería automáticamente
      await this.crearMovimientoTesoreria(
        empresaId,
        'INGRESO',
        pago.monto,
        `Cobro factura ${factura.numero} - ${factura.cliente.nombre}`,
        pago.fechaPago,
        pago.referencia,
        pago.creadoPor
      );
      
      console.log('✅ Asiento contable generado automáticamente con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error generando asiento automático para pago de cliente:', error);
      throw error;
    }
  }
  
  /**
   * Genera un asiento contable automático al registrar un pago a proveedor
   * @param empresaId ID de la empresa
   * @param factura Factura por pagar
   * @param pago Datos del pago registrado
   * @returns ID del asiento contable generado
   */
  static async generarAsientoPagoPagar(
    empresaId: string,
    factura: FacturaPorPagar,
    pago: PagoProveedor
  ): Promise<string> {
    try {
      // Asegurar autenticación
      const isAuth = await FirebaseAuthService.ensureAuthenticated();
      if (!isAuth) {
        throw new Error('No se pudo autenticar con Firebase');
      }

      console.log('🔄 Generando asiento contable automático para pago a proveedor:', pago.monto);
      
      // Cuenta de débito (Cuentas por Pagar)
      const cuentaDebitoId = '4212'; // Cuentas por pagar - Emitidas
      
      // Determinar cuenta de crédito según el tipo de pago
      const cuentaCreditoId = this.obtenerCuentaCreditoPorTipoPago(pago.tipoPago);
      
      // Crear movimientos del asiento
      const movimientos: MovimientoContable[] = [
        {
          id: '1',
          cuentaId: cuentaDebitoId,
          cuenta: this.obtenerNombreCuenta(cuentaDebitoId),
          debito: pago.monto,
          credito: 0,
          descripcion: `Pago factura ${factura.numero}`
        },
        {
          id: '2',
          cuentaId: cuentaCreditoId,
          cuenta: this.obtenerNombreCuenta(cuentaCreditoId),
          debito: 0,
          credito: pago.monto,
          descripcion: `Pago factura ${factura.numero}`
        }
      ];
      
      // Crear asiento contable
      const asientoData: Omit<AsientoContable, 'id'> = {
        numero: await this.generarNumeroAsiento(empresaId),
        fecha: pago.fechaPago,
        descripcion: `Pago factura ${factura.numero} - ${factura.proveedor.nombre}`,
        referencia: pago.referencia || factura.numero,
        estado: 'confirmado',
        movimientos,
        empresaId,
        paisId: 'peru', // Obtener de la empresa
        creadoPor: pago.creadoPor,
        fechaCreacion: new Date().toISOString()
      };
      
      // Guardar asiento en Firestore
      const asientosRef = collection(db, 'empresas', empresaId, 'asientos');
      const docRef = await addDoc(asientosRef, asientoData);
      
      // Crear movimiento de tesorería automáticamente
      await this.crearMovimientoTesoreria(
        empresaId,
        'EGRESO',
        pago.monto,
        `Pago factura ${factura.numero} - ${factura.proveedor.nombre}`,
        pago.fechaPago,
        pago.referencia,
        pago.creadoPor
      );
      
      console.log('✅ Asiento contable generado automáticamente con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error generando asiento automático para pago a proveedor:', error);
      throw error;
    }
  }
  
  /**
   * Crea un movimiento de tesorería automáticamente
   */
  private static async crearMovimientoTesoreria(
    empresaId: string,
    tipo: 'INGRESO' | 'EGRESO',
    monto: number,
    concepto: string,
    fecha: string,
    referencia?: string,
    creadoPor?: string
  ): Promise<string | null> {
    try {
      // Obtener la primera cuenta bancaria disponible
      const cuentasRef = collection(db, 'empresas', empresaId, 'cuentasBancarias');
      const cuentasQuery = query(cuentasRef, where('activa', '==', true), limit(1));
      const cuentasSnapshot = await getDocs(cuentasQuery);
      
      if (cuentasSnapshot.empty) {
        console.log('⚠️ No hay cuentas bancarias disponibles para crear movimiento de tesorería');
        return null;
      }
      
      const cuentaId = cuentasSnapshot.docs[0].id;
      
      // Crear movimiento
      const movimientosRef = collection(db, 'empresas', empresaId, 'movimientosTesoreria');
      const movimientoData = {
        fecha,
        tipo,
        concepto,
        monto,
        cuentaId,
        referencia,
        estado: 'PENDIENTE',
        empresaId,
        creadoPor: creadoPor || 'sistema',
        fechaCreacion: new Date().toISOString()
      };
      
      const docRef = await addDoc(movimientosRef, movimientoData);
      console.log('✅ Movimiento de tesorería creado automáticamente con ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creando movimiento de tesorería automático:', error);
      return null;
    }
  }
  
  /**
   * Genera un número de asiento automático
   * @param empresaId ID de la empresa
   * @returns Número de asiento en formato ASI-XXX
   */
  private static async generarNumeroAsiento(empresaId: string): Promise<string> {
    try {
      // Obtener el último número de asiento
      const asientosRef = collection(db, `empresas/${empresaId}/asientos`);
      const asientosQuery = query(asientosRef, orderBy('numero', 'desc'), limit(1));
      const asientosSnapshot = await getDocs(asientosQuery);
      
      // Si no hay asientos, empezar desde 1
      if (asientosSnapshot.empty) {
        return 'ASI-001';
      }
      
      // Encontrar el número más alto
      const ultimoAsiento = asientosSnapshot.docs[0].data();
      const match = ultimoAsiento.numero.match(/ASI-(\d+)/);
      
      if (match) {
        const num = parseInt(match[1], 10);
        const nextNumero = num + 1;
        return `ASI-${String(nextNumero).padStart(3, '0')}`;
      } else {
        // Si no sigue el formato esperado, crear uno nuevo
        return `ASI-${Date.now().toString().slice(-6)}`;
      }
    } catch (error) {
      console.error('Error generando número de asiento:', error);
      // En caso de error, generar un número basado en timestamp
      return `ASI-${Date.now().toString().slice(-6)}`;
    }
  }
  
  /**
   * Obtiene la cuenta de débito según el tipo de pago
   * @param tipoPago Tipo de pago (EFECTIVO, TRANSFERENCIA, etc.)
   * @returns ID de la cuenta contable
   */
  private static obtenerCuentaDebitoPorTipoPago(tipoPago: string): string {
    switch (tipoPago) {
      case 'EFECTIVO':
        return '1011'; // Caja MN
      case 'TRANSFERENCIA':
        return '1041'; // Cuentas corrientes operativas
      case 'CHEQUE':
        return '1041'; // Cuentas corrientes operativas
      case 'TARJETA':
        return '1042'; // Cuentas corrientes para fines específicos
      default:
        return '1011'; // Caja MN por defecto
    }
  }
  
  /**
   * Obtiene la cuenta de crédito según el tipo de pago
   * @param tipoPago Tipo de pago (EFECTIVO, TRANSFERENCIA, etc.)
   * @returns ID de la cuenta contable
   */
  private static obtenerCuentaCreditoPorTipoPago(tipoPago: string): string {
    switch (tipoPago) {
      case 'EFECTIVO':
        return '1011'; // Caja MN
      case 'TRANSFERENCIA':
        return '1041'; // Cuentas corrientes operativas
      case 'CHEQUE':
        return '1041'; // Cuentas corrientes operativas
      case 'TARJETA':
        return '1042'; // Cuentas corrientes para fines específicos
      default:
        return '1011'; // Caja MN por defecto
    }
  }
  
  /**
   * Obtiene el nombre de una cuenta a partir de su código
   * @param codigoCuenta Código de la cuenta
   * @returns Nombre de la cuenta
   */
  private static obtenerNombreCuenta(codigoCuenta: string): string {
    const cuentas: Record<string, string> = {
      '1011': '1011 - Caja MN',
      '1012': '1012 - Caja ME',
      '1041': '1041 - Cuentas corrientes operativas',
      '1042': '1042 - Cuentas corrientes para fines específicos',
      '1212': '1212 - Facturas por cobrar - Emitidas en cartera',
      '4212': '4212 - Facturas por pagar - Emitidas'
    };
    
    return cuentas[codigoCuenta] || `${codigoCuenta} - Cuenta contable`;
  }
}