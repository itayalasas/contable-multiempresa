import React, { useState, useEffect } from 'react';
import { Wallet, Building2, CreditCard, ArrowUpRight, ArrowDownRight, Plus, Filter, Search, Download, RefreshCw, Calendar, DollarSign, BarChart3, PiggyBank, Ban as BankIcon, Loader2, AlertCircle, FileText, ArrowLeftRight, Eye, Edit, Trash2, BookOpen, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSesion } from '../../context/SesionContext';
import { useAuth } from '../../context/AuthContext';
import { useModals } from '../../hooks/useModals';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { NotificationModal } from '../../components/common/NotificationModal';
import { CuentaBancariaModal } from '../../components/tesoreria/CuentaBancariaModal';
import { MovimientoTesoreriaModal } from '../../components/tesoreria/MovimientoTesoreriaModal';
import { ResumenTesoreria } from '../../components/tesoreria/ResumenTesoreria';
import { useTesoreriaFirebase } from '../../hooks/useTesoreriaFirebase';

function Tesoreria() {
  const { empresaActual, paisActual, formatearMoneda } = useSesion();
  const { usuario } = useAuth();
  
  // Hook personalizado para manejo de tesorería con Firebase
  const {
    cuentas,
    movimientos,
    resumen,
    loading,
    error,
    isLoadingMockData,
    crearCuentaBancaria,
    actualizarCuentaBancaria,
    eliminarCuentaBancaria,
    crearMovimientoTesoreria,
    actualizarMovimientoTesoreria,
    eliminarMovimientoTesoreria,
    cargarDatosMockEnFirebase,
    recargarDatos
  } = useTesoreriaFirebase(empresaActual?.id);
  
  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuenta, setSelectedCuenta] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState<any | null>(null);
  const [selectedCuentaBancaria, setSelectedCuentaBancaria] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  
  // Hook para modales
  const {
    confirmModal,
    notificationModal,
    closeConfirm,
    closeNotification,
    confirmDelete,
    showSuccess,
    showError
  } = useModals();

  // Filtrado de movimientos
  const movimientosFiltrados = movimientos.filter(movimiento => {
    const matchesSearch = movimiento.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movimiento.referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuenta = !selectedCuenta || movimiento.cuentaId === selectedCuenta;
    const matchesTipo = !selectedTipo || movimiento.tipo === selectedTipo;
    
    let matchesFecha = true;
    if (fechaDesde && fechaHasta) {
      const fechaMovimiento = new Date(movimiento.fecha);
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      matchesFecha = fechaMovimiento >= desde && fechaMovimiento <= hasta;
    }
    
    return matchesSearch && matchesCuenta && matchesTipo && matchesFecha;
  });

  // Handlers para modales
  const handleNuevaCuenta = () => {
    setSelectedCuentaBancaria(null);
    setModalType('create');
    setShowCuentaModal(true);
  };

  const handleEditarCuenta = (cuenta: any) => {
    setSelectedCuentaBancaria(cuenta);
    setModalType('edit');
    setShowCuentaModal(true);
  };

  const handleNuevoMovimiento = () => {
    setSelectedMovimiento(null);
    setModalType('create');
    setShowMovimientoModal(true);
  };

  const handleVerMovimiento = (movimiento: any) => {
    setSelectedMovimiento(movimiento);
    setModalType('view');
    setShowMovimientoModal(true);
  };

  const handleEditarMovimiento = (movimiento: any) => {
    setSelectedMovimiento(movimiento);
    setModalType('edit');
    setShowMovimientoModal(true);
  };

  const handleEliminarMovimiento = (movimiento: any) => {
    confirmDelete(
      `el movimiento de ${movimiento.tipo === 'INGRESO' ? 'ingreso' : movimiento.tipo === 'EGRESO' ? 'egreso' : 'transferencia'}`,
      async () => {
        try {
          await eliminarMovimientoTesoreria(movimiento.id);
          
          showSuccess(
            'Movimiento eliminado',
            'El movimiento ha sido eliminado exitosamente'
          );
        } catch (error) {
          showError(
            'Error al eliminar movimiento',
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
      }
    );
  };

  const handleEliminarCuenta = (cuenta: any) => {
    confirmDelete(
      `la cuenta ${cuenta.nombre}`,
      async () => {
        try {
          await eliminarCuentaBancaria(cuenta.id);
          
          showSuccess(
            'Cuenta eliminada',
            'La cuenta ha sido eliminada exitosamente'
          );
        } catch (error) {
          showError(
            'Error al eliminar cuenta',
            error instanceof Error ? error.message : 'Error desconocido'
          );
        }
      }
    );
  };

  // Guardar cuenta bancaria
  const handleSaveCuenta = async (cuentaData: any) => {
    try {
      if (modalType === 'create') {
        const cuentaId = await crearCuentaBancaria(cuentaData);
        showSuccess(
          'Cuenta creada',
          `La cuenta "${cuentaData.nombre}" ha sido creada exitosamente.`
        );
        return cuentaId;
      } else if (modalType === 'edit' && selectedCuentaBancaria) {
        await actualizarCuentaBancaria(selectedCuentaBancaria.id, cuentaData);
        showSuccess(
          'Cuenta actualizada',
          `La cuenta "${cuentaData.nombre}" ha sido actualizada exitosamente.`
        );
        return selectedCuentaBancaria.id;
      }
      return '';
    } catch (error) {
      showError(
        'Error al guardar cuenta',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Guardar movimiento de tesorería
  const handleSaveMovimiento = async (movimientoData: any) => {
    try {
      if (modalType === 'create') {
        const movimientoId = await crearMovimientoTesoreria(movimientoData);
        showSuccess(
          'Movimiento creado',
          `El movimiento ha sido creado exitosamente.`
        );
        return movimientoId;
      } else if (modalType === 'edit' && selectedMovimiento) {
        await actualizarMovimientoTesoreria(selectedMovimiento.id, movimientoData);
        showSuccess(
          'Movimiento actualizado',
          `El movimiento ha sido actualizado exitosamente.`
        );
        return selectedMovimiento.id;
      }
      return '';
    } catch (error) {
      showError(
        'Error al guardar movimiento',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      throw error;
    }
  };

  // Cargar datos mock en Firebase
  const handleCargarDatosMock = async () => {
    try {
      confirmDelete(
        'los datos existentes y cargar nuevos datos de prueba',
        async () => {
          try {
            const resultado = await cargarDatosMockEnFirebase();
            if (resultado) {
              showSuccess(
                'Datos cargados',
                'Los datos de prueba han sido cargados exitosamente en Firebase.'
              );
              // Recargar datos después de cargar
              await recargarDatos();
            }
          } catch (error) {
            showError(
              'Error al cargar datos',
              error instanceof Error ? error.message : 'Error desconocido'
            );
          }
        }
      );
    } catch (error) {
      showError(
        'Error al cargar datos',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }
  };

  // Obtener el nombre de la cuenta para un movimiento
  const getCuentaNombre = (cuentaId: string): string => {
    const cuenta = cuentas.find(c => c.id === cuentaId);
    return cuenta ? cuenta.nombre : 'Cuenta desconocida';
  };

  // Obtener color según tipo de movimiento
  const getTipoMovimientoColor = (tipo: string) => {
    switch (tipo) {
      case 'INGRESO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'EGRESO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'TRANSFERENCIA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Obtener icono según tipo de movimiento
  const getTipoMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case 'INGRESO':
        return ArrowUpRight;
      case 'EGRESO':
        return ArrowDownRight;
      case 'TRANSFERENCIA':
        return ArrowLeftRight;
      default:
        return FileText;
    }
  };

  // Obtener color según tipo de cuenta
  const getTipoCuentaColor = (tipo: string) => {
    switch (tipo) {
      case 'CORRIENTE':
        return 'bg-blue-100 text-blue-800';
      case 'AHORRO':
        return 'bg-green-100 text-green-800';
      case 'EFECTIVO':
        return 'bg-yellow-100 text-yellow-800';
      case 'TARJETA':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener icono según tipo de cuenta
  const getTipoCuentaIcon = (tipo: string) => {
    switch (tipo) {
      case 'CORRIENTE':
        return BankIcon;
      case 'AHORRO':
        return PiggyBank;
      case 'EFECTIVO':
        return Wallet;
      case 'TARJETA':
        return CreditCard;
      default:
        return Wallet;
    }
  };

  // Renderizar contenido principal
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Cargando datos de tesorería...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={recargarDatos}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Resumen de Tesorería */}
        {resumen && (
          <ResumenTesoreria 
            resumen={resumen} 
            formatearMoneda={formatearMoneda} 
          />
        )}

        {/* Cuentas Bancarias */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Cuentas Bancarias</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleCargarDatosMock}
                  disabled={isLoadingMockData}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
                >
                  {isLoadingMockData ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Cargando...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      <span>Cargar Datos en Firebase</span>
                    </>
                  )}
                </button>
                <Link
                  to="/manuales/finanzas/tesoreria"
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Ver Manual</span>
                </Link>
                <button
                  onClick={handleNuevaCuenta}
                  className="bg-cyan-600 text-white px-3 py-1.5 rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Cuenta
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.map(cuenta => {
                const TipoCuentaIcon = getTipoCuentaIcon(cuenta.tipo);
                return (
                  <div key={cuenta.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getTipoCuentaColor(cuenta.tipo)}`}>
                          <TipoCuentaIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{cuenta.nombre}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cuenta.banco ? `${cuenta.banco} - ` : ''}{cuenta.numero}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTipoCuentaColor(cuenta.tipo)}`}>
                              {cuenta.tipo}
                            </span>
                            <span className="text-xs text-gray-500">{cuenta.moneda}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-sm font-bold text-gray-900">
                          {formatearMoneda(cuenta.saldoActual)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Disponible: {formatearMoneda(cuenta.saldoDisponible)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3 space-x-2">
                      <button
                        onClick={() => handleEditarCuenta(cuenta)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEliminarCuenta(cuenta)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        to="/manuales/finanzas/tesoreria"
                        className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              
              {cuentas.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No hay cuentas bancarias
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Comience creando su primera cuenta bancaria para gestionar su tesorería.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleCargarDatosMock}
                      disabled={isLoadingMockData}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingMockData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          <span>Cargar Datos en Firebase</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleNuevaCuenta}
                      className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nueva Cuenta
                    </button>
                    <Link
                      to="/manuales/finanzas/tesoreria"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      Ver Manual
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtros de Movimientos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros de Movimientos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Concepto, referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuenta
              </label>
              <select
                value={selectedCuenta}
                onChange={(e) => setSelectedCuenta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las cuentas</option>
                {cuentas.map(cuenta => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
                <option value="TRANSFERENCIA">Transferencias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
            </div>
            <div className="flex space-x-2">
              <button
                onClick={recargarDatos}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                onClick={handleNuevoMovimiento}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Nuevo Movimiento
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Movimientos de Tesorería</h3>
              <Link
                to="/manuales/finanzas/tesoreria"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>Ver Manual</span>
              </Link>
            </div>
          </div>
          
          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <ArrowLeftRight className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay movimientos
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedCuenta || selectedTipo || fechaDesde
                    ? 'No se encontraron movimientos con los filtros aplicados.'
                    : 'Comience registrando su primer movimiento de tesorería.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {movimientos.length === 0 && (
                    <button
                      onClick={handleCargarDatosMock}
                      disabled={isLoadingMockData}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoadingMockData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          <span>Cargar Datos en Firebase</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleNuevoMovimiento}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Movimiento
                  </button>
                  <Link
                    to="/manuales/finanzas/tesoreria"
                    className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Ver Manual
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuenta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientosFiltrados.map((movimiento) => {
                    const TipoIcon = getTipoMovimientoIcon(movimiento.tipo);
                    
                    return (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {movimiento.concepto}
                          {movimiento.referencia && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Ref: {movimiento.referencia}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCuentaNombre(movimiento.cuentaId)}
                          {movimiento.tipo === 'TRANSFERENCIA' && movimiento.cuentaDestinoId && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              → {getCuentaNombre(movimiento.cuentaDestinoId)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTipoMovimientoColor(movimiento.tipo)}`}>
                            <TipoIcon className="h-3 w-3 mr-1" />
                            {movimiento.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={movimiento.tipo === 'INGRESO' ? 'text-green-600' : movimiento.tipo === 'EGRESO' ? 'text-red-600' : 'text-blue-600'}>
                            {formatearMoneda(movimiento.monto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            movimiento.estado === 'CONCILIADO' ? 'bg-green-100 text-green-800' :
                            movimiento.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {movimiento.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerMovimiento(movimiento)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditarMovimiento(movimiento)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEliminarMovimiento(movimiento)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <Link
                              to="/manuales/finanzas/tesoreria"
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Ver manual"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tesorería</h1>
              <p className="text-cyan-100">Gestión de cuentas bancarias y flujo de efectivo</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded">
                  {cuentas.length} cuentas
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {formatearMoneda(resumen?.saldoTotal || 0)} saldo total
                </span>
                <span className="bg-white/20 px-3 py-1 rounded">
                  {movimientos.length} movimientos
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/manuales/finanzas/tesoreria"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <BookOpen className="h-5 w-5" />
              <span>Manual</span>
            </Link>
            <button
              onClick={handleNuevoMovimiento}
              className="bg-white text-cyan-600 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              Nuevo Movimiento
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderMainContent()}

      {/* Modales */}
      {showCuentaModal && (
        <CuentaBancariaModal
          isOpen={showCuentaModal}
          onClose={() => setShowCuentaModal(false)}
          cuenta={selectedCuentaBancaria}
          onSave={handleSaveCuenta}
          mode={modalType}
        />
      )}

      {showMovimientoModal && (
        <MovimientoTesoreriaModal
          isOpen={showMovimientoModal}
          onClose={() => setShowMovimientoModal(false)}
          movimiento={selectedMovimiento}
          cuentas={cuentas}
          mode={modalType}
          onSave={handleSaveMovimiento}
        />
      )}

      {/* Modales de confirmación y notificación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={confirmModal.loading}
      />

      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.autoClose}
      />
    </div>
  );
}

// Componente Database para el icono
const Database = (props: any) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
};

export { Tesoreria };