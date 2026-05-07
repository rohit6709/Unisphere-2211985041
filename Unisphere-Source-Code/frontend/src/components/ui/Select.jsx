import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Select = React.forwardRef(
  ({ className, error, options = [], placeholder = 'Select an option', ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 pr-10 text-sm text-[var(--text-h)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-[var(--red)] focus:ring-[var(--red)]',
              className
            )}
            {...props}
          >
            {placeholder !== null && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text)] opacity-70" />
        </div>
        {error && <p className="mt-1 text-sm text-[var(--red)]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
