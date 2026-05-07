import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SearchBar({ value, onChange, placeholder = 'Search', className, onClear }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
