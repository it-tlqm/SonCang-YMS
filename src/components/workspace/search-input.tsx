'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className = '',
  autoFocus = false,
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-9 pl-9 pr-8 text-xs bg-white text-[#17202E] placeholder-[#98A2B3] border border-[#E5E9F0] rounded-lg transition-all focus:outline-none focus:border-[#326DD8] focus:ring-3 focus:ring-[rgba(50,109,216,0.12)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 rounded-full text-[#98A2B3] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors"
          title="Xóa tìm kiếm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
