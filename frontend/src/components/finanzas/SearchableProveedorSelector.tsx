import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { Proveedor } from '../../types/cuentasPorPagar';

interface SearchableProveedorSelectorProps {
  proveedores: Proveedor[];
  value: string;
  onChange: (proveedorId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const SearchableProveedorSelector: React.FC<SearchableProveedorSelectorProps> = ({
  proveedores,
  value,
  onChange,
  placeholder = "Seleccionar proveedor...",
  disabled = false,
  className = "",
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Obtener el proveedor seleccionado
  const selectedProveedor = proveedores.find(p => p.id === value);

  // Eliminar duplicados y filtrar proveedores - usando useMemo para optimizar
  const filteredProveedores = useMemo(() => {
    // Primero eliminar duplicados
    const uniqueProveedores = new Map<string, Proveedor>();
    proveedores.forEach(proveedor => {
      if (!uniqueProveedores.has(proveedor.id)) {
        uniqueProveedores.set(proveedor.id, proveedor);
      }
    });
    const uniqueProveedoresList = Array.from(uniqueProveedores.values());
    
    // Luego filtrar por término de búsqueda
    if (!searchTerm.trim()) {
      return uniqueProveedoresList;
    }
    
    const term = searchTerm.toLowerCase();
    return uniqueProveedoresList.filter(proveedor => 
      proveedor.nombre.toLowerCase().includes(term) ||
      proveedor.numeroDocumento.toLowerCase().includes(term) ||
      (proveedor.razonSocial && proveedor.razonSocial.toLowerCase().includes(term))
    );
  }, [proveedores, searchTerm]);

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
          prev < filteredProveedores.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProveedores.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredProveedores[highlightedIndex]) {
          handleSelectProveedor(filteredProveedores[highlightedIndex]);
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

  const handleSelectProveedor = (proveedor: Proveedor) => {
    onChange(proveedor.id);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
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
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
          error 
            ? 'border-red-300 bg-red-50' 
            : isOpen 
            ? 'border-red-500 bg-white' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        } ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${
            selectedProveedor ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {selectedProveedor 
              ? `${selectedProveedor.nombre} - ${selectedProveedor.numeroDocumento}`
              : placeholder
            }
          </span>
          <div className="flex items-center space-x-1">
            {selectedProveedor && !disabled && (
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
                placeholder="Buscar por nombre o documento..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Options List */}
          <ul 
            ref={listRef}
            className="max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {filteredProveedores.length > 0 ? (
              filteredProveedores.map((proveedor, index) => (
                <li
                  key={proveedor.id}
                  onClick={() => handleSelectProveedor(proveedor)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-red-100 text-red-900'
                      : proveedor.id === value
                      ? 'bg-red-50 text-red-800'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                  role="option"
                  aria-selected={proveedor.id === value}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{proveedor.nombre}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {proveedor.tipoDocumento}: {proveedor.numeroDocumento}
                        </span>
                        {proveedor.email && (
                          <span className="text-xs text-gray-500 truncate">
                            {proveedor.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {proveedor.id === value && (
                      <Check className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {searchTerm 
                    ? `No se encontraron proveedores para "${searchTerm}"`
                    : 'No hay proveedores disponibles'
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </li>
            )}
          </ul>

          {/* Footer con información */}
          {filteredProveedores.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {filteredProveedores.length} proveedor{filteredProveedores.length !== 1 ? 'es' : ''} 
                {searchTerm && ` encontrado${filteredProveedores.length !== 1 ? 's' : ''}`}
                • Use ↑↓ para navegar, Enter para seleccionar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};