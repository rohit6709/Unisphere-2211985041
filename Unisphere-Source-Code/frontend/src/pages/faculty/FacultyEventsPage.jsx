import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  MessageSquare,
  Search,
  User,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/context/AuthContext';
import { getAdviseePendingEvents, getEventLogs, reviewEvent } from '@/services/eventService';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const INITIAL_PAGE_SIZE = 500;

export default function FacultyEventsPage() {
  useDocumentTitle('Faculty Events | Unisphere');
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const { data: eventsData, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['faculty-events', INITIAL_PAGE_SIZE],
    queryFn: () => getAdviseePendingEvents({ page: 1, limit: INITIAL_PAGE_SIZE }),
    keepPreviousData: true,
  });

  const allEvents = useMemo(() => normalizeList(eventsData), [eventsData]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allEvents.filter((event) => {
      if (statusFilter && event.status !== statusFilter) return false;
      if (!query) return true;

      const haystack = [
        event.title,
        event.description,
        event.eventType,
        event.status,
        event.club?.name,
        event.submittedBy?.name,
        event.venue?.name,
        event.venue?.building,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [allEvents, search, statusFilter]);

  const selectedEventLogsQuery = useQuery({
    queryKey: ['faculty-event-logs', selectedEvent?.club?._id, selectedEvent?._id],
    queryFn: () => getEventLogs(selectedEvent.club._id, selectedEvent._id),
    enabled: Boolean(selectedEvent?._id && selectedEvent?.club?._id),
  });

  const logs = useMemo(() => normalizeList(selectedEventLogsQuery.data), [selectedEventLogsQuery.data]);

  const reviewMutation = useMutation({
    mutationFn: ({ clubId, eventId, action, reason, comment }) =>
      reviewEvent(clubId, eventId, {
        action,
        rejectionReason: reason,
        comment,
      }),
    onSuccess: (_, variables) => {
      toast.success(`Event ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['faculty-events'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-event-logs'] });
      setSelectedEvent(null);
      setReviewComment('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Review action failed');
    },
  });

  const statusSummary = useMemo(() => {
    return allEvents.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {});
  }, [allEvents]);

  const pendingCount = statusSummary.pending_approval || 0;

  const openEvent = (event) => {
    setSelectedEvent(event);
    setReviewComment('');
  };

  const handleApprove = () => {
    if (!selectedEvent) return;
    if (selectedEvent.status !== 'pending_approval') return;

    if (!window.confirm('Are you sure you want to approve this event?')) return;

    reviewMutation.mutate({
      clubId: selectedEvent.club._id,
      eventId: selectedEvent._id,
      action: 'approve',
      reason: '',
      comment: reviewComment.trim(),
    });
  };

  const handleReject = () => {
    if (!selectedEvent) return;
    if (selectedEvent.status !== 'pending_approval') return;
    if (!reviewComment.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    reviewMutation.mutate({
      clubId: selectedEvent.club._id,
      eventId: selectedEvent._id,
      action: 'reject',
      reason: reviewComment.trim(),
      comment: reviewComment.trim(),
    });
  };

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <EmptyState
          title="Unable to load faculty events"
          description={error?.response?.data?.message || error?.message || 'Please refresh and try again.'}
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-3 dark:bg-indigo-900/30">
              <ClipboardCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Faculty Events</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Browse every event from clubs you advise, including pending submissions, approved events, and older records.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900">
              Total {allEvents.length}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
              Pending {pendingCount}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
              Approved {statusSummary.approved || 0}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, club, venue, or status"
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-900"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-400 dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

   
      {isFetching && !isLoading && (
        <p className="text-sm text-gray-500">Refreshing events...</p>
      )}

      {!filteredEvents.length ? (
        <EmptyState
          title="No events found"
          description="Try another search term or status filter."
          icon={ClipboardCheck}
        />
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => (
            <article
              key={event._id}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300">
                      {event.club?.name || 'Club event'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(event.status)}`}>
                      {formatStatus(event.status)}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{event.eventType || 'other'}</span>
                  </div>

                  <h2 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">{event.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{event.description}</p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(event.startsAt).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.venue?.name || 'TBA'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {event.submittedBy?.name || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:w-auto">
                  <Button variant="outline" onClick={() => openEvent(event)}>
                    <FileText className="mr-2 h-4 w-4" /> Details
                  </Button>
                  {event.status === 'pending_approval' && (
                    <Button onClick={() => openEvent(event)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Review
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link to={`/events/${event._id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Public view
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          setReviewComment('');
        }}
        title={selectedEvent?.title || 'Event details'}
        description={selectedEvent?.club?.name ? `${selectedEvent.club.name} event` : undefined}
        size="xl"
      >
        {selectedEvent && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard icon={CalendarDays} label="Date" value={new Date(selectedEvent.startsAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} />
              <InfoCard icon={Clock} label="Time" value={`${new Date(selectedEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
              <InfoCard icon={Building2} label="Venue" value={[selectedEvent.venue?.name, selectedEvent.venue?.building].filter(Boolean).join(', ') || 'TBA'} />
              <InfoCard icon={CheckCircle2} label="Status" value={formatStatus(selectedEvent.status)} />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Description</p>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
            </div>

            {selectedEvent.rejectionReason && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">Latest Rejection Reason</p>
                <p className="text-sm text-red-800 dark:text-red-200">{selectedEvent.rejectionReason}</p>
              </div>
            )}

            {selectedEvent.hasConflict && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Conflict Alert</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{selectedEvent.conflictDetails || 'Potential scheduling conflict detected.'}</p>
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <FileText className="h-4 w-4" /> Review Logs
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
                {selectedEventLogsQuery.isLoading ? (
                  <p className="text-sm text-gray-500">Loading logs...</p>
                ) : logs.length ? (
                  logs.map((log) => (
                    <div key={log._id} className="border-b border-gray-100 pb-2 text-sm last:border-b-0 dark:border-gray-800">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{formatAction(log.action)}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                      {log.performedBy?.name && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">By {log.performedBy.name}</p>}
                      {(log.reason || log.metadata?.details) && <p className="mt-1 text-gray-600 dark:text-gray-400">{log.reason || log.metadata?.details}</p>}
                      {(log.fromStatus || log.toStatus) && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {log.fromStatus || 'none'} to {log.toStatus || 'none'}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No logs found for this event yet.</p>
                )}
              </div>
            </div>

            {selectedEvent.status === 'pending_approval' ? (
              <div className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Decision Comment</span>
                  <Textarea
                    rows={5}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Optional for approval, required for rejection."
                    className="rounded-2xl"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedEvent(null)} disabled={reviewMutation.isPending}>
                    <X className="mr-2 h-4 w-4" /> Close
                  </Button>
                  <Button variant="outline" className="text-red-600" onClick={handleReject} isLoading={reviewMutation.isPending}>
                    Reject
                  </Button>
                  <Button onClick={handleApprove} isLoading={reviewMutation.isPending}>
                    Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  <X className="mr-2 h-4 w-4" /> Close
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/events/${selectedEvent._id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open public view
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.events)) return value.events;
  if (Array.isArray(value?.logs)) return value.logs;
  return [];
}

function formatStatus(status) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ');
}

function statusBadgeClass(status) {
  if (status === 'approved' || status === 'live') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
  }
  if (status === 'pending_approval') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  }
  if (status === 'rejected' || status === 'cancelled') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {React.createElement(icon, { className: 'h-4 w-4' })}
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <Skeleton className="h-24 w-1/2" />
      {[1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="h-32 w-full rounded-3xl" />
      ))}
    </div>
  );
}

function formatAction(action) {
  if (!action) return 'Update';
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
