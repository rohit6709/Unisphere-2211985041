import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  ExternalLink, 
  Building2,
  ShieldCheck,
  AlertCircle,
  UserRound,
  X
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { assignAdvisor, getClubMembers, getMyAdvisedClubs } from '@/services/clubService';
import { getAdviseePendingEvents } from '@/services/eventService';
import { getAllFaculty } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';

export default function ClubManagementPage() {
  useDocumentTitle('Club Management | Unisphere');
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isHod = role === 'hod';
  const [advisorSelection, setAdvisorSelection] = React.useState({});
  const [detailClub, setDetailClub] = React.useState(null);
  const [memberClub, setMemberClub] = React.useState(null);

  // Fetch clubs advised by this faculty
  const { data: clubData, isLoading } = useQuery({
    queryKey: ['advised-clubs'],
    queryFn: () => getMyAdvisedClubs(),
  });

  const { data: pendingEventsData = [], isLoading: pendingLoading, isError: pendingError, error: pendingErrorDetail } = useQuery({
    queryKey: ['faculty-pending-events'],
    queryFn: () => getAdviseePendingEvents(),
  });

  const { data: facultyData } = useQuery({
    queryKey: ['faculty-directory-minimal', isHod],
    queryFn: () => getAllFaculty({ page: 1, limit: 200 }),
    enabled: isHod,
  });

  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ['club-members-preview', memberClub?._id],
    queryFn: () => getClubMembers(memberClub._id, { page: 1, limit: 50 }),
    enabled: Boolean(memberClub?._id),
  });

  const assignAdvisorMutation = useMutation({
    mutationFn: ({ clubId, employeeId }) => assignAdvisor(clubId, { employeeId }),
    onSuccess: () => {
      toast.success('Advisor assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['advised-clubs'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to assign advisor');
    },
  });

  const clubs = clubData?.clubs || [];
  const pendingEvents = pendingEventsData?.events || pendingEventsData || [];
  const facultyList = facultyData?.faculty || facultyData?.data?.faculty || facultyData || [];
  const members = memberData?.members || [];
  const pendingByClub = pendingEvents.reduce((acc, event) => {
    const clubId = event?.club?._id;
    if (!clubId) return acc;
    acc[clubId] = (acc[clubId] || 0) + 1;
    return acc;
  }, {});

  if (isLoading || pendingLoading) return <LoadingSkeleton />;
  if (pendingError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title="Unable to load faculty approvals"
          description={pendingErrorDetail?.response?.data?.message || pendingErrorDetail?.message || 'Please refresh and try again.'}
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-500" />
          Advised Clubs
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
          Manage the clubs you officially advise. Oversee memberships, leadership assignments, and club details to ensure successful operations.
        </p>
      </div>

      {!clubs?.length ? (
        <EmptyState 
          title="No clubs assigned" 
          description="You are not currently listed as an advisor for any active clubs. Contact the Dean's office or Platform Admin if this is an error."
          icon={Building2}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Motion.div
              key={club._id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all flex flex-col h-full"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                    club.status === 'active' 
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800/50"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50"
                  )}>
                    {club.status}
                  </span>
                </div>

                <div className="mb-2 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailClub(club)}
                    className="text-left text-xl font-bold text-gray-900 dark:text-white line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {club.name}
                  </button>
                  {pendingByClub[club._id] > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      {pendingByClub[club._id]} pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed">
                  {club.description || 'No description provided.'}
                </p>

                {isHod && (
                  <div className="mb-6 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Assign Advisor (HOD)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={advisorSelection[club._id] || ''}
                        onChange={(e) => setAdvisorSelection((prev) => ({ ...prev, [club._id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-2 py-1.5 text-xs"
                      >
                        <option value="">Select faculty</option>
                        {facultyList.map((faculty) => (
                          <option key={faculty._id} value={faculty.employeeId}>
                            {faculty.name} ({faculty.employeeId})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const employeeId = advisorSelection[club._id];
                          if (!employeeId) {
                            toast.error('Select a faculty member first');
                            return;
                          }
                          if (!window.confirm('Are you sure you want to assign this advisor?')) return;
                          assignAdvisorMutation.mutate({ clubId: club._id, employeeId });
                        }}
                        isLoading={assignAdvisorMutation.isPending}
                        className="text-xs"
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-gray-800/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Members
                    </span>
                    <span className="font-semibold dark:text-gray-200">{club.members?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Pending Events
                    </span>
                    <span className="font-semibold dark:text-gray-200">{pendingByClub[club._id] || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> President
                    </span>
                    <span className="font-semibold dark:text-gray-200 truncate max-w-30">
                      {club.president?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailClub(club)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Quick View
                </button>
                <Link
                  to={`/clubs/${club._id}/governance`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </Link>
                <button
                  type="button"
                  onClick={() => setMemberClub(club)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Users className="w-3.5 h-3.5" /> Members
                </button>
              </div>
            </Motion.div>
          ))}
        </div>
      )}

      {detailClub && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-100 p-5 dark:border-gray-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Club Detail</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{detailClub.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailClub(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close club details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
                {detailClub.description || 'No description provided for this club yet.'}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard icon={ShieldCheck} label="Status" value={detailClub.status} />
                <DetailCard icon={AlertCircle} label="Pending Events" value={String(pendingByClub[detailClub._id] || 0)} />
                <DetailCard icon={Users} label="Members" value={String(detailClub.members?.length || 0)} />
                <DetailCard icon={UserRound} label="President" value={detailClub.president?.name || 'Unassigned'} />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Advisors</p>
                <div className="flex flex-wrap gap-2">
                  {(detailClub.advisors || []).map((advisor) => (
                    <span
                      key={advisor._id}
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
                    >
                      {advisor.name} ({advisor.employeeId})
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailClub(null);
                    setMemberClub(detailClub);
                  }}
                >
                  View Members
                </Button>
                <Link
                  to={`/clubs/${detailClub._id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Open Club
                </Link>
                <Link
                  to={`/clubs/${detailClub._id}/governance`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Open Governance
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {memberClub && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-100 p-5 dark:border-gray-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Members</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{memberClub.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setMemberClub(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close members dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {memberLoading ? (
                <div className="grid gap-3">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : !members.length ? (
                <EmptyState title="No members found" description="This club does not have any enrolled members yet." icon={Users} />
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    <span>Name</span>
                    <span>Roll No</span>
                    <span>Department</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {members.map((member) => (
                      <div
                        key={member._id}
                        className="grid grid-cols-[1.5fr_1fr_1fr] gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200"
                      >
                        <span className="font-medium">{member.name}</span>
                        <span>{member.rollNo}</span>
                        <span>{member.department || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {React.createElement(icon, { className: 'h-4 w-4' })}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-10" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
