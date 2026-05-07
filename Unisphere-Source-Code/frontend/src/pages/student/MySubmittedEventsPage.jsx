import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, FileClock, FileSearch, PlusCircle } from 'lucide-react';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { getMySubmittedEvents } from '@/services/eventService';
import { cn } from '@/utils/cn';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  live: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function MySubmittedEventsPage() {
  useDocumentTitle('My Submitted Events | Unisphere');
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState('');

  const eventsQuery = useQuery({
    queryKey: ['my-submitted-events', statusFilter],
    queryFn: () =>
      getMySubmittedEvents({
        page: 1,
        limit: 100,
        status: statusFilter || undefined,
      }),
  });

  const events = eventsQuery.data?.events || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">My Submitted Events</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track draft, rejected, and approval progress for events you created.
          </p>
        </div>
        <Button onClick={() => navigate('/events/create')} className="rounded-xl">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Event
        </Button>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'draft', label: 'Draft' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'approved', label: 'Approved' },
          { value: 'live', label: 'Live' },
        ].map((option) => (
          <button
            key={option.value || 'all'}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition',
              statusFilter === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            {option.label}
          </button>
        ))}
      </section>

      {eventsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No submitted events yet"
          description="Create your first event draft to start the approval workflow."
          action={
            <Button onClick={() => navigate('/events/create')} className="rounded-xl">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Event
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const statusClass = STATUS_STYLES[event.status] || STATUS_STYLES.cancelled;
            const canEdit = ['draft', 'rejected'].includes(event.status);

            return (
              <article
                key={event._id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                      {event.club?.name || 'Club Event'}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{event.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <CalendarClock className="h-4 w-4" />
                      {new Date(event.startsAt).toLocaleString()}
                    </p>
                  </div>

                  <span className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest', statusClass)}>
                    {event.status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={`/events/${event._id}`}>
                    <Button variant="outline" className="rounded-xl">View Public Page</Button>
                  </Link>
                  {canEdit && (
                    <Link to={`/events/${event._id}/edit?clubId=${event.club?._id || ''}`}>
                      <Button className="rounded-xl">Edit and Resubmit</Button>
                    </Link>
                  )}
                  {!canEdit && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                      <FileClock className="h-4 w-4" />
                      Locked while review/progress is active
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
