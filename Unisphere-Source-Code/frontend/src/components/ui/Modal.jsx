import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  className,
  contentClassName,
  size = 'lg',
  closeOnBackdrop = true,
  footer = null,
}) => {
  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }[size] || 'max-w-4xl';

  return (
    <div
      className={cn('fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm', className)}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={cn(
          'mx-auto mt-6 max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900',
          sizeClass,
          contentClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  );
};
