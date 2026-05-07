import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, CalendarDays, BookOpen, ClipboardCheck } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMyAdvisedClubs } from '@/services/clubService';
import { getAdviseePendingEvents } from '@/services/eventService';
import { getInitials } from '@/utils/getInitials';

export default function FacultyDashboard() {
  useDocumentTitle('Faculty Dashboard');
  const { user } = useAuth();

  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ['faculty-clubs'],
    queryFn: async () => {
      const payload = await getMyAdvisedClubs();
      return payload?.clubs || payload || [];
    },
    enabled: !!user,
  });

  const { data: events = [], isLoading: isLoadingEvents, isError: isEventsError } = useQuery({
    queryKey: ['faculty-events'],
    queryFn: async () => {
      const payload = await getAdviseePendingEvents();
      return payload?.events || payload || [];
    },
    enabled: !!user,
  });

  if (isLoadingClubs || isLoadingEvents) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>
          <div className="h-64 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (isEventsError) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={ClipboardCheck}
          title="Unable to load faculty queue"
          description="We could not load your pending event review list right now. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BookOpen className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-heading font-extrabold mb-2">
            Faculty Advisor Dashboard
          </h1>
          <p className="text-white/80 max-w-lg">
            Welcome back, {user?.name}. You are currently advising {clubs.length} clubs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Advised Clubs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--primary)]" />
              Clubs You Advise
            </h2>
          </div>

          {clubs.length === 0 ? (
            <EmptyState 
              icon={Users}
              title="No clubs advised"
              description="You are not currently advising any clubs."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {clubs.map(club => (
                <Link key={club._id} to={`/clubs/${club._id}`} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--primary)] transition-colors shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-h)] font-bold text-lg group-hover:bg-[var(--primary-glow)] group-hover:text-[var(--primary)] transition-colors">
                      {getInitials(club.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-h)]">{club.name}</h3>
                      <p className="text-xs text-[var(--text)]">{club.members?.length || 0} members</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-lg uppercase">
                    {club.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Action Items */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[var(--primary)]" />
              Recent Club Events
            </h2>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <p className="text-sm text-[var(--text)] mb-6">Events from the platform. Review and monitor club activities.</p>
            
            <div className="space-y-4">
              {events.slice(0, 5).map(event => (
                <Link to={`/events/${event._id}`} key={event._id} className="flex gap-4 items-center p-3 rounded-xl hover:bg-[var(--bg-card-alt)] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center text-[var(--primary)] shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[var(--text-h)] truncate">{event.title}</h4>
                    <p className="text-xs text-[var(--text)] flex items-center gap-2 truncate">
                      {new Date(event.startsAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
              {events.length === 0 && (
                <div className="text-center py-4 text-[var(--text)] text-sm">No recent events found.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

