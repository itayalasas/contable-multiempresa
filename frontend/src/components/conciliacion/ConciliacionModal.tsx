import React, { useState, useEffect } from 'react';
import { X, Check, Search, ArrowLeftRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useSesion } from '../../context/SesionContext';

// Tipos para el componente
interface MovimientoBancario {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string;
  monto: number;
  tipo: 'CARGO' | 'ABONO';
  conciliado: boolean;
  cuentaId: string;
}

interface MovimientoContable {
  id: string;
  fecha: string;
  asientoNumero: string;
  descripcion: string;
  referencia?: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  conciliado: boolean;
  cuentaId: string;
}

interface ConciliacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimientoBancario?: MovimientoBancario | null;
  movimientoContable?: MovimientoContable | null;
  movimientosParaConciliar: (MovimientoBancario | MovimientoContable)[];
  onConciliar: (movimientoBancario: MovimientoBancario, movimientoContable: MovimientoContable) => void;
}

export const ConciliacionModal: React.FC<ConciliacionModalProps> = ({
  isOpen,
  onClose,
  movimientoBancario,
  movimientoContable,
  movimientosParaConciliar,
  onConciliar
}) => {
  const { formatearMoneda } = useSesion();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMovimientos, setFilteredMovimientos] = useState<(MovimientoBancario | MovimientoContable)[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Determinar el tipo de movimiento seleccionado
  const movimientoSeleccionado = movimientoBancario || movimientoContable;
  const tipoSeleccionado = movimientoBancario ? 'bancario' : 'contable';
  
  // Filtrar movimientos cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMovimientos(movimientosParaConciliar);
      return;
    }
    
    const termino = searchTerm.toLowerCase();
    const filtered = movimientosParaConciliar.filter(movimiento => {
      const descripcionMatch = movimiento.descripcion.toLowerCase().includes(termino);
      
      // Verificar referencia según el tipo de movimiento
      let referenciaMatch = false;
      if ('referencia' in movimiento && movimiento.referencia) {
        referenciaMatch = movimiento.referencia.toLowerCase().includes(termino);
      }
      
      // Verificar número de asiento para movimientos contables
      let asientoMatch = false;
      if ('asientoNumero' in movimiento) {
        asientoMatch = movimiento.asientoNumero.toLowerCase().includes(termino);
      }
      
      return descripcionMatch || referenciaMatch || asientoMatch;
    });
    
    setFilteredMovimientos(filtered);
  }, [searchTerm, movimientosParaConciliar]);

  // Manejar la conciliación
  const handleConciliar = async (movimiento: MovimientoBancario | MovimientoContable) => {
    if (!movimientoSeleccionado) return;
    
    setLoading(true);
    
    try {
      if (tipoSeleccionado === 'bancario' && movimientoBancario) {
        await onConciliar(movimientoBancario, movimiento as MovimientoContable);
      } else if (tipoSeleccionado === 'contable' && movimientoContable) {
        await onConciliar(movimiento as MovimientoBancario, movimientoContable);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al conciliar:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !movimientoSeleccionado) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
              Conciliar Movimiento
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-indigo-800 mb-2">Movimiento Seleccionado</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Fecha:</p>
                <p className="font-medium">{new Date(movimientoSeleccionado.fecha).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Tipo:</p>
                <p className="font-medium">
                  {tipoSeleccionado === 'bancario' 
                    ? ((movimientoSeleccionado as MovimientoBancario).tipo === 'ABONO' ? 'Abono' : 'Cargo')
                    : ((movimientoSeleccionado as MovimientoContable).tipo === 'INGRESO' ? 'Ingreso' : 
                       (movimientoSeleccionado as MovimientoContable).tipo === 'EGRESO' ? 'Egreso' : 'Transferencia')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Descripción:</p>
                <p className="font-medium">{movimientoSeleccionado.descripcion}</p>
              </div>
              <div>
                <p className="text-gray-600">Monto:</p>
                <p className={`font-medium ${
                  tipoSeleccionado === 'bancario' 
                    ? ((movimientoSeleccionado as MovimientoBancario).tipo === 'ABONO' ? 'text-green-600' : 'text-red-600')
                    : ((movimientoSeleccionado as MovimientoContable).tipo === 'INGRESO' ? 'text-green-600' : 
                       (movimientoSeleccionado as MovimientoContable).tipo === 'EGRESO' ? 'text-red-600' : 'text-blue-600')
                }`}>
                  {formatearMoneda(movimientoSeleccionado.monto)}
                </p>
              </div>
              {tipoSeleccionado === 'bancario' && (
                <div>
                  <p className="text-gray-600">Referencia:</p>
                  <p className="font-medium">{(movimientoSeleccionado as MovimientoBancario).referencia}</p>
                </div>
              )}
              {tipoSeleccionado === 'contable' && (
                <div>
                  <p className="text-gray-600">Asiento:</p>
                  <p className="font-medium">{(movimientoSeleccionado as MovimientoContable).asientoNumero}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Seleccione un movimiento para conciliar:
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por descripción o referencia..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-96 border border-gray-200 rounded-lg">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Procesando conciliación...</p>
              </div>
            ) : filteredMovimientos.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-600">
                  {searchTerm 
                    ? `No se encontraron movimientos que coincidan con "${searchTerm}"`
                    : 'No hay movimientos disponibles para conciliar'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tipoSeleccionado === 'bancario' ? 'Asiento' : 'Referencia'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovimientos.map((movimiento) => (
                    <tr key={movimiento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movimiento.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tipoSeleccionado === 'bancario' 
                          ? (movimiento as MovimientoContable).asientoNumero
                          : (movimiento as MovimientoBancario).referencia}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {movimiento.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={
                          tipoSeleccionado === 'bancario' 
                            ? ((movimiento as MovimientoContable).tipo === 'INGRESO' ? 'text-green-600' : 
                               (movimiento as MovimientoContable).tipo === 'EGRESO' ? 'text-red-600' : 
                               'text-blue-600')
                            : ((movimiento as MovimientoBancario).tipo === 'ABONO' ? 'text-green-600' : 'text-red-600')
                        }>
                          {tipoSeleccionado === 'bancario' 
                            ? ((movimiento as MovimientoContable).tipo === 'INGRESO' ? '+' : 
                               (movimiento as MovimientoContable).tipo === 'EGRESO' ? '-' : 
                               '↔')
                            : ((movimiento as MovimientoBancario).tipo === 'ABONO' ? '+' : '-')
                          } {formatearMoneda(movimiento.monto)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleConciliar(movimiento)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Conciliar
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};