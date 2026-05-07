import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarDays, CheckCircle2, ClipboardList, FileText, MessageSquare, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPendingClubs, reviewClubRequest } from '@/services/clubService';
import { getAllFaculty } from '@/services/authService';
import { getGlobalPendingRequests, getEventLogs, reviewEvent } from '@/services/eventService';

export default function ApprovalCenter() {
  useDocumentTitle('Approval Center | Unisphere');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('clubs');
  const [selectedClub, setSelectedClub] = React.useState(null);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [comment, setComment] = React.useState('');
  const [advisorEmployeeId, setAdvisorEmployeeId] = React.useState('');

  const { data: pendingClubData, isLoading: clubsLoading } = useQuery({
    queryKey: ['admin-pending-clubs'],
    queryFn: () => getPendingClubs(),
  });

  const { data: pendingRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin-pending-requests'],
    queryFn: () => getGlobalPendingRequests(),
  });

  const { data: facultyData } = useQuery({
    queryKey: ['admin-faculty-approval-directory'],
    queryFn: () => getAllFaculty({ page: 1, limit: 500, isActive: true }),
  });

  const { data: logData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-event-logs', selectedEvent?.club?._id, selectedEvent?._id],
    queryFn: () => getEventLogs(selectedEvent.club._id, selectedEvent._id),
    enabled: Boolean(selectedEvent?._id && selectedEvent?.club?._id),
  });

  const clubReviewMutation = useMutation({
    mutationFn: ({ clubId, payload }) => reviewClubRequest(clubId, payload),
    onSuccess: () => {
      toast.success('Club request reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests'] });
      setSelectedClub(null);
      setComment('');
      setAdvisorEmployeeId('');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Club review failed');
    },
  });

  const eventReviewMutation = useMutation({
    mutationFn: ({ clubId, eventId, payload }) => reviewEvent(clubId, eventId, payload),
    onSuccess: () => {
      toast.success('Event reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests'] });
      setSelectedEvent(null);
      setComment('');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Event review failed');
    },
  });

  const clubs = pendingClubData || [];
  const events = pendingRequestsData?.events || [];
  const faculty = facultyData?.faculty || [];
  const logs = logData?.logs || logData || [];
  const isLoading = clubsLoading || requestsLoading;

  const openClub = (club) => {
    setSelectedEvent(null);
    setSelectedClub(club);
    setComment(club.rejectionReason || '');
    setAdvisorEmployeeId('');
  };

  const openEvent = (event) => {
    setSelectedClub(null);
    setSelectedEvent(event);
    setComment(event.rejectionReason || '');
  };

  const handleClubAction = (action) => {
    if (!selectedClub) return;
    if (action === 'approve' && !advisorEmployeeId && !(selectedClub.advisors || []).length) {
      toast.error('Select an advisor before approving this club request');
      return;
    }
    if (action === 'reject' && !comment.trim()) {
      toast.error('Feedback comment is required for rejection');
      return;
    }

    clubReviewMutation.mutate({
      clubId: selectedClub._id,
      payload: {
        action,
        rejectionReason: action === 'reject' ? comment.trim() : undefined,
        advisorEmployeeId: action === 'approve' ? advisorEmployeeId || undefined : undefined,
      },
    });
  };

  const handleEventAction = (action) => {
    if (!selectedEvent) return;
    if (action === 'reject' && !comment.trim()) {
      toast.error('Comment is required for rejection');
      return;
    }

    eventReviewMutation.mutate({
      clubId: selectedEvent.club._id,
      eventId: selectedEvent._id,
      payload: {
        action,
        rejectionReason: action === 'reject' ? comment.trim() : '',
        comment: comment.trim(),
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Approval Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Review pending club requests and event submissions with complete context, advisor assignment, decision comments, and audit-ready event logs.
          </p>
        </div>
        <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
          <MetricCard label="Pending Clubs" value={clubs.length} icon={Building2} />
          <MetricCard label="Pending Events" value={events.length} icon={CalendarDays} />
        </div>
      </div>

      <div className="inline-flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        {[
          { key: 'clubs', label: 'Club Approvals' },
          { key: 'events', label: 'Event Approvals' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm dark:bg-gray-900 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : activeTab === 'clubs' ? (
        clubs.length ? (
          <div className="grid gap-4">
            {clubs.map((club) => (
              <button
                key={club._id}
                type="button"
                onClick={() => openClub(club)}
                className="rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Club Request</p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{club.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{club.description || 'No description provided.'}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <p>Requested by</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{club.requestedBy?.name || 'Unknown requester'}</p>
                    <p>{club.requestedBy?.employeeId || club.requestedBy?.email || ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No pending club requests" description="There are no club approvals waiting for review." icon={ShieldCheck} />
        )
      ) : events.length ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <button
              key={event._id}
              type="button"
              onClick={() => openEvent(event)}
              className="rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{event.club?.name || 'Club Event'}</p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{event.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{event.description}</p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p>{new Date(event.startsAt).toLocaleDateString()}</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">{event.venue?.name || 'Venue TBA'}</p>
                  <p>{event.status?.replace('_', ' ')}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No pending event requests" description="There are no event approvals waiting for review." icon={ClipboardList} />
      )}

      {selectedClub && (
        <Overlay onClose={() => setSelectedClub(null)}>
          <div className="max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <ModalHeader title={selectedClub.name} subtitle="Club approval review" onClose={() => setSelectedClub(null)} />
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-5">
                <InfoBlock label="Description" value={selectedClub.description || 'No description provided.'} multiline />
                <InfoGrid
                  items={[
                    { label: 'Department', value: selectedClub.department || 'N/A' },
                    { label: 'Requested By', value: selectedClub.requestedBy?.name || 'Unknown' },
                    { label: 'Requester ID', value: selectedClub.requestedBy?.employeeId || selectedClub.requestedBy?.email || 'N/A' },
                    { label: 'Current Status', value: selectedClub.status },
                  ]}
                />
              </div>

              <div className="space-y-4 rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Approval Controls</p>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Assign advisor</label>
                  <select
                    value={advisorEmployeeId}
                    onChange={(event) => setAdvisorEmployeeId(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
                  >
                    <option value="">Select faculty advisor</option>
                    {faculty.map((member) => (
                      <option key={member._id} value={member.employeeId}>
                        {member.name} ({member.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Feedback comment</label>
                  <textarea
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
                    placeholder="Required for rejection. Optional note for internal review."
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedClub(null)}>Close</Button>
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleClubAction('reject')}
                    isLoading={clubReviewMutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => handleClubAction('approve')} isLoading={clubReviewMutation.isPending}>
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {selectedEvent && (
        <Overlay onClose={() => setSelectedEvent(null)}>
          <div className="max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <ModalHeader title={selectedEvent.title} subtitle={selectedEvent.club?.name || 'Event approval review'} onClose={() => setSelectedEvent(null)} />
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <InfoGrid
                  items={[
                    { label: 'Date', value: new Date(selectedEvent.startsAt).toLocaleDateString() },
                    { label: 'Time', value: `${new Date(selectedEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
                    { label: 'Location', value: [selectedEvent.venue?.name, selectedEvent.venue?.building].filter(Boolean).join(', ') || 'TBA' },
                    { label: 'Status', value: selectedEvent.status?.replace('_', ' ') || 'pending approval' },
                  ]}
                />
                <InfoBlock label="Description" value={selectedEvent.description || 'No description provided.'} multiline />
                {selectedEvent.rejectionReason && (
                  <InfoBlock label="Latest Rejection Reason" value={selectedEvent.rejectionReason} multiline tone="rose" />
                )}
                <div className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Event Logs</p>
                  </div>
                  {logsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-14 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : logs.length ? (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log._id} className="rounded-2xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatAction(log.action)}</p>
                          <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                          {log.reason && <p className="mt-2 text-gray-600 dark:text-gray-400">{log.reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No event logs found yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Decision Comment</p>
                </div>
                <textarea
                  rows={10}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950"
                  placeholder="Optional for approval, required for rejection."
                />
                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={() => handleEventAction('reject')}
                    isLoading={eventReviewMutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => handleEventAction('approve')} isLoading={eventReviewMutation.isPending}>
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-6 max-w-6xl" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{subtitle}</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <button type="button" onClick={onClose} className="rounded-2xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          {React.createElement(icon, { className: 'h-5 w-5' })}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, multiline = false, tone = 'default' }) {
  const toneClass = tone === 'rose'
    ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20'
    : 'border-gray-200 bg-transparent dark:border-gray-800';

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-sm text-gray-700 dark:text-gray-300 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-3xl border border-gray-200 p-5 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function formatAction(action) {
  return (action || 'update')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
