import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CalendarDays,
  Building2,
  User,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  X,
  MessageSquare,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { ApprovalModal } from '@/components/features/ReviewModal';
import { getAdviseePendingEvents, getEventLogs, reviewEvent } from '@/services/eventService';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function EventReviewPage() {
  useDocumentTitle('Event Review Queue | Unisphere');
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const normalizeList = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.events)) return value.events;
    if (Array.isArray(value?.logs)) return value.logs;
    return [];
  };

  const { data: eventsData, isLoading, isError, error } = useQuery({
    queryKey: ['advisee-pending-events'],
    queryFn: () => getAdviseePendingEvents(),
  });

  const events = useMemo(() => normalizeList(eventsData), [eventsData]);

  const reviewMutation = useMutation({
    mutationFn: ({ clubId, eventId, action, reason, comment }) =>
      reviewEvent(clubId, eventId, {
        action,
        rejectionReason: reason,
        comment,
      }),
    onSuccess: (_, variables) => {
      toast.success(`Event ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['advisee-pending-events'] });
      setSelectedEvent(null);
      setReviewComment('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'Review action failed');
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['event-review-logs', selectedEvent?.club?._id, selectedEvent?._id],
    queryFn: () => getEventLogs(selectedEvent.club._id, selectedEvent._id),
    enabled: Boolean(selectedEvent?._id && selectedEvent?.club?._id),
  });

  const logs = useMemo(() => normalizeList(logsData), [logsData]);

  const pendingCountByClub = useMemo(
    () => events.reduce((acc, event) => {
      const clubId = event?.club?._id;
      if (!clubId) return acc;
      acc[clubId] = (acc[clubId] || 0) + 1;
      return acc;
    }, {}),
    [events]
  );

  const handleApprove = (event, commentOverride = reviewComment) => {
    if (!window.confirm('Are you sure you want to approve this event?')) return;
    reviewMutation.mutate({
      clubId: event.club._id,
      eventId: event._id,
      action: 'approve',
      reason: '',
      comment: commentOverride.trim(),
    });
  };

  const handleReject = () => {
    if (!selectedEvent) return;
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState
          title="Unable to load approval queue"
          description={error?.response?.data?.message || error?.message || 'Please refresh and try again.'}
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold dark:text-white tracking-tight">Review Queue</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Carefully review event proposals from clubs you advise. Open a request to review full details, logs,
            and submit an approval decision with comments.
          </p>
        </div>
        {events && events.length > 0 && (
          <span className="px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-full">
            {events.length} pending
          </span>
        )}
      </div>

      {!events.length ? (
        <EmptyState
          title="Queue is clear"
          description="There are no pending event proposals for your advised clubs at the moment."
          icon={ClipboardCheck}
        />
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <Motion.div
              key={event._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                        {event.club?.name}
                      </span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
                        {event.status?.replace('_', ' ')}
                      </span>
                      <span className="text-gray-300 dark:text-gray-700">|</span>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{event.eventType}</span>
                      <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                        Pending in club: {pendingCountByClub[event.club?._id] || 0}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{event.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">{event.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SummaryItem icon={CalendarDays} label="Date & Time" value={`${new Date(event.startsAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
                      <SummaryItem icon={Building2} label="Venue" value={event.venue?.name || 'TBA'} />
                      <SummaryItem icon={User} label="Submitted By" value={event.submittedBy?.name || 'Unknown'} />
                      <SummaryItem icon={Clock} label="Registration Deadline" value={new Date(event.registrationDeadline).toLocaleDateString()} />
                    </div>
                  </div>

                  <div className="lg:w-64 flex flex-col gap-3 justify-center pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 lg:pl-8 shrink-0">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 w-full shadow-sm"
                      onClick={() => {
                        setReviewComment('');
                        setSelectedEvent(event);
                      }}
                      aria-label="Open review modal for this event"
                    >
                      Open Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewComment('');
                        handleApprove(event, '');
                      }}
                      disabled={reviewMutation.isPending}
                    >
                      Quick Approve
                    </Button>
                    <Link
                      to={`/events/${event._id}`}
                      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <ExternalLink className="w-4 h-4" /> Public Event View
                    </Link>
                  </div>
                </div>
              </div>

              {event.hasConflict && (
                <div className="bg-amber-50/50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20 px-6 py-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase tracking-widest block mb-1">
                      Scheduling Conflict Detected
                    </span>
                    <p className="text-sm text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                      {event.conflictDetails || 'Potential schedule overlap found.'}
                    </p>
                  </div>
                </div>
              )}
            </Motion.div>
          ))}
        </div>
      )}

      <ApprovalModal
        open={Boolean(selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          setReviewComment('');
        }}
        title="Review Event Proposal"
        subtitle={selectedEvent?.title}
        comment={reviewComment}
        onCommentChange={setReviewComment}
        onApprove={() => selectedEvent && handleApprove(selectedEvent)}
        onReject={handleReject}
        rejectLabel="Reject with Comment"
        approveLabel="Approve Event"
        closeLabel="Cancel"
        isSubmitting={reviewMutation.isPending}
        commentPlaceholder="Optional for approval, required for rejection. Capture guidance for the club leadership."
      >
        {selectedEvent && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReviewInfo icon={CalendarDays} label="Date" value={new Date(selectedEvent.startsAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} />
              <ReviewInfo icon={Clock} label="Time" value={`${new Date(selectedEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
              <ReviewInfo icon={MapPin} label="Location" value={[selectedEvent.venue?.name, selectedEvent.venue?.building].filter(Boolean).join(', ') || 'TBA'} />
              <ReviewInfo icon={CheckCircle2} label="Status" value={selectedEvent.status?.replace('_', ' ') || 'pending approval'} />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Description</p>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
            </div>

            {selectedEvent.rejectionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">Latest Rejection Reason</p>
                <p className="text-sm text-red-800 dark:text-red-200">{selectedEvent.rejectionReason}</p>
              </div>
            )}

            {selectedEvent.hasConflict && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Conflict Alert</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{selectedEvent.conflictDetails || 'Potential scheduling conflict detected.'}</p>
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <FileText className="w-4 h-4" /> Review Logs
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                {logsLoading ? (
                  <p className="text-sm text-gray-500">Loading logs...</p>
                ) : logs.length ? (
                  logs.map((log) => (
                    <div key={log._id} className="border-b border-gray-100 pb-2 text-sm last:border-b-0 dark:border-gray-800">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{formatAction(log.action)}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                      {log.performedBy?.name && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">By {log.performedBy.name}</p>}
                      {(log.reason || log.metadata?.details) && <p className="mt-1 text-gray-600 dark:text-gray-400">{log.reason || log.metadata?.details}</p>}
                      {(log.fromStatus || log.toStatus) && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{log.fromStatus || 'none'} to {log.toStatus || 'none'}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No logs found for this event yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </ApprovalModal>
    </div>
  );
}

function ReviewInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {React.createElement(icon, { className: 'h-4 w-4' })}
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md">
        {React.createElement(icon, { className: 'w-4 h-4' })}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
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

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Skeleton className="h-24 w-1/2" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  );
}
