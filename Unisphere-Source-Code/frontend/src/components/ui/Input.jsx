import React from 'react';
import { cn } from '@/utils/cn';

export const Input = React.forwardRef(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--red)] focus:ring-[var(--red)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[var(--red)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';