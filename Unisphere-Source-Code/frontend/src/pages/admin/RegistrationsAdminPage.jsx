import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ListChecks, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAllEvents } from '@/services/eventService';
import { api } from '@/api/axios';
import { exportRegistrations, getEventRegistrations } from '@/services/registrationService';

export default function RegistrationsAdminPage() {
  useDocumentTitle('Registrations Administration | Unisphere');
  const queryClient = useQueryClient();
  const [eventId, setEventId] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState([]);

  const { data: eventListData } = useQuery({
    queryKey: ['registration-admin-events'],
    queryFn: () => getAllEvents({ page: 1, limit: 300 }),
  });

  const { data: registrationsData, isLoading } = useQuery({
    queryKey: ['registration-admin-event-detail', eventId, statusFilter, search],
    queryFn: () => getEventRegistrations(eventId, { page: 1, limit: 200, status: statusFilter || undefined, search: search || undefined }),
    enabled: Boolean(eventId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ registrationId, status }) => api.patch(`/api/v1/event-registrations/${eventId}/registrations/${registrationId}/status`, { status }),
    onSuccess: () => {
      toast.success('Registration status updated');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['registration-admin-event-detail', eventId] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to update registration'),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ status }) => api.patch(`/api/v1/event-registrations/${eventId}/registrations/bulk-status`, { registrationIds: selectedIds, status }),
    onSuccess: () => {
      toast.success('Bulk status update applied');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['registration-admin-event-detail', eventId] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Bulk update failed'),
  });

  const events = eventListData?.events || [];
  const registrations = registrationsData?.registrations || [];
  const summary = registrationsData?.summary || {};

  const handleExport = async () => {
    if (!eventId) {
      toast.error('Select an event first');
      return;
    }
    try {
      const response = await exportRegistrations(eventId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'event_registrations.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to export registrations');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Registrations Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Select an event, review registrants, filter by status, export attendance CSV, and apply single or bulk attendance outcomes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.9fr_1fr_auto]">
        <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <option value="">Select event</option>
          {events.map((event) => (
            <option key={event._id} value={event._id}>
              {event.title} {event.club?.name ? `- ${event.club.name}` : ''}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="cancelled">Cancelled</option>
          <option value="attended">Attended</option>
          <option value="no_show">No-show</option>
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student name or roll no" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900" />
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {eventId && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Registered" value={summary.registered || 0} />
          <SummaryCard label="Attended" value={summary.attended || 0} />
          <SummaryCard label="Cancelled" value={summary.cancelled || 0} />
          <SummaryCard label="No-show" value={summary.no_show || 0} />
        </div>
      )}

      {!eventId ? (
        <EmptyState title="Select an event" description="Choose an event from the dropdown to inspect registrations and attendance." icon={ListChecks} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : registrations.length ? (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.length} selected
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => bulkMutation.mutate({ status: 'attended' })} isLoading={bulkMutation.isPending}>Bulk Mark Attended</Button>
              <Button variant="outline" onClick={() => bulkMutation.mutate({ status: 'no_show' })} isLoading={bulkMutation.isPending}>Bulk Mark No-show</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={registrations.length > 0 && selectedIds.length === registrations.length}
                      onChange={(event) => setSelectedIds(event.target.checked ? registrations.map((registration) => registration._id) : [])}
                    />
                  </th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(registration._id)}
                        onChange={(event) => {
                          setSelectedIds((current) => (
                            event.target.checked ? [...current, registration._id] : current.filter((id) => id !== registration._id)
                          ));
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{registration.student?.name}</td>
                    <td className="px-4 py-3">{registration.student?.rollNo}</td>
                    <td className="px-4 py-3">{registration.student?.department || 'N/A'}</td>
                    <td className="px-4 py-3 capitalize">{registration.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{registration.registeredAt ? new Date(registration.registeredAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => statusMutation.mutate({ registrationId: registration._id, status: 'attended' })}
                          isLoading={statusMutation.isPending && statusMutation.variables?.registrationId === registration._id}
                        >
                          Attend
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => statusMutation.mutate({ registrationId: registration._id, status: 'no_show' })}
                          isLoading={statusMutation.isPending && statusMutation.variables?.registrationId === registration._id}
                        >
                          No-show
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="No registrations found" description="There are no registrations matching the current filters." icon={Users} />
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
