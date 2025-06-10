import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { PlanCuenta } from '../../types';

interface SearchableAccountSelectorProps {
  cuentas: PlanCuenta[];
  value: string;
  onChange: (cuentaId: string, cuenta: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const SearchableAccountSelector: React.FC<SearchableAccountSelectorProps> = ({
  cuentas,
  value,
  onChange,
  placeholder = "Seleccionar cuenta...",
  disabled = false,
  className = "",
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCuentas, setFilteredCuentas] = useState<PlanCuenta[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Obtener la cuenta seleccionada
  const selectedCuenta = cuentas.find(c => c.id === value);

  // Filtrar cuentas basado en el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCuentas(cuentas.filter(c => c.activa));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = cuentas.filter(cuenta => 
        cuenta.activa && (
          cuenta.codigo.toLowerCase().includes(term) ||
          cuenta.nombre.toLowerCase().includes(term)
        )
      );
      setFilteredCuentas(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchTerm, cuentas]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCuentas.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCuentas.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCuentas[highlightedIndex]) {
          handleSelectCuenta(filteredCuentas[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // Scroll automático al elemento resaltado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleSelectCuenta = (cuenta: PlanCuenta) => {
    onChange(cuenta.id, `${cuenta.codigo} - ${cuenta.nombre}`);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
          error 
            ? 'border-red-300 bg-red-50' 
            : isOpen 
            ? 'border-green-500 bg-white' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        } ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${
            selectedCuenta ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {selectedCuenta 
              ? `${selectedCuenta.codigo} - ${selectedCuenta.nombre}`
              : placeholder
            }
          </span>
          <div className="flex items-center space-x-1">
            {selectedCuenta && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Limpiar selección"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Options List */}
          <ul 
            ref={listRef}
            className="max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {filteredCuentas.length > 0 ? (
              filteredCuentas.map((cuenta, index) => (
                <li
                  key={cuenta.id}
                  onClick={() => handleSelectCuenta(cuenta)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-green-100 text-green-900'
                      : cuenta.id === value
                      ? 'bg-green-50 text-green-800'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                  role="option"
                  aria-selected={cuenta.id === value}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-blue-600 font-medium">
                          {cuenta.codigo}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          cuenta.tipo === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                          cuenta.tipo === 'PASIVO' ? 'bg-red-100 text-red-800' :
                          cuenta.tipo === 'PATRIMONIO' ? 'bg-blue-100 text-blue-800' :
                          cuenta.tipo === 'INGRESO' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {cuenta.tipo}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                        {cuenta.nombre}
                      </p>
                      {cuenta.descripcion && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {cuenta.descripcion}
                        </p>
                      )}
                    </div>
                    {cuenta.id === value && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {searchTerm 
                    ? `No se encontraron cuentas para "${searchTerm}"`
                    : 'No hay cuentas disponibles'
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </li>
            )}
          </ul>

          {/* Footer con información */}
          {filteredCuentas.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {filteredCuentas.length} cuenta{filteredCuentas.length !== 1 ? 's' : ''} 
                {searchTerm && ` encontrada${filteredCuentas.length !== 1 ? 's' : ''}`}
                • Use ↑↓ para navegar, Enter para seleccionar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};