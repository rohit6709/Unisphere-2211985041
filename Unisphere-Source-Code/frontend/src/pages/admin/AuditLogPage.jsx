import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, History, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/api/axios';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AuditLogPage() {
  useDocumentTitle('Audit Logs | Unisphere');
  const [search, setSearch] = React.useState('');
  const [actionType, setActionType] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log-admin', search, actionType, startDate, endDate, page],
    queryFn: async () => {
      const response = await api.get('/api/v1/audit/logs', {
        params: {
          page,
          limit: 25,
          search: search || undefined,
          actionType: actionType || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return response.data.data;
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  const exportLogs = async () => {
    try {
      const response = await api.get('/api/v1/audit/logs/export', {
        params: {
          search: search || undefined,
          actionType: actionType || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit_logs.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to export logs');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Search by username, action, or resource, filter by action type and date range, and export the current ledger view for compliance and incident review.
          </p>
        </div>
        <Button variant="outline" onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" /> Export Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search username, action, event, or club"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm dark:border-gray-800 dark:bg-gray-900"
          />
        </div>
        <select value={actionType} onChange={(event) => { setActionType(event.target.value); setPage(1); }} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <option value="">All action types</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
        <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900" />
        <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : logs.length ? (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{log.performedBy?.name || 'System'}</div>
                      <div className="text-xs text-gray-500">{log.performedByModel || 'System'}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{log.action.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <div>{log.event?.title || log.club?.name || '-'}</div>
                      {log.club?.name && <div className="text-xs text-gray-500">{log.club.name}</div>}
                    </td>
                    <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-md text-gray-600 dark:text-gray-400">{log.reason || [log.fromStatus, log.toStatus].filter(Boolean).join(' to ') || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
              <span className="text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState title="No audit logs found" description="Try broadening the filters to inspect more audit activity." icon={History} />
      )}
    </div>
  );
}
