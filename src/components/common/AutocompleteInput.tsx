import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
  required,
  className = '',
  name,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (showSuggestions && value) {
      const lower = value.toLowerCase();
      setFiltered(
        suggestions.filter(s => s.toLowerCase().includes(lower))
      );
    } else {
      setFiltered(suggestions);
    }
  }, [value, suggestions, showSuggestions]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlighted(-1);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
    setHighlighted(-1);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && highlighted < filtered.length) {
        e.preventDefault();
        handleSelect(filtered[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlighted(-1);
    }
  };

  return (
    <div className={`w-full relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>{label}{required && <span className="text-red-500">*</span>}</label>
      )}
      <input
        ref={inputRef}
        type="text"
        name={name}
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        required={required}
      />
      {showSuggestions && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 w-full bg-white border border-gray-200 rounded shadow mt-1 max-h-48 overflow-auto"
        >
          {filtered.map((s, idx) => (
            <li
              key={s}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${highlighted === idx ? 'bg-blue-100' : ''}`}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHighlighted(idx)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};