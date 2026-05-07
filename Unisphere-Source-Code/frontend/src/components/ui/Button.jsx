import React from 'react';
import { cn } from '@/utils/cn';

export const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[var(--primary)] text-white hover:bg-blue-700 active:bg-blue-800 shadow-[0_0_15px_var(--primary-glow)]',
      secondary: 'bg-[var(--bg-card-alt)] text-[var(--text-h)] hover:bg-gray-200 dark:hover:bg-[#2d3748] border border-[var(--border)]',
      outline: 'bg-transparent border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-glow)]',
      ghost: 'bg-transparent text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--bg-card-alt)]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      default: 'h-10 px-4 py-2',
      lg: 'h-12 px-8 text-lg',
      icon: 'h-10 w-10 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-[var(--bg)]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';