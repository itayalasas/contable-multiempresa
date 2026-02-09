import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  FileText,
  ExternalLink,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { PeriodoContable } from '../../services/supabase/periodosContables';
import { useNavigate } from 'react-router-dom';
import { tesoreriaSupabaseService } from '../../services/supabase/tesoreria';
import { ConfirmModal } from '../common/ConfirmModal';
import { NotificationModal } from '../common/NotificationModal';

interface DetalleErroresCierreProps {
  periodo: PeriodoContable;
  empresaId: string;
  onClose: () => void;
}

interface AsientoDescuadrado {
  id: string;
  numero: string;
  fecha: string;
  descripcion: string;
  totalDebitos: number;
  totalCreditos: number;
  diferencia: number;
}

interface FacturaSinContabilizar {
  id: string;
  numero_factura: string;
  serie: string;
  fecha_emision: string;
  total: number;
  cliente_razon_social?: string;
  proveedor_razon_social?: string;
  asiento_error?: string;
}

interface ComisionPendiente {
  id: string;
  partner_razon_social: string;
  fecha: string;
  comision_monto: number;
  estado_comision: string;
  order_id?: string;
}

interface CuentaBancariaDescuadrada {
  id: string;
  nombre: string;
  saldo_contable: number;
  saldo_fisico: number;
  diferencia: number;
}

interface MovimientoTesoreriaSinAsiento {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo_movimiento: string;
  referencia?: string | null;
  cuenta_nombre?: string | null;
}

interface DetallesErrores {
  asientosDescuadrados: AsientoDescuadrado[];
  asientosBorrador: Array<{ id: string; numero: string; fecha: string; descripcion: string }>;
  facturasVentaSinContabilizar: FacturaSinContabilizar[];
  facturasCompraSinContabilizar: FacturaSinContabilizar[];
  facturasConError: FacturaSinContabilizar[];
  comisionesPendientes: ComisionPendiente[];
  comisionesFacturadasSinCuentaPorPagar: ComisionPendiente[];
  comisionesFacturadasSinCobrar: ComisionPendiente[];
  cuentasBancariasDescuadradas: CuentaBancariaDescuadrada[];
  movimientosTesoreriaSinAsiento: MovimientoTesoreriaSinAsiento[];
}

export function DetalleErroresCierre({ periodo, empresaId, onClose }: DetalleErroresCierreProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState<DetallesErrores | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [cuadrandoCuentas, setCuadrandoCuentas] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  // Estados para modales
  const [showConfirmCuadrar, setShowConfirmCuadrar] = useState(false);
  const [showConfirmSincronizar, setShowConfirmSincronizar] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    cargarDetalles();
  }, []);

  const cargarDetalles = async () => {
    setLoading(true);
    try {
      // 1. Asientos descuadrados
      const { data: asientosDesc } = await supabase
        .from('asientos_contables')
        .select(`
          id,
          numero,
          fecha,
          descripcion,
          movimientos_contables(debito, credito)
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha', periodo.fecha_inicio)
        .lte('fecha', periodo.fecha_fin)
        .eq('estado', 'descuadrado');

      const asientosDescuadrados: AsientoDescuadrado[] = asientosDesc?.map((asiento: any) => {
        const totalDebitos = asiento.movimientos_contables?.reduce((sum: number, m: any) => sum + (parseFloat(m.debito) || 0), 0) || 0;
        const totalCreditos = asiento.movimientos_contables?.reduce((sum: number, m: any) => sum + (parseFloat(m.credito) || 0), 0) || 0;
        const diferencia = Math.abs(totalDebitos - totalCreditos);

        return {
          id: asiento.id,
          numero: asiento.numero,
          fecha: asiento.fecha,
          descripcion: asiento.descripcion || '',
          totalDebitos,
          totalCreditos,
          diferencia
        };
      }) || [];

      const asientosBorrador: Array<{ id: string; numero: string; fecha: string; descripcion: string }> = [];

      // Asientos en borrador
      const { data: borradores } = await supabase
        .from('asientos_contables')
        .select('id, numero, fecha, descripcion')
        .eq('empresa_id', empresaId)
        .gte('fecha', periodo.fecha_inicio)
        .lte('fecha', periodo.fecha_fin)
        .eq('estado', 'borrador');

      if (borradores) {
        borradores.forEach((b: any) => {
          asientosBorrador.push({
            id: b.id,
            numero: b.numero,
            fecha: b.fecha,
            descripcion: b.descripcion || ''
          });
        });
      }

      // 2. Facturas de venta sin contabilizar
      const { data: facturasVentaSinAsiento } = await supabase
        .from('facturas_venta')
        .select(`
          id,
          numero_factura,
          serie,
          fecha_emision,
          total,
          asiento_error,
          clientes(razon_social)
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .neq('estado', 'anulada')
        .or('asiento_generado.is.null,asiento_generado.eq.false');

      const facturasVentaSinContabilizar: FacturaSinContabilizar[] = facturasVentaSinAsiento?.map((f: any) => ({
        id: f.id,
        numero_factura: f.numero_factura,
        serie: f.serie,
        fecha_emision: f.fecha_emision,
        total: parseFloat(f.total || '0'),
        cliente_razon_social: f.clientes?.razon_social,
        asiento_error: f.asiento_error
      })) || [];

      // 3. Facturas de compra sin contabilizar
      const { data: facturasCompraSinAsiento } = await supabase
        .from('facturas_compra')
        .select(`
          id,
          numero_factura,
          serie,
          fecha_emision,
          total,
          asiento_error,
          proveedores(razon_social)
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .neq('estado', 'anulada')
        .or('asiento_generado.is.null,asiento_generado.eq.false');

      const facturasCompraSinContabilizar: FacturaSinContabilizar[] = facturasCompraSinAsiento?.map((f: any) => ({
        id: f.id,
        numero_factura: f.numero_factura,
        serie: f.serie || '',
        fecha_emision: f.fecha_emision,
        total: parseFloat(f.total || '0'),
        proveedor_razon_social: f.proveedores?.razon_social,
        asiento_error: f.asiento_error
      })) || [];

      // 4. Facturas con errores
      const { data: facturasConErrorData } = await supabase
        .from('facturas_venta')
        .select(`
          id,
          numero_factura,
          serie,
          fecha_emision,
          total,
          asiento_error,
          clientes(razon_social)
        `)
        .eq('empresa_id', empresaId)
        .gte('fecha_emision', periodo.fecha_inicio)
        .lte('fecha_emision', periodo.fecha_fin)
        .not('asiento_error', 'is', null);

      const facturasConError: FacturaSinContabilizar[] = facturasConErrorData?.map((f: any) => ({
        id: f.id,
        numero_factura: f.numero_factura,
        serie: f.serie,
        fecha_emision: f.fecha_emision,
        total: parseFloat(f.total || '0'),
        cliente_razon_social: f.clientes?.razon_social,
        asiento_error: f.asiento_error
      })) || [];

      // 5. Comisiones pendientes
      let comisionesPendientes: ComisionPendiente[] = [];
      let comisionesFacturadasSinCuentaPorPagar: ComisionPendiente[] = [];
      let comisionesFacturadasSinCobrar: ComisionPendiente[] = [];

      try {
        const { data: comisionesPend } = await supabase
          .from('comisiones_partners')
          .select(`
            id,
            fecha,
            comision_monto,
            estado_comision,
            order_id,
            partners_aliados(razon_social)
          `)
          .eq('empresa_id', empresaId)
          .gte('fecha', periodo.fecha_inicio)
          .lte('fecha', periodo.fecha_fin)
          .eq('estado_comision', 'pendiente');

        comisionesPendientes = comisionesPend?.map((c: any) => ({
          id: c.id,
          partner_razon_social: c.partners_aliados?.razon_social || 'N/A',
          fecha: c.fecha,
          comision_monto: parseFloat(c.comision_monto || '0'),
          estado_comision: c.estado_comision,
          order_id: c.order_id
        })) || [];

        const { data: comisionesFacturadas } = await supabase
          .from('comisiones_partners')
          .select(`
            id,
            fecha,
            comision_monto,
            estado_comision,
            order_id,
            partners_aliados(razon_social)
          `)
          .eq('empresa_id', empresaId)
          .gte('fecha', periodo.fecha_inicio)
          .lte('fecha', periodo.fecha_fin)
          .eq('estado_comision', 'facturada')
          .is('factura_compra_id', null);

        comisionesFacturadasSinCuentaPorPagar = comisionesFacturadas?.map((c: any) => ({
          id: c.id,
          partner_razon_social: c.partners_aliados?.razon_social || 'N/A',
          fecha: c.fecha,
          comision_monto: parseFloat(c.comision_monto || '0'),
          estado_comision: c.estado_comision,
          order_id: c.order_id
        })) || [];

        // Comisiones facturadas pero sin cobrar del cliente
        // Solo considerar comisiones que tienen factura de venta de comisión generada
        const { data: comisionesSinCobrar } = await supabase
          .from('comisiones_partners')
          .select(`
            id,
            fecha,
            comision_monto,
            estado_comision,
            order_id,
            factura_venta_id,
            factura_venta_comision_id,
            partners_aliados(razon_social)
          `)
          .eq('empresa_id', empresaId)
          .gte('fecha', periodo.fecha_inicio)
          .lte('fecha', periodo.fecha_fin)
          .eq('estado_comision', 'facturada')
          .eq('estado_pago', 'pendiente')
          .not('factura_venta_comision_id', 'is', null);

        comisionesFacturadasSinCobrar = comisionesSinCobrar?.map((c: any) => ({
          id: c.id,
          partner_razon_social: c.partners_aliados?.razon_social || 'N/A',
          fecha: c.fecha,
          comision_monto: parseFloat(c.comision_monto || '0'),
          estado_comision: c.estado_comision,
          order_id: c.order_id
        })) || [];
      } catch (error) {
        console.warn('Error cargando comisiones:', error);
      }

      // 6. Cuentas bancarias descuadradas
      let cuentasBancariasDescuadradas: CuentaBancariaDescuadrada[] = [];
      try {
        const { data: validacionTesoreria } = await supabase
          .rpc('validar_tesoreria_periodo', {
            p_empresa_id: empresaId,
            p_fecha_inicio: periodo.fecha_inicio,
            p_fecha_fin: periodo.fecha_fin
          });

        if (validacionTesoreria && validacionTesoreria.length > 0) {
          const resultado = validacionTesoreria[0];
          const detallesCuentas = resultado.detalles?.cuentas_problema || [];

          cuentasBancariasDescuadradas = detallesCuentas.map((c: any) => ({
            id: c.cuenta_id,
            nombre: c.nombre,
            saldo_contable: parseFloat(c.saldo_contable || '0'),
            saldo_fisico: parseFloat(c.saldo_fisico || '0'),
            diferencia: parseFloat(c.diferencia || '0')
          }));
        }
      } catch (error) {
        console.warn('Error validando tesorería:', error);
      }

      // 7. Movimientos de tesorería sin asiento contable
      let movimientosTesoreriaSinAsiento: MovimientoTesoreriaSinAsiento[] = [];
      try {
        const { data: movimientosSinAsiento } = await supabase
          .from('movimientos_tesoreria')
          .select(`
            id,
            fecha,
            descripcion,
            monto,
            tipo_movimiento,
            referencia,
            cuenta_bancaria_id,
            cuentas_bancarias(nombre)
          `)
          .eq('empresa_id', empresaId)
          .eq('eliminado', false)
          .gte('fecha', periodo.fecha_inicio)
          .lte('fecha', periodo.fecha_fin)
          .is('asiento_contable_id', null)
          .order('fecha', { ascending: false });

        movimientosTesoreriaSinAsiento = movimientosSinAsiento?.map((m: any) => ({
          id: m.id,
          fecha: m.fecha,
          descripcion: m.descripcion || 'Sin descripción',
          monto: parseFloat(m.monto || '0'),
          tipo_movimiento: m.tipo_movimiento || 'N/A',
          referencia: m.referencia,
          cuenta_nombre: m.cuentas_bancarias?.nombre || 'Cuenta no encontrada'
        })) || [];
      } catch (error) {
        console.warn('Error cargando movimientos de tesorería sin asiento:', error);
      }

      const detallesData = {
        asientosDescuadrados,
        asientosBorrador,
        facturasVentaSinContabilizar,
        facturasCompraSinContabilizar,
        facturasConError,
        comisionesPendientes,
        comisionesFacturadasSinCuentaPorPagar,
        comisionesFacturadasSinCobrar,
        cuentasBancariasDescuadradas,
        movimientosTesoreriaSinAsiento
      };

      setDetalles(detallesData);

      // Auto-expandir secciones con errores
      const seccionesConErrores = new Set<string>();
      if (asientosDescuadrados.length > 0) seccionesConErrores.add('asientos-descuadrados');
      if (asientosBorrador.length > 0) seccionesConErrores.add('asientos-borrador');
      if (facturasVentaSinContabilizar.length > 0) seccionesConErrores.add('facturas-venta');
      if (facturasCompraSinContabilizar.length > 0) seccionesConErrores.add('facturas-compra');
      if (facturasConError.length > 0) seccionesConErrores.add('facturas-con-error');
      if (comisionesPendientes.length > 0) seccionesConErrores.add('comisiones-pendientes');
      if (comisionesFacturadasSinCuentaPorPagar.length > 0) seccionesConErrores.add('comisiones-facturadas');
      if (comisionesFacturadasSinCobrar.length > 0) seccionesConErrores.add('comisiones-sin-cobrar');
      if (cuentasBancariasDescuadradas.length > 0) seccionesConErrores.add('cuentas-descuadradas');
      if (movimientosTesoreriaSinAsiento.length > 0) seccionesConErrores.add('tesoreria-sin-asiento');
      setExpandedSections(seccionesConErrores);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const navegarA = (ruta: string) => {
    navigate(ruta);
    onClose();
  };

  const mostrarNotificacion = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Notificaciones deshabilitadas - solo consola
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(icon, title, message);
  };

  const confirmarCuadrarCuentas = () => {
    setShowConfirmCuadrar(true);
  };

  const ejecutarCuadreCuentas = async () => {
    setShowConfirmCuadrar(false);
    setCuadrandoCuentas(true);

    try {
      const resultado = await tesoreriaSupabaseService.cuadrarCuentasSinMovimientos(empresaId);

      if (resultado.cuentasCorregidas > 0) {
        mostrarNotificacion(
          'Cuentas Cuadradas',
          `Se cuadraron ${resultado.cuentasCorregidas} cuenta(s) bancaria(s) exitosamente. Las cuentas sin movimientos ahora tienen saldo $0.00.`,
          'success'
        );
        await cargarDetalles();
      } else {
        mostrarNotificacion(
          'Sin Cambios',
          'No se encontraron cuentas bancarias sin movimientos que requieran ajuste.',
          'info'
        );
      }
    } catch (error) {
      console.error('Error cuadrando cuentas:', error);
      mostrarNotificacion(
        'Error al Cuadrar Cuentas',
        'Ocurrió un error al intentar cuadrar las cuentas bancarias. Por favor, intente nuevamente.',
        'error'
      );
    } finally {
      setCuadrandoCuentas(false);
    }
  };

  const confirmarSincronizarCompleto = () => {
    setShowConfirmSincronizar(true);
  };

  const ejecutarSincronizacionCompleta = async () => {
    setShowConfirmSincronizar(false);
    setSincronizando(true);

    try {
      const resultado = await tesoreriaSupabaseService.sincronizarTesoreriaCompleta(empresaId);

      if (resultado.movimientosCreados > 0 || resultado.cuentasActualizadas > 0) {
        mostrarNotificacion(
          'Sincronización Completada',
          `Se crearon ${resultado.movimientosCreados} movimiento(s) de tesorería y se actualizaron ${resultado.cuentasActualizadas} cuenta(s) bancaria(s). El sistema está ahora sincronizado.`,
          'success'
        );
        await cargarDetalles();
      } else {
        mostrarNotificacion(
          'Sistema Sincronizado',
          'El sistema ya está sincronizado. No se requieren cambios.',
          'info'
        );
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      mostrarNotificacion(
        'Error en Sincronización',
        'Ocurrió un error al sincronizar el sistema. Por favor, contacte al administrador.',
        'error'
      );
    } finally {
      setSincronizando(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 mt-4">Cargando detalles de errores...</p>
        </div>
      </div>
    );
  }

  if (!detalles) return null;

  const totalErrores =
    detalles.asientosDescuadrados.length +
    detalles.asientosBorrador.length +
    detalles.facturasVentaSinContabilizar.length +
    detalles.facturasCompraSinContabilizar.length +
    detalles.facturasConError.length +
    detalles.comisionesPendientes.length +
    detalles.comisionesFacturadasSinCuentaPorPagar.length +
    detalles.comisionesFacturadasSinCobrar.length +
    detalles.cuentasBancariasDescuadradas.length +
    detalles.movimientosTesoreriaSinAsiento.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detalle de Errores - {periodo.nombre}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Se encontraron {totalErrores} problema(s) que impiden el cierre
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Asientos Descuadrados */}
          {detalles.asientosDescuadrados.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('asientos-descuadrados')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Asientos Descuadrados ({detalles.asientosDescuadrados.length})
                  </span>
                </div>
                {expandedSections.has('asientos-descuadrados') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('asientos-descuadrados') && (
                <div className="p-4 space-y-2">
                  {detalles.asientosDescuadrados.map((asiento) => (
                    <div key={asiento.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{asiento.numero}</div>
                        <div className="text-sm text-gray-600">{asiento.descripcion}</div>
                        <div className="text-xs text-red-600 mt-1">
                          Débitos: ${asiento.totalDebitos.toFixed(2)} | Créditos: ${asiento.totalCreditos.toFixed(2)} | Diferencia: ${asiento.diferencia.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => navegarA(`/contabilidad/asientos?asiento=${asiento.id}`)}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        Ver Asiento
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Asientos en Borrador */}
          {detalles.asientosBorrador.length > 0 && (
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('asientos-borrador')}
                className="w-full p-4 bg-orange-50 flex items-center justify-between hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">
                    Asientos en Borrador ({detalles.asientosBorrador.length})
                  </span>
                </div>
                {expandedSections.has('asientos-borrador') ? (
                  <ChevronDown className="h-5 w-5 text-orange-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-orange-600" />
                )}
              </button>
              {expandedSections.has('asientos-borrador') && (
                <div className="p-4 space-y-2">
                  {detalles.asientosBorrador.map((asiento) => (
                    <div key={asiento.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{asiento.numero}</div>
                        <div className="text-sm text-gray-600">{asiento.descripcion}</div>
                        <div className="text-xs text-orange-600 mt-1">Debe ser confirmado antes del cierre</div>
                      </div>
                      <button
                        onClick={() => navegarA(`/contabilidad/asientos?asiento=${asiento.id}`)}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        Confirmar
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Facturas de Venta Sin Contabilizar */}
          {detalles.facturasVentaSinContabilizar.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('facturas-venta')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Facturas de Venta Sin Contabilizar ({detalles.facturasVentaSinContabilizar.length})
                  </span>
                </div>
                {expandedSections.has('facturas-venta') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('facturas-venta') && (
                <div className="p-4 space-y-2">
                  {detalles.facturasVentaSinContabilizar.map((factura) => (
                    <div key={factura.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{factura.serie}-{factura.numero_factura}</div>
                        <div className="text-sm text-gray-600">{factura.cliente_razon_social}</div>
                        <div className="text-sm text-gray-900 mt-1">Total: ${factura.total.toFixed(2)}</div>
                        {factura.asiento_error && (
                          <div className="text-xs text-red-600 mt-1">Error: {factura.asiento_error}</div>
                        )}
                      </div>
                      <button
                        onClick={() => navegarA(`/ventas/facturas?factura=${factura.id}`)}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Ver Factura
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Facturas de Compra Sin Contabilizar */}
          {detalles.facturasCompraSinContabilizar.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('facturas-compra')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Facturas de Compra Sin Contabilizar ({detalles.facturasCompraSinContabilizar.length})
                  </span>
                </div>
                {expandedSections.has('facturas-compra') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('facturas-compra') && (
                <div className="p-4 space-y-2">
                  {detalles.facturasCompraSinContabilizar.map((factura) => (
                    <div key={factura.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{factura.serie}-{factura.numero_factura}</div>
                        <div className="text-sm text-gray-600">{factura.proveedor_razon_social}</div>
                        <div className="text-sm text-gray-900 mt-1">Total: ${factura.total.toFixed(2)}</div>
                        {factura.asiento_error && (
                          <div className="text-xs text-red-600 mt-1">Error: {factura.asiento_error}</div>
                        )}
                      </div>
                      <button
                        onClick={() => navegarA('/finanzas/cuentas-por-pagar')}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Ver Factura
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Facturas con Errores */}
          {detalles.facturasConError.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('facturas-con-error')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Facturas con Errores de Contabilización ({detalles.facturasConError.length})
                  </span>
                </div>
                {expandedSections.has('facturas-con-error') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('facturas-con-error') && (
                <div className="p-4 space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-800">
                      <strong>Acción requerida:</strong> Estas facturas tienen errores al generar el asiento contable. Revísalas y corrígelas.
                    </p>
                  </div>
                  {detalles.facturasConError.map((factura) => (
                    <div key={factura.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{factura.serie}-{factura.numero_factura}</div>
                        <div className="text-sm text-gray-600">{factura.cliente_razon_social}</div>
                        <div className="text-sm text-gray-900 mt-1">Total: ${factura.total.toFixed(2)}</div>
                        <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                          <strong>Error:</strong> {factura.asiento_error}
                        </div>
                      </div>
                      <button
                        onClick={() => navegarA(`/ventas/facturas?factura=${factura.id}`)}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Ver Factura
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comisiones Pendientes de Facturar */}
          {detalles.comisionesPendientes.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('comisiones-pendientes')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Comisiones Pendientes de Facturar ({detalles.comisionesPendientes.length})
                  </span>
                </div>
                {expandedSections.has('comisiones-pendientes') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('comisiones-pendientes') && (
                <div className="p-4 space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-800">
                      <strong>Acción requerida:</strong> Debes facturar estas comisiones antes de cerrar el periodo. Ve a Compras → Comisiones Partners.
                    </p>
                  </div>
                  {detalles.comisionesPendientes.map((comision) => (
                    <div key={comision.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{comision.partner_razon_social}</div>
                        <div className="text-sm text-gray-600">Orden: {comision.order_id || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Fecha: {new Date(comision.fecha).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-900 mt-1">Comisión: ${comision.comision_monto.toFixed(2)}</div>
                        <div className="text-xs text-red-600 mt-1">Estado: {comision.estado_comision}</div>
                      </div>
                      <button
                        onClick={() => navegarA('/compras/comisiones')}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Facturar
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comisiones Facturadas sin Cuenta por Pagar */}
          {detalles.comisionesFacturadasSinCuentaPorPagar.length > 0 && (
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('comisiones-facturadas')}
                className="w-full p-4 bg-orange-50 flex items-center justify-between hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">
                    Comisiones Facturadas Sin Cuenta por Pagar ({detalles.comisionesFacturadasSinCuentaPorPagar.length})
                  </span>
                </div>
                {expandedSections.has('comisiones-facturadas') ? (
                  <ChevronDown className="h-5 w-5 text-orange-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-orange-600" />
                )}
              </button>
              {expandedSections.has('comisiones-facturadas') && (
                <div className="p-4 space-y-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-orange-800">
                      <strong>Acción requerida:</strong> Ve a Compras → Comisiones Partners y genera las cuentas por pagar para estas comisiones.
                    </p>
                  </div>
                  {detalles.comisionesFacturadasSinCuentaPorPagar.map((comision) => (
                    <div key={comision.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{comision.partner_razon_social}</div>
                        <div className="text-sm text-gray-600">Orden: {comision.order_id || 'N/A'}</div>
                        <div className="text-sm text-gray-900 mt-1">Comisión: ${comision.comision_monto.toFixed(2)}</div>
                      </div>
                      <button
                        onClick={() => navegarA('/compras/comisiones')}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                      >
                        Ver Comisiones
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comisiones Facturadas Sin Cobrar del Cliente */}
          {detalles.comisionesFacturadasSinCobrar.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('comisiones-sin-cobrar')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Comisiones Facturadas Sin Cobrar del Cliente ({detalles.comisionesFacturadasSinCobrar.length})
                  </span>
                </div>
                {expandedSections.has('comisiones-sin-cobrar') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('comisiones-sin-cobrar') && (
                <div className="p-4 space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-800">
                      <strong>Acción requerida:</strong> Estas comisiones están facturadas pero no has cobrado el dinero del cliente. Ve a Ventas → Facturas y marca las facturas como cobradas (pagadas) o regístralas en Finanzas → Cuentas por Cobrar.
                    </p>
                  </div>
                  {detalles.comisionesFacturadasSinCobrar.map((comision) => (
                    <div key={comision.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{comision.partner_razon_social}</div>
                        <div className="text-sm text-gray-600">Orden: {comision.order_id || 'N/A'}</div>
                        <div className="text-sm text-gray-600">Fecha: {new Date(comision.fecha).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-900 mt-1">Comisión: ${comision.comision_monto.toFixed(2)}</div>
                        <div className="text-xs text-red-600 mt-1">Estado: Facturada pero no cobrada</div>
                      </div>
                      <button
                        onClick={() => navegarA('/ventas/facturas')}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Ver Facturas
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cuentas Bancarias Descuadradas */}
          {detalles.cuentasBancariasDescuadradas.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('cuentas-descuadradas')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Cuentas Bancarias Descuadradas ({detalles.cuentasBancariasDescuadradas.length})
                  </span>
                </div>
                {expandedSections.has('cuentas-descuadradas') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('cuentas-descuadradas') && (
                <div className="p-4 space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-red-800">
                          <strong>Acción requerida:</strong> El saldo contable de las cuentas bancarias no coincide con el saldo real.
                          Esto puede deberse a movimientos de tesorería que no se han reflejado correctamente.
                        </p>
                        <p className="text-xs text-red-700 mt-2">
                          <strong>Opciones:</strong>
                        </p>
                        <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                          <li><strong>Sincronizar Sistema:</strong> Crea movimientos de tesorería basados en asientos contables existentes</li>
                          <li><strong>Cuadrar Simple:</strong> Ajusta solo cuentas sin movimientos a $0.00</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={confirmarSincronizarCompleto}
                          disabled={sincronizando || cuadrandoCuentas}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Sincronizar todo el sistema creando movimientos de tesorería desde asientos contables"
                        >
                          {sincronizando ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Sincronizar Sistema
                            </>
                          )}
                        </button>
                        <button
                          onClick={confirmarCuadrarCuentas}
                          disabled={cuadrandoCuentas || sincronizando}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cuadrar automáticamente cuentas sin movimientos estableciendo saldo en $0.00"
                        >
                          {cuadrandoCuentas ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cuadrando...
                            </>
                          ) : (
                            <>
                              <Wrench className="h-4 w-4" />
                              Cuadrar Simple
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {detalles.cuentasBancariasDescuadradas.map((cuenta) => (
                    <div key={cuenta.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{cuenta.nombre}</div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Saldo Real:</span>
                            <div className="font-medium text-gray-900">${cuenta.saldo_fisico.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Saldo Contable:</span>
                            <div className="font-medium text-gray-900">${cuenta.saldo_contable.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-red-600">Diferencia:</span>
                            <div className="font-semibold text-red-700">${cuenta.diferencia.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navegarA('/finanzas/tesoreria')}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Ver Tesorería
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Movimientos de Tesorería Sin Asiento */}
          {detalles.movimientosTesoreriaSinAsiento.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('tesoreria-sin-asiento')}
                className="w-full p-4 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Movimientos de Tesorería Sin Asiento ({detalles.movimientosTesoreriaSinAsiento.length})
                  </span>
                </div>
                {expandedSections.has('tesoreria-sin-asiento') ? (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-red-600" />
                )}
              </button>
              {expandedSections.has('tesoreria-sin-asiento') && (
                <div className="p-4 space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-800">
                      <strong>Acción requerida:</strong> Estos movimientos no tienen asiento contable. Revísalos en Tesorería y genera/ajusta su asiento.
                    </p>
                  </div>
                  {detalles.movimientosTesoreriaSinAsiento.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{mov.descripcion}</div>
                        <div className="text-sm text-gray-600">Cuenta: {mov.cuenta_nombre}</div>
                        <div className="text-sm text-gray-600">Fecha: {new Date(mov.fecha).toLocaleDateString()}</div>
                        {mov.referencia && (
                          <div className="text-xs text-gray-500 mt-1">Ref: {mov.referencia}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${mov.tipo_movimiento === 'INGRESO' ? 'text-green-600' : mov.tipo_movimiento === 'EGRESO' ? 'text-red-600' : 'text-blue-600'}`}>
                          ${mov.monto.toFixed(2)}
                        </span>
                        <button
                          onClick={() => navegarA('/finanzas/tesoreria')}
                          className="ml-2 flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          Ver Tesorería
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {totalErrores === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay errores</h3>
              <p className="text-gray-600">El período está listo para ser cerrado</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="text-sm text-gray-600">
            {totalErrores > 0 ? (
              <>Corrige los errores para poder cerrar el período</>
            ) : (
              <>Todos los requisitos están cumplidos</>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación - Cuadrar */}
      <ConfirmModal
        isOpen={showConfirmCuadrar}
        onClose={() => setShowConfirmCuadrar(false)}
        onConfirm={ejecutarCuadreCuentas}
        title="Cuadrar Cuentas Bancarias"
        message="¿Desea cuadrar automáticamente las cuentas bancarias sin movimientos estableciendo su saldo en $0.00?"
        type="warning"
        confirmText="Sí, Cuadrar"
        cancelText="Cancelar"
      />

      {/* Modal de confirmación - Sincronizar */}
      <ConfirmModal
        isOpen={showConfirmSincronizar}
        onClose={() => setShowConfirmSincronizar(false)}
        onConfirm={ejecutarSincronizacionCompleta}
        title="Sincronizar Sistema Completo"
        message="Esta acción creará movimientos de tesorería basados en los asientos contables existentes y recalculará todos los saldos. Esto sincronizará completamente el sistema. ¿Desea continuar?"
        type="warning"
        confirmText="Sí, Sincronizar"
        cancelText="Cancelar"
      />

      {/* Modal de notificación */}
      <NotificationModal
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationConfig.title}
        message={notificationConfig.message}
        type={notificationConfig.type}
        autoClose={notificationConfig.type === 'success' ? 3000 : undefined}
      />
    </div>
  );
}
