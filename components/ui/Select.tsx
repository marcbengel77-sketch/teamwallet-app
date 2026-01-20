
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder,
  label,
  disabled,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleOptionClick = useCallback((optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
  }, [onValueChange]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div ref={selectRef} className={`relative ${className || ''}`} {...props}>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>}
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className="truncate">{selectedOption?.label || placeholder || 'Select an option'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </Button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="py-2 px-3 text-gray-500">No options available</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${
                  option.value === value ? 'bg-blue-50 text-blue-700' : ''
                }`}
                onClick={() => handleOptionClick(option.value)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
