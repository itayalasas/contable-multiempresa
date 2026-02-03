import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  FileText,
  ExternalLink,
  X,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { PeriodoContable } from '../../services/supabase/periodosContables';
import { useNavigate } from 'react-router-dom';

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

interface DetallesErrores {
  asientosDescuadrados: AsientoDescuadrado[];
  asientosBorrador: Array<{ id: string; numero: string; fecha: string; descripcion: string }>;
  facturasVentaSinContabilizar: FacturaSinContabilizar[];
  facturasCompraSinContabilizar: FacturaSinContabilizar[];
  facturasConError: FacturaSinContabilizar[];
  comisionesPendientes: ComisionPendiente[];
  comisionesFacturadasSinCuentaPorPagar: ComisionPendiente[];
  cuentasBancariasDescuadradas: CuentaBancariaDescuadrada[];
}

export function DetalleErroresCierre({ periodo, empresaId, onClose }: DetalleErroresCierreProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState<DetallesErrores | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

      setDetalles({
        asientosDescuadrados,
        asientosBorrador,
        facturasVentaSinContabilizar,
        facturasCompraSinContabilizar,
        facturasConError,
        comisionesPendientes,
        comisionesFacturadasSinCuentaPorPagar,
        cuentasBancariasDescuadradas
      });
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
    detalles.cuentasBancariasDescuadradas.length;

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
    </div>
  );
}
