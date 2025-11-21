import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, CheckCircle, Clock, XCircle, FileText, Play } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface Comision {
  id: string;
  order_id: string;
  fecha: string;
  descripcion: string;
  subtotal_venta: number;
  comision_porcentaje: number;
  comision_monto: number;
  estado_comision: string;
  estado_pago: string;
  fecha_facturada?: string;
  fecha_pagada?: string;
  partner_id: string;
  factura_venta_id: string;
  partners_aliados: {
    razon_social: string;
    partner_id_externo: string;
  };
  facturas_venta: {
    numero_factura: string;
  };
}

interface FacturaCompra {
  id: string;
  numero_factura: string;
  fecha_emision: string;
  total: number;
  estado: string;
  proveedor_id: string;
  observaciones?: string;
  proveedores: {
    razon_social: string;
  };
}

export default function ComisionesPartners() {
  const { empresaActual, usuario } = useSesion();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [facturasCompra, setFacturasCompra] = useState<FacturaCompra[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [loading, setLoading] = useState(true);
  const [generandoFacturas, setGenerandoFacturas] = useState(false);
  const [showGenerarModal, setShowGenerarModal] = useState(false);

  useEffect(() => {
    if (empresaActual) {
      cargarDatos();
    }
  }, [empresaActual]);

  const cargarDatos = async () => {
    if (!empresaActual) return;

    try {
      setLoading(true);
      await Promise.all([
        cargarComisiones(),
        cargarFacturasCompra(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarComisiones = async () => {
    if (!empresaActual) return;

    const { data, error } = await supabase
      .from('comisiones_partners')
      .select(`
        *,
        partners_aliados!inner(razon_social, partner_id_externo),
        facturas_venta!inner(numero_factura)
      `)
      .eq('empresa_id', empresaActual.id)
      .order('fecha', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error al cargar comisiones:', error);
      return;
    }

    setComisiones(data || []);
  };

  const cargarFacturasCompra = async () => {
    if (!empresaActual) return;

    const { data, error } = await supabase
      .from('facturas_compra')
      .select(`
        *,
        proveedores!inner(razon_social)
      `)
      .eq('empresa_id', empresaActual.id)
      .contains('metadata', { tipo: 'factura_comisiones_partner' })
      .order('fecha_emision', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al cargar facturas compra:', error);
      return;
    }

    setFacturasCompra(data || []);
  };

  const generarFacturasAhora = async () => {
    if (!empresaActual) return;

    try {
      setGenerandoFacturas(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceRoleKey) {
        alert('Error: SERVICE_ROLE_KEY no configurado');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generar-facturas-partners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          empresaId: empresaActual.id,
          forzar: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Facturas generadas exitosamente:\n\n- Facturas: ${result.facturas_generadas}\n- Comisiones procesadas: ${result.comisiones_procesadas}`);
        await cargarDatos();
      } else {
        alert('Error: ' + (result.error || 'Error desconocido'));
      }
    } catch (error: any) {
      console.error('Error al generar facturas:', error);
      alert('Error al generar facturas: ' + error.message);
    } finally {
      setGenerandoFacturas(false);
      setShowGenerarModal(false);
    }
  };

  const aprobarFactura = async (factura: FacturaCompra) => {
    const { error } = await supabase
      .from('facturas_compra')
      .update({ estado: 'aprobada' })
      .eq('id', factura.id);

    if (error) {
      console.error('Error al aprobar factura:', error);
      alert('Error al aprobar factura: ' + error.message);
      return;
    }

    alert('✅ Factura aprobada exitosamente');
    await cargarDatos();
  };

  const marcarComoPagada = async (factura: FacturaCompra) => {
    const { error: updateError } = await supabase
      .from('facturas_compra')
      .update({ estado: 'pagada' })
      .eq('id', factura.id);

    if (updateError) {
      console.error('Error al marcar como pagada:', updateError);
      alert('Error: ' + updateError.message);
      return;
    }

    const { error: comisionesError } = await supabase
      .from('comisiones_partners')
      .update({
        estado_pago: 'pagada',
        fecha_pagada: new Date().toISOString(),
      })
      .eq('factura_compra_id', factura.id);

    if (comisionesError) {
      console.error('Error al actualizar comisiones:', comisionesError);
    }

    alert('✅ Factura marcada como pagada');
    await cargarDatos();
  };

  const comisionesFiltradas = comisiones.filter((c) => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'pendientes') return c.estado_comision === 'pendiente';
    if (filtroEstado === 'facturadas') return c.estado_comision === 'facturada' && c.estado_pago !== 'pagada';
    if (filtroEstado === 'pagadas') return c.estado_pago === 'pagada';
    return true;
  });

  const totales = {
    pendientes: comisiones.filter(c => c.estado_comision === 'pendiente').reduce((sum, c) => sum + parseFloat(c.comision_monto.toString()), 0),
    facturadas: comisiones.filter(c => c.estado_comision === 'facturada' && c.estado_pago !== 'pagada').reduce((sum, c) => sum + parseFloat(c.comision_monto.toString()), 0),
    pagadas: comisiones.filter(c => c.estado_pago === 'pagada').reduce((sum, c) => sum + parseFloat(c.comision_monto.toString()), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comisiones de Partners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control y gestión de comisiones y pagos a partners
          </p>
        </div>
        <button
          onClick={() => setShowGenerarModal(true)}
          disabled={generandoFacturas}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          <Play className="w-5 h-5" />
          {generandoFacturas ? 'Generando...' : 'Generar Facturas Ahora'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comisiones Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">${totales.pendientes.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {comisiones.filter(c => c.estado_comision === 'pendiente').length} comisiones
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Por Pagar (Facturadas)</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">${totales.facturadas.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {comisiones.filter(c => c.estado_comision === 'facturada' && c.estado_pago !== 'pagada').length} comisiones
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600 mt-1">${totales.pagadas.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {comisiones.filter(c => c.estado_pago === 'pagada').length} comisiones
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {facturasCompra.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Facturas de Comisiones Generadas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasCompra.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {factura.numero_factura}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {factura.proveedores.razon_social}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(factura.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${parseFloat(factura.total.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        factura.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                        factura.estado === 'aprobada' ? 'bg-blue-100 text-blue-800' :
                        factura.estado === 'pendiente_aprobacion' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {factura.estado === 'pendiente_aprobacion' ? 'Pendiente Aprobación' :
                         factura.estado === 'aprobada' ? 'Aprobada' :
                         factura.estado === 'pagada' ? 'Pagada' :
                         factura.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {factura.estado === 'pendiente_aprobacion' && (
                        <button
                          onClick={() => aprobarFactura(factura)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Aprobar
                        </button>
                      )}
                      {factura.estado === 'aprobada' && (
                        <button
                          onClick={() => marcarComoPagada(factura)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          <DollarSign className="w-3 h-3" />
                          Marcar Pagada
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Detalle de Comisiones</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroEstado('todas')}
                className={`px-3 py-1 rounded text-sm ${
                  filtroEstado === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroEstado('pendientes')}
                className={`px-3 py-1 rounded text-sm ${
                  filtroEstado === 'pendientes' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFiltroEstado('facturadas')}
                className={`px-3 py-1 rounded text-sm ${
                  filtroEstado === 'facturadas' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Facturadas
              </button>
              <button
                onClick={() => setFiltroEstado('pagadas')}
                className={`px-3 py-1 rounded text-sm ${
                  filtroEstado === 'pagadas' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Pagadas
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Venta</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comisionesFiltradas.map((comision) => (
                <tr key={comision.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(comision.fecha).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {comision.partners_aliados.razon_social}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {comision.order_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {comision.facturas_venta.numero_factura}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {comision.descripcion}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    ${parseFloat(comision.subtotal_venta.toString()).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {comision.comision_porcentaje}%
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                    ${parseFloat(comision.comision_monto.toString()).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        comision.estado_pago === 'pagada' ? 'bg-green-100 text-green-800' :
                        comision.estado_comision === 'facturada' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {comision.estado_pago === 'pagada' ? 'Pagada' :
                         comision.estado_comision === 'facturada' ? 'Facturada' :
                         'Pendiente'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showGenerarModal && (
        <ConfirmModal
          isOpen={showGenerarModal}
          onClose={() => setShowGenerarModal(false)}
          onConfirm={generarFacturasAhora}
          title="Generar Facturas de Comisiones"
          message="¿Deseas generar las facturas de comisiones pendientes ahora? Esto agrupará todas las comisiones pendientes por partner y creará facturas de compra."
          confirmText="Generar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
}
