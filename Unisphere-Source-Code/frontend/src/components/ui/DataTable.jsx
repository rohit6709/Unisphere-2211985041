import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaginationControl } from '@/components/ui/PaginationControl';
import { cn } from '@/utils/cn';

export function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  emptyTitle = 'No records found',
  emptyDescription = 'There is nothing to show right now.',
  emptyIcon,
  sortState,
  onSortChange,
  bulkActions = [],
  selectedRowIds = [],
  onSelectedRowIdsChange,
  pagination,
  className,
}) {
  const selectable = Boolean(onSelectedRowIdsChange);
  const selectedSet = new Set(selectedRowIds);
  const allVisibleSelected = data.length > 0 && data.every((row) => selectedSet.has(getRowKey(row, rowKey)));

  const toggleAllVisible = (checked) => {
    if (!onSelectedRowIdsChange) return;
    const visibleIds = data.map((row) => getRowKey(row, rowKey));
    if (checked) {
      onSelectedRowIdsChange(Array.from(new Set([...selectedRowIds, ...visibleIds])));
      return;
    }
    onSelectedRowIdsChange(selectedRowIds.filter((id) => !visibleIds.includes(id)));
  };

  const toggleRow = (id, checked) => {
    if (!onSelectedRowIdsChange) return;
    if (checked) {
      onSelectedRowIdsChange([...selectedRowIds, id]);
      return;
    }
    onSelectedRowIdsChange(selectedRowIds.filter((item) => item !== id));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {bulkActions.length > 0 && selectable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">{selectedRowIds.length} selected</p>
          <div className="flex flex-wrap gap-3">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || 'outline'}
                onClick={() => action.onClick(selectedRowIds)}
                disabled={!selectedRowIds.length || action.disabled}
                isLoading={action.isLoading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!data.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  {selectable && (
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} />
                    </th>
                  )}
                  {columns.map((column) => {
                    const sortable = column.sortable && onSortChange;
                    const activeDirection = sortState?.key === column.key ? sortState.direction : null;
                    return (
                      <th key={column.key} className="px-4 py-3">
                        {sortable ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 font-semibold"
                            onClick={() => onSortChange(column.key, activeDirection === 'asc' ? 'desc' : 'asc')}
                          >
                            {column.header}
                            <ArrowUpDown className={`h-3.5 w-3.5 ${activeDirection ? 'text-indigo-600' : ''}`} />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => {
                  const id = getRowKey(row, rowKey);
                  const selected = selectedSet.has(id);
                  return (
                    <tr key={id ?? index} className="border-t border-gray-100 dark:border-gray-800">
                      {selectable && (
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected} onChange={(event) => toggleRow(id, event.target.checked)} />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 align-top">
                          {column.cell ? column.cell(row) : row[column.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && (
        <PaginationControl
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          isLoading={pagination.isLoading}
          label={pagination.label}
        />
      )}
    </div>
  );
}

function getRowKey(row, rowKey) {
  return typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey];
}
