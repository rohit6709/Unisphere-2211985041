import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Eye, FileText, MapPin, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cancelEvent, deleteEvent, getAllEvents, getEventLogs, toggleFeatured, updateEvent } from '@/services/eventService';
import { useAuth } from '@/context/AuthContext';

const INPUT_CLASS = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-950';

const emptyEditForm = {
  title: '',
  description: '',
  eventType: 'other',
  startsAt: '',
  endsAt: '',
  registrationDeadline: '',
  venueName: '',
  venueBuilding: '',
  maxParticipants: 1,
};

export default function EventAdminPage() {
  useDocumentTitle('Event Administration | Unisphere');
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [editForm, setEditForm] = React.useState(emptyEditForm);
  const [cancelReason, setCancelReason] = React.useState('');

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event-admin-list', search, statusFilter],
    queryFn: () => getAllEvents({ page: 1, limit: 200, search: search || undefined, status: statusFilter || undefined }),
  });

  const { data: logData, isLoading: logsLoading } = useQuery({
    queryKey: ['event-admin-logs', selectedEvent?.club?._id, selectedEvent?._id],
    queryFn: () => getEventLogs(selectedEvent.club._id, selectedEvent._id),
    enabled: Boolean(selectedEvent?._id && selectedEvent?.club?._id),
  });

  React.useEffect(() => {
    if (!selectedEvent) return;
    setEditForm({
      title: selectedEvent.title || '',
      description: selectedEvent.description || '',
      eventType: selectedEvent.eventType || 'other',
      startsAt: selectedEvent.startsAt ? new Date(selectedEvent.startsAt).toISOString().slice(0, 16) : '',
      endsAt: selectedEvent.endsAt ? new Date(selectedEvent.endsAt).toISOString().slice(0, 16) : '',
      registrationDeadline: selectedEvent.registrationDeadline ? new Date(selectedEvent.registrationDeadline).toISOString().slice(0, 16) : '',
      venueName: selectedEvent.venue?.name || '',
      venueBuilding: selectedEvent.venue?.building || '',
      maxParticipants: selectedEvent.maxParticipants || 1,
    });
    setCancelReason('');
  }, [selectedEvent]);

  const events = eventData?.events || [];
  const logs = logData?.logs || logData || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['event-admin-list'] });
    if (selectedEvent?._id) {
      queryClient.invalidateQueries({ queryKey: ['event-admin-logs', selectedEvent.club._id, selectedEvent._id] });
    }
  };

  const featuredMutation = useMutation({
    mutationFn: (eventId) => toggleFeatured(eventId),
    onSuccess: () => {
      toast.success('Featured status updated');
      refresh();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to update featured status'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ clubId, eventId, payload }) => updateEvent(clubId, eventId, payload),
    onSuccess: () => {
      toast.success('Event updated');
      refresh();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to update event'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ clubId, eventId, reason }) => cancelEvent(clubId, eventId, { cancellationReason: reason }),
    onSuccess: () => {
      toast.success('Event cancelled');
      refresh();
      setSelectedEvent(null);
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId) => deleteEvent(eventId),
    onSuccess: () => {
      toast.success('Event deleted');
      refresh();
      setSelectedEvent(null);
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to delete event'),
  });

  const saveEvent = () => {
    if (!selectedEvent?.club?._id) return;
    updateMutation.mutate({
      clubId: selectedEvent.club._id,
      eventId: selectedEvent._id,
      payload: {
        title: editForm.title,
        description: editForm.description,
        eventType: editForm.eventType,
        startsAt: editForm.startsAt,
        endsAt: editForm.endsAt,
        registrationDeadline: editForm.registrationDeadline,
        venue: {
          name: editForm.venueName,
          building: editForm.venueBuilding,
        },
        maxParticipants: Number(editForm.maxParticipants),
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Event Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Search all events, review status changes, edit pending drafts safely, cancel with reason, toggle featured visibility, and inspect approval history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search events by title or description"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="live">Live</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : events.length ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <article key={event._id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{event.club?.name || 'Club event'}</p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{event.title}</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{event.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(event.startsAt).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.venue?.name || 'TBA'}</span>
                    <span className={`rounded-full px-2 py-1 font-semibold ${
                      event.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : event.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setSelectedEvent(event)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => featuredMutation.mutate(event._id)}
                    isLoading={featuredMutation.isPending && featuredMutation.variables === event._id}
                  >
                    <Star className="mr-2 h-4 w-4" /> {event.isFeatured ? 'Unfeature' : 'Feature'}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No events found" description="Try different filters or search terms." icon={CalendarDays} />
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="mx-auto mt-6 max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{selectedEvent.club?.name || 'Club event'}</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{selectedEvent.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Details</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Title">
                      <input value={editForm.title} onChange={(event) => setEditForm((state) => ({ ...state, title: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Type">
                      <select value={editForm.eventType} onChange={(event) => setEditForm((state) => ({ ...state, eventType: event.target.value }))} className={INPUT_CLASS}>
                        <option value="workshop">Workshop</option>
                        <option value="seminar">Seminar</option>
                        <option value="competition">Competition</option>
                        <option value="cultural">Cultural</option>
                        <option value="sports">Sports</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Starts At">
                      <input type="datetime-local" value={editForm.startsAt} onChange={(event) => setEditForm((state) => ({ ...state, startsAt: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Ends At">
                      <input type="datetime-local" value={editForm.endsAt} onChange={(event) => setEditForm((state) => ({ ...state, endsAt: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Registration Deadline">
                      <input type="datetime-local" value={editForm.registrationDeadline} onChange={(event) => setEditForm((state) => ({ ...state, registrationDeadline: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Max Participants">
                      <input type="number" min="1" value={editForm.maxParticipants} onChange={(event) => setEditForm((state) => ({ ...state, maxParticipants: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Venue Name">
                      <input value={editForm.venueName} onChange={(event) => setEditForm((state) => ({ ...state, venueName: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Venue Building">
                      <input value={editForm.venueBuilding} onChange={(event) => setEditForm((state) => ({ ...state, venueBuilding: event.target.value }))} className={INPUT_CLASS} />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea rows={4} value={editForm.description} onChange={(event) => setEditForm((state) => ({ ...state, description: event.target.value }))} className={INPUT_CLASS} />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={saveEvent} isLoading={updateMutation.isPending}>Save Changes</Button>
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actions</h3>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Cancel Event</p>
                      <textarea
                        rows={4}
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        className={`${INPUT_CLASS} mt-3`}
                        placeholder="Required when cancelling an event"
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          className="text-red-600"
                          onClick={() => cancelMutation.mutate({ clubId: selectedEvent.club._id, eventId: selectedEvent._id, reason: cancelReason })}
                          isLoading={cancelMutation.isPending}
                        >
                          Cancel Event
                        </Button>
                      </div>
                    </div>

                    {role === 'superadmin' && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          className="text-red-600"
                          onClick={() => deleteMutation.mutate(selectedEvent._id)}
                          isLoading={deleteMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                        </Button>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Logs</h3>
                  </div>
                  {logsLoading ? (
                    <div className="mt-4 space-y-3">
                      {[1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full rounded-2xl" />)}
                    </div>
                  ) : logs.length ? (
                    <div className="mt-4 space-y-3">
                      {logs.map((log) => (
                        <div key={log._id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatAction(log.action)}</p>
                          <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                          {log.reason && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{log.reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No logs found for this event.</p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function formatAction(action) {
  return (action || 'update')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
