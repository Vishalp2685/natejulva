import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  required?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchable = true,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    setSearchQuery('');
    setHighlightedIndex(-1);
  }, [isOpen, searchable]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onChange(filteredOptions[highlightedIndex]);
          setIsOpen(false);
        } else if (filteredOptions.length === 1) {
          onChange(filteredOptions[0]);
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div 
      className="form-group" 
      ref={containerRef} 
      style={{ position: 'relative', marginBottom: '1.5rem' }}
      onKeyDown={handleKeyDown}
    >
      <label className="form-label">
        {label} {required && '*'}
      </label>
      
      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--border-radius-md)',
          border: isOpen ? '1px solid var(--primary-burgundy)' : '1px solid rgba(128, 10, 63, 0.1)',
          backgroundColor: 'rgba(253, 251, 247, 0.5)',
          color: value ? 'var(--text-dark)' : 'var(--text-light)',
          fontSize: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 4px rgba(128, 10, 63, 0.06)' : 'none',
          transition: 'all 0.3s ease',
          userSelect: 'none',
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDown 
          size={18} 
          style={{ 
            color: 'var(--primary-burgundy)', 
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }} 
        />
      </div>

      {/* Dropdown Menu (Glassmorphism Styled) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid rgba(128, 10, 63, 0.15)',
            background: 'rgba(253, 251, 247, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 12px 30px rgba(128, 10, 63, 0.12)',
            overflow: 'hidden',
            animation: 'fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box */}
          {searchable && (
            <div 
              style={{ 
                position: 'relative', 
                padding: '6px', 
                borderBottom: '1px solid rgba(128, 10, 63, 0.05)' 
              }}
              onClick={(e) => e.stopPropagation()} // Stop closing dropdown
            >
              <Search 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-light)' 
                }} 
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(-1);
                }}
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.2rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(128, 10, 63, 0.08)',
                  backgroundColor: 'white',
                  color: 'var(--text-dark)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="hide-scrollbar"
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div 
                style={{ 
                  padding: '1rem', 
                  textAlign: 'center', 
                  color: 'var(--text-light)', 
                  fontSize: '0.9rem' 
                }}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option === value;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <div
                    key={option}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '0.7rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      color: isSelected ? 'var(--primary-burgundy)' : 'var(--text-dark)',
                      backgroundColor: isSelected 
                        ? 'var(--secondary-gold-light)' 
                        : isHighlighted 
                        ? 'rgba(128, 10, 63, 0.04)' 
                        : 'transparent',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {option}
                    </span>
                    {isSelected && (
                      <Check size={16} style={{ color: 'var(--primary-burgundy)', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
