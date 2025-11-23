import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, DollarSign, Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { supabase } from '../../config/supabase';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { PartnerModal } from '../../components/compras/PartnerModal';

interface Partner {
  id: string;
  partner_id_externo: string;
  razon_social: string;
  documento: string;
  tipo_documento: string;
  email: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  comision_porcentaje_default: number;
  facturacion_frecuencia: string;
  dia_facturacion: number;
  proxima_facturacion?: string;
  cuenta_bancaria?: string;
  banco?: string;
}

interface ComisionResumen {
  partner_id: string;
  partner_nombre: string;
  cantidad_pendientes: number;
  total_pendiente: number;
  cantidad_facturadas: number;
  total_facturado: number;
  cantidad_pagadas: number;
  total_pagado: number;
}

export default function Partners() {
  const { empresaActual } = useSesion();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [comisionesResumen, setComisionesResumen] = useState<Record<string, ComisionResumen>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partnerSeleccionado, setPartnerSeleccionado] = useState<Partner | null>(null);
  const [partnerAEliminar, setPartnerAEliminar] = useState<Partner | null>(null);

  useEffect(() => {
    if (empresaActual) {
      cargarDatos();
    }
  }, [empresaActual]);

  useEffect(() => {
    filtrarPartners();
  }, [searchTerm, partners]);

  const cargarDatos = async () => {
    if (!empresaActual) return;

    try {
      setLoading(true);
      await Promise.all([
        cargarPartners(),
        cargarComisionesResumen(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPartners = async () => {
    if (!empresaActual) return;

    const { data, error } = await supabase
      .from('partners_aliados')
      .select('*')
      .eq('empresa_id', empresaActual.id)
      .order('razon_social', { ascending: true });

    if (error) {
      console.error('Error al cargar partners:', error);
      if (error.code === 'PGRST205') {
        setError('Las tablas de partners están siendo inicializadas. Por favor espera 1-2 minutos y recarga la página.');
      }
      return;
    }

    setPartners(data || []);
    setError(null);
  };

  const cargarComisionesResumen = async () => {
    if (!empresaActual) return;

    const { data: periodoActual } = await supabase
      .from('periodos_contables')
      .select('fecha_inicio, fecha_fin')
      .eq('empresa_id', empresaActual.id)
      .eq('estado', 'abierto')
      .order('fecha_inicio', { ascending: false })
      .maybeSingle();

    let query = supabase
      .from('comisiones_partners')
      .select(`
        partner_id,
        comision_monto,
        estado_comision,
        estado_pago,
        fecha,
        partners_aliados!inner(razon_social)
      `)
      .eq('empresa_id', empresaActual.id);

    if (periodoActual) {
      query = query
        .gte('fecha', periodoActual.fecha_inicio)
        .lte('fecha', periodoActual.fecha_fin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al cargar comisiones:', error);
      return;
    }

    const resumen: Record<string, ComisionResumen> = {};

    data?.forEach((comision: any) => {
      const partnerId = comision.partner_id;
      if (!resumen[partnerId]) {
        resumen[partnerId] = {
          partner_id: partnerId,
          partner_nombre: comision.partners_aliados.razon_social,
          cantidad_pendientes: 0,
          total_pendiente: 0,
          cantidad_facturadas: 0,
          total_facturado: 0,
          cantidad_pagadas: 0,
          total_pagado: 0,
        };
      }

      const monto = parseFloat(comision.comision_monto);

      if (comision.estado_pago === 'pagada') {
        resumen[partnerId].cantidad_pagadas++;
        resumen[partnerId].total_pagado += monto;
      } else if (comision.estado_comision === 'facturada') {
        resumen[partnerId].cantidad_facturadas++;
        resumen[partnerId].total_facturado += monto;
      } else if (comision.estado_comision === 'pendiente') {
        resumen[partnerId].cantidad_pendientes++;
        resumen[partnerId].total_pendiente += monto;
      }
    });

    setComisionesResumen(resumen);
  };

  const filtrarPartners = () => {
    if (!searchTerm.trim()) {
      setFilteredPartners(partners);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = partners.filter(partner =>
      partner.razon_social.toLowerCase().includes(term) ||
      partner.documento.includes(term) ||
      partner.email?.toLowerCase().includes(term)
    );
    setFilteredPartners(filtered);
  };

  const handleEliminar = (partner: Partner) => {
    setPartnerAEliminar(partner);
    setShowDeleteModal(true);
  };

  const confirmarEliminar = async () => {
    if (!partnerAEliminar) return;

    const { error } = await supabase
      .from('partners_aliados')
      .delete()
      .eq('id', partnerAEliminar.id);

    if (error) {
      console.error('Error al eliminar partner:', error);
      alert('Error al eliminar partner: ' + error.message);
      return;
    }

    await cargarDatos();
    setShowDeleteModal(false);
    setPartnerAEliminar(null);
  };

  const handleCambiarEstado = async (partner: Partner) => {
    const { error } = await supabase
      .from('partners_aliados')
      .update({ activo: !partner.activo })
      .eq('id', partner.id);

    if (error) {
      console.error('Error al cambiar estado:', error);
      return;
    }

    await cargarDatos();
  };

  const handleGuardarPartner = async (partnerData: Partial<Partner>) => {
    if (!empresaActual) return;

    const dataToSave = {
      ...partnerData,
      empresa_id: empresaActual.id,
    };

    if (partnerSeleccionado) {
      const { error } = await supabase
        .from('partners_aliados')
        .update(dataToSave)
        .eq('id', partnerSeleccionado.id);

      if (error) {
        console.error('Error al actualizar partner:', error);
        alert('Error al actualizar partner: ' + error.message);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('partners_aliados')
        .insert([dataToSave]);

      if (error) {
        console.error('Error al crear partner:', error);
        alert('Error al crear partner: ' + error.message);
        throw error;
      }
    }

    await cargarDatos();
    setShowModal(false);
    setPartnerSeleccionado(null);
  };

  const formatFrecuencia = (freq: string) => {
    const map: Record<string, string> = {
      semanal: 'Semanal',
      quincenal: 'Quincenal',
      mensual: 'Mensual',
      bimensual: 'Bimensual',
    };
    return map[freq] || freq;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partners y Aliados</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona tus partners, comisiones y facturación
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Sistema Inicializando</h3>
              <p className="text-yellow-800 mb-4">{error}</p>
              <p className="text-sm text-yellow-700 mb-4">
                Las tablas de partners y comisiones han sido creadas recientemente y el caché de Supabase necesita actualizarse.
              </p>
              <div className="space-y-2 text-sm text-yellow-800">
                <p><strong>Opciones:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Espera 1-2 minutos y recarga esta página (F5)</li>
                  <li>O ve al Dashboard de Supabase → Settings → API → "Reload Schema Cache"</li>
                </ol>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Recargar Página Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners y Aliados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona tus partners, comisiones y facturación
          </p>
        </div>
        <button
          onClick={() => {
            setPartnerSeleccionado(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Partner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partners Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {partners.filter(p => p.activo).length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comisiones Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                ${Object.values(comisionesResumen).reduce((sum, r) => sum + r.total_pendiente, 0).toFixed(2)}
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
              <p className="text-sm font-medium text-gray-600">Por Pagar</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ${Object.values(comisionesResumen).reduce((sum, r) => sum + r.total_facturado, 0).toFixed(2)}
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
              <p className="text-2xl font-bold text-green-600 mt-1">
                ${Object.values(comisionesResumen).reduce((sum, r) => sum + r.total_pagado, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, documento o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {filteredPartners.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay partners registrados</h3>
            <p className="mt-1 text-sm text-gray-500">
              Los partners se crean automáticamente al recibir órdenes con comisiones
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisiones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facturación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPartners.map((partner) => {
                  const resumen = comisionesResumen[partner.id];
                  return (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{partner.razon_social}</div>
                          <div className="text-sm text-gray-500">ID: {partner.partner_id_externo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{partner.documento}</div>
                        <div className="text-xs text-gray-500">{partner.tipo_documento}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{partner.email}</div>
                        {partner.telefono && (
                          <div className="text-xs text-gray-500">{partner.telefono}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {resumen ? (
                          <div className="space-y-1">
                            {resumen.total_pendiente > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  Pendiente: ${resumen.total_pendiente.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {resumen.total_facturado > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                  Por pagar: ${resumen.total_facturado.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {resumen.total_pagado > 0 && (
                              <div className="text-xs text-gray-500">
                                Pagado: ${resumen.total_pagado.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin comisiones</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{formatFrecuencia(partner.facturacion_frecuencia)}</div>
                          {partner.proxima_facturacion && (
                            <div className="text-xs text-gray-500">
                              Próxima: {new Date(partner.proxima_facturacion).toLocaleDateString()}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Comisión: {partner.comision_porcentaje_default}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleCambiarEstado(partner)}
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            partner.activo
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {partner.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setPartnerSeleccionado(partner);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(partner)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteModal && partnerAEliminar && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmarEliminar}
          title="Eliminar Partner"
          message={`¿Estás seguro de que deseas eliminar a ${partnerAEliminar.razon_social}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      )}

      {showModal && empresaActual && (
        <PartnerModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setPartnerSeleccionado(null);
          }}
          onSave={handleGuardarPartner}
          partner={partnerSeleccionado}
          empresaId={empresaActual.id}
        />
      )}
    </div>
  );
}
