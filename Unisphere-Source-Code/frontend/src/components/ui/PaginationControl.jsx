import React from 'react';
import { Button } from '@/components/ui/Button';

export function PaginationControl({
  page = 1,
  totalPages = 1,
  onPageChange,
  isLoading = false,
  label,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500">
        {label ? `${label} | ` : ''}Page {page} of {totalPages}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={page >= totalPages || isLoading} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
