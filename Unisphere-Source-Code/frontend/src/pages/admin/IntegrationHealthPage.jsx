import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { getAllClubs } from '@/services/clubService';
import { getPublicEvents } from '@/services/eventService';
import { getAllNotices } from '@/services/noticeService';
import { getAllStudents, getAllFaculty, getAllAdmins } from '@/services/authService';
import { getAllRegistrations } from '@/services/registrationService';
import { getMyNotifications } from '@/services/notificationService';

const countRecords = (payload) => {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload.items)) return payload.items.length;
  if (Array.isArray(payload.events)) return payload.events.length;
  if (Array.isArray(payload.clubs)) return payload.clubs.length;
  if (Array.isArray(payload.notices)) return payload.notices.length;
  if (Array.isArray(payload.notifications)) return payload.notifications.length;
  if (Array.isArray(payload.students)) return payload.students.length;
  if (Array.isArray(payload.faculty)) return payload.faculty.length;
  if (Array.isArray(payload.registrations)) return payload.registrations.length;
  return 1;
};

export default function IntegrationHealthPage() {
  useDocumentTitle('Integration Health | Unisphere');
  const { role } = useAuth();

  const checks = React.useMemo(() => {
    const baseChecks = [
      { id: 'clubs', label: 'Clubs Service', queryFn: () => getAllClubs({ limit: 5 }) },
      { id: 'events', label: 'Events Service', queryFn: () => getPublicEvents({ limit: 5 }) },
      { id: 'notices', label: 'Notices Service', queryFn: () => getAllNotices({ limit: 5 }) },
      { id: 'notifications', label: 'Notifications Service', queryFn: () => getMyNotifications({ limit: 5 }) },
      { id: 'students', label: 'Students Service', queryFn: () => getAllStudents({ limit: 5 }) },
      { id: 'faculty', label: 'Faculty Service', queryFn: () => getAllFaculty({ limit: 5 }) },
      { id: 'registrations', label: 'Registrations Service', queryFn: () => getAllRegistrations({ limit: 5 }) },
    ];

    if (role === 'superadmin') {
      baseChecks.push({ id: 'admins', label: 'Admins Service', queryFn: () => getAllAdmins() });
    }

    return baseChecks;
  }, [role]);

  const results = useQueries({
    queries: checks.map((check) => ({
      queryKey: ['integration-health', check.id],
      queryFn: check.queryFn,
      staleTime: 0,
      retry: 1,
    })),
  });

  const summary = React.useMemo(() => {
    const total = results.length;
    const passed = results.filter((result) => result.isSuccess).length;
    const failed = results.filter((result) => result.isError).length;
    const loading = results.filter((result) => result.isPending).length;
    return { total, passed, failed, loading };
  }, [results]);

  const refreshAll = () => {
    results.forEach((result) => {
      result.refetch();
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">Integration Health</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Live smoke checks for critical frontend-to-backend service connections.
          </p>
        </div>
        <Button onClick={refreshAll} className="rounded-xl" variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" /> Re-run Checks
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Total Checks" value={summary.total} tone="neutral" />
        <SummaryCard title="Passing" value={summary.passed} tone="success" />
        <SummaryCard title="Failing" value={summary.failed} tone="danger" />
        <SummaryCard title="Running" value={summary.loading} tone="warning" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {checks.map((check, index) => {
          const result = results[index];
          const status = result.isPending ? 'running' : result.isError ? 'failed' : 'passed';
          const sampledCount = result.isSuccess ? countRecords(result.data) : 0;
          const errorMessage = result.error?.response?.data?.message || result.error?.message || 'Unknown error';

          return (
            <article
              key={check.id}
              className={cn(
                'rounded-3xl border p-5 shadow-sm transition',
                status === 'passed' && 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20',
                status === 'failed' && 'border-rose-200 bg-rose-50/70 dark:border-rose-800/60 dark:bg-rose-950/20',
                status === 'running' && 'border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Service Check</p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{check.label}</h3>
                </div>
                <StatusIcon status={status} />
              </div>

              <div className="mt-4 text-sm">
                {status === 'running' && (
                  <p className="font-medium text-amber-700 dark:text-amber-300">Running smoke test...</p>
                )}
                {status === 'passed' && (
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Connected successfully. Sample records: {sampledCount}
                  </p>
                )}
                {status === 'failed' && (
                  <p className="font-medium text-rose-700 dark:text-rose-300">
                    Failed to connect: {errorMessage}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'passed') {
    return <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
  }

  if (status === 'failed') {
    return <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />;
  }

  return <Activity className="h-6 w-6 animate-pulse text-amber-600 dark:text-amber-400" />;
}

function SummaryCard({ title, value, tone }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
        : tone === 'warning'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
          : 'bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300';

  return (
    <div className={cn('rounded-2xl border border-gray-200 p-4 dark:border-gray-800', toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
