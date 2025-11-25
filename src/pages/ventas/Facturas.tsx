import React, { useState, useEffect } from 'react';
import { useSesion } from '../../context/SesionContext';
import {
  obtenerFacturas,
  eliminarFactura,
  marcarFacturaComoPagada,
  enviarFacturaDGI,
  obtenerEstadisticasFacturas,
  obtenerFacturaPorId,
  regenerarAsientoContable,
  type FacturaVenta,
} from '../../services/supabase/facturas';
import { supabase } from '../../config/supabase';
import FacturaModal from '../../components/ventas/FacturaModal';
import { FacturaDetalleModal } from '../../components/ventas/FacturaDetalleModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';

export default function Facturas() {
  const { empresaActual } = useSesion();
  const [facturas, setFacturas] = useState<FacturaVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [facturaEdit, setFacturaEdit] = useState<FacturaVenta | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [facturaDetalle, setFacturaDetalle] = useState<FacturaVenta | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ show: false, type: 'info', title: '', message: '' });
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [enviandoDGI, setEnviandoDGI] = useState<string | null>(null);
  const [regenerandoAsiento, setRegenerandoAsiento] = useState<string | null>(null);

  useEffect(() => {
    if (empresaActual) {
      cargarFacturas();
      cargarEstadisticas();

      const channel = supabase
        .channel('facturas-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'facturas_venta',
            filter: `empresa_id=eq.${empresaActual.id}`,
          },
          (payload) => {
            console.log('📡 Cambio en tiempo real detectado:', payload);
            cargarFacturas();
            cargarEstadisticas();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [empresaActual]);

  const cargarFacturas = async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const data = await obtenerFacturas(empresaActual.id);
      setFacturas(data);
    } catch (error: any) {
      mostrarNotificacion('error', 'Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!empresaActual) return;
    try {
      const data = await obtenerEstadisticasFacturas(empresaActual.id);
      setEstadisticas(data);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleNuevaFactura = () => {
    setFacturaEdit(null);
    setShowModal(true);
  };

  const handleEditFactura = (factura: FacturaVenta) => {
    setFacturaEdit(factura);
    setShowModal(true);
  };

  const handleEliminarFactura = (factura: FacturaVenta) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Factura',
      message: `¿Está seguro que desea eliminar la factura ${factura.numero_factura}?`,
      onConfirm: async () => {
        try {
          await eliminarFactura(factura.id);
          mostrarNotificacion('success', 'Éxito', 'Factura eliminada correctamente');
          cargarFacturas();
          cargarEstadisticas();
        } catch (error: any) {
          mostrarNotificacion('error', 'Error', error.message);
        }
      },
    });
  };

  const handleMarcarComoPagada = (factura: FacturaVenta) => {
    setConfirmModal({
      show: true,
      title: 'Marcar como Pagada',
      message: `¿Confirma que la factura ${factura.numero_factura} ha sido pagada?`,
      onConfirm: async () => {
        try {
          await marcarFacturaComoPagada(factura.id);
          mostrarNotificacion('success', 'Éxito', 'Factura marcada como pagada');
          cargarFacturas();
          cargarEstadisticas();
        } catch (error: any) {
          mostrarNotificacion('error', 'Error', error.message);
        }
      },
    });
  };

  const handleEnviarDGI = async (factura: FacturaVenta) => {
    console.log('📤 [handleEnviarDGI] Iniciando proceso para factura:', factura.numero_factura, factura.id);

    setConfirmModal({
      show: true,
      title: 'Enviar a DGI',
      message: `¿Desea enviar la factura ${factura.numero_factura} al sistema de facturación electrónica de DGI?`,
      onConfirm: async () => {
        console.log('✅ [handleEnviarDGI] Usuario confirmó, cerrando modal...');
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        setEnviandoDGI(factura.id);

        try {
          console.log('🚀 [handleEnviarDGI] Llamando a enviarFacturaDGI...');
          const resultado = await enviarFacturaDGI(factura.id);
          console.log('✅ [handleEnviarDGI] Factura enviada exitosamente:', resultado);

          mostrarNotificacion('success', 'Éxito', 'Factura enviada a DGI correctamente');

          console.log('🔄 [handleEnviarDGI] Recargando facturas...');
          await cargarFacturas();
          await cargarEstadisticas();
          console.log('✅ [handleEnviarDGI] Proceso completado');
        } catch (error: any) {
          console.error('❌ [handleEnviarDGI] Error completo:', error);
          console.error('❌ [handleEnviarDGI] Error message:', error.message);
          console.error('❌ [handleEnviarDGI] Error stack:', error.stack);
          mostrarNotificacion('error', 'Error al Enviar', error.message || 'Error desconocido al enviar a DGI');
        } finally {
          setEnviandoDGI(null);
        }
      },
    });
  };

  const handleVerDetalles = async (factura: FacturaVenta) => {
    try {
      console.log('👁️ Cargando detalles de factura:', factura.id);
      const facturaCompleta = await obtenerFacturaPorId(factura.id);
      console.log('✅ Factura completa cargada:', facturaCompleta);
      setFacturaDetalle(facturaCompleta);
      setShowDetalleModal(true);
    } catch (error: any) {
      console.error('❌ Error al cargar detalles:', error);
      mostrarNotificacion('error', 'Error', `No se pudo cargar los detalles: ${error.message}`);
    }
  };

  const handleDescargarPDF = async (factura: FacturaVenta) => {
    try {
      console.log('📄 Generando PDF de factura:', factura.id);
      const { obtenerFacturaPorId } = await import('../../services/supabase/facturas');
      const facturaCompleta = await obtenerFacturaPorId(factura.id);

      console.log('✅ Datos para PDF:', facturaCompleta);

      const itemsHTML = facturaCompleta.items?.map((item: any, i: number) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${i + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.descripcion}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${parseFloat(item.precio_unitario).toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${parseFloat(item.subtotal || 0).toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.tasa_iva * 100).toFixed(0)}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${parseFloat(item.monto_iva || 0).toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">$${parseFloat(item.total || 0).toFixed(2)}</td>
        </tr>
      `).join('') || '<tr><td colspan="8" style="text-align: center; padding: 20px;">Sin items</td></tr>';

      const pdfHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${facturaCompleta.numero_factura}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-number {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-box {
      padding: 15px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #2563eb;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
    }
    .totals {
      margin-top: 30px;
      float: right;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    .total-row.final {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
      border-top: 3px solid #2563eb;
      border-bottom: 3px solid #2563eb;
      padding: 15px 0;
      margin-top: 10px;
    }
    .dgi-box {
      margin-top: 40px;
      padding: 20px;
      background: ${facturaCompleta.dgi_enviada ? '#d1fae5' : '#fef3c7'};
      border: 2px solid ${facturaCompleta.dgi_enviada ? '#10b981' : '#f59e0b'};
      border-radius: 8px;
      clear: both;
    }
    .dgi-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      color: ${facturaCompleta.dgi_enviada ? '#065f46' : '#92400e'};
    }
    .print-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      margin: 20px 0;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

  <div class="header">
    <div class="company-info">
      <div class="company-name">${empresaActual?.razon_social || 'Empresa'}</div>
      <div>RUT: ${empresaActual?.numero_identificacion || 'N/A'}</div>
      <div>${empresaActual?.direccion || ''}</div>
      <div>${empresaActual?.email || ''}</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${facturaCompleta.numero_factura}</div>
      <div style="font-size: 14px; color: #666; margin-top: 5px;">${facturaCompleta.tipo_documento || 'e-ticket'}</div>
      <div style="margin-top: 10px;">
        <div><strong>Fecha:</strong> ${new Date(facturaCompleta.fecha_emision).toLocaleDateString()}</div>
        <div><strong>Estado:</strong> ${getEstadoLabel(facturaCompleta.estado).toUpperCase()}</div>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="section-title">Cliente</div>
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${facturaCompleta.cliente?.razon_social || 'Cliente'}</div>
      <div>${facturaCompleta.cliente?.tipo_documento || 'RUT'}: ${facturaCompleta.cliente?.numero_documento || 'N/A'}</div>
      ${facturaCompleta.cliente?.direccion ? `<div>${facturaCompleta.cliente.direccion}</div>` : ''}
      ${facturaCompleta.cliente?.email ? `<div>✉️ ${facturaCompleta.cliente.email}</div>` : ''}
      ${facturaCompleta.cliente?.telefono ? `<div>📞 ${facturaCompleta.cliente.telefono}</div>` : ''}
    </div>

    ${facturaCompleta.dgi_enviada ? `
    <div class="info-box" style="background: #d1fae5;">
      <div class="section-title" style="color: #065f46;">✅ Comprobante Fiscal</div>
      <div><strong>CAE:</strong> ${facturaCompleta.dgi_cae_numero || 'N/A'}</div>
      <div><strong>Serie:</strong> ${facturaCompleta.dgi_serie || 'N/A'}</div>
      <div><strong>Número:</strong> ${facturaCompleta.dgi_numero || 'N/A'}</div>
      <div><strong>Vencimiento CAE:</strong> ${facturaCompleta.dgi_cae_vencimiento ? new Date(facturaCompleta.dgi_cae_vencimiento).toLocaleDateString() : 'N/A'}</div>
    </div>
    ` : `
    <div class="info-box" style="background: #fef3c7;">
      <div class="section-title" style="color: #92400e;">⏳ Pendiente de Envío a DGI</div>
      <div>Esta factura aún no ha sido enviada al sistema de facturación electrónica de DGI.</div>
    </div>
    `}
  </div>

  <div class="section">
    <div class="section-title">Detalle de Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Descripción</th>
          <th style="width: 80px; text-align: center;">Cant.</th>
          <th style="width: 100px; text-align: right;">P. Unit.</th>
          <th style="width: 100px; text-align: right;">Subtotal</th>
          <th style="width: 60px; text-align: right;">IVA %</th>
          <th style="width: 100px; text-align: right;">IVA</th>
          <th style="width: 120px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>$${parseFloat(facturaCompleta.subtotal).toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>IVA:</span>
      <span>$${parseFloat(facturaCompleta.total_iva).toFixed(2)}</span>
    </div>
    <div class="total-row final">
      <span>TOTAL:</span>
      <span>$${parseFloat(facturaCompleta.total).toFixed(2)} ${facturaCompleta.moneda}</span>
    </div>
  </div>

  ${facturaCompleta.observaciones ? `
  <div style="clear: both; margin-top: 40px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
    <div class="section-title">Observaciones</div>
    <div>${facturaCompleta.observaciones}</div>
  </div>
  ` : ''}

  <div style="clear: both; margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 12px;">
    <p>Documento generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
    <p>Sistema ContaEmpresa - Gestión Contable Integral</p>
  </div>
</body>
</html>
      `;

      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (ventana) {
        ventana.document.write(pdfHTML);
        ventana.document.close();
        console.log('✅ PDF abierto en nueva ventana');
        mostrarNotificacion('success', 'PDF Generado', 'Usa el botón "Imprimir" o Ctrl+P para guardar como PDF');
      } else {
        throw new Error('No se pudo abrir la ventana. Verifica que no estén bloqueadas las ventanas emergentes.');
      }
    } catch (error: any) {
      console.error('❌ Error al generar PDF:', error);
      mostrarNotificacion('error', 'Error', `No se pudo generar el PDF: ${error.message}`);
    }
  };

  const handleRegenerarAsiento = async (factura: FacturaVenta) => {
    setRegenerandoAsiento(factura.id);
    try {
      await regenerarAsientoContable(factura.id);
      mostrarNotificacion('success', 'Asiento Regenerado', 'El asiento contable se ha generado correctamente');
      cargarFacturas();
    } catch (error: any) {
      console.error('❌ Error al regenerar asiento:', error);
      mostrarNotificacion('error', 'Error', `No se pudo regenerar el asiento: ${error.message}`);
    } finally {
      setRegenerandoAsiento(null);
    }
  };

  const handleRegenerarAsientosMasivo = async () => {
    const facturasSinAsiento = facturas.filter(f => !f.asiento_generado || f.asiento_error);

    if (facturasSinAsiento.length === 0) {
      mostrarNotificacion('info', 'Sin pendientes', 'Todas las facturas ya tienen su asiento contable generado');
      return;
    }

    mostrarConfirmacion(
      'Generación de Asientos Contables',
      `Se generarán asientos contables para ${facturasSinAsiento.length} factura(s) pendiente(s).\n\n` +
      `Este proceso puede tardar algunos momentos. ¿Desea continuar?`,
      () => ejecutarRegeneracionMasiva(facturasSinAsiento)
    );
  };

  const ejecutarRegeneracionMasiva = async (facturasSinAsiento: FacturaVenta[]) => {

    setRegenerandoAsiento('masivo');
    let exitosos = 0;
    let fallidos = 0;

    for (const factura of facturasSinAsiento) {
      try {
        await regenerarAsientoContable(factura.id);
        exitosos++;
      } catch (error: any) {
        console.error(`❌ Error regenerando asiento para ${factura.numero_factura}:`, error);
        fallidos++;
      }
    }

    setRegenerandoAsiento(null);
    cargarFacturas();

    if (fallidos === 0) {
      mostrarNotificacion(
        'success',
        'Asientos Generados',
        `Se generaron ${exitosos} asiento(s) contable(s) correctamente`
      );
    } else {
      mostrarNotificacion(
        'warning',
        'Proceso Completado con Errores',
        `Exitosos: ${exitosos}, Fallidos: ${fallidos}. Revisa las facturas con error individualmente.`
      );
    }
  };

  const mostrarNotificacion = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setNotification({ show: true, type, title, message });
  };

  const facturasFiltradas = facturas.filter((factura) => {
    const cumpleFiltroEstado =
      filtroEstado === 'todos' || factura.estado === filtroEstado;
    const cumpleBusqueda =
      factura.numero_factura.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.cliente?.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.cliente?.numero_documento.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltroEstado && cumpleBusqueda;
  });

  const getEstadoBadge = (estado: string) => {
    const badges = {
      borrador: 'bg-gray-100 text-gray-700',
      pagada: 'bg-green-100 text-green-700',
      pendiente: 'bg-yellow-100 text-yellow-700',
      anulada: 'bg-red-100 text-red-700',
      vencida: 'bg-orange-100 text-orange-700',
    };
    return badges[estado as keyof typeof badges] || badges.borrador;
  };

  const getEstadoLabel = (estado: string) => {
    const labels = {
      borrador: 'Borrador',
      pagada: 'Pagada',
      pendiente: 'Pendiente',
      anulada: 'Anulada',
      vencida: 'Vencida',
    };
    return labels[estado as keyof typeof labels] || estado;
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas de Venta</h1>
          <p className="text-gray-600 mt-1">
            Gestión de facturas electrónicas y documentos de venta
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón para regenerar asientos faltantes */}
          {facturas.some(f => !f.asiento_generado || f.asiento_error) && (
            <button
              onClick={handleRegenerarAsientosMasivo}
              disabled={regenerandoAsiento !== null}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Generar asientos contables para facturas sin contabilizar"
            >
              <svg
                className={`w-5 h-5 ${regenerandoAsiento ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Generar Asientos Faltantes
            </button>
          )}
          <button
            onClick={handleNuevaFactura}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nueva Factura
          </button>
        </div>
      </div>

      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Facturado</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ${estadisticas.total_facturado.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.cantidad_facturas} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total Pagado</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              ${estadisticas.total_pagado.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_pagadas} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Pendiente</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              ${estadisticas.total_pendiente.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_pendientes} facturas
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Anuladas</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {estadisticas.facturas_anuladas}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {estadisticas.facturas_vencidas} vencidas
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por número, cliente o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencida">Vencida</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin facturas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comience creando una nueva factura de venta
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DGI
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {factura.serie}-{factura.numero_factura}
                      </div>
                      <div className="text-xs text-gray-500">{factura.tipo_documento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{factura.cliente?.razon_social}</div>
                      <div className="text-xs text-gray-500">
                        {factura.cliente?.numero_documento}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(factura.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${parseFloat(factura.total).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{factura.moneda}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(
                          factura.estado
                        )}`}
                      >
                        {getEstadoLabel(factura.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {factura.dgi_enviada && factura.dgi_cae ? (
                        <div className="flex items-center text-green-600">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs">Enviada</span>
                        </div>
                      ) : factura.dgi_response?.error ? (
                        <div className="flex items-center text-red-600 group relative">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs">Error</span>
                          <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            {factura.dgi_response?.error || 'Error al enviar a DGI'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ver detalles - siempre visible */}
                        <button
                          onClick={() => handleVerDetalles(factura)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver detalles"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {/* Regenerar asiento - si falló o si no se ha generado */}
                        {(factura.asiento_error || !factura.asiento_generado) && (
                          <button
                            onClick={() => handleRegenerarAsiento(factura)}
                            disabled={regenerandoAsiento === factura.id}
                            className="relative text-amber-600 hover:text-amber-900 group disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              regenerandoAsiento === factura.id
                                ? 'Generando asiento...'
                                : factura.asiento_error
                                  ? `Regenerar asiento contable - ${factura.asiento_error}`
                                  : 'Generar asiento contable'
                            }
                          >
                            <svg
                              className={`w-5 h-5 ${regenerandoAsiento === factura.id ? 'animate-spin' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            {regenerandoAsiento !== factura.id && (
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                {factura.asiento_error ? `Error: ${factura.asiento_error}` : 'Asiento contable no generado. Click para generar.'}
                              </div>
                            )}
                          </button>
                        )}

                        {/* Editar - solo borrador */}
                        {factura.estado === 'borrador' && (
                          <button
                            onClick={() => handleEditFactura(factura)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Marcar como pagada - solo pendiente */}
                        {factura.estado === 'pendiente' && (
                          <button
                            onClick={() => handleMarcarComoPagada(factura)}
                            className="text-green-600 hover:text-green-900"
                            title="Marcar como pagada"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Enviar a DGI - botón visible si no está enviada o si tuvo error */}
                        {((!factura.dgi_enviada || factura.dgi_response?.error) && factura.estado !== 'anulada') && (
                          <button
                            onClick={() => handleEnviarDGI(factura)}
                            disabled={enviandoDGI === factura.id}
                            className={`flex items-center gap-1 px-3 py-1 text-white text-xs font-medium rounded transition-colors ${
                              enviandoDGI === factura.id
                                ? 'bg-blue-400 cursor-not-allowed'
                                : factura.dgi_response?.error
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            title={factura.dgi_response?.error ? 'Reintentar envío a DGI' : 'Enviar a DGI'}
                          >
                            {enviandoDGI === factura.id ? (
                              <>
                                <svg
                                  className="w-4 h-4 animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                {factura.dgi_response?.error ? (
                                  <>
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      />
                                    </svg>
                                    <span>Reintentar</span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                      />
                                    </svg>
                                    <span>Enviar DGI</span>
                                  </>
                                )}
                              </>
                            )}
                          </button>
                        )}

                        {/* Descargar PDF - siempre visible excepto borrador */}
                        {factura.estado !== 'borrador' && (
                          <button
                            onClick={() => handleDescargarPDF(factura)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Descargar PDF"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Eliminar - solo borrador */}
                        {factura.estado === 'borrador' && (
                          <button
                            onClick={() => handleEliminarFactura(factura)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <FacturaModal
          factura={facturaEdit}
          onClose={() => {
            setShowModal(false);
            setFacturaEdit(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setFacturaEdit(null);
            cargarFacturas();
            cargarEstadisticas();
          }}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          isOpen={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            console.log('🔘 [ConfirmModal] Botón confirmar presionado');
            confirmModal.onConfirm();
          }}
          onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        />
      )}

      {notification.show && (
        <NotificationModal
          isOpen={notification.show}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          autoClose={notification.type === 'info' ? false : true}
          autoCloseDelay={notification.type === 'info' ? 0 : 3000}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {showDetalleModal && facturaDetalle && (
        <FacturaDetalleModal
          factura={facturaDetalle}
          onClose={() => {
            setShowDetalleModal(false);
            setFacturaDetalle(null);
          }}
        />
      )}
    </div>
  );
}
